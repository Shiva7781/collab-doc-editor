# CollabDocs

A local-first, real-time collaborative document editor with offline support, deterministic conflict resolution, granular version control, and role-based access — built for the House of Edtech Full-Stack Developer Assignment v2.1.

**Live:** [https://collab-doc-editor-rho.vercel.app](https://collab-doc-editor-rho.vercel.app)

---

## What it does

- **Works offline** — the editor runs entirely from IndexedDB. No network = no blocked UI.
- **Syncs automatically** — when connectivity returns, changes merge via Y.js CRDT (no data loss, no conflicts).
- **Real-time collaboration** — multiple users see each other's edits live via WebSocket.
- **Version snapshots** — save named checkpoints and restore to any past state without corrupting other live editors.
- **Role-based access** — Owner / Editor / Viewer. Viewers are blocked from pushing updates at the WebSocket level.
- **AI writing assistant** — continue writing, summarize, fix grammar, or rewrite (requires a Groq API key).

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Editor | Tiptap 3 + `@tiptap/extension-collaboration` |
| CRDT / sync | Y.js 13, y-indexeddb 9, y-websocket 3 |
| WS server | `@y/websocket-server` (separate port) |
| Database | MongoDB (Mongoose 9) |
| Auth | NextAuth v4 — JWT strategy |
| Validation | Zod 3 |
| AI | Groq SDK — Llama 3.3 70B |
| Styling | Tailwind CSS 3 |
| Toasts | Sonner |

---

## Running locally

### Prerequisites

- Node.js 20+
- MongoDB — local (`mongod`) **or** a free [MongoDB Atlas](https://cloud.mongodb.com) cluster
- (Optional) A free [Groq API key](https://console.groq.com) for AI features

### 1. Clone and install

```bash
git clone https://github.com/Shiva7781/collab-doc-editor.git
cd collab-doc-editor
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the values:

```env
# MongoDB — use Atlas URI for cloud, or localhost for local
MONGODB_URI=mongodb://localhost:27017/HOE

# NextAuth — generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-32-char-secret-here
NEXTAUTH_URL=http://localhost:3000

# WebSocket auth JWT
JWT_SECRET=your-jwt-secret-here

# WebSocket server port (runs separately from Next.js)
WS_PORT=3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Groq — optional, needed for AI features
GROQ_API_KEY=gsk_...

# App
PORT=3000
NODE_ENV=development
```

### 3. Start MongoDB (local only)

Skip this if you're using MongoDB Atlas.

```bash
mongod --dbpath /var/lib/mongodb
```

### 4. Start the app

```bash
npm run dev
```

This starts two servers:

| Server | URL | Purpose |
|---|---|---|
| Next.js | http://localhost:3000 | Web app + REST API |
| Y.js WebSocket | ws://localhost:3001 | Real-time collaboration |

Open [http://localhost:3000](http://localhost:3000), register an account, and start editing.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `NEXTAUTH_SECRET` | Yes | NextAuth signing secret (32+ chars) |
| `NEXTAUTH_URL` | Yes | App base URL |
| `JWT_SECRET` | Yes | Short-lived WS token signing key |
| `NEXT_PUBLIC_WS_URL` | Yes | WebSocket server URL (seen by browser) |
| `WS_PORT` | No | WebSocket server port (default: 3001) |
| `PORT` | No | HTTP server port (default: 3000) |
| `GROQ_API_KEY` | No | Enables AI assistant features |
| `MAX_SYNC_PAYLOAD_BYTES` | No | Max sync payload (default: 5 MB) |
| `NEXT_PUBLIC_AUTHOR_NAME` | No | Footer author name |
| `NEXT_PUBLIC_GITHUB_URL` | No | Footer GitHub link |
| `NEXT_PUBLIC_LINKEDIN_URL` | No | Footer LinkedIn link |

---

## Architecture

```
Browser (Local-First)
+--------------------------------------------------+
|  Tiptap Editor <-- Y.Doc (in-memory CRDT)        |
|                       |                          |
|                  IndexedDB (y-indexeddb)          |
|                  -- primary storage, offline-OK  |
|                       |                          |
|                  WebsocketProvider               |
|                  -- background sync, reconnects  |
+------------------------|-------------------------+
                         | ws://localhost:3001/doc/:id
                         |
+------------------------|-------------------------+
|  Y.js WS Server (port 3001)                      |
|  -- setPersistence: loads/saves Y.Doc <-> MongoDB|
|  -- JWT auth on handshake                        |
|  -- Viewers blocked from updates (code 4005)     |
+------------------------|-------------------------+
                         |
+------------------------|-------------------------+
|  Next.js (port 3000)   |  MongoDB                |
|  REST API              |  documents (yjsState)   |
|  NextAuth v4           |  collaborations (RBAC)  |
|  AI routes (Groq)      |  versions (snapshots)   |
+------------------------+-------------------------+
```

### How offline sync works

1. Every keystroke goes to the **in-memory Y.Doc** first — instant, zero latency.
2. Y.js automatically persists to **IndexedDB** via `y-indexeddb` — survives page refresh.
3. `WebsocketProvider` runs in the background and reconnects automatically.
4. When connection drops, the editor keeps working. A `SyncManager` queues metadata ops (title updates, version creation).
5. On reconnect, the WS server and client exchange Y.js state vectors and apply only the missing updates — no full-document retransmit, no overwrites.

### Conflict resolution

Y.js uses the **YATA algorithm** — a CRDT where concurrent inserts at the same position are resolved deterministically using each client's unique `clientId` and vector clocks. Two users typing offline at the same position will always produce the same merged result when they reconnect, with no data lost.

### Version history

- **Save:** `Y.snapshot(ydoc)` → `Y.encodeSnapshot()` → stored as binary in MongoDB.
- **Restore:** `Y.decodeSnapshot()` → `Y.createDocFromSnapshot()` (with `gc: false`) → encoded as full update → persisted to MongoDB. Live collaborators receive the restored state on next sync without interruption.

### Security

- WebSocket `maxPayload: 5 MB` enforced at the transport layer.
- All sync routes validate payloads with Zod — oversized updates are rejected before any Y.js processing.
- Every DB query scopes by `userId` via the `Collaboration` table (tenant isolation).
- Viewers sending a Y.js update message over WebSocket are disconnected with close code 4005.

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/ws-token` | Get short-lived WS JWT |
| GET | `/api/documents` | List accessible documents |
| POST | `/api/documents` | Create document |
| GET | `/api/documents/:id` | Get document metadata |
| PATCH | `/api/documents/:id` | Update title / word count |
| DELETE | `/api/documents/:id` | Delete (owner only) |
| GET | `/api/documents/:id/sync` | Get current Y.js state |
| POST | `/api/documents/:id/sync` | HTTP fallback sync |
| GET | `/api/documents/:id/versions` | List snapshots |
| POST | `/api/documents/:id/versions` | Create snapshot |
| GET | `/api/documents/:id/versions/:vid` | Get snapshot data |
| POST | `/api/documents/:id/versions/:vid` | Restore snapshot |
| GET | `/api/documents/:id/collaborators` | List collaborators |
| POST | `/api/documents/:id/collaborators` | Invite by email |
| PATCH | `/api/documents/:id/collaborators?userId=` | Update role |
| DELETE | `/api/documents/:id/collaborators?userId=` | Remove collaborator |
| POST | `/api/ai/complete` | Continue writing |
| POST | `/api/ai/summarize` | Summarize document |
| POST | `/api/ai/grammar` | Fix grammar / rewrite |

---

## Deployment

### Vercel (Next.js app)

```bash
npm run build          # verify build passes locally first
npx vercel --prod
```

Set all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

> **Note:** The WebSocket server (`server.ts`) is a persistent Node.js process and cannot run on Vercel serverless. Deploy it separately on [Railway](https://railway.app), [Render](https://render.com), or a VPS, then update `NEXT_PUBLIC_WS_URL` to point to it. The app falls back to HTTP sync automatically when WebSocket is unavailable.

### Production (VPS / Railway)

```bash
npm run build
NODE_ENV=production npm start
```

---

## CI/CD

GitHub Actions at `.github/workflows/ci.yml` runs on every push:

1. **Lint & type-check** — `next lint` + `tsc --noEmit`
2. **Build** — `next build`
3. **Deploy** — on push to `main`

---

Built by **Shivanand Vishwakarma** · [GitHub](https://github.com/Shiva7781) · [LinkedIn](https://www.linkedin.com/in/shivanand-vishwakarma/)
