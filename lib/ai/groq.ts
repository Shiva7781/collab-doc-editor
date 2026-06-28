import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MAX_INPUT_CHARS = 8000;

export async function aiComplete(content: string, prompt: string): Promise<string> {
  const truncated = content.slice(-MAX_INPUT_CHARS);
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are a writing assistant embedded in a collaborative document editor. " +
          "Continue the text naturally, matching the author's tone, style, and context. " +
          "Return ONLY the continuation text — no explanations, no preamble.",
      },
      {
        role: "user",
        content: `Document content so far:\n\n${truncated}\n\nUser instruction: ${prompt || "Continue writing naturally."}`,
      },
    ],
    max_tokens: 512,
    temperature: 0.7,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function aiSummarize(content: string): Promise<string> {
  const truncated = content.slice(0, MAX_INPUT_CHARS);
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are a document summarizer. Create a concise, well-structured summary. " +
          "Use bullet points for key insights. Keep it under 200 words.",
      },
      {
        role: "user",
        content: `Summarize this document:\n\n${truncated}`,
      },
    ],
    max_tokens: 400,
    temperature: 0.3,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function aiGrammarCheck(content: string): Promise<string> {
  const truncated = content.slice(0, MAX_INPUT_CHARS);
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are a grammar and style editor. Fix grammar, spelling, punctuation, and clarity issues. " +
          "Return ONLY the corrected text, preserving the original structure and meaning.",
      },
      {
        role: "user",
        content: `Correct this text:\n\n${truncated}`,
      },
    ],
    max_tokens: 1024,
    temperature: 0.1,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function aiRewrite(content: string, tone: string = "professional"): Promise<string> {
  const truncated = content.slice(0, MAX_INPUT_CHARS);
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a writing assistant. Rewrite the provided text in a ${tone} tone. Return ONLY the rewritten text.`,
      },
      { role: "user", content: truncated },
    ],
    max_tokens: 1024,
    temperature: 0.5,
  });
  return response.choices[0]?.message?.content ?? "";
}
