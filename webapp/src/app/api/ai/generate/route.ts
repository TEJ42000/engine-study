/**
 * POST /api/ai/generate
 *
 * AI engine generation from course source material (COSMOS_V1_SPEC §4.1).
 * Model: Sonnet 4.6 — structured, quality-sensitive, infrequent (~10/user lifetime).
 * Rate limit: 10 calls/day per user.
 *
 * Body: { courseId: string, courseName: string, source: string, examProfile: ExamProfile, existingTitles: string[] }
 * Response: { engines: EngineDraft[] }
 *
 * Generated engines are always SHAKY/UNTESTED — friction principle.
 * They open in the editor as drafts; nothing enters the store unreviewed.
 */
import { auth } from "@/lib/auth";
import { getAiUsage, incrementAiUsage } from "@/lib/db";
import { oneShot, MODELS } from "@/lib/ai";
import type { ExamProfile } from "@/core/types";

const DAILY_GENERATE_LIMIT = 10;

// Minimal draft type — id/maturity fields are added by the editor.
interface EngineDraft {
  title: string;
  engineType: "DOCTRINAL" | "ANSWER_STRUCTURE";
  gate: string;
  steps: string[];
  trigger: string;
  satellites: string[];
  stacking: boolean;
  confidence: number; // 0-100: extraction quality
}

function buildSystem(courseName: string, examProfile: ExamProfile, existingTitles: string[]): string {
  const siblings = existingTitles.length > 0
    ? `EXISTING ENGINES IN "${courseName}" (AVOID DUPLICATES):\n${existingTitles.map(t => `- ${t}`).join("\n")}\n`
    : '';

  return `You are an expert legal educator and engine extractor. Your job is to convert raw law notes into COSMOS engines — structured recall tools for exam answering.

COURSE: ${courseName}
EXAM PROFILE:
- Open book: ${examProfile.openBook}
- Grading style: ${examProfile.appliedVsMemorization}
- Path graded (sequence = marks): ${examProfile.pathGraded}

${siblings}
EXTRACTION RULES — follow precisely:
1. Title: name the SITUATION as an exam task ("Does GDPR apply?", "Assess liability under Rylands v Fletcher"). Never include article numbers.
2. Gate: one yes/no question that guards against choosing this engine wrongly. Must be answerable from the fact pattern alone.
3. Steps: 5–9 items, in EXECUTION order (the order you'd write the answer). Each = one action or legal check. If a list item has >4 sub-points, move them to satellites or split into a child engine.
4. Precision targets: wrap exact terms, figures, and deadlines in {{double braces}} inside the step text. Example: "Notice must be served within {{14 days}}".
5. Trigger: the fact-pattern cue that signals "use this engine now". One sentence.
6. Satellites: verbatim qualifiers, case names with their pivot (e.g. "Donoghue v Stevenson — duty to ultimate consumer"), statutes, thresholds.
7. engineType: DOCTRINAL (a legal test or doctrine) or ANSWER_STRUCTURE (a generic answer pattern like IRAC).
8. stacking: true only if this engine is typically combined with others in a single answer.
9. If source material is insufficient to produce a complete engine, SKIP it — do not pad.

OUTPUT: a valid JSON array only. No prose. No markdown fences. No extra fields.
[
  {
    "title": "...",
    "engineType": "DOCTRINAL",
    "gate": "...",
    "steps": ["step 1", "step 2 with {{precision target}}"],
    "trigger": "...",
    "satellites": ["Case v Case — pivot", "{{exact threshold}}"],
    "stacking": false,
    "confidence": <integer 0-100>
  }
]`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  // XC-002: Body size limit (DoS vector).
  const contentLength = Number(req.headers.get("Content-Length") ?? 0);
  if (contentLength > 100000) return new Response("Payload too large", { status: 413 });

  // P1-003: Rate limit check (off-by-one fix).
  const currentUsage = await getAiUsage(session.user.id, "generate");
  if (currentUsage >= DAILY_GENERATE_LIMIT) {
    return new Response("Daily AI generation limit reached", { status: 429 });
  }

  const body = await req.json();
  const { courseId, courseName, source, examProfile, existingTitles } = body as {
    courseId: string;
    courseName: string;
    source: string;
    examProfile: ExamProfile;
    existingTitles: string[];
  };

  // XC-003: Basic runtime validation.
  if (!courseId || !courseName || !source || !examProfile || !existingTitles) {
    return new Response("Missing required fields", { status: 400 });
  }

  const system = buildSystem(courseName, examProfile, existingTitles);
  const prompt = `COURSE ID: ${courseId}\n\nSOURCE MATERIAL:\n${source.slice(0, 12000)}`;

  let raw: string;
  try {
    raw = await oneShot({
      modelId: MODELS.generation,
      system,
      prompt,
      maxTokens: 6000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("[AI generate] upstream error:", msg);
    return Response.json(
      { error: "AI service unavailable. Please try again later." },
      { status: 502 },
    );
  }

  // P1-004: Increment AFTER successful call.
  await incrementAiUsage(session.user.id, "generate");

  let drafts: EngineDraft[];
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      throw new Error("Response not an array");
    }
    // Validate each draft has required fields
    for (const draft of parsed) {
      if (!draft.title || !draft.gate || !Array.isArray(draft.steps) ||
          !draft.trigger || !Array.isArray(draft.satellites)) {
        throw new Error(`Invalid draft structure: missing required fields`);
      }
    }
    drafts = parsed as EngineDraft[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Parse failed';
    console.error('[AI generate] JSON parse error:', msg, raw.slice(0, 200));
    return Response.json({ drafts: [], raw }, { status: 200 });
  }

  return Response.json({ drafts });
}
