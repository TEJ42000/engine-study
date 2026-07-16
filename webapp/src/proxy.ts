import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const ALLOWED_ORIGINS = [
  "https://tnl-we7lpbg22l5bo-engine-study-dev.augmentusercontent.com",
  "https://webapp-theta-beige.vercel.app",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Extension-Token, X-Session-Token",
};

function isAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || origin.startsWith("chrome-extension://");
}

function addCors(response: NextResponse, origin: string): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", origin);
  for (const [k, v] of Object.entries(CORS_HEADERS)) response.headers.set(k, v);
  return response;
}

// Auth-wrapped handler for non-OPTIONS requests — adds CORS to outgoing responses.
// Auth.js v5 provides request.auth; extension routes bypass auth (handled in-route).
const withAuth = auth((request: NextRequest & { auth: any }) => {
  const origin = request.headers.get("origin") ?? "";
  const response = NextResponse.next();
  if (isAllowed(origin)) addCors(response, origin);
  return response;
});

/**
 * Next.js 16 Proxy
 *
 * OPTIONS preflight is handled here — BEFORE the auth() wrapper — so that
 * cross-origin preflights are never intercepted by Auth.js and redirected to
 * the sign-in page (which would strip the CORS headers).
 */
export async function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";

  if (request.method === "OPTIONS") {
    if (isAllowed(origin)) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          ...CORS_HEADERS,
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    return new NextResponse(null, { status: 204 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (withAuth as any)(request);
}

export const config = {
  matcher: [
    // Auth-protected app routes
    "/dashboard/:path*",
    "/courses/:path*",
    "/engines/:path*",
    "/leaks/:path*",
    "/mocks/:path*",
    "/data/:path*",
    // CORS + Auth-protected API routes
    "/api/data/:path*",
    "/api/ai/:path*",
    "/api/extension/:path*",
  ],
};
