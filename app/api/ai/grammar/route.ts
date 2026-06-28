import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { aiGrammarCheck, aiRewrite } from "@/lib/ai/groq";
import { z } from "zod";

const Schema = z.object({
  content: z.string().min(1).max(8000),
  documentId: z.string().min(1),
  mode: z.enum(["grammar", "rewrite"]).default("grammar"),
  tone: z.string().max(50).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });

    const result =
      parsed.data.mode === "rewrite"
        ? await aiRewrite(parsed.data.content, parsed.data.tone)
        : await aiGrammarCheck(parsed.data.content);

    return NextResponse.json({ success: true, data: { result } });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: false, error: "AI service unavailable" }, { status: 503 });
  }
}
