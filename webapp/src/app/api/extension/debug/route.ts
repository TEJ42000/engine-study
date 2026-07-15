import { decode } from "next-auth/jwt";

/**
 * Debug endpoint — call with X-Session-Token header, returns what we decoded.
 * DELETE THIS FILE before production launch.
 */
export async function GET(req: Request) {
  const raw = req.headers.get("X-Session-Token");
  if (!raw) return Response.json({ error: "No X-Session-Token header" });

  const cookieName = "__Secure-authjs.session-token";

  try {
    const decoded = await decode({
      token: raw,
      secret: process.env.AUTH_SECRET!,
      salt: cookieName,
    });
    return Response.json({ ok: true, sub: decoded?.sub, decoded });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message });
  }
}
