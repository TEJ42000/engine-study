import { useEffect, useState } from 'react'
import type { Store } from '../store'
import { uid } from '../store'
import type { Engine, LeakType } from '../types'
import { LEAK_TYPES, nextMaturity } from '../types'
import { LeakTypeBadge, MaturityBadge } from '../ui'

interface Props {
  store: Store
  presetEngineId: string | null
}

type Phase = 'recall' | 'result'
type Result = 'PASS' | 'FAIL'

export function TestRunner({ store, presetEngineId }: Props) {
  const { data, saveEngine, addLeak } = store

  const [engineId, setEngineId] = useState<string>(
    presetEngineId ?? data.engines[0]?.id ?? '',
  )
  const [phase, setPhase] = useState<Phase>('recall')
  const [result, setResult] = useState<Result | null>(null)
  const [advancedTo, setAdvancedTo] = useState<string | null>(null)
  const [recallText, setRecallText] = useState('')

  // leak form state
  const [showLeakForm, setShowLeakForm] = useState(false)
  const [leakDesc, setLeakDesc] = useState('')
  const [leakType, setLeakType] = useState<LeakType>('GATE_SKIP')
  const [savedLeak, setSavedLeak] = useState(false)

  const engine = data.engines.find((e) => e.id === engineId)

  // when the preset changes (navigated from dashboard), select it & reset
  useEffect(() => {
    if (presetEngineId) setEngineId(presetEngineId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetEngineId])

  // snap selection back to a real engine if the current one was deleted
  useEffect(() => {
    if (!data.engines.some((e) => e.id === engineId)) {
      setEngineId(data.engines[0]?.id ?? '')
    }
  }, [data.engines, engineId])

  // reset the run whenever the selected engine changes
  useEffect(() => {
    resetRun()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineId])

  function resetRun() {
    setPhase('recall')
    setResult(null)
    setAdvancedTo(null)
    setRecallText('')
    setShowLeakForm(false)
    setLeakDesc('')
    setLeakType('GATE_SKIP')
    setSavedLeak(false)
  }

  function record(r: Result) {
    if (!engine) return
    setResult(r)
    setPhase('result')
    if (r === 'PASS') {
      const next = nextMaturity(engine.maturity)
      const updated: Engine = {
        ...engine,
        maturity: next,
        lastTestedAt: new Date().toISOString(),
      }
      saveEngine(updated)
      setAdvancedTo(next === engine.maturity ? null : next)
    } else {
      // FAIL: no maturity change. Prompt a leak.
      setShowLeakForm(true)
    }
  }

  function saveLeak() {
    if (!engine || !leakDesc.trim()) return
    addLeak({
      id: uid(),
      engineId: engine.id,
      description: leakDesc.trim(),
      type: leakType,
      createdAt: new Date().toISOString(),
    })
    setSavedLeak(true)
    setShowLeakForm(false)
    setLeakDesc('')
  }

  if (data.engines.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600">
        No engines to test yet. Create one in the Engine Editor.
      </div>
    )
  }

  const courseName = (id: string) =>
    data.courses.find((c) => c.id === id)?.name ?? ''

  return (
    <div className="space-y-4">
      {/* Engine picker */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <span className="text-sm font-medium text-slate-600">Test engine:</span>
        <select
          value={engineId}
          onChange={(e) => setEngineId(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
        >
          {data.engines.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} — {courseName(e.courseId)} [{e.maturity}]
            </option>
          ))}
        </select>
        <button
          onClick={resetRun}
          className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Restart
        </button>
      </div>

      {engine && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xl font-bold">{engine.title}</h2>
            <MaturityBadge maturity={engine.maturity} />
            <span className="text-xs text-slate-400">
              {courseName(engine.courseId)}
            </span>
          </div>

          {/* PHASE 1: COLD RECALL — content hidden */}
          {phase === 'recall' && (
            <div className="space-y-5">
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-lg font-semibold text-slate-700">
                  🔒 Cold recall
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Recall this engine from memory — the gate, every step in order,
                  the trigger, and the satellites. Content stays hidden until you
                  record a result.
                </p>
              </div>
              <textarea
                value={recallText}
                onChange={(e) => setRecallText(e.target.value)}
                placeholder="Scratchpad — write your attempt here BEFORE revealing: gate, steps in order, trigger, satellites. Shown next to the answer after you record a result. Not saved."
                rows={8}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <p className="text-center text-xs text-slate-400">
                Convention: skipped the gate, or lost/added a whole step → FAIL.
                Wording slips → PASS, then log a PRECISION leak.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => record('PASS')}
                  className="rounded-md bg-emerald-600 px-8 py-3 text-base font-semibold text-white hover:bg-emerald-500"
                >
                  ✓ PASS
                </button>
                <button
                  onClick={() => record('FAIL')}
                  className="rounded-md bg-rose-600 px-8 py-3 text-base font-semibold text-white hover:bg-rose-500"
                >
                  ✗ FAIL
                </button>
              </div>
            </div>
          )}

          {/* PHASE 2: RESULT + REVEAL */}
          {phase === 'result' && (
            <div className="space-y-5">
              {/* Result banner */}
              {result === 'PASS' ? (
                <div className="rounded-md bg-emerald-50 p-4 text-emerald-800">
                  <p className="font-semibold">✓ Passed.</p>
                  {advancedTo ? (
                    <p className="text-sm">
                      Maturity advanced to <strong>{advancedTo}</strong>.
                    </p>
                  ) : (
                    <p className="text-sm">
                      Already at max maturity (REFLEX) — kept there. Last-tested
                      updated.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-md bg-rose-50 p-4 text-rose-800">
                  <p className="font-semibold">✗ Failed.</p>
                  <p className="text-sm">
                    Maturity unchanged ({engine.maturity}). Log the leak below.
                  </p>
                </div>
              )}

              {/* Leak form (shown on FAIL, or when user opts in on PASS) */}
              {showLeakForm && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    Log a leak
                  </h3>
                  <div className="space-y-2">
                    <textarea
                      value={leakDesc}
                      onChange={(e) => setLeakDesc(e.target.value)}
                      placeholder="What went wrong? e.g. Forgot to check the discriminant sign."
                      rows={2}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={leakType}
                        onChange={(e) =>
                          setLeakType(e.target.value as LeakType)
                        }
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
                      >
                        {LEAK_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={saveLeak}
                        disabled={!leakDesc.trim()}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
                      >
                        Save leak
                      </button>
                      {result === 'PASS' && (
                        <button
                          onClick={() => setShowLeakForm(false)}
                          className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
                        >
                          Skip
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {savedLeak && (
                <div className="rounded-md bg-slate-100 p-2 text-center text-sm text-slate-600">
                  Leak logged. See it in the Leak Log.
                </div>
              )}

              {/* Offer to log a leak on PASS */}
              {result === 'PASS' && !showLeakForm && !savedLeak && (
                <button
                  onClick={() => setShowLeakForm(true)}
                  className="text-sm font-medium text-slate-500 underline hover:text-slate-700"
                >
                  + Log a leak anyway
                </button>
              )}

              {/* The user's attempt, for side-by-side self-check */}
              {recallText.trim() !== '' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Your attempt
                  </h3>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">
                    {recallText}
                  </pre>
                </div>
              )}

              {/* REVEAL — full engine content, for self-check */}
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Check yourself
                </h3>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="font-semibold text-slate-600">Gate</dt>
                    <dd className="text-slate-800">
                      {engine.gate || <em className="text-slate-400">—</em>}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">Steps</dt>
                    <dd>
                      {engine.steps.length ? (
                        <ol className="ml-5 list-decimal space-y-1 text-slate-800">
                          {engine.steps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      ) : (
                        <em className="text-slate-400">—</em>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">Trigger</dt>
                    <dd className="text-slate-800">
                      {engine.trigger || <em className="text-slate-400">—</em>}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">Satellites</dt>
                    <dd>
                      {engine.satellites.length ? (
                        <ul className="ml-5 list-disc space-y-1 text-slate-800">
                          {engine.satellites.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      ) : (
                        <em className="text-slate-400">—</em>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={resetRun}
                  className="rounded-md bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Test again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
