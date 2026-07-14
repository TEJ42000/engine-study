/**
 * POST /api/ai/mark
 *
 * Zero-flattery AI recall marking (COSMOS_V1_SPEC §4.2).
 * Model: Haiku 4.5 — small rubric task; cheap and fast.
 * Rate limit: 40 calls/day per user (generous for exam prep; raises cost alarm).
 *
 * Body: { engine: Engine, gateAttempt: string, attempt: string }
 * Response: { score: number, feedback: MarkingFeedback }
 */
import { auth } from "@/lib/auth";
import { incrementAiUsage } from "@/lib/db";
import { oneShot, MODELS } from "@/lib/ai";
import type { Engine } from "@/core/types";

const DAILY_MARK_LIMIT = 40;

interface MarkingFeedback {
  score: number;          // 0–10
  correct: string[];      // 2–4 bullets
  missing: string[];      // 2–4 bullets
  structureNote: string;  // answered directly? named authority? stopped when done?
  keyToAdd: string;       // one thing to add next time
}

function buildSystem(engine: Engine): string {
  return `You are a strict law examiner. Mark against the engine below using Boolean evaluation. Zero flattery.

ENGINE:
Title: ${engine.title}
Gate: ${engine.gate}
Steps:
${engine.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
Trigger: ${engine.trigger}
Satellites:
${engine.satellites.map((s) => `  - ${s}`).join("\n")}

EVALUATION PROTOCOL:
1. GATE-SKIP CHECK: Did the student answer the gate question BEFORE reciting steps? If they skipped directly to steps or conclusions → automatic FAIL (score 0–4). This is non-negotiable.
2. STEP SEQUENCE: Mark each step TRUE/FALSE. Missing or added steps → FAIL (score 0–4). Step order matters.
3. PRECISION TARGETS: Terms inside {{ }} must match exactly. Near-misses reduce score significantly.
4. SUBSTANCE vs WORDING: If a step's substance is preserved despite wording changes → TRUE. Pure paraphrase without loss → TRUE.
5. SCORING: 0–10 integer. No rounding up. No partial credit for gate-skips or sequence errors.

FEEDBACK CONSTRAINTS:
- "correct": 2–4 bullets listing what they got right (specific step references)
- "missing": 2–4 bullets listing gaps or errors (specific)
- "structureNote": one sentence on their answer structure (did they follow gate → steps → satellites?)
- "keyToAdd": one actionable improvement for next attempt

OUTPUT (strict JSON, no prose):
{
  "score": <integer 0-10>,
  "correct": ["<bullet>", ...],
  "missing": ["<bullet>", ...],
  "structureNote": "<sentence>",
  "keyToAdd": "<sentence>"
}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  // Rate limit check.
  const count = await incrementAiUsage(session.user.id, "mark");
  if (count > DAILY_MARK_LIMIT) {
    return new Response("Daily AI marking limit reached", { status: 429 });
  }

  const { engine, gateAttempt, attempt } = (await req.json()) as {
    engine: Engine;
    gateAttempt: string;
    attempt: string;
  };

  const system = buildSystem(engine);
  const prompt = `GATE ATTEMPT:\n${gateAttempt}\n\nFULL RECALL:\n${attempt}`;

  const raw = await oneShot({
    modelId: MODELS.marking,
    system,
    prompt,
    maxTokens: 600,
  });

  let feedback: MarkingFeedback;
  try {
    const parsed = JSON.parse(raw);
    // Validate structure
    if (typeof parsed.score !== 'number' ||
        !Array.isArray(parsed.correct) ||
        !Array.isArray(parsed.missing) ||
        typeof parsed.structureNote !== 'string' ||
        typeof parsed.keyToAdd !== 'string') {
      throw new Error('Invalid feedback structure');
    }
    feedback = parsed as MarkingFeedback;
  } catch (err) {
    // Fallback: return raw text so the UI can still display it.
    const msg = err instanceof Error ? err.message : 'Parse failed';
    console.error('[AI mark] JSON parse error:', msg, raw.slice(0, 200));
    return Response.json({ score: null, raw }, { status: 200 });
  }

  return Response.json({ score: feedback.score, feedback });
}
