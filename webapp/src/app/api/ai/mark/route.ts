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
  return `You are a strict law examiner with zero flattery. Mark the student's recall of the engine below.

ENGINE:
Title: ${engine.title}
Gate: ${engine.gate}
Steps:
${engine.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
Trigger: ${engine.trigger}
Satellites:
${engine.satellites.map((s) => `  - ${s}`).join("\n")}

MARKING RULES (mandatory):
1. If the student skipped the gate or lost/added a whole step → FAIL (score 0–4).
2. Wording slips that preserve the substance → pass the step.
3. Precision terms inside {{ }} must be exact; near-misses reduce score.
4. Score 0–10. Be honest; do not round up.

OUTPUT FORMAT (strict JSON, no prose outside it):
{
  "score": <integer 0-10>,
  "correct": ["<bullet>", ...],
  "missing": ["<bullet>", ...],
  "structureNote": "<one sentence on answer structure>",
  "keyToAdd": "<one sentence>"
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
    feedback = JSON.parse(raw);
  } catch {
    // Fallback: return raw text so the UI can still display it.
    return Response.json({ score: null, raw }, { status: 200 });
  }

  return Response.json({ score: feedback.score, feedback });
}
