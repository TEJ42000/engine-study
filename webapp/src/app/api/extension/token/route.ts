import { auth } from "@/lib/auth";
import { decode } from "next-auth/jwt";
import { upsertExtensionToken } from "@/lib/db";

/**
 * Issues a 24h extension token for the logged-in user.
 *
 * Two auth paths:
 *  1. Normal same-origin request → auth() reads the session cookie.
 *  2. Chrome extension → sends the raw Auth.js session JWT in the
 *     `X-Session-Token` header (read from Chrome's cookie jar via
 *     chrome.cookies, which bypasses the SameSite=Lax restriction that
 *     otherwise stops the cookie being sent cross-origin).
 */
export async function GET(req: Request) {
  // Path 1 — same-origin session cookie
  const session = await auth();
  let userId = session?.user?.id ?? null;

  // Path 2 — raw JWT passed by the extension
  if (!userId) {
    const raw = req.headers.get("X-Session-Token");
    if (raw) {
      try {
        const decoded = await decode({
          token: raw,
          secret: process.env.AUTH_SECRET!,
          salt: "__Secure-authjs.session-token",
        });
        if (decoded?.sub) userId = decoded.sub;
      } catch {
        // fall through to unauthorized
      }
    }
  }

  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const token = await upsertExtensionToken(userId);
  return Response.json({ token });
}
