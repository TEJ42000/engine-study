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
  if (examProfile.openBook) hints.push("open-book: emphasize lookup/navigation steps");
  if (examProfile.pathGraded) hints.push("path-graded: step sequence = marks");
  if (examProfile.appliedVsMemorization === "APPLIED") hints.push("applied: execution order > taxonomy order");

  return `Extract exam engines from course material. Follow the rules exactly.

EXAM PROFILE: ${hints.join("; ") || "balanced recall"}

EXTRACTION RULES:
1. TITLE: Name the situation/task as an exam question ("Does the GDPR apply?", "Is consent valid?"). NEVER include article numbers, legal sources, or answer content — title stays visible during recall.

2. GATE: The wrong-tool test. A go/no-go question that stops you before wasting time ("Is data leaving the EU? If not, transfer regime doesn't apply"). Not a summary of step 1.

3. STEPS (5–9, ordered by EXECUTION not taxonomy):
   - Course materials present taxonomies (definitions, categories). You must impose exam decision order: identify → classify → check exceptions → edge cases → conclude.
   - Each step = one action or one check.
   - Lists >4 items → pull into satellites or split into separate engine.
   - Final step must be explicit conclusion/output.
   - Cases referenced only when the case IS the decision point.

4. TRIGGER: Fact-pattern cue that says "run this NOW" + relative sequencing hint ("run BEFORE lawfulness discussion").

5. SATELLITES (2–5): Exact verbatim qualifiers, case holdings (name + pivot point), numbers, deadlines, Latin terms. Phrase as close to source as possible ("PURELY PERSONAL and household" — the qualifier IS the answer).

6. PRECISION TARGETS: Mark exact terms inline with {{curly braces}} — numbers, Latin, specific legal terms that flip outcomes.

7. ENGINE TYPE: Propose DOCTRINAL (legal rules/tests) or ANSWER_STRUCTURE (exam technique/framing).

OUTPUT: JSON array only. No prose before or after.
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
    const parsed = JSON.parse(raw);
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
