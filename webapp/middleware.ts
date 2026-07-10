// Protect app routes (all pages that live in the (app) route group render at
// their real URL — the group folder name is never part of the URL in Next.js).
// Unauthenticated requests are redirected to the sign-in page (/).
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Protect every route except:
    //   /            — landing / sign-in page (must stay public)
    //   /_next/…     — Next.js internals
    //   /favicon.ico — static asset
    //   /api/auth/…  — NextAuth OAuth callbacks (must stay public)
    "/((?!$|_next/|favicon\\.ico|api/auth).*)",
  ],
};
