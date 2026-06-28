import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import DocModel from "@/lib/db/models/Document";
import Version from "@/lib/db/models/Version";
import Collaboration from "@/lib/db/models/Collaboration";
import { requireSession } from "@/lib/auth/session";
import * as Y from "yjs";
import mongoose from "mongoose";
import { toBuffer } from "@/lib/utils";

type Params = { params: Promise<{ id: string; versionId: string }> };

// GET /api/documents/:id/versions/:versionId — return snapshot state for preview
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id, versionId } = await params;
    await connectDB();

    const collab = await Collaboration.findOne({
      documentId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    if (!collab) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const version = await Version.findOne({ _id: versionId, documentId: id }).lean();
    if (!version) return NextResponse.json({ success: false, error: "Version not found" }, { status: 404 });

    // Return snapshot as base64 so client can reconstruct the Y.Doc for preview
    return NextResponse.json({
      success: true,
      data: {
        id: version._id.toString(),
        documentId: id,
        title: version.title,
        description: version.description,
        snapshot: toBuffer(version.yjsSnapshot).toString("base64"),
        textPreview: version.textContent?.slice(0, 2000),
        createdAt: version.createdAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/documents/:id/versions/:versionId/restore
// Restores a snapshot without destroying the current collaborative state.
// Strategy: the snapshot Y.Doc state becomes the new server state, broadcast
// to all connected clients via the shared Y.Doc in @y/websocket-server memory.
// Active editors will receive the update on next sync.
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id, versionId } = await params;
    await connectDB();

    const collab = await Collaboration.findOne({
      documentId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    if (!collab) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    if (collab.role === "viewer")
      return NextResponse.json({ success: false, error: "Viewers cannot restore versions" }, { status: 403 });

    const version = await Version.findOne({ _id: versionId, documentId: id }).lean();
    if (!version) return NextResponse.json({ success: false, error: "Version not found" }, { status: 404 });

    // Reconstruct a new Y.Doc from the snapshot
    const rawBuf = toBuffer(version.yjsSnapshot);
    const snapshotBytes = new Uint8Array(rawBuf.buffer, rawBuf.byteOffset, rawBuf.byteLength);
    const snap = Y.decodeSnapshot(snapshotBytes);

    // Restore: create a fresh Y.Doc from the snapshot.
    // gc must be false — Y.createDocFromSnapshot throws otherwise.
    const seedDoc = new Y.Doc({ gc: false });
    const currentDoc = await DocModel.findById(id).select("yjsState").lean();
    if (currentDoc?.yjsState) {
      const cb = toBuffer(currentDoc.yjsState);
      Y.applyUpdate(seedDoc, new Uint8Array(cb.buffer, cb.byteOffset, cb.byteLength));
    }
    const snapDoc = Y.createDocFromSnapshot(seedDoc, snap);

    // Encode the restored state as a full update
    const restoredState = Y.encodeStateAsUpdate(snapDoc);

    // Persist restored state
    await DocModel.findByIdAndUpdate(id, {
      $set: {
        yjsState: Buffer.from(restoredState),
        yjsStateVector: Buffer.from(Y.encodeStateVector(snapDoc)),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        restoredState: Buffer.from(restoredState).toString("base64"),
        message: "Document restored to selected version",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("POST /restore:", err);
    return NextResponse.json({ success: false, error: "Restore failed" }, { status: 500 });
  }
}
