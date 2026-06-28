import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { aiSummarize } from "@/lib/ai/groq";
import { z } from "zod";

const Schema = z.object({
  content: z.string().min(10).max(8000),
  documentId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    const result = await aiSummarize(parsed.data.content);
    return NextResponse.json({ success: true, data: { result } });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: "AI service unavailable" }, { status: 503 });
  }
}
