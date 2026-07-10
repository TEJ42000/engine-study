/** Reusable badge for engine type, maturity axes, etc. */
export type BadgeVariant =
  | "doctrinal"
  | "answer-structure"
  | "untested"
  | "fragile"
  | "reliable"
  | "shaky"
  | "solid"
  | "committed"
  | "guarded"
  | "neutral";

const VARIANTS: Record<BadgeVariant, string> = {
  doctrinal: "bg-blue-100 text-blue-800",
  "answer-structure": "bg-purple-100 text-purple-800",
  untested: "bg-zinc-100 text-zinc-600",
  fragile: "bg-amber-100 text-amber-800",
  reliable: "bg-green-100 text-green-800",
  shaky: "bg-orange-100 text-orange-700",
  solid: "bg-emerald-100 text-emerald-800",
  committed: "bg-red-100 text-red-700",
  guarded: "bg-yellow-100 text-yellow-700",
  neutral: "bg-zinc-100 text-zinc-700",
};

export function Badge({
  variant,
  children,
}: {
  variant: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
