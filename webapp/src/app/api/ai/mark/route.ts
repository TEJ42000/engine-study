/**
 * POST /api/ai/mark
 *
 * Zero-flattery AI recall marking (COSMOS_V1_SPEC §4.2).
 * Model: Haiku 4.5 — small rubric task; cheap and fast.
 * Rate limit: 40 calls/day per user (generous for exam prep; raises cost alarm).
 *
 * Body: { engine: Engine, gateAttempt: string, attempt: string, course?: { name: string, examProfile: any } }
 * Response: { score: number, feedback: MarkingFeedback }
 */
import { auth } from "@/lib/auth";
import { getAiUsage, incrementAiUsage } from "@/lib/db";
import { oneShot, MODELS } from "@/lib/ai";
import type { Engine } from "@/core/types";

const DAILY_MARK_LIMIT = 40;

interface MarkingFeedback {
  score: number;          // 0–10
  confidence: number;     // 0-100
  correct: string[];      // 2–4 bullets
  missing: string[];      // 2–4 bullets
  structureNote: string;  // answered directly? named authority? stopped when done?
  keyToAdd: string;       // one thing to add next time
}

function buildSystem(engine: Engine, course?: { name: string, examProfile: any }): string {
  const context = course
    ? `COURSE CONTEXT: ${course.name} (${course.examProfile.openBook ? 'Open Book' : 'Closed Book'}, ${course.examProfile.appliedVsMemorization})\n`
    : '';

  return `You are a strict law-exam marker. You have ZERO tolerance for vagueness and give ZERO flattery.

${context}ENGINE BEING MARKED:
Title: ${engine.title}
Type: ${engine.engineType}
Gate: ${engine.gate}
Steps (execute in this order):
${engine.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
Trigger: ${engine.trigger}
Satellites (exact terms):
${engine.satellites.map((s) => `  - ${s}`).join("\n")}

MARKING RULES — apply every rule, no exceptions:
1. Gate first: if the student did not address the gate, score is 0–3 maximum.
2. Step order matters: out-of-order execution = structural deduction (−1 per swap).
3. {{precision target}} spans require the EXACT term/figure. Near-miss = −1 per occurrence.
4. Omitting a whole step = −1.5; adding a wholly invented step = −0.5.
5. Wording slips that preserve substance do NOT penalise.
6. Score is 0–10 (integer). Do NOT round up. Do NOT give 10 unless perfect.

RESPONSE — output ONLY this JSON, no markdown fences, no prose:
{
  "score": <integer 0–10>,
  "confidence": <integer 0-100: how certain are you that this mark is accurate?>,
  "correct": ["<what was right, max 4 bullets>"],
  "missing": ["<what was missing or wrong, max 4 bullets>"],
  "structureNote": "<one sentence: did they gate first? execute in order? stop cleanly?>",
  "keyToAdd": "<one sentence: the single most valuable thing to add next time>"
}
}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  // XC-002: Body size limit (DoS vector).
  const contentLength = Number(req.headers.get("Content-Length") ?? 0);
  if (contentLength > 50000) return new Response("Payload too large", { status: 413 });

  // P1-003: Rate limit check (off-by-one fix).
  const currentUsage = await getAiUsage(session.user.id, "mark");
  if (currentUsage >= DAILY_MARK_LIMIT) {
    return new Response("Daily AI marking limit reached", { status: 429 });
  }

  const body = await req.json();
  const { engine, gateAttempt, attempt, course } = body as {
    engine: Engine;
    gateAttempt: string;
    attempt: string;
    course?: { name: string, examProfile: any };
  };

  // XC-003: Basic runtime validation.
  if (!engine || !gateAttempt || !attempt) {
    return new Response("Missing required fields", { status: 400 });
  }

  const system = buildSystem(engine, course);
  const prompt = `GATE ATTEMPT:\n${gateAttempt}\n\nFULL RECALL:\n${attempt}`;

  let raw: string;
  try {
    raw = await oneShot({
      modelId: MODELS.marking,
      system,
      prompt,
      maxTokens: 800,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("[AI mark] upstream error:", msg);
    return Response.json(
      { error: "AI marking unavailable. Please try again later." },
      { status: 502 },
    );
  }

  // P1-004: Increment AFTER successful call.
  await incrementAiUsage(session.user.id, "mark");

  let feedback: MarkingFeedback;
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
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
