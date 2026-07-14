/**
 * GET /api/ai/brief
 *
 * Zero-flattery daily study focus brief (COSMOS_V1_SPEC §4.3).
 * Model: Haiku 4.5 — short coaching output; cheap and fast.
 * Rate limit: shares the "mark" counter (same model tier, 40/day shared).
 *
 * Response: { brief: string } — one concrete drill, ≤60 words, no flattery.
 */
import { auth } from "@/lib/auth";
import { loadUserData, getAiUsage, incrementAiUsage } from "@/lib/db";
import { studyNext } from "@/core/selectors";
import { oneShot, MODELS } from "@/lib/ai";

// Brief shares the mark counter — same Haiku model tier, cheap.
const DAILY_BRIEF_LIMIT = 40;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  // Rate limit: share the mark counter (same model, same cost tier).
  const currentUsage = await getAiUsage(session.user.id, "mark");
  if (currentUsage >= DAILY_BRIEF_LIMIT) {
    return new Response("Daily AI limit reached", { status: 429 });
  }

  const { data } = await loadUserData(session.user.id);
  const next = studyNext(data.engines, data.mockRuns);
  const atRisk = next
    .filter(e => e.comprehension === 'SHAKY' || e.retrievalReliability === 'FRAGILE')
    .slice(0, 5);

  if (atRisk.length === 0) {
    return Response.json({ brief: "No at-risk engines today." });
  }

  const studyList = atRisk
    .map(e => `- ${e.title} (${e.comprehension}/${e.retrievalReliability})`)
    .join("\n");

  const system = `You are a strict law-exam coach. Zero flattery. Zero filler.
Given a list of at-risk study engines, identify the single weakest one and prescribe one concrete drill.
Format: one sentence naming the engine + one sentence naming the exact drill action. Under 60 words total.
Do NOT use phrases like "great job", "well done", or "keep it up".`;

  const prompt = `AT-RISK ENGINES:\n${studyList}\n\nPrescribe one drill.`;

  let brief: string;
  try {
    brief = await oneShot({
      modelId: MODELS.marking,
      system,
      prompt,
      maxTokens: 150,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("[AI brief] upstream error:", msg);
    return Response.json({ brief: "Daily brief unavailable. Try again later." }, { status: 200 });
  }

  // Increment AFTER successful call (mark counter — same tier).
  await incrementAiUsage(session.user.id, "mark");

  return Response.json({ brief });
}
