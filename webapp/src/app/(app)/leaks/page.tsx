"use client";
/**
 * F5 — Leak log (AC5.1–5.3).
 * Table filterable by course, engine, type, status, source.
 * Manual COMMITTED/GUARDED leak entry from any course/engine.
 */
import { useState } from "react";
import { v4 as uuid } from "uuid";
import { useStore } from "@/lib/store";
import { filterLeaks, leakCounts } from "@/core/selectors";
import { Badge } from "@/components/badge";
import type { LeakEntry, LeakType, LeakStatus, LeakSource } from "@/core/types";

const LEAK_TYPES: LeakType[] = ["GATE_SKIP", "WRONG_TOOL", "PRECISION"];
const SOURCES: LeakSource[] = ["COLD_TEST", "PRECISION_CHECK", "MOCK", "MANUAL", "TIMED_MOCK"];

export default function LeakLogPage() {
  const { data, addLeak } = useStore();

  // Filters
  const [courseId, setCourseId] = useState("");
  const [engineId, setEngineId] = useState("");
  const [typeF, setTypeF] = useState<LeakType | "">("");
  const [statusF, setStatusF] = useState<LeakStatus | "">("");

  // Manual entry form
  const [showForm, setShowForm] = useState(false);
  const [mCourseId, setMCourseId] = useState("");
  const [mEngineId, setMEngineId] = useState("");
  const [mType, setMType] = useState<LeakType>("GATE_SKIP");
  const [mStatus, setMStatus] = useState<LeakStatus>("COMMITTED");
  const [mDesc, setMDesc] = useState("");
  const [formError, setFormError] = useState("");

  const filtered = filterLeaks(data.leaks, {
    courseId: courseId || undefined,
    engineId: engineId || undefined,
    type: typeF || undefined,
    status: statusF || undefined,
  });

  const counts = leakCounts(filtered);

  const coursesInView = data.courses.filter((c) => courseId ? c.id === courseId : true);
  const enginesForCourse = data.engines.filter((e) => mCourseId ? e.courseId === mCourseId : true);

  function handleAdd() {
    if (!mCourseId) { setFormError("Select a course."); return; }
    if (!mEngineId) { setFormError("Select an engine."); return; }
    if (!mDesc.trim()) { setFormError("Description is required."); return; }
    const leak: LeakEntry = {
      id: uuid(),
      engineId: mEngineId,
      courseId: mCourseId,
      type: mType,
      status: mStatus,
      source: "MANUAL",
      description: mDesc.trim(),
      createdAt: new Date().toISOString(),
    };
    addLeak(leak);
    setMDesc(""); setMEngineId(""); setFormError(""); setShowForm(false);
  }

  function engineName(id: string) { return data.engines.find((e) => e.id === id)?.title ?? id; }
  function courseName(id: string) { return data.courses.find((c) => c.id === id)?.name ?? id; }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Leak log</h1>
        <button onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
          {showForm ? "Cancel" : "+ Manual leak"}
        </button>
      </div>

      {/* Manual entry form (AC5.2) */}
      {showForm && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-700">New manual leak</p>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Select label="Course" value={mCourseId} onChange={(v) => { setMCourseId(v); setMEngineId(""); }}>
              <option value="">— select —</option>
              {data.courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Engine" value={mEngineId} onChange={setMEngineId}>
              <option value="">— select —</option>
              {enginesForCourse.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
            <Select label="Type" value={mType} onChange={(v) => setMType(v as LeakType)}>
              {LEAK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select label="Status" value={mStatus} onChange={(v) => setMStatus(v as LeakStatus)}>
              <option value="COMMITTED">COMMITTED</option>
              <option value="GUARDED">GUARDED</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-600">Description</label>
            <textarea rows={2} value={mDesc} onChange={(e) => setMDesc(e.target.value)}
              className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
              placeholder="Describe the specific failure or risk…" />
          </div>
          <button onClick={handleAdd}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
            Save leak
          </button>
        </div>
      )}

      {/* Counts summary */}
      <div className="flex gap-4 flex-wrap">
        {LEAK_TYPES.map((t) => (
          <div key={t} className="text-xs text-zinc-500">
            <span className="font-medium text-zinc-800">{t}</span>{" "}
            <Badge variant="committed">{counts.committed[t]} committed</Badge>{" "}
            <Badge variant="guarded">{counts.guarded[t]} guarded</Badge>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select label="Course" value={courseId} onChange={setCourseId} compact>
          <option value="">All courses</option>
          {data.courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select label="Engine" value={engineId} onChange={setEngineId} compact>
          <option value="">All engines</option>
          {(courseId ? data.engines.filter((e) => e.courseId === courseId) : data.engines).map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </Select>
        <Select label="Type" value={typeF} onChange={(v) => setTypeF(v as LeakType | "")} compact>
          <option value="">All types</option>
          {LEAK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select label="Status" value={statusF} onChange={(v) => setStatusF(v as LeakStatus | "")} compact>
          <option value="">All statuses</option>
          <option value="COMMITTED">COMMITTED</option>
          <option value="GUARDED">GUARDED</option>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-400 py-8 text-center">No leaks match the current filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wide">
              <tr>
                {["Date", "Course", "Engine", "Type", "Status", "Source", "Description"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{l.createdAt.slice(0, 10)}</td>
                  <td className="px-3 py-2 text-zinc-600 max-w-[120px] truncate">{courseName(l.courseId)}</td>
                  <td className="px-3 py-2 text-zinc-600 max-w-[160px] truncate">{engineName(l.engineId)}</td>
                  <td className="px-3 py-2"><Badge variant={l.type === "GATE_SKIP" ? "committed" : l.type === "WRONG_TOOL" ? "neutral" : "guarded"}>{l.type}</Badge></td>
                  <td className="px-3 py-2"><Badge variant={l.status === "COMMITTED" ? "committed" : "guarded"}>{l.status}</Badge></td>
                  <td className="px-3 py-2 text-zinc-400 text-xs">{l.source}</td>
                  <td className="px-3 py-2 text-zinc-700">{l.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Select({ label, value, onChange, children, compact }: {
  label: string; value: string; onChange: (v: string) => void;
  children: React.ReactNode; compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "space-y-1"}>
      {!compact && <label className="block text-xs font-medium text-zinc-600">{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded border border-zinc-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400">
        {children}
      </select>
    </div>
  );
}
