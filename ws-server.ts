import "dotenv/config";
import http from "http";
import url from "url";
import { WebSocketServer, WebSocket } from "ws";
import mongoose from "mongoose";

async function loadYWsUtils() {
  // @ts-ignore — package exports subpath; types resolved at runtime
  const mod = await import("@y/websocket-server/utils");
  return mod;
}

const PORT = parseInt(process.env.WS_PORT ?? process.env.PORT ?? "3001", 10);
const MAX_MESSAGE_BYTES = parseInt(process.env.MAX_SYNC_PAYLOAD_BYTES ?? "5242880", 10);
const MONGODB_URI = process.env.MONGODB_URI!;
const JWT_SECRET = process.env.JWT_SECRET!;

let isReady = false;

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

async function getDb() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB not connected");
  return db;
}

async function loadDocumentState(docName: string): Promise<Buffer | null> {
  const db = await getDb();
  const doc = await db.collection("documents").findOne(
    { _id: new mongoose.Types.ObjectId(docName) },
    { projection: { yjsState: 1 } }
  );
  return doc?.yjsState?.buffer ? Buffer.from(doc.yjsState.buffer) : null;
}

async function saveDocumentState(docName: string, state: Uint8Array): Promise<void> {
  const db = await getDb();
  await db.collection("documents").updateOne(
    { _id: new mongoose.Types.ObjectId(docName) },
    { $set: { yjsState: Buffer.from(state), updatedAt: new Date() } }
  );
}

async function getDocumentRole(docId: string, userId: string): Promise<string | null> {
  const db = await getDb();
  const collab = await db.collection("collaborations").findOne({
    documentId: new mongoose.Types.ObjectId(docId),
    userId: new mongoose.Types.ObjectId(userId),
  });
  return collab?.role ?? null;
}

// Start HTTP + WS server immediately so Railway's health check can pass
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

// Keep connections alive through Railway's load balancer (closes idle TCP after ~60s)
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

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ HTTP+WS server on port ${PORT} (initializing...)`);
});

// Async setup after server is already listening
async function init() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI env var is required");
  if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required");

  await mongoose.connect(MONGODB_URI, { maxPoolSize: 5 });
  console.log("✓ MongoDB connected");

  const yWsUtils = await loadYWsUtils();
  console.log("✓ Y.js WS utils loaded");

  yWsUtils.setPersistence({
    provider: null,
    bindState: async (docName: string, ydoc: import("yjs").Doc) => {
      const state = await loadDocumentState(docName);
      if (state) {
        const Y = await import("yjs");
        Y.applyUpdate(ydoc, state);
      }
    },
    writeState: async (docName: string, ydoc: import("yjs").Doc) => {
      const Y = await import("yjs");
      const state = Y.encodeStateAsUpdate(ydoc);
      await saveDocumentState(docName, state);
    },
  });

  wss.on("connection", async (ws: WebSocket, req: http.IncomingMessage) => {
    const parsed = url.parse(req.url ?? "", true);
    const pathParts = (parsed.pathname ?? "").split("/").filter(Boolean);
    const docId = pathParts[1];
    const token = parsed.query.token as string | undefined;

    if (!docId || !token) {
      ws.close(4001, "Missing documentId or token");
      return;
    }

    const user = await verifyToken(token);
    if (!user) {
      ws.close(4003, "Invalid token");
      return;
    }

    const role = await getDocumentRole(docId, user.userId);
    if (!role) {
      ws.close(4004, "No access to this document");
      return;
    }

    if (role === "viewer") {
      ws.on("message", (data) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        if (buf[0] === 0 && buf[1] === 2) {
          ws.close(4005, "Viewers cannot push updates");
        }
      });
    }

    yWsUtils.setupWSConnection(ws as unknown as Parameters<typeof yWsUtils.setupWSConnection>[0], req, {
      docName: docId,
      gc: true,
    });
  });

  isReady = true;
  console.log("✓ WS server ready");
}

init().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
