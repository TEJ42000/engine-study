/**
 * POST /api/ai/generate
 *
 * AI engine generation from course source material (COSMOS_V1_SPEC §4.1).
 * Model: Sonnet 4.6 — structured, quality-sensitive, infrequent (~10/user lifetime).
 * Rate limit: 10 calls/day per user.
 *
 * Body: { courseId: string, source: string, examProfile: ExamProfile }
 * Response: { engines: EngineDraft[] }
 *
 * Generated engines are always SHAKY/UNTESTED — friction principle.
 * They open in the editor as drafts; nothing enters the store unreviewed.
 */
import { auth } from "@/lib/auth";
import { incrementAiUsage } from "@/lib/db";
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
}

function buildSystem(examProfile: ExamProfile): string {
  const hints: string[] = [];
  if (examProfile.openBook) hints.push("open-book exam — emphasise navigation/lookup steps");
  if (examProfile.pathGraded) hints.push("path-graded — sequence order is marks");
  if (examProfile.appliedVsMemorization === "APPLIED") hints.push("applied exam — decision-execution order matters most");

  return `You are an expert legal educator. Convert the course material into engines using the extraction rules below.

EXAM PROFILE HINTS: ${hints.join("; ") || "balanced recall"}

EXTRACTION RULES (from EXTRACTION.md):
- Title: name the SITUATION or TASK as an exam question ("Does the GDPR apply?"). Never put article numbers in the title.
- Gate: the go/no-go question that stops you choosing this engine wrongly.
- Steps: 5–9, in the order you would EXECUTE them in an exam answer (not taxonomy order). Each step = one action or check. Lists >4 items become satellites or a separate engine.
- Trigger: the fact-pattern cue that says "run this engine now".
- Satellites: exact verbatim qualifiers, case holdings (name + pivot), numbers, deadlines.
- Mark precision targets inline: {{exact figure or term}}.
- Propose engineType: DOCTRINAL or ANSWER_STRUCTURE.

OUTPUT: valid JSON array of engine objects. No prose outside the array.
[{"title":"...","engineType":"DOCTRINAL","gate":"...","steps":["..."],"trigger":"...","satellites":["..."],"stacking":false}, ...]`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const count = await incrementAiUsage(session.user.id, "generate");
  if (count > DAILY_GENERATE_LIMIT) {
    return new Response("Daily AI generation limit reached", { status: 429 });
  }

  const { courseId, source, examProfile } = (await req.json()) as {
    courseId: string;
    source: string;
    examProfile: ExamProfile;
  };

  const system = buildSystem(examProfile);
  const prompt = `COURSE ID: ${courseId}\n\nSOURCE MATERIAL:\n${source.slice(0, 12000)}`;

  const raw = await oneShot({
    modelId: MODELS.generation,
    system,
    prompt,
    maxTokens: 4000,
  });

  let drafts: EngineDraft[];
  try {
    drafts = JSON.parse(raw);
    if (!Array.isArray(drafts)) throw new Error("not an array");
  } catch {
    return Response.json({ drafts: [], raw }, { status: 200 });
  }

  return Response.json({ drafts });
}
