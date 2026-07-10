"use client";
/**
 * F6 — Record a mock run (AC6.1–6.3).
 * Captures label, date, notes, and per-miss: description + leak type + engine (or null).
 * Each tagged miss writes a COMMITTED LeakEntry (source MOCK) via addMockRun.
 * A "no engine" miss shows a link to create an engine with the description as draft title (AC6.3).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { useStore } from "@/lib/store";
import type { LeakType, MockMiss, MockRun } from "@/core/types";

interface MissForm {
  id: string;
  description: string;
  engineId: string; // "" means no engine
  leakType: LeakType;
}

const LEAK_TYPES: LeakType[] = ["GATE_SKIP", "WRONG_TOOL", "PRECISION"];

export default function NewMockRunPage() {
  const router = useRouter();
  const { data, addMockRun } = useStore();

  const [courseId, setCourseId] = useState(data.courses[0]?.id ?? "");
  const [label, setLabel] = useState("");
  const [takenAt, setTakenAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [misses, setMisses] = useState<MissForm[]>([{ id: uuid(), description: "", engineId: "", leakType: "GATE_SKIP" }]);
  const [error, setError] = useState("");

  const enginesForCourse = data.engines.filter((e) => e.courseId === courseId);

  function addMiss() {
    setMisses((p) => [...p, { id: uuid(), description: "", engineId: "", leakType: "GATE_SKIP" }]);
  }

  function removeMiss(id: string) {
    setMisses((p) => p.filter((m) => m.id !== id));
  }

  function updateMiss(id: string, patch: Partial<MissForm>) {
    setMisses((p) => p.map((m) => m.id === id ? { ...m, ...patch } : m));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) { setError("Select a course."); return; }
    if (!label.trim()) { setError("Label is required."); return; }
    const validMisses = misses.filter((m) => m.description.trim());

    const mockMisses: MockMiss[] = validMisses.map((m) => ({
      id: m.id,
      description: m.description.trim(),
      engineId: m.engineId || null,
      leakType: m.leakType,
      drilled: false,
    }));

    const run: MockRun = {
      id: uuid(),
      courseId,
      label: label.trim(),
      takenAt: new Date(takenAt).toISOString(),
      notes: notes.trim(),
      misses: mockMisses,
    };

    addMockRun(run);
    router.push("/mocks");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <h1 className="text-xl font-semibold text-zinc-900">Record mock run</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700">Course</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm">
              {data.courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700">Date</label>
            <input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)}
              className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">Label <span className="text-zinc-400 font-normal">(e.g. "ITL 2021 1st chance")</span></label>
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            placeholder="Mock exam label" />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">Notes <span className="text-zinc-400 font-normal">(optional)</span></label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400"
            placeholder="Conditions, time pressure, anything notable…" />
        </div>

        {/* Misses */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">Misses</h2>
            <button type="button" onClick={addMiss} className="text-xs text-zinc-500 underline hover:text-zinc-800">+ Add miss</button>
          </div>

          {misses.map((m, idx) => (
            <div key={m.id} className="rounded-lg border border-zinc-200 p-3 space-y-2 bg-zinc-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600">Miss {idx + 1}</span>
                {misses.length > 1 && (
                  <button type="button" onClick={() => removeMiss(m.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                )}
              </div>

              <textarea rows={2} value={m.description} onChange={(e) => updateMiss(m.id, { description: e.target.value })}
                className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
                placeholder="What did you miss or apply wrongly?" />

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-xs text-zinc-500">Leak type</label>
                  <select value={m.leakType} onChange={(e) => updateMiss(m.id, { leakType: e.target.value as LeakType })}
                    className="w-full rounded border border-zinc-300 px-2 py-1 text-xs">
                    {LEAK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-0.5">
                  <label className="text-xs text-zinc-500">Engine (or "no engine")</label>
                  <select value={m.engineId} onChange={(e) => updateMiss(m.id, { engineId: e.target.value })}
                    className="w-full rounded border border-zinc-300 px-2 py-1 text-xs">
                    <option value="">No engine covers this</option>
                    {enginesForCourse.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
              </div>

              {/* AC6.3 — no-engine miss shows create link */}
              {!m.engineId && m.description.trim() && (
                <a
                  href={`/engines/new/edit?courseId=${courseId}&draft=${encodeURIComponent(m.description.trim())}`}
                  className="text-xs text-blue-600 underline hover:text-blue-800"
                >
                  → Create engine from this miss
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
            Save mock run
          </button>
          <button type="button" onClick={() => router.push("/mocks")}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
