import { auth } from "@/lib/auth";
import { oneShot, MODELS } from "@/lib/ai";
import { incrementAiUsage, getAiUsage, getSubscription, validateExtensionToken } from "@/lib/db";
import JSZip from "jszip";

const DAILY_EXTRACT_LIMIT = 10;

export const maxDuration = 60;

/**
 * PPTX text extraction using jszip.
 * Scans ppt/slides/slide*.xml for <a:t> nodes.
 */
async function extractPptxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files).filter(name =>
    name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
  );

  // Sort slides numerically
  slideFiles.sort((a, b) => {
    const na = parseInt(a.match(/slide(\d+)\.xml/)?.[1] ?? "0");
    const nb = parseInt(b.match(/slide(\d+)\.xml/)?.[1] ?? "0");
    return na - nb;
  });

  let text = "";
  for (const slideFile of slideFiles) {
    const xml = await zip.file(slideFile)?.async("text");
    if (xml) {
      // Very simple extraction of <a:t>...</a:t> content
      const matches = xml.matchAll(/<a:t>(.*?)<\/a:t>/g);
      for (const match of matches) {
        text += match[1] + " ";
      }
      text += "\n";
    }
  }
  return text.trim();
}

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    const pdfMod = await import("pdf-parse") as any;
    const pdfParse = pdfMod.default ?? pdfMod;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    file.name.endsWith(".pptx")
  ) {
    return extractPptxText(buffer);
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return buffer.toString("utf-8");
}

const SYSTEM = `You are an academic course analyser. Given raw text from multiple university documents (syllabus, slides, readings), extract combined course metadata as JSON.

Return ONLY valid JSON with this exact shape:
{
  "courseName": "string — full official course name",
  "openBook": true | false,
  "appliedVsMemorization": "MEMORIZATION" | "APPLIED" | "MIXED",
  "pathGraded": true | false,
  "modes": ["string", ...],
  "sourceExcerpt": "string — the most useful 3000-character excerpt of the documents for engine generation (definitions, key rules, legal tests)"
}

Rules:
- courseName: extract from the document header or title.
- openBook: true if the exam is explicitly open-book or allows materials.
- appliedVsMemorization: APPLIED if exam tests application; MEMORIZATION if pure recall; MIXED if both.
- pathGraded: true if reasoning steps award marks.
- modes: array of exam-mode strings.
- sourceExcerpt: pick the richest substantive section.`;

export async function POST(req: Request) {
  const session = await auth();

  let userId = session?.user?.id ?? null;
  if (!userId) {
    const headerToken = req.headers.get("X-Extension-Token");
    if (headerToken) {
      userId = await validateExtensionToken(headerToken);
    }
  }

  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const used = await getAiUsage(userId, "generate");
  const sub = await getSubscription(userId);
  const isPro = sub?.status === "active";

  if (!isPro && used >= DAILY_EXTRACT_LIMIT) {
    return Response.json({ error: "Daily AI quota reached. Upgrade to Pro for unlimited usage." }, { status: 429 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  if (files.length === 0) {
    return Response.json({ error: "No files provided." }, { status: 400 });
  }

  let combinedText = "";
  for (const file of files) {
    try {
      const text = await extractText(file);
      combinedText += `--- FILE: ${file.name} ---\n${text}\n\n`;
    } catch (err) {
      console.error(`[Batch extract] failed for ${file.name}:`, err);
    }
  }

  const truncated = combinedText.slice(0, 25000); // Larger window for batch

  let raw: string;
  try {
    raw = await oneShot({
      modelId: MODELS.generation,
      system: SYSTEM,
      prompt: `COMBINED DOCUMENT TEXT:\n${truncated}`,
      maxTokens: 1500,
    });
  } catch (err) {
    return Response.json({ error: "AI service unavailable." }, { status: 502 });
  }

  await incrementAiUsage(userId, "generate");

  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return Response.json(parsed);
  } catch {
    return Response.json({ error: "Unexpected AI format." }, { status: 500 });
  }
}
