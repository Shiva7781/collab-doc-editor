import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";
import DocModel from "@/lib/db/models/Document";
import Collaboration from "@/lib/db/models/Collaboration";

const RegisterSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(6).max(72),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword });

    // Create a welcome document for the new user
    const welcomeDoc = await DocModel.create({
      title: "My First Document",
      ownerId: user._id,
    });
    await Collaboration.create({
      documentId: welcomeDoc._id,
      userId: user._id,
      role: "owner",
      invitedBy: user._id,
    });

    return NextResponse.json(
      {
        success: true,
        data: { id: user._id.toString(), name: user.name, email: user.email },
      },
      { status: 201 }
    );
  } catch (err) {
    const e = err as Error & { code?: string; reason?: unknown };
    console.error("Register error name:", e?.constructor?.name);
    console.error("Register error message:", e?.message);
    console.error("Register error code:", e?.code);
    console.error("Register error reason:", JSON.stringify(e?.reason)?.substring(0, 500));
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
