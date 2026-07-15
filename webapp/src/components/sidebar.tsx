"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import type { Session } from "next-auth";
import { SyncStatus } from "./sync-status";

import { useStore } from "@/lib/store";

const NAV = [
  { href: "/dashboard", icon: "◈", label: "Dashboard" },
  { href: "/leaks",     icon: "⚑", label: "Leaks" },
  { href: "/mocks",     icon: "⏱", label: "Mocks" },
  { href: "/data",      icon: "⬡", label: "Data" },
];

export function Sidebar({ session }: { session: Session }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isPro } = useStore();

  return (
    <aside
      className={`flex flex-col shrink-0 border-r border-zinc-200 bg-white transition-all duration-200 ${
        collapsed ? "w-14" : "w-52"
      }`}
    >
      {/* Brand + collapse toggle */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-zinc-100">
        {!collapsed && (
          <Link href="/dashboard" className="text-sm font-bold tracking-tight text-zinc-900 truncate">
            Engine Study
          </Link>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto rounded-md p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <span className="text-base leading-none shrink-0">{icon}</span>
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer — user + sync + sign out */}
      <div className="border-t border-zinc-100 p-3 space-y-3">
        <SyncStatus collapsed={collapsed} />
        {!collapsed && (
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-zinc-400 truncate max-w-[120px]">
              {session.user?.email}
            </p>
            {isPro && (
              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 rounded uppercase tracking-tighter">Pro</span>
            )}
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          title="Sign out"
          className={`flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <span className="text-base leading-none">↪</span>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
