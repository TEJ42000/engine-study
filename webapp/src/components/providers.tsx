"use client";
// Root provider — SessionProvider + ToastProvider.
// StoreProvider lives inside the (app) route group layout (auth-gated), so it
// never runs on the unauthenticated landing page and never fires a 401 fetch.
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
