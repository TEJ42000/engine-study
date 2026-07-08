import { useStore } from './store'
import { downloadText } from './download'

// Step 1 shell. Proves the store loads on start and survives refresh, and that
// an unknown schemaVersion is surfaced (never wiped). Feature screens (F1–F8)
// mount into the content area in later steps.
export default function App() {
  const { state } = useStore()

  if (state.status === 'blocked') {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-5">
          <h1 className="text-lg font-bold text-rose-800">Can’t load your data</h1>
          <p className="mt-2 text-sm text-rose-700">{state.reason}</p>
          <p className="mt-2 text-sm text-rose-700">
            Your stored data was left untouched. Export it before doing anything
            else, then you can inspect or restore it.
          </p>
          <button
            onClick={() => downloadText('engine-study-blocked.json', state.raw)}
            className="mt-4 rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
          >
            Export my data
          </button>
        </div>
      </div>
    )
  }

  const d = state.data
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-baseline gap-2">
        <h1 className="text-2xl font-bold">⚙️ Engine Study</h1>
        <span className="text-sm text-slate-500">v1</span>
      </header>
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p className="mb-2 font-semibold text-slate-700">
          Store loaded — localStorage key <code>cosmos-v1</code>
        </p>
        <ul className="grid grid-cols-2 gap-1 text-slate-600 sm:grid-cols-3">
          <li>courses: {d.courses.length}</li>
          <li>engines: {d.engines.length}</li>
          <li>testSessions: {d.testSessions.length}</li>
          <li>leaks: {d.leaks.length}</li>
          <li>mockRuns: {d.mockRuns.length}</li>
          <li>mockDrills: {d.mockDrills.length}</li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Shell only — feature screens land next.
        </p>
      </div>
    </div>
  )
}
