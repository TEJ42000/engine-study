"use client";
/**
 * Timed Mock Drill — Active drill + Reveal + Complete (SPEC_TIMED_MOCK §3.2–3.4)
 * Phases: DRILLING (per-question countdown) → REVEALED (side-by-side grade) → COMPLETED
 */
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { useStore } from "@/lib/store";
import type { Comprehension, LeakEntry, LeakType, MockDrill, MockDrillItem, Result, TestSession } from "@/core/types";

function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` }
function stripBraces(s: string) { return s.replace(/\{\{(.+?)\}\}/g, "$1") }

export default function DrillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = useStore();
  const drill = data.mockDrills.find((d) => d.id === id);
  if (!drill) return <p className="text-zinc-500 p-8 text-center">Drill not found.</p>;
  if (drill.status === "COMPLETED") return <CompletedView drill={drill} />;
  return <ActiveDrill drill={drill} />;
}

// ─── Active drill + reveal ────────────────────────────────────────────────────

function ActiveDrill({ drill }: { drill: MockDrill }) {
  const router = useRouter();
  const { data, updateMockDrill, recordSession, addLeak } = useStore();
  const [current, setCurrent] = useState(0);
  const [attempts, setAttempts] = useState<string[]>(() => drill.items.map((i) => i.attempt));
  const [elapsed, setElapsed] = useState<number[]>(() => drill.items.map((i) => i.elapsedSeconds));
  const [timedOut, setTimedOut] = useState<boolean[]>(() => drill.items.map((i) => i.timedOut));
  const [phase, setPhase] = useState<"DRILLING" | "REVEALED">(
    drill.status === "REVEALED" ? "REVEALED" : "DRILLING"
  );
  const [localAttempt, setLocalAttempt] = useState(attempts[current] || "");
  const startRef = useRef(Date.now() - elapsed[current] * 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tick, setTick] = useState(0);

  // Per-item grading state
  const [results, setResults] = useState<(Result | null)[]>(() => drill.items.map((i) => i.result));
  const [compreh, setCompreh] = useState<(Comprehension | null)[]>(() => drill.items.map(() => null));
  const [leakForms, setLeakForms] = useState<boolean[]>(() => drill.items.map(() => false));
  const [leakTypes, setLeakTypes] = useState<LeakType[]>(() => drill.items.map(() => "GATE_SKIP" as LeakType));
  const [leakDescs, setLeakDescs] = useState<string[]>(() => drill.items.map(() => ""));
  const [leakSaved, setLeakSaved] = useState<boolean[]>(() => drill.items.map(() => false));

  const remaining = drill.perQuestionSeconds - Math.floor((Date.now() - startRef.current) / 1000);

  // Countdown timer
  useEffect(() => {
    if (phase !== "DRILLING") return;
    timerRef.current = setInterval(() => {
      setTick((t) => t + 1);
      const r = drill.perQuestionSeconds - Math.floor((Date.now() - startRef.current) / 1000);
      if (r <= 0) { clearInterval(timerRef.current!); commitItem(true); }
    }, 250);
    return () => { if (timerRef.current) clearInterval(timerRef.current!); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current]);

  const persistItem = useCallback((idx: number, attempt: string, elSec: number, tOut: boolean) => {
    const nextItems: MockDrillItem[] = drill.items.map((item, i) =>
      i !== idx ? item : { ...item, attempt, elapsedSeconds: elSec, timedOut: tOut }
    );
    const isLast = idx === drill.items.length - 1;
    updateMockDrill({ ...drill, status: isLast ? "REVEALED" : "IN_PROGRESS", items: nextItems });
  }, [drill, updateMockDrill]);

  function commitItem(timeout = false) {
    if (timerRef.current) clearInterval(timerRef.current);
    const sec = Math.min(Math.floor((Date.now() - startRef.current) / 1000), drill.perQuestionSeconds);
    const newAttempts = attempts.map((a, i) => (i === current ? localAttempt : a));
    const newElapsed = elapsed.map((e, i) => (i === current ? sec : e));
    const newTimedOut = timedOut.map((t, i) => (i === current ? timeout : t));
    setAttempts(newAttempts);
    setElapsed(newElapsed);
    setTimedOut(newTimedOut);
    persistItem(current, localAttempt, sec, timeout);

    if (current < drill.items.length - 1) {
      const next = current + 1;
      setCurrent(next);
      setLocalAttempt(newAttempts[next] || "");
      startRef.current = Date.now();
    } else {
      setPhase("REVEALED");
    }
  }

  function handleGrade(idx: number, r: Result) {
    const newResults = results.map((v, i) => (i === idx ? r : v));
    setResults(newResults);
    const newForms = leakForms.map((v, i) => (i === idx ? r === "FAIL" : v));
    setLeakForms(newForms);

    // Create TestSession immediately on grade
    const engine = data.engines.find((e) => e.id === drill.items[idx].engineId);
    if (engine) {
      const now = new Date().toISOString();
      const sessionId = uuid();
      const session: TestSession = {
        id: sessionId,
        engineId: engine.id,
        mode: "TIMED_MOCK",
        gateAttempt: "",
        attempt: attempts[idx],
        result: r,
        comprehensionAfter: null,
        startedAt: drill.startedAt,
        recordedAt: now,
        timed: true,
        mockDrillId: drill.id,
        elapsedSeconds: elapsed[idx],
        timedOut: timedOut[idx],
      };
      recordSession(session);
      // Update drill item with result + sessionId
      const nextItems = drill.items.map((item, i) =>
        i !== idx ? item : { ...item, result: r, testSessionId: sessionId }
      );
      updateMockDrill({ ...drill, items: nextItems });
    }
  }

  function handleSaveLeak(idx: number) {
    const engine = data.engines.find((e) => e.id === drill.items[idx].engineId);
    if (!engine || !leakDescs[idx].trim()) return;
    const leak: LeakEntry = {
      id: uuid(),
      engineId: engine.id,
      courseId: drill.items[idx].courseId,
      type: leakTypes[idx],
      status: "COMMITTED",
      source: "TIMED_MOCK",
      description: leakDescs[idx].trim(),
      createdAt: new Date().toISOString(),
    };
    addLeak(leak);
    setLeakSaved((prev) => prev.map((v, i) => (i === idx ? true : v)));
    setLeakForms((prev) => prev.map((v, i) => (i === idx ? false : v)));
  }

  function handleComplete() {
    updateMockDrill({ ...drill, status: "COMPLETED", completedAt: new Date().toISOString() });
    // Redirect to same page — it will render CompletedView
    router.refresh();
  }

  function handleAbandon() {
    if (!confirm("Abandon this drill? Committed attempts are saved, but no maturity is recorded for ungraded items.")) return;
    updateMockDrill({ ...drill, status: "ABANDONED" });
    router.push("/dashboard");
  }

  const allGraded = results.every((r) => r !== null);

  if (phase === "DRILLING") {
    const engine = data.engines.find((e) => e.id === drill.items[current].engineId);
    const course = data.courses.find((c) => c.id === drill.items[current].courseId);
    const r = Math.max(0, remaining);
    const pct = (r / drill.perQuestionSeconds) * 100;
    const urgentColor = r <= 60 ? "bg-red-500" : r <= 120 ? "bg-amber-500" : "bg-zinc-900";
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Question {current + 1} of {drill.items.length}</p>
            <h1 className="text-lg font-semibold text-zinc-900 mt-0.5">{course?.name ?? "Unknown course"}</h1>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-black font-mono ${r <= 60 ? "text-red-600" : "text-zinc-900"}`}>{fmt(r)}</p>
            <p className="text-xs text-zinc-400">remaining</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${urgentColor}`} style={{ width: `${pct}%` }} />
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Write your full answer from memory. <strong>Engine content is hidden.</strong> No gate scaffold — go straight to the method.
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-700">
            Your answer for: <span className="text-zinc-500 italic">{engine?.title ?? "Unknown engine"}</span>
          </label>
          <textarea rows={12} value={localAttempt} onChange={(e) => setLocalAttempt(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400 font-mono"
            placeholder="Write the full engine from memory — gate, steps, trigger, satellites…"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button onClick={() => commitItem(false)}
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors">
            {current < drill.items.length - 1 ? "Commit & next →" : "Commit & reveal →"}
          </button>
          <button onClick={handleAbandon} className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors">
            Abandon
          </button>
        </div>
      </div>
    );
  }

  // REVEALED phase
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900">Reveal & Self-grade</h1>
        <p className="text-sm text-zinc-500">Compare each attempt to the engine. Grade PASS/FAIL, log any leaks.</p>
      </div>

      {drill.items.map((item, idx) => {
        const engine = data.engines.find((e) => e.id === item.engineId);
        const course = data.courses.find((c) => c.id === item.courseId);
        const r = results[idx];
        if (!engine) return null;
        return (
          <section key={idx} className="rounded-lg border border-zinc-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Question {idx + 1}</p>
                <h2 className="font-semibold text-zinc-900">{engine.title}</h2>
                <p className="text-xs text-zinc-500">{course?.name} · {fmt(item.elapsedSeconds)} used{item.timedOut ? " · ⏱ timed out" : ""}</p>
              </div>
              {r && (
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${r === "PASS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{r}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Your attempt</h3>
                <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-zinc-700 whitespace-pre-wrap min-h-32 font-mono text-xs">
                  {item.attempt || <span className="italic text-zinc-400">(blank — timed out)</span>}
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Engine</h3>
                <div className="rounded-lg bg-white border border-zinc-200 p-3 text-zinc-700 space-y-2 min-h-32 text-xs">
                  <div><p className="text-zinc-400 mb-0.5">Gate</p><p>{engine.gate}</p></div>
                  <div><p className="text-zinc-400 mb-0.5">Steps</p>
                    <ol className="list-decimal list-inside space-y-0.5">{engine.steps.map((s, i) => <li key={i}>{stripBraces(s)}</li>)}</ol>
                  </div>
                  {engine.trigger && <div><p className="text-zinc-400 mb-0.5">Trigger</p><p>{engine.trigger}</p></div>}
                  {engine.satellites.length > 0 && (
                    <div><p className="text-zinc-400 mb-0.5">Satellites</p>
                      <ul className="list-disc list-inside space-y-0.5">{engine.satellites.map((s, i) => <li key={i}>{stripBraces(s)}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!r && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-500">Gate skipped or whole step lost/added → FAIL. Wording slip → PASS + precision leak.</p>
                <div className="flex gap-3">
                  <button onClick={() => handleGrade(idx, "PASS")} className="rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors">PASS</button>
                  <button onClick={() => handleGrade(idx, "FAIL")} className="rounded-lg bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors">FAIL</button>
                </div>
              </div>
            )}

            {/* Comprehension mark (after grading) */}
            {r && (
              <div className="flex items-center gap-3">
                <p className="text-xs text-zinc-500">Comprehension:</p>
                {(["SHAKY", "SOLID"] as const).map((c) => (
                  <button key={c} onClick={() => setCompreh((prev) => prev.map((v, i) => i === idx ? c : v))}
                    className={`rounded px-3 py-1 text-xs font-medium border transition-colors ${compreh[idx] === c ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Leak form */}
            {leakForms[idx] && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
                <p className="text-sm font-medium text-orange-800">Log a leak{r === "FAIL" ? " (required on FAIL)" : ""}</p>
                <div className="flex gap-2">
                  {(["GATE_SKIP", "WRONG_TOOL", "PRECISION"] as LeakType[]).map((t) => (
                    <button key={t} onClick={() => setLeakTypes((prev) => prev.map((v, i) => i === idx ? t : v))}
                      className={`rounded px-2.5 py-1 text-xs font-medium border transition-colors ${leakTypes[idx] === t ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-300 text-zinc-600 hover:bg-white"}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <textarea rows={3} value={leakDescs[idx]} onChange={(e) => setLeakDescs((prev) => prev.map((v, i) => i === idx ? e.target.value : v))}
                  className="w-full rounded border border-orange-300 px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-orange-400"
                  placeholder="Describe the failure…" />
                <div className="flex gap-2">
                  <button onClick={() => handleSaveLeak(idx)} disabled={!leakDescs[idx].trim()}
                    className="rounded-lg bg-orange-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-40 transition-colors">
                    Save leak
                  </button>
                  <button onClick={() => {
                    if (r === "FAIL" && !confirm("Skip leak log? Failures should always be recorded.")) return;
                    setLeakForms((prev) => prev.map((v, i) => i === idx ? false : v));
                  }} className="text-sm text-zinc-500 hover:text-zinc-800 underline">
                    {r === "FAIL" ? "Skip (confirm)" : "Skip"}
                  </button>
                </div>
              </div>
            )}

            {leakSaved[idx] && <p className="text-sm text-green-700">✓ Leak logged.</p>}

            {r && !leakForms[idx] && !leakSaved[idx] && r === "PASS" && (
              <button onClick={() => setLeakForms((prev) => prev.map((v, i) => i === idx ? true : v))}
                className="text-sm text-zinc-400 underline hover:text-zinc-700">
                Log a precision leak from this pass
              </button>
            )}
          </section>
        );
      })}

      {allGraded && (
        <button onClick={handleComplete} className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors">
          Complete Drill →
        </button>
      )}
    </div>
  );
}

// ─── Completion summary ───────────────────────────────────────────────────────

function CompletedView({ drill }: { drill: MockDrill }) {
  const { data } = useStore();
  const totalSec = drill.items.reduce((s, i) => s + i.elapsedSeconds, 0);
  const passes = drill.items.filter((i) => i.result === "PASS").length;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-16">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900">Drill Complete</h1>
        <p className="text-sm text-zinc-500">{passes}/{drill.items.length} passed · total time {fmt(totalSec)}</p>
      </div>

      <div className="space-y-3">
        {drill.items.map((item, idx) => {
          const engine = data.engines.find((e) => e.id === item.engineId);
          const course = data.courses.find((c) => c.id === item.courseId);
          return (
            <div key={idx} className={`rounded-lg border p-4 space-y-1 ${item.result === "PASS" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="flex items-center justify-between">
                <p className="font-medium text-zinc-900 text-sm">{engine?.title}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${item.result === "PASS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{item.result}</span>
              </div>
              <p className="text-xs text-zinc-500">{course?.name} · {fmt(item.elapsedSeconds)} elapsed{item.timedOut ? " · ⏱ timed out" : ""}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600 space-y-1">
        <p><strong>Total time:</strong> {fmt(totalSec)}</p>
        <p><strong>Timed out:</strong> {drill.items.filter((i) => i.timedOut).length} question(s)</p>
        <p><strong>Cross-course:</strong> {new Set(drill.items.map((i) => i.courseId)).size >= 2 ? "Yes ✓" : "No (same course)"}</p>
      </div>

      <a href="/dashboard" className="block text-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors">
        ← Back to dashboard
      </a>
    </div>
  );
}
