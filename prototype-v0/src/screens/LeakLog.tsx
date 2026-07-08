import { useMemo, useState } from 'react'
import type { Store } from '../store'
import type { LeakType } from '../types'
import { LEAK_TYPES } from '../types'
import { LeakTypeBadge, formatDate } from '../ui'

interface Props {
  store: Store
}

export function LeakLog({ store }: Props) {
  const { data } = store
  const [typeFilter, setTypeFilter] = useState<LeakType | 'ALL'>('ALL')
  const [engineFilter, setEngineFilter] = useState<string | 'ALL'>('ALL')

  const engineTitle = (id: string) =>
    data.engines.find((e) => e.id === id)?.title ?? '(deleted engine)'

  const counts = useMemo(() => {
    const c: Record<LeakType, number> = {
      GATE_SKIP: 0,
      WRONG_TOOL: 0,
      PRECISION: 0,
    }
    for (const l of data.leaks) c[l.type]++
    return c
  }, [data.leaks])

  const filtered = data.leaks.filter(
    (l) =>
      (typeFilter === 'ALL' || l.type === typeFilter) &&
      (engineFilter === 'ALL' || l.engineId === engineFilter),
  )

  const selectCls =
    'rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500'

  return (
    <div className="space-y-4">
      {/* Counts */}
      <section className="grid grid-cols-3 gap-3">
        {LEAK_TYPES.map((t) => (
          <div
            key={t}
            className="rounded-lg border border-slate-200 bg-white p-3 text-center"
          >
            <div className="text-2xl font-bold">{counts[t]}</div>
            <div className="mt-1">
              <LeakTypeBadge type={t} />
            </div>
          </div>
        ))}
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <span className="text-sm font-medium text-slate-600">Filter:</span>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as LeakType | 'ALL')}
          className={selectCls}
        >
          <option value="ALL">All types</option>
          {LEAK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={engineFilter}
          onChange={(e) => setEngineFilter(e.target.value)}
          className={selectCls}
        >
          <option value="ALL">All engines</option>
          {data.engines.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-slate-400">
          {filtered.length} leak{filtered.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">
            No leaks logged{data.leaks.length > 0 ? ' for this filter' : ' yet'}.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-semibold">When</th>
                <th className="px-4 py-2 font-semibold">Engine</th>
                <th className="px-4 py-2 font-semibold">Type</th>
                <th className="px-4 py-2 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                    {formatDate(l.createdAt)}
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {engineTitle(l.engineId)}
                  </td>
                  <td className="px-4 py-2">
                    <LeakTypeBadge type={l.type} />
                  </td>
                  <td className="px-4 py-2 text-slate-800">{l.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
