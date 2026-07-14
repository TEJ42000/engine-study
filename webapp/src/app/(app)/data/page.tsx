"use client";
/**
 * F8 — Data durability: export + import (AC8.1–8.3).
 * Export: downloads the versioned envelope as JSON.
 * Import: validates schemaVersion, shows counts, requires confirm before replacing.
 * Unknown schemaVersion blocks the import without touching existing data (AC8.3).
 */
import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { buildEnvelope, parseEnvelope, SCHEMA_VERSION } from "@/core/persistence";

export default function DataPage() {
  const { data, setData } = useStore();
  const [importStatus, setImportStatus] = useState<
    | { phase: "idle" }
    | { phase: "error"; message: string }
    | { phase: "confirm"; json: string; counts: Record<string, number> }
    | { phase: "done" }
  >({ phase: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const envelope = buildEnvelope(data);
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `engine-study-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseEnvelope(text);
      if (!result.ok) {
        setImportStatus({ phase: "error", message: result.reason });
        return;
      }
      const d = result.data;
      const counts = {
        courses: d.courses.length,
        engines: d.engines.length,
        sessions: d.testSessions.length,
        leaks: d.leaks.length,
        mockRuns: d.mockRuns.length,
      };
      setImportStatus({ phase: "confirm", json: text, counts });
    };
    reader.readAsText(file);
    // Reset file input so the same file can be re-selected if needed.
    e.target.value = "";
  }

  function handleConfirmImport() {
    if (importStatus.phase !== "confirm") return;
    const result = parseEnvelope(importStatus.json);
    if (!result.ok) { setImportStatus({ phase: "error", message: result.reason }); return; }
    setData(result.data);
    setImportStatus({ phase: "done" });
  }

  function handleCancelImport() {
    setImportStatus({ phase: "idle" });
    if (fileRef.current) fileRef.current.value = "";
  }

  const currentCounts = {
    courses: data.courses.length,
    engines: data.engines.length,
    sessions: data.testSessions.length,
    leaks: data.leaks.length,
    mockRuns: data.mockRuns.length,
  };

  return (
    <div className="max-w-lg mx-auto space-y-8 pb-16">
      <h1 className="text-xl font-semibold text-zinc-900">Data</h1>

      {/* Current data summary */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-2">
        <p className="text-sm font-semibold text-zinc-700">Current data <span className="text-xs font-normal text-zinc-400">(schema v{SCHEMA_VERSION})</span></p>
        <DataSummary counts={currentCounts} />
      </div>

      {/* Export */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700">Export</h2>
        <p className="text-sm text-zinc-500">Downloads all your data as a versioned JSON file. Use this to back up or move your study data.</p>
        <button onClick={handleExport}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
          Download export
        </button>
      </section>

      {/* Import */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700">Import</h2>
        <p className="text-sm text-zinc-500">
          Select a previously exported JSON file. The schema version is validated before anything changes — an unknown version will never wipe your data.
        </p>

        <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange}
          className={`block text-sm file:mr-3 file:rounded file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium cursor-pointer transition-colors ${
            importStatus.phase === "error"
              ? "text-red-700 file:bg-red-100 file:text-red-800 hover:file:bg-red-200"
              : importStatus.phase === "done"
              ? "text-green-700 file:bg-green-100 file:text-green-800 hover:file:bg-green-200"
              : "text-zinc-600 file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
          }`} />

        {importStatus.phase === "error" && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-red-800">Import blocked</p>
            <p className="text-sm text-red-700">{importStatus.message}</p>
            <p className="text-xs text-red-500">Your existing data has not been changed.</p>
            <button onClick={handleCancelImport} className="text-xs text-red-600 underline">Dismiss</button>
          </div>
        )}

        {importStatus.phase === "confirm" && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-4 space-y-3">
            <p className="text-sm font-semibold text-amber-800">Confirm import</p>
            <p className="text-sm text-amber-700">This will <strong>replace all current data</strong> with:</p>
            <DataSummary counts={importStatus.counts} />
            <p className="text-xs text-amber-600">Your current data will be overwritten. Export first if you want to keep it.</p>
            <div className="flex gap-3">
              <button onClick={handleConfirmImport}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors">
                Confirm import
              </button>
              <button onClick={handleCancelImport}
                className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {importStatus.phase === "done" && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <p className="text-sm text-green-800">✓ Import complete. Your data has been replaced.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function DataSummary({ counts }: { counts: Record<string, number> }) {
  return (
    <ul className="text-sm text-zinc-600 space-y-0.5">
      {Object.entries(counts).map(([k, v]) => (
        <li key={k}><span className="font-mono font-medium text-zinc-900">{v}</span> {k}</li>
      ))}
    </ul>
  );
}
