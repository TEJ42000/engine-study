import { useState } from 'react'
import { useStore } from './store'
import { Dashboard } from './screens/Dashboard'
import { EngineEditor } from './screens/EngineEditor'
import { TestRunner } from './screens/TestRunner'
import { LeakLog } from './screens/LeakLog'

type Tab = 'dashboard' | 'editor' | 'test' | 'leaks'

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'editor', label: 'Engine Editor' },
  { key: 'test', label: 'Test Runner' },
  { key: 'leaks', label: 'Leak Log' },
]

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('dashboard')
  // engine id being edited / tested, passed between screens
  const [editingId, setEditingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  const openEditor = (engineId: string | null) => {
    setEditingId(engineId)
    setTab('editor')
  }
  const openTest = (engineId: string | null) => {
    setTestingId(engineId)
    setTab('test')
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-slate-200 bg-slate-50/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">⚙️ Engine Study</h1>
          <nav className="ml-auto flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {tab === 'dashboard' && (
        <Dashboard store={store} onEdit={openEditor} onTest={openTest} />
      )}
      {tab === 'editor' && (
        <EngineEditor
          store={store}
          editingId={editingId}
          onDone={() => setTab('dashboard')}
        />
      )}
      {tab === 'test' && (
        <TestRunner store={store} presetEngineId={testingId} />
      )}
      {tab === 'leaks' && <LeakLog store={store} />}
    </div>
  )
}
