import { auth } from "@/lib/auth";
import { oneShot, MODELS } from "@/lib/ai";
import { incrementAiUsage, getAiUsage } from "@/lib/db";

const DAILY_EXTRACT_LIMIT = 10;

export const maxDuration = 60;

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    // Dynamic import; CJS module may land as default or as the module itself
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfMod = await import("pdf-parse") as any;
    const pdfParse: (b: Buffer) => Promise<{ text: string }> =
      pdfMod.default ?? pdfMod;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text fallback
  return buffer.toString("utf-8");
}

const SYSTEM = `You are an academic course analyser. Given raw text from a university syllabus or course document, extract structured course metadata as JSON.

Return ONLY valid JSON with this exact shape:
{
  "courseName": "string — full official course name",
  "openBook": true | false,
  "appliedVsMemorization": "MEMORIZATION" | "APPLIED" | "MIXED",
  "pathGraded": true | false,
  "modes": ["string", ...],
  "sourceExcerpt": "string — the most useful 3000-character excerpt of the document for engine generation (definitions, key rules, legal tests)"
}

Rules:
- courseName: extract from the document header or title, never invent one.
- openBook: true if the exam is explicitly open-book or allows materials.
- appliedVsMemorization: APPLIED if exam tests case analysis / routing / application of rules; MEMORIZATION if it tests pure recall; MIXED if both.
- pathGraded: true if the exam awards marks for reasoning steps / structure, not just the final answer.
- modes: array of short exam-mode strings extracted from the document (e.g. "open-book case analysis"). Empty array if none mentioned.
- sourceExcerpt: pick the richest substantive section — course objectives, key topics, legal tests, definitions. Avoid admin boilerplate.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const used = await getAiUsage(session.user.id, "generate");
  if (used >= DAILY_EXTRACT_LIMIT) {
    return Response.json({ error: "Daily AI quota reached. Try again tomorrow." }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File too large (max 10 MB)." }, { status: 400 });
  }

  let rawText: string;
  try {
    rawText = await extractText(file);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to read file";
    console.error("[AI extract] text extraction error:", msg);
    return Response.json({ error: "Could not read file. Try a PDF, DOCX, or TXT." }, { status: 422 });
  }

  const truncated = rawText.slice(0, 15000);

  let raw: string;
  try {
    raw = await oneShot({
      modelId: MODELS.generation,
      system: SYSTEM,
      prompt: `DOCUMENT TEXT:\n${truncated}`,
      maxTokens: 1500,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("[AI extract] upstream error:", msg);
    return Response.json({ error: "AI service unavailable. Please try again." }, { status: 502 });
  }

  await incrementAiUsage(session.user.id, "generate");

  let parsed: unknown;
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[AI extract] JSON parse error; raw:", raw.slice(0, 300));
    return Response.json({ error: "AI returned unexpected format. Try again." }, { status: 500 });
  }

  return Response.json(parsed);
}
