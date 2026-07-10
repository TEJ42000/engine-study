"use client";
/**
 * F2 — Engine editor (AC2.1–2.6).
 * Also handles creation when ?new=1&courseId=xxx is in the URL.
 * Steps/satellites: multiline paste auto-split on `1.`/`-`/`•` (AC2.2).
 * Precision target marking: select text, click "mark precision" → wraps in {{ }} (AC2.3).
 * Deterministic suggester: highlights regex candidates in each step (AC2.4).
 */
import { use, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { v4 as uuid } from "uuid";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/badge";
import type { Engine, EngineType } from "@/core/types";
import { NEW_ENGINE_DEFAULTS } from "@/core/mutations";

// Regex-based precision candidate detector (AC2.4).
const PRECISION_CANDIDATE_RE =
  /Art\.?\s*\d+[a-z]?(\(\d+\))?|C-\d+\/\d+|T-\d+\/\d+|\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+ v (?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)|\b\d{4}\b|[A-Za-z]+ erga omnes|[A-Za-z]+ ex ante|[A-Za-z]+ ex post|[A-Za-z]+ inter partes|[A-Za-z]+ inter alia|[A-Za-z]+ prima facie/g;

function hasCandidates(text: string) { return PRECISION_CANDIDATE_RE.test(text); }

function parsePastedLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.replace(/^(\d+\.|[-•])\s*/, "").trim())
    .filter(Boolean);
}

type EditableEngine = Omit<Engine, "id" | "createdAt" | "comprehension" | "retrievalReliability" | "passStreak" | "lastTestedAt" | "stacking">;

export default function EngineEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const isNew = id === "new";
  const courseId = searchParams.get("courseId") ?? "";
  const draftTitle = searchParams.get("draft") ?? "";

  const router = useRouter();
  const { data, addEngine, updateEngine, deleteEngine } = useStore();

  const existing = isNew ? null : data.engines.find((e) => e.id === id) ?? null;
  const course = data.courses.find((c) => c.id === (existing?.courseId ?? courseId));

  const [engineType, setEngineType] = useState<EngineType>(existing?.engineType ?? "DOCTRINAL");
  const [title, setTitle] = useState(existing?.title ?? draftTitle);
  const [gate, setGate] = useState(existing?.gate ?? "");
  const [steps, setSteps] = useState<string[]>(existing?.steps ?? [""]);
  const [trigger, setTrigger] = useState(existing?.trigger ?? "");
  const [satellites, setSatellites] = useState<string[]>(existing?.satellites ?? [""]);
  const [stacking, setStacking] = useState(existing?.stacking ?? false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Allow SOLID→SHAKY flip for existing engines (AC2.5).
  const [comprehension, setComprehension] = useState(existing?.comprehension ?? "SHAKY");

  useEffect(() => {
    if (existing) {
      setEngineType(existing.engineType);
      setTitle(existing.title);
      setGate(existing.gate);
      setSteps(existing.steps.length ? existing.steps : [""]);
      setTrigger(existing.trigger);
      setSatellites(existing.satellites.length ? existing.satellites : [""]);
      setStacking(existing.stacking);
      setComprehension(existing.comprehension);
    }
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!gate.trim()) { setError("Gate is required."); return; }
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
    if (cleanSteps.length === 0) { setError("At least one step is required."); return; }
    const cleanSats = satellites.map((s) => s.trim()).filter(Boolean);

    if (isNew) {
      addEngine({ courseId, engineType, title: title.trim(), gate: gate.trim(), steps: cleanSteps, trigger: trigger.trim(), satellites: cleanSats });
    } else if (existing) {
      updateEngine({ ...existing, engineType, title: title.trim(), gate: gate.trim(), steps: cleanSteps, trigger: trigger.trim(), satellites: cleanSats, stacking, comprehension });
    }
    router.push("/");
  }

  function handleDelete() {
    if (confirmDelete && existing) {
      deleteEngine(existing.id);
      router.push("/");
    } else {
      setConfirmDelete(true);
    }
  }

  function insertPrecisionMarker(listSetter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, ref: React.RefObject<HTMLTextAreaElement | null>) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    if (s === e) return;
    const marked = `${value.slice(0, s)}{{${value.slice(s, e)}}}${value.slice(e)}`;
    listSetter((prev) => prev.map((v, i) => (i === idx ? marked : v)));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">
          {isNew ? "New engine" : "Edit engine"}
          {course && <span className="ml-2 text-sm font-normal text-zinc-500">— {course.name}</span>}
        </h1>
        {!isNew && existing && (
          <div className="flex items-center gap-2">
            <Badge variant={existing.retrievalReliability === "RELIABLE" ? "reliable" : existing.retrievalReliability === "FRAGILE" ? "fragile" : "untested"}>
              {existing.retrievalReliability}
            </Badge>
            <Badge variant={comprehension === "SOLID" ? "solid" : "shaky"}>
              {comprehension}
            </Badge>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="space-y-5">
        {/* Type */}
        <div className="flex gap-3">
          {(["DOCTRINAL", "ANSWER_STRUCTURE"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setEngineType(t)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${engineType === t ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
            >
              {t === "DOCTRINAL" ? "Doctrinal" : "Answer Structure"}
            </button>
          ))}
        </div>

        <Field label="Title" hint="Name the situation, not the source (e.g. 'Market definition in dominance')">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} placeholder="Situation title" />
        </Field>

        <Field label="Gate" hint="The wrong-tool / go-no-go question the examiner implicitly asks">
          <textarea value={gate} onChange={(e) => setGate(e.target.value)} rows={2} className={`${INPUT} resize-none`} placeholder="When does this engine apply?" />
        </Field>

        <StepList label="Steps" hint="Ordered execution steps. Paste multiple lines to split automatically. Select text → 'Mark precision' to wrap in {{ }}." items={steps} setItems={setSteps} insertPrecisionMarker={insertPrecisionMarker} />

        <Field label="Trigger" hint="The surface cue that tells you this engine is needed">
          <input value={trigger} onChange={(e) => setTrigger(e.target.value)} className={INPUT} placeholder="e.g. 'Agreement between undertakings'" />
        </Field>

        <StepList label="Satellites" hint="Cases, verbatim qualifiers, thresholds. Wrap precision data in {{ }}." items={satellites} setItems={setSatellites} insertPrecisionMarker={insertPrecisionMarker} />

        {/* Stacking flag (AC2.6) */}
        <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
          <input type="checkbox" checked={stacking} onChange={(e) => setStacking(e.target.checked)} className="rounded" />
          Stack all grounds (cumulative doctrine)
        </label>

        {/* SOLID→SHAKY flip (AC2.5) */}
        {!isNew && existing?.comprehension === "SOLID" && (
          <label className="flex items-center gap-2 text-sm text-amber-700 cursor-pointer bg-amber-50 rounded-lg px-3 py-2">
            <input type="checkbox" checked={comprehension === "SHAKY"} onChange={(e) => setComprehension(e.target.checked ? "SHAKY" : "SOLID")} className="rounded" />
            I doubt this engine — flip comprehension back to SHAKY
          </label>
        )}
      </div>

      <div className="flex gap-3 pt-2 justify-between">
        <div className="flex gap-3">
          <button onClick={handleSave} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
            Save engine
          </button>
          <button onClick={() => router.push("/")} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
        </div>

        {!isNew && existing && (
          <button
            onClick={handleDelete}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${confirmDelete ? "bg-red-600 text-white" : "text-red-600 border border-red-200 hover:bg-red-50"}`}
          >
            {confirmDelete ? "Confirm Delete" : "Delete Engine"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const INPUT = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
      {children}
    </div>
  );
}

function StepList({
  label, hint, items, setItems, insertPrecisionMarker,
}: {
  label: string;
  hint?: string;
  items: string[];
  setItems: React.Dispatch<React.SetStateAction<string[]>>;
  insertPrecisionMarker: (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number, ref: React.RefObject<HTMLTextAreaElement | null>) => void;
}) {
  const refs = useRef<(HTMLTextAreaElement | null)[]>([]);

  function handleChange(idx: number, val: string) {
    // Auto-split on paste with list markers.
    if (val.includes("\n")) {
      const newLines = parsePastedLines(val);
      if (newLines.length > 1) {
        setItems((prev) => {
          const copy = [...prev];
          copy.splice(idx, 1, ...newLines);
          return copy;
        });
        return;
      }
    }
    setItems((prev) => prev.map((v, i) => (i === idx ? val : v)));
  }

  function addRow() { setItems((p) => [...p, ""]); }
  function removeRow(idx: number) { setItems((p) => p.filter((_, i) => i !== idx)); }
  function moveUp(idx: number) {
    if (idx === 0) return;
    setItems((p) => { const c = [...p]; [c[idx - 1], c[idx]] = [c[idx], c[idx - 1]]; return c; });
  }
  function moveDown(idx: number) {
    setItems((p) => { if (idx >= p.length - 1) return p; const c = [...p]; [c[idx], c[idx + 1]] = [c[idx + 1], c[idx]]; return c; });
  }

  return (
    <Field label={label} hint={hint}>
      <div className="space-y-2">
        {items.map((val, idx) => (
          <div key={idx} className="flex gap-1 items-start">
            <span className="mt-2 text-xs text-zinc-400 w-5 text-right shrink-0">{idx + 1}.</span>
            <textarea
              ref={(el) => { refs.current[idx] = el; }}
              value={val}
              onChange={(e) => handleChange(idx, e.target.value)}
              rows={2}
              className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-zinc-400"
              placeholder={idx === 0 ? "First step…" : ""}
            />
            <div className="flex flex-col gap-1 pt-0.5">
              <button type="button" onClick={() => moveUp(idx)} className="text-zinc-400 hover:text-zinc-700 text-xs" title="Move up">↑</button>
              <button type="button" onClick={() => moveDown(idx)} className="text-zinc-400 hover:text-zinc-700 text-xs" title="Move down">↓</button>
              {hasCandidates(val) && (
                <button type="button" title="Mark precision" onClick={() => insertPrecisionMarker(setItems, idx, { current: refs.current[idx] })} className="text-blue-500 hover:text-blue-700 text-xs">{"{{}}"}</button>
              )}
              <button type="button" onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600 text-xs" title="Remove">×</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addRow} className="text-xs text-zinc-500 hover:text-zinc-800 underline">
          + Add {label === "Steps" ? "step" : "satellite"}
        </button>
      </div>
    </Field>
  );
}
