import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import DocModel from "@/lib/db/models/Document";
import Collaboration from "@/lib/db/models/Collaboration";
import User from "@/lib/db/models/User";
import { requireSession } from "@/lib/auth/session";
import { UpdateDocumentSchema } from "@/lib/validations/sync";
import mongoose from "mongoose";

type Params = { params: Promise<{ id: string }> };

async function getAccess(docId: string, userId: string) {
  const collab = await Collaboration.findOne({
    documentId: new mongoose.Types.ObjectId(docId),
    userId: new mongoose.Types.ObjectId(userId),
  });
  return collab?.role ?? null;
}

// GET /api/documents/:id
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await connectDB();

    const role = await getAccess(id, session.user.id);
    if (!role) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const doc = await DocModel.findById(id).lean();
    if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const owner = await User.findById(doc.ownerId).select("name").lean();
    const collabCount = await Collaboration.countDocuments({ documentId: doc._id });

    return NextResponse.json({
      success: true,
      data: {
        id: doc._id.toString(),
        title: doc.title,
        ownerId: doc.ownerId.toString(),
        ownerName: owner?.name ?? "Unknown",
        myRole: role,
        collaboratorCount: collabCount,
        wordCount: doc.wordCount ?? 0,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/documents/:id — update title / word count
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await connectDB();

    const role = await getAccess(id, session.user.id);
    if (!role || role === "viewer") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = UpdateDocumentSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    const updated = await DocModel.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, lean: true }
    );
    if (!updated) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: { id: updated._id.toString(), title: updated.title } });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/documents/:id — only owner can delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await connectDB();

    const role = await getAccess(id, session.user.id);
    if (role !== "owner") {
      return NextResponse.json({ success: false, error: "Only the owner can delete this document" }, { status: 403 });
    }

    await DocModel.findByIdAndDelete(id);
    await Collaboration.deleteMany({ documentId: new mongoose.Types.ObjectId(id) });

    return NextResponse.json({ success: true, message: "Document deleted" });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
