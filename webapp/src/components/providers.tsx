"use client";
// Root provider — SessionProvider only.
// StoreProvider lives inside the (app) route group layout (auth-gated), so it
// never runs on the unauthenticated landing page and never fires a 401 fetch.
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
