import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import DocModel from "@/lib/db/models/Document";
import Version from "@/lib/db/models/Version";
import Collaboration from "@/lib/db/models/Collaboration";
import User from "@/lib/db/models/User";
import { requireSession } from "@/lib/auth/session";
import { CreateVersionSchema } from "@/lib/validations/sync";
import * as Y from "yjs";
import mongoose from "mongoose";
import { toBuffer } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// GET /api/documents/:id/versions
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

    const versions = await Version.find({ documentId: id })
      .sort({ createdAt: -1 })
      .select("-yjsSnapshot")
      .lean();

    // Batch-fetch creator names
    const creatorIds = [...new Set(versions.map((v) => v.createdBy.toString()))];
    const creators = await User.find({ _id: { $in: creatorIds } }).select("name").lean();
    const creatorMap = new Map(creators.map((c) => [c._id.toString(), c.name]));

    return NextResponse.json({
      success: true,
      data: versions.map((v) => ({
        id: v._id.toString(),
        documentId: v.documentId.toString(),
        title: v.title,
        description: v.description,
        createdBy: v.createdBy.toString(),
        createdByName: creatorMap.get(v.createdBy.toString()) ?? "Unknown",
        createdAt: v.createdAt.toISOString(),
        snapshotSize: v.snapshotSize,
        preview: v.textContent?.slice(0, 200),
      })),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/documents/:id/versions — capture a snapshot
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await connectDB();

    const collab = await Collaboration.findOne({
      documentId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    if (!collab) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    if (collab.role === "viewer")
      return NextResponse.json({ success: false, error: "Viewers cannot create versions" }, { status: 403 });

    const body = await req.json();
    const parsed = CreateVersionSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    // Load current server Y.js state to snapshot
    const doc = await DocModel.findById(id).select("yjsState").lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    let snapshotBytes: Uint8Array;
    let textContent = "";

    {
      const ydoc = new Y.Doc();
      if (doc.yjsState) {
        const sb = toBuffer(doc.yjsState);
        Y.applyUpdate(ydoc, new Uint8Array(sb.buffer, sb.byteOffset, sb.byteLength));
      }
      // Y.js snapshot encodes only the current clock state, not the full update log
      const snapshot = Y.snapshot(ydoc);
      snapshotBytes = Y.encodeSnapshot(snapshot);
      // Extract plain text for preview
      try {
        const content = ydoc.get("default", Y.XmlFragment);
        textContent = content.toString().slice(0, 50000);
      } catch {
        textContent = "";
      }
    }

    const version = await Version.create({
      documentId: new mongoose.Types.ObjectId(id),
      title: parsed.data.title,
      description: parsed.data.description,
      yjsSnapshot: Buffer.from(snapshotBytes),
      textContent,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
      snapshotSize: snapshotBytes.length,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: version._id.toString(),
          documentId: id,
          title: version.title,
          description: version.description,
          createdBy: session.user.id,
          createdByName: session.user.name,
          createdAt: version.createdAt.toISOString(),
          snapshotSize: version.snapshotSize,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("POST /versions:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
