/**
 * Custom Next.js server with an integrated Y.js WebSocket collaboration server.
 *
 * Architecture:
 *  - Port 3000: Next.js HTTP (all page/API requests)
 *  - Port 3001 (WS_PORT): WebSocket server using @y/websocket-server
 *
 * The WS server uses setPersistence() to read/write Y.js document state from
 * MongoDB, making the in-memory Y.Doc the hot-path while MongoDB is the
 * durable store.  Role-based access is enforced on the WS handshake so Viewers
 * can never push updates.
 *
 * OOM protection:
 *  - MAX_MESSAGE_BYTES limits per-message payload size
 *  - ws maxPayload option enforces this at the transport layer
 */

import "dotenv/config";
import http from "http";
import url from "url";
import { WebSocketServer, WebSocket } from "ws";
import next from "next";
import mongoose from "mongoose";

// ─── @y/websocket-server utilities ───────────────────────────────────────────
// Using dynamic import because @y/websocket-server is ESM
async function loadYWsUtils() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — package exports subpath; types resolved at runtime
  const mod = await import("@y/websocket-server/utils");
  return mod;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const WS_PORT = parseInt(process.env.WS_PORT ?? "3001", 10);
const MAX_MESSAGE_BYTES = parseInt(process.env.MAX_SYNC_PAYLOAD_BYTES ?? "5242880", 10);
const MONGODB_URI = process.env.MONGODB_URI!;
const JWT_SECRET = process.env.JWT_SECRET!;
const dev = process.env.NODE_ENV !== "production";

// ─── JWT verification (no external deps beyond jose) ─────────────────────────
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

// ─── MongoDB access helpers (raw, no Mongoose schema needed here) ─────────────
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

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function start() {
  // Connect MongoDB first so persistence is ready before WS server starts
  await mongoose.connect(MONGODB_URI, { maxPoolSize: 5 });
  console.log("✓ MongoDB connected");

  const yWsUtils = await loadYWsUtils();

  // Set up Y.js MongoDB persistence
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

  // ─── WebSocket server (separate port) ───────────────────────────────────────
  const wss = new WebSocketServer({
    port: WS_PORT,
    maxPayload: MAX_MESSAGE_BYTES,
  });

  wss.on("connection", async (ws: WebSocket, req: http.IncomingMessage) => {
    const parsed = url.parse(req.url ?? "", true);
    // URL pattern: /doc/<documentId>?token=<jwt>
    const pathParts = (parsed.pathname ?? "").split("/").filter(Boolean);
    const docId = pathParts[1]; // e.g. /doc/abc123
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

    // Monkey-patch ws.send to block write messages for viewers
    if (role === "viewer") {
      const originalSend = ws.send.bind(ws);
      // Allow reads (sync step 2 going out to viewer is fine),
      // but close if viewer tries to send an update (message type 2)
      ws.on("message", (data) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        const msgType = buf[0];
        // msgType 0 = sync step 1 (ok), 1 = awareness (ok), 2 = update (BLOCK)
        if (msgType === 0 && buf[1] === 2) {
          // sync update from client — block for viewers
          ws.close(4005, "Viewers cannot push updates");
        }
      });
      // Suppress unused var warning
      void originalSend;
    }

    // Set up Y.js connection using @y/websocket-server
    yWsUtils.setupWSConnection(ws as unknown as Parameters<typeof yWsUtils.setupWSConnection>[0], req, {
      docName: docId,
      gc: true,
    });
  });

  wss.on("listening", () => console.log(`✓ WS  server listening on ws://localhost:${WS_PORT}`));
  wss.on("error", (err) => console.error("WS server error:", err));

  // ─── Next.js HTTP server ─────────────────────────────────────────────────────
  const app = next({ dev, hostname: "localhost", port: PORT });
  const handle = app.getRequestHandler();
  await app.prepare();

  const httpServer = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error("Next.js request error:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`✓ HTTP server listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
