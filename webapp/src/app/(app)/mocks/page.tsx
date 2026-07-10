"use client";
/**
 * F6 — Mock log + drill list (AC6.4).
 * Shows all mock runs per course, and the drill list:
 * engines with undrilled misses, most-recent mock first.
 * "Mark drilled" is an explicit user action — a passing session never clears it (AC6.4).
 */
import Link from "next/link";
import { useStore } from "@/lib/store";
import { drillList } from "@/core/selectors";
import { Badge } from "@/components/badge";

export default function MockLogPage() {
  const { data, markMissDrilled } = useStore();

  const drill = drillList(data.engines, data.mockRuns);

  function engineName(id: string) { return data.engines.find((e) => e.id === id)?.title ?? id; }
  function courseName(id: string) { return data.courses.find((c) => c.id === id)?.name ?? id; }

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Mock log</h1>
        <Link href="/mocks/new"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
          + Record mock run
        </Link>
      </div>

      {/* Drill list (AC6.4) */}
      {drill.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700">Drill list — undrilled misses</h2>
          <div className="space-y-2">
            {drill.map(({ engine, mostRecentMockAt, undrilledMissCount }) => {
              // Find the undrilled misses for this engine.
              const undrilledMisses = data.mockRuns.flatMap((run) =>
                run.misses
                  .filter((m) => m.engineId === engine.id && !m.drilled)
                  .map((m) => ({ ...m, runId: run.id, runLabel: run.label }))
              );

              return (
                <div key={engine.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{engine.title}</p>
                      <p className="text-xs text-zinc-500">{courseName(engine.courseId)} · Last mock: {mostRecentMockAt.slice(0, 10)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant={engine.retrievalReliability === "RELIABLE" ? "reliable" : engine.retrievalReliability === "FRAGILE" ? "fragile" : "untested"}>
                        {engine.retrievalReliability}
                      </Badge>
                      <Link href={`/engines/${engine.id}/test`}
                        className="ml-2 rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors">
                        Test now
                      </Link>
                    </div>
                  </div>

                  {undrilledMisses.map((m) => (
                    <div key={m.id} className="flex items-start justify-between rounded bg-white border border-amber-100 px-3 py-2 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-700">{m.description}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{m.runLabel} · <Badge variant={m.leakType === "GATE_SKIP" ? "committed" : "neutral"}>{m.leakType}</Badge></p>
                      </div>
                      <button
                        onClick={() => markMissDrilled(m.runId, m.id)}
                        className="shrink-0 rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 transition-colors"
                      >
                        Mark drilled
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* All mock runs */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700">All mock runs</h2>
        {data.mockRuns.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">No mock runs recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {[...data.mockRuns].reverse().map((run) => {
              const undrilledCount = run.misses.filter((m) => !m.drilled).length;
              return (
                <div key={run.id} className="rounded-lg border border-zinc-200 bg-white p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{run.label}</p>
                      <p className="text-xs text-zinc-500">{courseName(run.courseId)} · {run.takenAt.slice(0, 10)}</p>
                    </div>
                    <div className="text-xs text-zinc-400">{run.misses.length} miss{run.misses.length !== 1 ? "es" : ""} · {undrilledCount} undrilled</div>
                  </div>
                  {run.notes && <p className="text-xs text-zinc-500 italic">{run.notes}</p>}
                  {run.misses.length > 0 && (
                    <ul className="space-y-1">
                      {run.misses.map((m) => (
                        <li key={m.id} className="flex items-center gap-2 text-xs text-zinc-600">
                          <span className={m.drilled ? "line-through text-zinc-400" : ""}>{m.description}</span>
                          <Badge variant="neutral">{m.leakType}</Badge>
                          {m.engineId ? (
                            <span className="text-zinc-400">→ {engineName(m.engineId)}</span>
                          ) : (
                            <Link href={`/engines/new/edit?courseId=${run.courseId}&draft=${encodeURIComponent(m.description)}`}
                              className="text-blue-500 hover:text-blue-700 underline">
                              Create engine
                            </Link>
                          )}
                          {m.drilled && <span className="text-green-600">✓ drilled</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
