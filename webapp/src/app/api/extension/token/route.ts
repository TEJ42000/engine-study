import { auth } from "@/lib/auth";
import { upsertExtensionToken } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const token = await upsertExtensionToken(session.user.id);
  return Response.json({ token });
}
