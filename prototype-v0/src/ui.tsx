import type { Maturity, LeakType } from './types'

const MATURITY_STYLES: Record<Maturity, string> = {
  DRAFTED: 'bg-slate-200 text-slate-700',
  TESTED: 'bg-amber-200 text-amber-900',
  STABLE: 'bg-sky-200 text-sky-900',
  REFLEX: 'bg-emerald-200 text-emerald-900',
}

export function MaturityBadge({ maturity }: { maturity: Maturity }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${MATURITY_STYLES[maturity]}`}
    >
      {maturity}
    </span>
  )
}

const LEAK_STYLES: Record<LeakType, string> = {
  GATE_SKIP: 'bg-rose-100 text-rose-800',
  WRONG_TOOL: 'bg-violet-100 text-violet-800',
  PRECISION: 'bg-orange-100 text-orange-800',
}

export function LeakTypeBadge({ type }: { type: LeakType }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${LEAK_STYLES[type]}`}
    >
      {type.replace('_', ' ')}
    </span>
  )
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'never'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
