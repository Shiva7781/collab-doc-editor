import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import DocModel from "@/lib/db/models/Document";
import Collaboration from "@/lib/db/models/Collaboration";
import User from "@/lib/db/models/User";
import { requireSession } from "@/lib/auth/session";
import { CreateDocumentSchema } from "@/lib/validations/sync";
import mongoose from "mongoose";

// GET /api/documents — list all documents accessible by the current user
export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Get all collaboration entries for this user
    const collabs = await Collaboration.find({ userId }).lean();
    const docIds = collabs.map((c) => c.documentId);

    const documents = await DocModel.find({ _id: { $in: docIds } })
      .sort({ updatedAt: -1 })
      .lean();

    // Attach role and owner info
    const collabMap = new Map(collabs.map((c) => [c.documentId.toString(), c.role]));

    // Fetch owner names in batch
    const ownerIds = [...new Set(documents.map((d) => d.ownerId.toString()))];
    const owners = await User.find({ _id: { $in: ownerIds } }).select("name").lean();
    const ownerMap = new Map(owners.map((o) => [o._id.toString(), o.name]));

    // Count collaborators per document
    const collabCounts = await Collaboration.aggregate([
      { $match: { documentId: { $in: docIds } } },
      { $group: { _id: "$documentId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(collabCounts.map((c) => [c._id.toString(), c.count]));

    const result = documents.map((doc) => ({
      id: doc._id.toString(),
      title: doc.title,
      ownerId: doc.ownerId.toString(),
      ownerName: ownerMap.get(doc.ownerId.toString()) ?? "Unknown",
      myRole: collabMap.get(doc._id.toString()) ?? "viewer",
      collaboratorCount: countMap.get(doc._id.toString()) ?? 1,
      wordCount: doc.wordCount ?? 0,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/documents:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/documents — create a new document
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await connectDB();

    const body = await req.json();
    const parsed = CreateDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const doc = await DocModel.create({ title: parsed.data.title, ownerId: userId });
    await Collaboration.create({
      documentId: doc._id,
      userId,
      role: "owner",
      invitedBy: userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: doc._id.toString(),
          title: doc.title,
          ownerId: userId.toString(),
          ownerName: session.user.name,
          myRole: "owner",
          collaboratorCount: 1,
          wordCount: 0,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/documents:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
