"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leaks", label: "Leaks" },
  { href: "/mocks", label: "Mocks" },
  { href: "/data", label: "Data" },
];

export function Nav({ session }: { session: Session }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Logo / brand */}
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight text-zinc-900">
          Engine Study
        </Link>

        {/* Primary navigation */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 hidden sm:block">
            {session.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
