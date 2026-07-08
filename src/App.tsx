import { useRef, useState } from 'react'
import {
  exportToJson,
  importFromJson,
  type CosmosData,
} from '@core'
import { useStore } from './store'
import { downloadText } from './download'
import { CoursesScreen } from './screens/CoursesScreen'

type Screen = 'courses'

// Pending-import UI state. On a successful parse we hold the validated data and
// show a replace-confirm (AC8.1/8.2). On failure we show the reason and NEVER
// touch the store (AC8.3).
type Pending =
  | { kind: 'confirm'; data: CosmosData }
  | { kind: 'error'; reason: string }
  | null

function counts(d: CosmosData) {
  return `${d.courses.length} courses, ${d.engines.length} engines, ${d.testSessions.length} sessions, ${d.leaks.length} leaks, ${d.mockRuns.length} mock runs, ${d.mockDrills.length} drills`
}

export default function App() {
  const store = useStore()
  const [screen] = useState<Screen>('courses')
  const [pending, setPending] = useState<Pending>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const s = store.state
  if (s.status === 'blocked') {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-5">
          <h1 className="text-lg font-bold text-rose-800">Can’t load your data</h1>
          <p className="mt-2 text-sm text-rose-700">{s.reason}</p>
          <p className="mt-2 text-sm text-rose-700">
            Your stored data was left untouched. Export it before doing anything
            else, then you can inspect or restore it.
          </p>
          <button
            onClick={() => downloadText('engine-study-blocked.json', s.raw)}
            className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
          >
            Export my data
          </button>
        </div>
      </div>
    )
  }

  const data = s.data

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    const text = await file.text()
    const res = importFromJson(text)
    setPending(res.ok ? { kind: 'confirm', data: res.data } : { kind: 'error', reason: res.reason })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold">⚙️ Engine Study</h1>
          <span className="text-sm text-slate-500">v1</span>
        </div>
        <div className="flex gap-2">
          <button
            data-testid="export-btn"
            onClick={() => downloadText('engine-study-export.json', exportToJson(data))}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export
          </button>
          <button
            data-testid="import-btn"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onPickFile}
          />
        </div>
      </header>

      {pending?.kind === 'error' && (
        <div data-testid="import-error" className="mb-6 rounded-lg border border-rose-300 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-800">Import blocked</p>
          <p className="mt-1 text-sm text-rose-700">{pending.reason}</p>
          <p className="mt-1 text-xs text-rose-600">Your current data was not changed.</p>
          <button
            onClick={() => setPending(null)}
            className="mt-3 rounded-md bg-rose-700 px-3 py-1.5 text-sm text-white hover:bg-rose-600"
          >
            Dismiss
          </button>
        </div>
      )}

      {pending?.kind === 'confirm' && (
        <div data-testid="import-confirm" className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Replace all current data?</p>
          <p className="mt-1 text-sm text-amber-800">
            Current: {counts(data)}.
          </p>
          <p className="text-sm text-amber-800">
            Imported: {counts(pending.data)}.
          </p>
          <p className="mt-1 text-xs text-amber-700">
            This replaces everything above. Export first if you want a backup.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              data-testid="import-confirm-btn"
              onClick={() => {
                store.commit(pending.data)
                setPending(null)
              }}
              className="rounded-md bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-600"
            >
              Replace
            </button>
            <button
              onClick={() => setPending(null)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {screen === 'courses' && <CoursesScreen store={store} />}
    </div>
  )
}
