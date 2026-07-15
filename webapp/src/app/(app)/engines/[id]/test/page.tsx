"use client";
/**
 * F3 — Test runner: gate-first → full recall → reveal → grade → comprehension.
 * AC3.1: Reveal disabled until both inputs have non-whitespace content.
 * AC3.2: PASS/FAIL and engine content are NOT in the DOM until Reveal is clicked.
 * AC3.5: Stores verbatim gate attempt + full attempt in TestSession.
 * AC3.6: Session only recorded on explicit grade — refresh loses the in-progress attempt only.
 */
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/badge";
import type { Comprehension, LeakEntry, LeakType, Result, TestSession } from "@/core/types";

interface MarkingFeedback {
  score: number;
  correct: string[];
  missing: string[];
  structureNote: string;
  keyToAdd: string;
  confidence?: number;
}

type Phase = "INPUT" | "REVEALED" | "GRADED";

// Strip {{ }} braces for display outside precision-check mode.
function stripBraces(s: string) { return s.replace(/\{\{(.+?)\}\}/g, "$1"); }

export default function TestRunnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = useStore();
  const engine = data.engines.find((e) => e.id === id);
  if (!engine) return <p className="text-zinc-500 text-sm">Engine not found.</p>;
  return <TestRunner engine={engine} />;
}

import type { Engine } from "@/core/types";

function TestRunner({ engine }: { engine: Engine }) {
  const router = useRouter();
  const { data, recordSession, addLeak } = useStore();

  const allText = [...engine.steps, ...engine.satellites].join("\n");
  const targets = Array.from(allText.matchAll(/\{\{(.+?)\}\}/g)).map((m) => m[1]);
  const hasPrecisionTargets = targets.length > 0;

  // Mode toggle (F4)
  const [mode, setMode] = useState<"FULL_RECALL" | "PRECISION_CHECK">("FULL_RECALL");
  const [phase, setPhase] = useState<Phase>("INPUT");
  const [gateAttempt, setGateAttempt] = useState("");
  const [attempt, setAttempt] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [comprehension, setComprehension] = useState<Comprehension>(engine.comprehension);
  const [startedAt] = useState(() => new Date().toISOString());

  // Usage tracking (P4-002)
  const [usage, setUsage] = useState<{ mark: { used: number, limit: number, isPro?: boolean }, isPro?: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/ai/usage").then(r => r.json()).then(setUsage).catch(() => {});
  }, []);

  // AI Marking state (F4 2nd half)
  const [marking, setMarking] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<MarkingFeedback | null>(null);
  const [aiRaw, setAiRaw] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Leak form state (shown on FAIL, offered on PASS).
  const [showLeakForm, setShowLeakForm] = useState(false);
  const [leakType, setLeakType] = useState<LeakType>("GATE_SKIP");
  const [leakDesc, setLeakDesc] = useState("");
  const [leakSaved, setLeakSaved] = useState(false);

  const canReveal = gateAttempt.trim().length > 0 && attempt.trim().length > 0;

  async function handleReveal() {
    setPhase("REVEALED");

    // Launch AI marking in parallel for FULL_RECALL (AC4.1–4.2).
    if (mode === "FULL_RECALL") {
      setMarking(true);
      setAiError(null);
      setAiRaw(null);
      try {
        const activeCourse = data.courses.find((c) => c.id === engine.courseId);
        const res = await fetch("/api/ai/mark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            engine,
            gateAttempt,
            attempt,
            course: activeCourse ? { name: activeCourse.name, examProfile: activeCourse.examProfile } : undefined
          }),
        });
        if (!res.ok) {
          if (res.status === 429) throw new Error("Quota exceeded — wait until tomorrow or use fewer satellites.");
          if (res.status === 413) throw new Error("Payload too large for Haiku 4.5.");
          throw new Error("AI marker is busy or unstable. Try again in a minute.");
        }
        const json = await res.json();
        if (json.score === null) {
          setAiRaw(json.raw);
        } else {
          setAiFeedback(json.feedback);
        }
      } catch (err) {
        setAiError(err instanceof Error ? err.message : "AI marking error");
      } finally {
        setMarking(false);
      }
    }
  }

  function handleGrade(r: Result) {
    setResult(r);
    setPhase("GRADED");

    // F3 AC3.5 — suggest SHAKY on any FAIL (graceful volatility protection).
    if (r === "FAIL") {
      setComprehension("SHAKY");
    }

    if (r === "FAIL" || (mode === "PRECISION_CHECK" && targets.some((t, i) => {
      const answers = attempt ? JSON.parse(attempt) : [];
      return (answers[i] ?? "").trim().toLowerCase() !== t.trim().toLowerCase();
    }))) {
      if (mode === "PRECISION_CHECK") {
        const answers = attempt ? JSON.parse(attempt) : [];
        const misses = targets
          .map((t, i) => ({ target: t, answer: answers[i] ?? "" }))
          .filter(x => x.target.trim().toLowerCase() !== x.answer.trim().toLowerCase())
          .map(x => `Missed: "${x.target}" (wrote: "${x.answer || "(blank)"}")`)
          .join("\n");

        if (misses) {
          setLeakType("PRECISION");
          setLeakDesc(misses);
        }
      }
      setShowLeakForm(true);
    }
  }

  function handleSaveLeak() {
    if (!leakDesc.trim()) return;
    const leak: LeakEntry = {
      id: uuid(),
      engineId: engine.id,
      courseId: engine.courseId,
      type: leakType,
      status: "COMMITTED",
      source: mode === "PRECISION_CHECK" ? "PRECISION_CHECK" : "COLD_TEST",
      description: leakDesc.trim(),
      createdAt: new Date().toISOString(),
    };
    addLeak(leak);
    setLeakSaved(true);
    setShowLeakForm(false);
  }

  function handleDone() {
    if (result) {
      const now = new Date().toISOString();
      const session: TestSession = {
        id: uuid(),
        engineId: engine.id,
        mode,
        gateAttempt,
        attempt,
        result: result,
        comprehensionAfter: mode === "PRECISION_CHECK" ? null : comprehension,
        startedAt,
        recordedAt: now,
      };
      recordSession(session);
    }
    router.push("/dashboard");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Mode Toggle - always visible during INPUT to allow escape from invalid precision state */}
      {phase === "INPUT" && (
        <div className="flex justify-end gap-2">
          {(["FULL_RECALL", "PRECISION_CHECK"] as const).map((m) => {
            if (m === "PRECISION_CHECK" && !hasPrecisionTargets && mode !== "PRECISION_CHECK") return null;
            return (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setAttempt("");
                }}
                className={`rounded-md px-3 py-1 text-xs font-medium border transition-colors ${mode === m ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
              >
                {m.replace("_", " ")}
              </button>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-zinc-900">{engine.title}</h1>
          <div className="mt-1 flex gap-2">
            <Badge variant={engine.engineType === "DOCTRINAL" ? "doctrinal" : "answer-structure"}>{engine.engineType}</Badge>
            <Badge variant={engine.retrievalReliability === "RELIABLE" ? "reliable" : engine.retrievalReliability === "FRAGILE" ? "fragile" : "untested"}>{engine.retrievalReliability}</Badge>
            <Badge variant={comprehension === "SOLID" ? "solid" : "shaky"}>{comprehension}</Badge>
          </div>
        </div>
      </div>

      {/* ── Phase: INPUT ─────────────────────────────── */}
      {phase === "INPUT" && (
        <div className="space-y-5">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <strong>Gate first.</strong> Write the gate — the wrong-tool check — before recalling the engine.
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700">What is the gate for this engine?</label>
            <textarea
              rows={3}
              value={gateAttempt}
              onChange={(e) => setGateAttempt(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400"
              placeholder="Write the go/no-go question from memory…"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700">
              {mode === "FULL_RECALL" ? "Full recall — steps, trigger, satellites" : "Precision check — fill in the blanks"}
            </label>
            {mode === "FULL_RECALL" ? (
              <textarea
                rows={10}
                value={attempt}
                onChange={(e) => setAttempt(e.target.value)}
                disabled={!gateAttempt.trim()}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400"
                placeholder={gateAttempt.trim() ? "Write out the engine from memory…" : "Answer the gate first to unlock recall…"}
              />
            ) : (
              <PrecisionBlanks
                engine={engine}
                value={attempt}
                onChange={setAttempt}
                disabled={!gateAttempt.trim()}
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReveal}
              disabled={!canReveal}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
            >
              Reveal engine
            </button>
            {mode === "FULL_RECALL" && usage && (
              <span className="text-xs text-zinc-400">
                AI Quota: {usage.isPro ? "Unlimited" : `${usage.mark.limit - usage.mark.used} left today`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Phase: REVEALED ──────────────────────────── */}
      {phase === "REVEALED" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Your attempt */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-zinc-700">Your attempt</h2>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 whitespace-pre-wrap min-h-32">
                <p className="text-xs text-zinc-400 mb-1">Gate:</p>
                <p className="mb-3">{gateAttempt}</p>
                <p className="text-xs text-zinc-400 mb-1">{mode === "FULL_RECALL" ? "Recall:" : "Blanks:"}</p>
                {mode === "FULL_RECALL" ? (
                  <p>{attempt}</p>
                ) : (
                  <PrecisionReveal engine={engine} value={attempt} />
                )}
              </div>
            </div>

            {/* AI Review (F4 2nd half) */}
            {mode === "FULL_RECALL" && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-zinc-700">AI review</h2>
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 min-h-32 text-sm">
                  {marking ? (
                    <div className="flex flex-col items-center justify-center py-8 text-blue-400 gap-2">
                      <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium uppercase tracking-widest">Haiku 4.5 is marking...</p>
                    </div>
                  ) : aiError ? (
                    <p className="text-zinc-400 py-8 text-center">{aiError}</p>
                  ) : aiRaw ? (
                    <div className="space-y-3">
                      <p className="text-xs text-amber-700 font-medium">AI Feedback (Raw):</p>
                      <p className="text-zinc-700 whitespace-pre-wrap">{aiRaw}</p>
                    </div>
                  ) : aiFeedback ? (
                    <div className="space-y-3">
                      <div className="flex items-baseline justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-blue-800 uppercase tracking-tight">Examiner Score</span>
                          {aiFeedback.confidence !== undefined && (
                            <span className="text-[10px] text-blue-400">Confidence: {aiFeedback.confidence}%</span>
                          )}
                        </div>
                        <span className="text-2xl font-black text-blue-900">{aiFeedback.score}<span className="text-xs text-blue-400 font-normal">/10</span></span>
                      </div>
                      <div className="space-y-2">
                        {aiFeedback.correct.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-green-600 uppercase mb-1">Correct</p>
                            <ul className="space-y-0.5">
                              {aiFeedback.correct.slice(0, 3).map((c, i) => (
                                <li key={i} className="text-zinc-700 flex gap-2">
                                  <span className="text-green-500">•</span> {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiFeedback.missing.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Missing / Slip</p>
                            <ul className="space-y-0.5">
                              {aiFeedback.missing.slice(0, 3).map((m, i) => (
                                <li key={i} className="text-zinc-700 flex gap-2">
                                  <span className="text-amber-500">•</span> {m}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-blue-100 pt-2">
                        <p className="text-[10px] font-bold text-blue-400 uppercase mb-0.5">Structure Note</p>
                        <p className="text-zinc-600 italic leading-relaxed">{aiFeedback.structureNote}</p>
                      </div>
                      <div className="bg-white/60 rounded p-2 border border-blue-100/50">
                        <p className="text-[10px] font-bold text-blue-400 uppercase mb-0.5">Key to add next time</p>
                        <p className="text-zinc-900 font-medium">{aiFeedback.keyToAdd}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-400 py-8 text-center italic">Awaiting marking...</p>
                  )}
                </div>
              </div>
            )}

            {/* Engine content — only exists in DOM after reveal (AC3.2) */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-zinc-700">Engine</h2>
              <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700 space-y-2 min-h-32">
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Gate</p>
                  <p>{engine.gate}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Steps</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    {engine.steps.map((s, i) => <li key={i}>{stripBraces(s)}</li>)}
                  </ol>
                </div>
                {engine.trigger && (
                  <div><p className="text-xs text-zinc-400 mb-0.5">Trigger</p><p>{engine.trigger}</p></div>
                )}
                {engine.satellites.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-400 mb-0.5">Satellites</p>
                    <ul className="list-disc list-inside space-y-0.5">{engine.satellites.map((s, i) => <li key={i}>{stripBraces(s)}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 text-xs text-zinc-600">
            Convention: <strong>FAIL</strong> if you skipped the gate or lost/added a whole step. <strong>PASS + precision leak</strong> for wording slips.
          </div>

          {/* PASS/FAIL only exist after reveal (AC3.2) */}
          <div className="flex gap-3">
            <button onClick={() => handleGrade("PASS")} className="rounded-lg bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors">PASS</button>
            <button onClick={() => handleGrade("FAIL")} className="rounded-lg bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors">FAIL</button>
          </div>
        </div>
      )}

      {/* ── Phase: GRADED ────────────────────────────── */}
      {phase === "GRADED" && (
        <div className="space-y-5">
          <div className={`rounded-lg px-4 py-3 text-sm font-semibold ${result === "PASS" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {result === "PASS" ? "✓ Recorded as PASS" : "✗ Recorded as FAIL"}
          </div>

          {/* Comprehension self-mark */}
          <div className="rounded-lg border border-zinc-200 p-4 space-y-3">
            <p className="text-sm font-medium text-zinc-700">Do you understand this engine?</p>
            <div className="flex gap-3">
              {(["SHAKY", "SOLID"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setComprehension(c)}
                  className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${comprehension === c ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400">Your comprehension is now recorded as <strong>{comprehension}</strong>.</p>
          </div>

          {/* Leak form — required on FAIL, offered on PASS */}
          {showLeakForm && (
            <LeakForm
              leakType={leakType} setLeakType={setLeakType}
              leakDesc={leakDesc} setLeakDesc={setLeakDesc}
              onSave={handleSaveLeak}
              onSkip={result === "FAIL"
                ? () => { if (confirm("Are you sure you want to skip logging this leak? Failures should always be recorded.")) setShowLeakForm(false); }
                : () => setShowLeakForm(false)}
              required={result === "FAIL"}
            />
          )}

          {!showLeakForm && result === "PASS" && !leakSaved && (
            <button onClick={() => setShowLeakForm(true)} className="text-sm text-zinc-500 underline hover:text-zinc-800">
              Log a precision leak from this pass
            </button>
          )}

          {leakSaved && <p className="text-sm text-green-700">✓ Leak logged.</p>}

          <button onClick={handleDone} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
            Done → Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

function PrecisionBlanks({ engine, value, onChange, disabled }: {
  engine: Engine; value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  // Extract all {{targets}} from steps and satellites
  const allText = [...engine.steps, ...engine.satellites].join("\n");
  const targets = Array.from(allText.matchAll(/\{\{(.+?)\}\}/g)).map(m => m[1]);

  if (targets.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        This engine has no precision targets marked. Use FULL RECALL mode instead.
      </div>
    );
  }

  // Value is stored as JSON array of strings
  const answers: string[] = value ? JSON.parse(value) : Array(targets.length).fill("");

  function updateAnswer(idx: number, val: string) {
    const next = [...answers];
    next[idx] = val;
    onChange(JSON.stringify(next));
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      {targets.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-amber-800 mb-3">No precision targets found.</p>
          <button
            onClick={() => onChange("")}
            className="text-xs font-medium text-zinc-600 underline hover:text-zinc-900"
          >
            Switch to Full Recall
          </button>
        </div>
      ) : (
        targets.map((t, i) => (
          <div key={i} className="space-y-1">
            <label className="block text-xs font-medium text-zinc-500">Blank #{i + 1}</label>
            <input
              type="text"
              value={answers[i]}
              onChange={(e) => updateAnswer(i, e.target.value)}
              disabled={disabled}
              className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:bg-zinc-50"
              placeholder="..."
            />
          </div>
        ))
      )}
    </div>
  );
}

function PrecisionReveal({ engine, value }: { engine: Engine; value: string }) {
  const allText = [...engine.steps, ...engine.satellites].join("\n");
  const targets = Array.from(allText.matchAll(/\{\{(.+?)\}\}/g)).map((m) => m[1]);
  const answers: string[] = value ? JSON.parse(value) : [];

  return (
    <div className="space-y-3">
      {targets.map((t, i) => (
        <div key={i} className="rounded border border-zinc-100 p-2 text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-zinc-400 font-medium uppercase tracking-wider">
              Target #{i + 1}
            </span>
            <Badge
              variant={
                (answers[i] ?? "").trim().toLowerCase() === t.trim().toLowerCase()
                  ? "reliable"
                  : "fragile"
              }
            >
              {(answers[i] ?? "").trim().toLowerCase() === t.trim().toLowerCase()
                ? "MATCH"
                : "DIFF"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-zinc-400 mb-0.5">Yours</p>
              <p className="text-zinc-700 font-medium">
                {answers[i] || "(blank)"}
              </p>
            </div>
            <div>
              <p className="text-zinc-400 mb-0.5">Model</p>
              <p className="text-zinc-900 font-bold">{t}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeakForm({ leakType, setLeakType, leakDesc, setLeakDesc, onSave, onSkip, required }: {
  leakType: LeakType; setLeakType: (t: LeakType) => void;
  leakDesc: string; setLeakDesc: (d: string) => void;
  onSave: () => void; onSkip: () => void; required: boolean;
}) {
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
      <p className="text-sm font-medium text-orange-800">Log a leak{required ? " (required on FAIL)" : ""}</p>
      <div className="flex gap-2">
        {(["GATE_SKIP", "WRONG_TOOL", "PRECISION"] as LeakType[]).map((t) => (
          <button key={t} type="button" onClick={() => setLeakType(t)}
            className={`rounded px-2.5 py-1 text-xs font-medium border transition-colors ${leakType === t ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-300 text-zinc-600 hover:bg-white"}`}
          >{t}</button>
        ))}
      </div>
      <textarea rows={3} value={leakDesc} onChange={(e) => setLeakDesc(e.target.value)}
        className="w-full rounded border border-orange-300 px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-orange-400"
        placeholder="Describe the specific failure…" />
      <div className="flex gap-2">
        <button onClick={onSave} disabled={!leakDesc.trim()}
          className="rounded-lg bg-orange-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-40 transition-colors">
          Save leak
        </button>
        <button onClick={onSkip} className="text-sm text-zinc-500 hover:text-zinc-800 underline">
          {required ? "Skip (with confirm)" : "Skip"}
        </button>
      </div>
    </div>
  );
}
