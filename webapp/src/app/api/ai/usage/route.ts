import { auth } from "@/lib/auth";
import { getAiUsage } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const mark = await getAiUsage(session.user.id, "mark");
  const generate = await getAiUsage(session.user.id, "generate");

  return Response.json({
    mark: { used: mark, limit: 40 },
    generate: { used: generate, limit: 10 },
  });
}
