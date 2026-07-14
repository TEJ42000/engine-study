// Protect app routes (all pages that live in the (app) route group render at
// their real URL — the group folder name is never part of the URL in Next.js).
// Unauthenticated requests are redirected to the sign-in page (/).
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth OAuth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - root (/) (landing page)
     */
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|$).*)",
  ],
};
