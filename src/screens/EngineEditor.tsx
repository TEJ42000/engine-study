import { useEffect, useState } from 'react'
import type { ClipboardEvent } from 'react'
import type { Store } from '../store'
import { uid } from '../store'
import type { Engine } from '../types'
import { MaturityBadge } from '../ui'

interface Props {
  store: Store
  editingId: string | null
  onDone: () => void
}

function blankEngine(courseId: string): Engine {
  return {
    id: uid(),
    courseId,
    title: '',
    gate: '',
    steps: [''],
    trigger: '',
    satellites: [''],
    maturity: 'DRAFTED',
    lastTestedAt: null,
  }
}

export function EngineEditor({ store, editingId, onDone }: Props) {
  const { data, saveEngine, deleteEngine } = store
  const existing = editingId
    ? data.engines.find((e) => e.id === editingId)
    : undefined

  const [engine, setEngine] = useState<Engine>(
    () => existing ?? blankEngine(data.courses[0]?.id ?? ''),
  )

  // if the target engine changes (navigating in), reset local state
  useEffect(() => {
    setEngine(existing ?? blankEngine(data.courses[0]?.id ?? ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId])

  const set = <K extends keyof Engine>(key: K, value: Engine[K]) =>
    setEngine((e) => ({ ...e, [key]: value }))

  // --- steps helpers ---
  const setStep = (i: number, v: string) =>
    setEngine((e) => ({ ...e, steps: e.steps.map((s, j) => (j === i ? v : s)) }))
  const addStep = () => setEngine((e) => ({ ...e, steps: [...e.steps, ''] }))
  const removeStep = (i: number) =>
    setEngine((e) => ({ ...e, steps: e.steps.filter((_, j) => j !== i) }))
  const moveStep = (i: number, dir: -1 | 1) =>
    setEngine((e) => {
      const j = i + dir
      if (j < 0 || j >= e.steps.length) return e
      const steps = [...e.steps]
      ;[steps[i], steps[j]] = [steps[j], steps[i]]
      return { ...e, steps }
    })

  // pasting multiple lines into a row splits them into separate entries
  // (leading "1." / "-" / "•" markers are stripped)
  const splitLines = (text: string) =>
    text
      .split('\n')
      .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim())
      .filter(Boolean)

  const pasteInto =
    (key: 'steps' | 'satellites', i: number) =>
    (ev: ClipboardEvent<HTMLInputElement>) => {
      const text = ev.clipboardData.getData('text')
      if (!text.includes('\n')) return
      ev.preventDefault()
      setEngine((e) => {
        const items = [...e[key]]
        items.splice(i, 1, ...splitLines(text))
        return { ...e, [key]: items }
      })
    }

  // --- satellites helpers ---
  const setSat = (i: number, v: string) =>
    setEngine((e) => ({
      ...e,
      satellites: e.satellites.map((s, j) => (j === i ? v : s)),
    }))
  const addSat = () =>
    setEngine((e) => ({ ...e, satellites: [...e.satellites, ''] }))
  const removeSat = (i: number) =>
    setEngine((e) => ({
      ...e,
      satellites: e.satellites.filter((_, j) => j !== i),
    }))

  const canSave = engine.title.trim() !== '' && engine.courseId !== ''

  const handleSave = () => {
    const cleaned: Engine = {
      ...engine,
      title: engine.title.trim(),
      steps: engine.steps.map((s) => s.trim()).filter(Boolean),
      satellites: engine.satellites.map((s) => s.trim()).filter(Boolean),
    }
    saveEngine(cleaned)
    onDone()
  }

  if (data.courses.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
        <p className="text-slate-600">
          You need a course before you can create an engine. Go to the Dashboard
          and add one.
        </p>
      </div>
    )
  }

  const inputCls =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500'

  return (
    <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">
          {existing ? 'Edit engine' : 'New engine'}
        </h2>
        <MaturityBadge maturity={engine.maturity} />
        {existing && (
          <button
            onClick={() => {
              if (confirm(`Delete engine "${existing.title}"?`)) {
                deleteEngine(existing.id)
                onDone()
              }
            }}
            className="ml-auto rounded-md bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            Delete
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            Title
          </span>
          <input
            value={engine.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Solve a quadratic by factoring"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            Course
          </span>
          <select
            value={engine.courseId}
            onChange={(e) => set('courseId', e.target.value)}
            className={inputCls}
          >
            {data.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600">
          Gate <span className="text-slate-400">(precondition to check first)</span>
        </span>
        <input
          value={engine.gate}
          onChange={(e) => set('gate', e.target.value)}
          placeholder="e.g. Is the equation actually quadratic (a ≠ 0)?"
          className={inputCls}
        />
      </label>

      {/* Steps */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">
            Steps (ordered){' '}
            <span className="font-normal text-slate-400">
              — paste multiple lines to split into steps
            </span>
          </span>
          <button
            onClick={addStep}
            className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            + Add step
          </button>
        </div>
        <ol className="space-y-2">
          {engine.steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-5 text-sm font-semibold text-slate-400">
                {i + 1}
              </span>
              <input
                value={s}
                onChange={(e) => setStep(i, e.target.value)}
                onPaste={pasteInto('steps', i)}
                placeholder={`Step ${i + 1}`}
                className={inputCls}
              />
              <button
                onClick={() => moveStep(i, -1)}
                disabled={i === 0}
                className="rounded px-1.5 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => moveStep(i, 1)}
                disabled={i === engine.steps.length - 1}
                className="rounded px-1.5 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                title="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => removeStep(i)}
                className="rounded px-1.5 py-1 text-rose-500 hover:bg-rose-50"
                title="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-600">
          Trigger <span className="text-slate-400">(the cue that says "use this engine")</span>
        </span>
        <input
          value={engine.trigger}
          onChange={(e) => set('trigger', e.target.value)}
          placeholder="e.g. See ax² + bx + c = 0"
          className={inputCls}
        />
      </label>

      {/* Satellites */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">
            Satellites <span className="text-slate-400">(related facts / edge cases)</span>
          </span>
          <button
            onClick={addSat}
            className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            + Add satellite
          </button>
        </div>
        <ul className="space-y-2">
          {engine.satellites.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-slate-400">•</span>
              <input
                value={s}
                onChange={(e) => setSat(i, e.target.value)}
                onPaste={pasteInto('satellites', i)}
                placeholder="e.g. If discriminant < 0, no real roots"
                className={inputCls}
              />
              <button
                onClick={() => removeSat(i)}
                className="rounded px-1.5 py-1 text-rose-500 hover:bg-rose-50"
                title="Remove"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          Save engine
        </button>
        <button
          onClick={onDone}
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
