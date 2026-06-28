/**
 * POST /api/documents/:id/sync
 *
 * HTTP fallback sync endpoint for clients without WebSocket access.
 * Also used by the background queue to flush offline operations.
 *
 * The full Y.js state is accepted, merged server-side, and persisted.
 * Security:
 *   - Zod schema validates payload structure and enforces MAX_SYNC_PAYLOAD_BYTES
 *   - Viewers are rejected with 403
 *   - Malformed base64 → 400
 */
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import DocModel from "@/lib/db/models/Document";
import Collaboration from "@/lib/db/models/Collaboration";
import { requireSession } from "@/lib/auth/session";
import { SyncPayloadSchema } from "@/lib/validations/sync";
import * as Y from "yjs";
import mongoose from "mongoose";
import { toBuffer } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await connectDB();

    // Role check
    const collab = await Collaboration.findOne({
      documentId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    if (!collab) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    if (collab.role === "viewer")
      return NextResponse.json({ success: false, error: "Viewers cannot sync updates" }, { status: 403 });

    // Parse & validate
    const body = await req.json();
    const parsed = SyncPayloadSchema.safeParse({ ...body, documentId: id });
    if (!parsed.success)
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    const clientUpdate = Buffer.from(parsed.data.update, "base64");

    // Load current server state
    const serverDoc = await DocModel.findById(id).select("yjsState").lean();

    const serverYDoc = new Y.Doc();
    if (serverDoc?.yjsState) {
      const sb = toBuffer(serverDoc.yjsState);
      Y.applyUpdate(serverYDoc, new Uint8Array(sb.buffer, sb.byteOffset, sb.byteLength));
    }

    // Apply client update (Y.js CRDT merge — always deterministic)
    Y.applyUpdate(serverYDoc, new Uint8Array(clientUpdate));

    const mergedState = Y.encodeStateAsUpdate(serverYDoc);
    const mergedStateVector = Y.encodeStateVector(serverYDoc);

    // Persist merged state
    await DocModel.findByIdAndUpdate(id, {
      $set: {
        yjsState: Buffer.from(mergedState),
        yjsStateVector: Buffer.from(mergedStateVector),
        updatedAt: new Date(),
      },
    });

    // Return the full merged state so the client can update its local copy
    return NextResponse.json({
      success: true,
      data: {
        mergedState: Buffer.from(mergedState).toString("base64"),
        stateVector: Buffer.from(mergedStateVector).toString("base64"),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("POST /sync:", err);
    return NextResponse.json({ success: false, error: "Sync failed" }, { status: 500 });
  }
}

// GET /api/documents/:id/sync — return current server Y.js state
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await connectDB();

    const collab = await Collaboration.findOne({
      documentId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    if (!collab) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const doc = await DocModel.findById(id).select("yjsState yjsStateVector updatedAt").lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        state: doc.yjsState ? toBuffer(doc.yjsState).toString("base64") : null,
        stateVector: doc.yjsStateVector ? toBuffer(doc.yjsStateVector).toString("base64") : null,
        updatedAt: doc.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
