/**
 * GET  /api/data  — load the authenticated user's CosmosData
 * PUT  /api/data  — replace the authenticated user's CosmosData
 *
 * The client store calls these on mount (load) and after every mutation (save).
 * Middleware guarantees the session exists before these handlers run.
 */
import { auth } from "@/lib/auth";
import { loadUserData, saveUserData } from "@/lib/db";
import { buildEnvelope, parseEnvelope } from "@/core/persistence";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, fresh } = await loadUserData(session.user.id);
  return Response.json({ envelope: buildEnvelope(data), fresh });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Re-use the v1-core version gate: reject unknown schemaVersions.
  const raw = JSON.stringify(body);
  const parsed = parseEnvelope(raw);
  if (!parsed.ok) {
    return new Response(`Bad envelope: ${parsed.reason}`, { status: 422 });
  }

  await saveUserData(
    session.user.id,
    session.user.email ?? "",
    parsed.data
  );

  return Response.json({ ok: true });
}
