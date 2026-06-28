import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import Collaboration from "@/lib/db/models/Collaboration";
import User from "@/lib/db/models/User";
import { requireSession } from "@/lib/auth/session";
import { AddCollaboratorSchema, UpdateCollaboratorRoleSchema } from "@/lib/validations/sync";
import mongoose from "mongoose";

type Params = { params: Promise<{ id: string }> };

// GET /api/documents/:id/collaborators
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await connectDB();

    const myCollab = await Collaboration.findOne({
      documentId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    if (!myCollab) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const collabs = await Collaboration.find({ documentId: new mongoose.Types.ObjectId(id) }).lean();
    const userIds = collabs.map((c) => c.userId);
    const users = await User.find({ _id: { $in: userIds } }).select("name email avatar").lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return NextResponse.json({
      success: true,
      data: collabs.map((c) => {
        const u = userMap.get(c.userId.toString());
        return {
          userId: c.userId.toString(),
          name: u?.name ?? "Unknown",
          email: u?.email ?? "",
          avatar: u?.avatar ?? null,
          role: c.role,
          joinedAt: c.createdAt.toISOString(),
        };
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/documents/:id/collaborators — invite by email
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await connectDB();

    const myCollab = await Collaboration.findOne({
      documentId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    if (!myCollab || myCollab.role !== "owner")
      return NextResponse.json({ success: false, error: "Only owners can invite collaborators" }, { status: 403 });

    const body = await req.json();
    const parsed = AddCollaboratorSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    const invitedUser = await User.findOne({ email: parsed.data.email.toLowerCase() }).lean();
    if (!invitedUser)
      return NextResponse.json({ success: false, error: "User not found with that email" }, { status: 404 });

    const existing = await Collaboration.findOne({
      documentId: new mongoose.Types.ObjectId(id),
      userId: invitedUser._id,
    });
    if (existing)
      return NextResponse.json({ success: false, error: "User is already a collaborator" }, { status: 409 });

    await Collaboration.create({
      documentId: new mongoose.Types.ObjectId(id),
      userId: invitedUser._id,
      role: parsed.data.role,
      invitedBy: new mongoose.Types.ObjectId(session.user.id),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: invitedUser._id.toString(),
          name: invitedUser.name,
          email: invitedUser.email,
          role: parsed.data.role,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/documents/:id/collaborators?userId=xxx
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const targetUserId = req.nextUrl.searchParams.get("userId");
    if (!targetUserId)
      return NextResponse.json({ success: false, error: "userId query param required" }, { status: 400 });

    await connectDB();

    const myCollab = await Collaboration.findOne({
      documentId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    if (!myCollab || myCollab.role !== "owner")
      return NextResponse.json({ success: false, error: "Only owners can update roles" }, { status: 403 });

    const body = await req.json();
    const parsed = UpdateCollaboratorRoleSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    const updated = await Collaboration.findOneAndUpdate(
      { documentId: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(targetUserId) },
      { $set: { role: parsed.data.role } },
      { new: true }
    );
    if (!updated) return NextResponse.json({ success: false, error: "Collaborator not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: { userId: targetUserId, role: updated.role } });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/documents/:id/collaborators?userId=xxx
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const targetUserId = req.nextUrl.searchParams.get("userId");
    if (!targetUserId)
      return NextResponse.json({ success: false, error: "userId query param required" }, { status: 400 });

    await connectDB();

    const myCollab = await Collaboration.findOne({
      documentId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id),
    });
    if (!myCollab || myCollab.role !== "owner")
      return NextResponse.json({ success: false, error: "Only owners can remove collaborators" }, { status: 403 });

    const target = await Collaboration.findOne({
      documentId: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(targetUserId),
    });
    if (!target) return NextResponse.json({ success: false, error: "Collaborator not found" }, { status: 404 });
    if (target.role === "owner")
      return NextResponse.json({ success: false, error: "Cannot remove the document owner" }, { status: 400 });

    await Collaboration.deleteOne({ _id: target._id });
    return NextResponse.json({ success: true, message: "Collaborator removed" });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
