import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  "https://tnl-we7lpbg22l5bo-engine-study-dev.augmentusercontent.com",
  "https://webapp-theta-beige.vercel.app",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Extension-Token, X-Session-Token",
};

function addCors(response: NextResponse, origin: string) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  for (const [k, v] of Object.entries(CORS_HEADERS)) response.headers.set(k, v);
  return response;
}

// Combine Auth.js middleware with custom CORS logic for Next.js 16 Proxy
export const proxy = auth((request: NextRequest & { auth: any }) => {
  const origin = request.headers.get("origin") ?? "";
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) || origin.startsWith("chrome-extension://");
  const pathname = request.nextUrl.pathname;

  // Extension API routes — always allow through (auth handled inside the route)
  const isExtensionRoute = pathname.startsWith("/api/extension/");

  // Handle CORS Preflight (OPTIONS)
  if (request.method === "OPTIONS") {
    if (isAllowed) {
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

  // Let extension routes through without auth redirect
  if (isExtensionRoute) {
    const response = NextResponse.next();
    if (isAllowed) addCors(response, origin);
    return response;
  }

  const response = NextResponse.next();
  if (isAllowed) addCors(response, origin);
  return response;
});

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
