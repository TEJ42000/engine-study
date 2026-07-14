import { auth } from "@/lib/auth";
import { loadUserData } from "@/lib/db";
import { studyNext } from "@/core/selectors";
import { oneShot, MODELS } from "@/lib/ai";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { data } = await loadUserData(session.user.id);
  const next = studyNext(data.engines, data.mockRuns);
  const atRisk = next.filter(e => e.comprehension === 'SHAKY' || e.retrievalReliability === 'FRAGILE').slice(0, 5);

  if (atRisk.length === 0) {
    return Response.json({ brief: "No at-risk engines today. Keep up the great work!" });
  }

  const studyList = atRisk.map(e => `- ${e.title} (${e.comprehension}/${e.retrievalReliability})`).join("\n");
  
  const prompt = `Analyze these study engines and provide a daily focus brief:
${studyList}

Recommend one concrete drill and keep it under 100 words.`;

  let brief: string;
  try {
    brief = await oneShot({
      modelId: MODELS.marking,
      system: "You are the Cosmos Study Coach. Direct, educational, focused on precision.",
      prompt
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    console.error("[AI brief] upstream error:", msg);
    return Response.json({ brief: "Daily brief unavailable right now." }, { status: 200 });
  }

  return Response.json({ brief });
}
