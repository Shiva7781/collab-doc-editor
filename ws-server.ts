import "dotenv/config";
import http from "http";
import url from "url";
import { WebSocketServer, WebSocket } from "ws";
import mongoose from "mongoose";
import * as Y from "yjs";
// y-protocols v1 is compatible with yjs v13 (our client stack)
// @y/websocket-server requires yjs v14 (@y/y) — incompatible, so we implement the
// sync + awareness protocol directly using the stable y-protocols v1 package.
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const PORT              = parseInt(process.env.WS_PORT ?? process.env.PORT ?? "3001", 10);
const MAX_MESSAGE_BYTES = parseInt(process.env.MAX_SYNC_PAYLOAD_BYTES ?? "5242880", 10);
const MONGODB_URI       = process.env.MONGODB_URI!;
const JWT_SECRET        = process.env.JWT_SECRET!;

// ─── Protocol constants ───────────────────────────────────────────────────────
const MSG_SYNC       = 0;
const MSG_AWARENESS  = 1;

// ─── In-memory document map ───────────────────────────────────────────────────
interface DocRoom {
  doc:        Y.Doc;
  awareness:  awarenessProtocol.Awareness;
  clients:    Set<WebSocket>;
  saving:     boolean;
}

const rooms = new Map<string, DocRoom>();

function getRoom(docName: string): DocRoom {
  let room = rooms.get(docName);
  if (!room) {
    const doc       = new Y.Doc({ gc: true });
    const awareness = new awarenessProtocol.Awareness(doc);
    room            = { doc, awareness, clients: new Set(), saving: false };
    rooms.set(docName, room);
  }
  return room;
}

// ─── Persistence (MongoDB) ────────────────────────────────────────────────────
async function loadState(docName: string): Promise<Uint8Array | null> {
  const db = mongoose.connection.db;
  if (!db) return null;
  const record = await db.collection("documents").findOne(
    { _id: new mongoose.Types.ObjectId(docName) },
    { projection: { yjsState: 1 } }
  );
  if (!record?.yjsState) return null;
  const buf = record.yjsState;
  return buf instanceof Buffer ? buf : Buffer.from(buf.buffer ?? buf);
}

async function persistState(docName: string, doc: Y.Doc): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;
  const state = Y.encodeStateAsUpdate(doc);
  await db.collection("documents").updateOne(
    { _id: new mongoose.Types.ObjectId(docName) },
    { $set: { yjsState: Buffer.from(state), updatedAt: new Date() } }
  );
}

// Debounced persist — avoid hammering Mongo on every keystroke
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
function debouncedPersist(docName: string, doc: Y.Doc, delayMs = 2000) {
  const existing = saveTimers.get(docName);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    saveTimers.delete(docName);
    try { await persistState(docName, doc); } catch (e) { console.error("persist error", e); }
  }, delayMs);
  saveTimers.set(docName, timer);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function verifyToken(token: string): Promise<{ userId: string; name: string; email: string } | null> {
  try {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || !payload.name) return null;
    return { userId: payload.sub, name: payload.name as string, email: payload.email as string };
  } catch {
    return null;
  }
}

async function getDocumentRole(docId: string, userId: string): Promise<string | null> {
  const db = mongoose.connection.db;
  if (!db) return null;
  const collab = await db.collection("collaborations").findOne({
    documentId: new mongoose.Types.ObjectId(docId),
    userId:     new mongoose.Types.ObjectId(userId),
  });
  return collab?.role ?? null;
}

// ─── WebSocket connection handler ─────────────────────────────────────────────
async function handleConnection(ws: WebSocket, req: http.IncomingMessage) {
  const parsed    = url.parse(req.url ?? "", true);
  const pathParts = (parsed.pathname ?? "").split("/").filter(Boolean);
  const docId     = pathParts[1];
  const token     = parsed.query.token as string | undefined;

  if (!docId || !token) { ws.close(4001, "Missing documentId or token"); return; }

  const user = await verifyToken(token);
  if (!user) { ws.close(4003, "Invalid token"); return; }

  const role = await getDocumentRole(docId, user.userId);
  if (!role) { ws.close(4004, "No access to this document"); return; }

  const room      = getRoom(docId);
  const { doc, awareness, clients } = room;

  // Load from MongoDB on first client
  if (clients.size === 0) {
    try {
      const state = await loadState(docId);
      if (state) Y.applyUpdate(doc, state);
    } catch (e) {
      console.warn("Failed to load doc state:", e);
    }
  }

  clients.add(ws);

  // ── Send sync step 1 (our state vector) ──────────────────────────────────
  {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_SYNC);
    syncProtocol.writeSyncStep1(enc, doc);
    ws.send(encoding.toUint8Array(enc));
  }

  // ── Send current awareness states ─────────────────────────────────────────
  const awarenessIds = Array.from(awareness.getStates().keys());
  if (awarenessIds.length > 0) {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_AWARENESS);
    encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, awarenessIds));
    ws.send(encoding.toUint8Array(enc));
  }

  // ── Propagate doc updates to all other clients in the room ────────────────
  const docUpdateHandler = (update: Uint8Array, origin: unknown) => {
    if (origin === ws) return; // don't echo back
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_SYNC);
    syncProtocol.writeUpdate(enc, update);
    const msg = encoding.toUint8Array(enc);
    clients.forEach((peer) => {
      if (peer !== ws && peer.readyState === WebSocket.OPEN) peer.send(msg);
    });
  };
  doc.on("update", docUpdateHandler);

  // ── Propagate awareness updates to others ─────────────────────────────────
  const awarenessHandler = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    if (origin === ws) return;
    const changedIds = [...added, ...updated, ...removed];
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MSG_AWARENESS);
    encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changedIds));
    const msg = encoding.toUint8Array(enc);
    clients.forEach((peer) => {
      if (peer.readyState === WebSocket.OPEN) peer.send(msg);
    });
  };
  awareness.on("update", awarenessHandler);

  // ── Incoming message handler ──────────────────────────────────────────────
  ws.on("message", (rawData) => {
    try {
      const data = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData as ArrayBuffer);
      const decoder = decoding.createDecoder(new Uint8Array(data));
      const msgType = decoding.readVarUint(decoder);

      if (msgType === MSG_SYNC) {
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, MSG_SYNC);
        const subType = syncProtocol.readSyncMessage(decoder, enc, doc, ws);

        // Reply if we wrote anything (e.g. sync step 2 in response to step 1)
        if (encoding.length(enc) > 1) {
          ws.send(encoding.toUint8Array(enc));
        }

        // After receiving updates or step2, debounce-persist
        if (subType === syncProtocol.messageYjsSyncStep2 || subType === syncProtocol.messageYjsUpdate) {
          debouncedPersist(docId, doc);
        }

        // Broadcast updates to all other clients
        if (subType === syncProtocol.messageYjsUpdate) {
          clients.forEach((peer) => {
            if (peer !== ws && peer.readyState === WebSocket.OPEN) peer.send(data);
          });
        }

        // Block viewers from pushing writes (type 2 = update)
        if (role === "viewer" && subType === syncProtocol.messageYjsUpdate) {
          ws.close(4005, "Viewers cannot push updates");
        }

      } else if (msgType === MSG_AWARENESS) {
        const update = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(awareness, update, ws);
        // Broadcast to all peers including sender (they see their own cursor via awareness)
        clients.forEach((peer) => {
          if (peer.readyState === WebSocket.OPEN) peer.send(data);
        });
      }
    } catch (err) {
      console.error("Message handling error:", err);
    }
  });

  // ── Cleanup on disconnect ─────────────────────────────────────────────────
  ws.on("close", async () => {
    clients.delete(ws);
    doc.off("update", docUpdateHandler);
    awareness.off("update", awarenessHandler);

    // Remove this client's awareness state
    awarenessProtocol.removeAwarenessStates(awareness, Array.from(awareness.getStates().keys()).filter(() => true), ws);

    if (clients.size === 0) {
      // Last client left — persist final state immediately
      const pending = saveTimers.get(docId);
      if (pending) { clearTimeout(pending); saveTimers.delete(docId); }
      try { await persistState(docId, doc); } catch (e) { console.error("Final persist error:", e); }
      rooms.delete(docId);
    }
  });

  ws.on("error", (err) => console.error("WS error:", err.message));
}

// ─── HTTP + WS server ─────────────────────────────────────────────────────────
let isReady = false;

const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

// Keepalive ping — Railway load balancer closes idle TCP after ~60 s
const PING_INTERVAL_MS = 25_000;
setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.ping();
  });
}, PING_INTERVAL_MS);

const httpServer = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(isReady ? "OK" : "Starting");
  } else {
    res.writeHead(404);
    res.end();
  }
});

httpServer.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (client) => {
    wss.emit("connection", client, request);
  });
});

wss.on("connection", (ws, req) => {
  handleConnection(ws, req).catch((err) => {
    console.error("Connection setup error:", err);
    ws.close(4000, "Internal error");
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ HTTP+WS server on port ${PORT} (initializing...)`);
});

// ─── Init (DB + signal handling) ──────────────────────────────────────────────
async function init() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI env var is required");
  if (!JWT_SECRET)  throw new Error("JWT_SECRET env var is required");

  await mongoose.connect(MONGODB_URI, { maxPoolSize: 5 });
  console.log("✓ MongoDB connected");

  isReady = true;
  console.log("✓ WS server ready");
}

init().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
