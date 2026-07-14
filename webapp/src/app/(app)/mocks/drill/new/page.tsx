"use client";
/**
 * Timed Mock Drill — Setup (SPEC_TIMED_MOCK §3.1)
 * Select engines (cross-course default: most-due), configure time, create MockDrill.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { useStore } from "@/lib/store";
import type { Engine, MockDrill } from "@/core/types";

/** Pick the N engines that are most due (nulls first, then oldest lastTestedAt). */
function mostDue(engines: Engine[], n: number): Engine[] {
  return [...engines]
    .sort((a, b) => {
      if (!a.lastTestedAt && !b.lastTestedAt) return 0;
      if (!a.lastTestedAt) return -1;
      if (!b.lastTestedAt) return 1;
      return Date.parse(a.lastTestedAt) - Date.parse(b.lastTestedAt);
    })
    .slice(0, n);
}

/** Try to pick from ≥2 different courses; fall back to same-course if needed. */
function defaultPicks(engines: Engine[], count: number): Engine[] {
  if (engines.length <= count) return engines.slice();
  // Prefer cross-course: pick the most-due from each course, then fill.
  const byCourse = new Map<string, Engine[]>();
  for (const e of engines) {
    if (!byCourse.has(e.courseId)) byCourse.set(e.courseId, []);
    byCourse.get(e.courseId)!.push(e);
  }
  const candidates: Engine[] = [];
  for (const courseEngines of byCourse.values()) {
    candidates.push(mostDue(courseEngines, 1)[0]);
  }
  if (candidates.length >= count) return mostDue(candidates, count);
  return mostDue(engines, count);
}

export default function DrillNewPage() {
  const router = useRouter();
  const { data, addMockDrill } = useStore();

  const engines = data.engines;
  const [count, setCount] = useState(2);
  const [secs, setSecs] = useState(450);
  const [selected, setSelected] = useState<string[]>(() =>
    defaultPicks(engines, 2).map((e) => e.id),
  );

  const crossCourse =
    new Set(selected.map((id) => engines.find((e) => e.id === id)?.courseId).filter(Boolean))
      .size >= 2;

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= count) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  function handleCountChange(n: number) {
    setCount(n);
    setSelected(defaultPicks(engines, n).map((e) => e.id));
  }

  function handleStart() {
    if (selected.length < 2) return;
    const orderedEngines = selected
      .map((id) => engines.find((e) => e.id === id)!)
      .filter(Boolean);
    const drill: MockDrill = {
      id: uuid(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      status: "IN_PROGRESS",
      perQuestionSeconds: secs,
      items: orderedEngines.map((e) => ({
        engineId: e.id,
        courseId: e.courseId,
        attempt: "",
        elapsedSeconds: 0,
        timedOut: false,
        result: null,
        comprehensionAfter: null,
        testSessionId: null,
      })),
    };
    addMockDrill(drill);
    router.push(`/mocks/drill/${drill.id}`);
  }

  if (engines.length < 2) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center space-y-4">
        <p className="text-zinc-500 text-sm">You need at least 2 engines to run a timed drill.</p>
        <a href="/dashboard" className="text-sm text-zinc-600 underline">← Back to dashboard</a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-16">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900">Timed Mock Drill</h1>
        <p className="text-sm text-zinc-500">Exam-simulation: write cold, against the clock, then reveal and self-grade.</p>
      </div>

      {/* Config */}
      <div className="rounded-lg border border-zinc-200 bg-white p-5 space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">Questions</label>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button key={n} onClick={() => handleCountChange(n)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${count === n ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Time per question: <span className="font-mono text-zinc-900">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
            </label>
            <input type="range" min={120} max={900} step={30} value={secs} onChange={(e) => setSecs(+e.target.value)}
              className="w-full accent-zinc-900" />
            <div className="flex justify-between text-xs text-zinc-400"><span>2 min</span><span>15 min</span></div>
          </div>
        </div>
      </div>

      {/* Engine selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700">Select {count} engines</h2>
          {!crossCourse && selected.length >= 2 && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
              Same-course picks — context-switch benefit reduced
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {engines.map((engine) => {
            const course = data.courses.find((c) => c.id === engine.courseId);
            const isSelected = selected.includes(engine.id);
            const order = selected.indexOf(engine.id);
            return (
              <button key={engine.id} onClick={() => toggle(engine.id)}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${isSelected ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-bold ${isSelected ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"}`}>
                    {isSelected ? order + 1 : ""}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{engine.title}</p>
                    <p className="text-xs text-zinc-400">{course?.name ?? "Unknown course"} · {engine.retrievalReliability}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={handleStart} disabled={selected.length < 2}
        className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors">
        Start Drill →
      </button>
    </div>
  );
}
