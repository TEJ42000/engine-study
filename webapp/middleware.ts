// Protect app routes (all pages that live in the (app) route group render at
// their real URL — the group folder name is never part of the URL in Next.js).
// Unauthenticated requests are redirected to the sign-in page (/).
//
// [P1-008] Security: Explicit allowlist matcher (positive pattern) to prevent
// accidental bypass. This protects all authenticated routes while explicitly
// allowing the known public surfaces.
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Protect all app routes (everything under (app) route group):
    "/dashboard/:path*",
    "/courses/:path*",
    "/engines/:path*",
    "/leaks/:path*",
    "/mocks/:path*",
    "/data/:path*",
    // Protect all API routes except /api/auth/…:
    "/api/data/:path*",
    "/api/ai/:path*",
  ],
};
