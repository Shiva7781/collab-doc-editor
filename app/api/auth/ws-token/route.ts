import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { generateWsToken } from "@/lib/auth/session";

// Returns a short-lived JWT for WebSocket authentication.
// The client passes this as ?token= on the WS URL.
export async function GET() {
  try {
    const session = await requireSession();
    const token = await generateWsToken(
      session.user.id,
      session.user.name ?? "Anonymous",
      session.user.email ?? ""
    );
    return NextResponse.json({ success: true, data: { token } });
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}
