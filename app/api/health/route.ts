import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return NextResponse.json({ ok: false, error: "MONGODB_URI not set" }, { status: 500 });
  }

  const uriMasked = uri.replace(/:([^@]+)@/, ":****@");

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    await conn.disconnect();
    return NextResponse.json({ ok: true, uri: uriMasked });
  } catch (err) {
    const e = err as Error & { code?: string; reason?: unknown };
    return NextResponse.json(
      {
        ok: false,
        uri: uriMasked,
        errorType: e?.constructor?.name,
        errorMessage: e?.message,
        errorCode: e?.code,
        errorReason: JSON.stringify(e?.reason)?.substring(0, 800),
      },
      { status: 500 }
    );
  }
}
