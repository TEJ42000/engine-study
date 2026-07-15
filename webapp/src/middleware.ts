import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  "https://tnl-we7lpbg22l5bo-engine-study-dev.augmentusercontent.com",
  "https://webapp-theta-beige.vercel.app",
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isAllowed =
    origin &&
    (ALLOWED_ORIGINS.includes(origin) || origin.startsWith("chrome-extension://"));

  if (request.method === "OPTIONS") {
    if (isAllowed) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin!,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    return new NextResponse(null, { status: 204 });
  }

  const response = NextResponse.next();

  if (isAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin!);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
