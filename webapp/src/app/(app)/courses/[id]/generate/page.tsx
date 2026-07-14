"use client";
/**
 * F4.1 — Bulk engine generation from source (COSMOS_V1_SPEC §4.1).
 */
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/badge";
import { SyllabusUploader, type ExtractedCourse } from "@/components/syllabus-uploader";

interface EngineDraft {
  title: string;
  engineType: "DOCTRINAL" | "ANSWER_STRUCTURE";
  gate: string;
  steps: string[];
  trigger: string;
  satellites: string[];
  stacking: boolean;
  confidence: number;
}

export default function GeneratePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const router = useRouter();
  const { data, addEngine } = useStore();
  const course = data.courses.find((c) => c.id === courseId);

  const [source, setSource] = useState("");
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<EngineDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aiLoaded, setAiLoaded] = useState(false);

  function handleExtracted(data: ExtractedCourse) {
    if (data.sourceExcerpt) {
      setSource(data.sourceExcerpt);
      setAiLoaded(true);
    }
  }

  if (!course) return <div className="p-8 text-center text-zinc-500">Course not found.</div>;

  async function handleGenerate() {
    if (!source.trim() || !course) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          courseName: course.name,
          source,
          examProfile: course.examProfile,
          existingTitles: data.engines.filter(e => e.courseId === courseId).map(e => e.title),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      setDrafts(body.drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function handleAdd(draft: EngineDraft) {
    addEngine({
      courseId,
      ...draft
    });
    // Remove from local list once added.
    setDrafts(prev => prev.filter(d => d !== draft));
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-zinc-900">Bulk Generate Engines</h1>
        <p className="text-sm text-zinc-500">Course: {course.name}</p>
      </div>

      <div className="space-y-4">
        <SyllabusUploader onExtracted={handleExtracted} />

        {aiLoaded && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700">
            <span>✨</span>
            <span>AI extracted the key content — review it below or generate engines straight away.</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">Source Material</label>
          <p className="text-xs text-zinc-400">Extracted content appears here automatically, or paste your own. Max ~12,000 characters.</p>
          <textarea
            value={source}
            onChange={(e) => { setSource(e.target.value); setAiLoaded(false); }}
            rows={10}
            className="w-full rounded-lg border border-zinc-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 font-mono"
            placeholder="Upload a file above, or paste source material here..."
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={generating || !source.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors w-full"
        >
          {generating ? "Sonnet 4.6 is extracting engines..." : "Generate Drafts"}
        </button>
      </div>

      {drafts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700">Generated Drafts ({drafts.length})</h2>
          <div className="space-y-4">
            {drafts.map((draft, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 bg-white p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-900">{draft.title}</h3>
                      <Badge variant="untested">{draft.engineType}</Badge>
                      <span className="text-[10px] text-zinc-400 font-mono">Confidence: {draft.confidence}%</span>
                    </div>
                    <p className="text-xs text-zinc-500">Gate: {draft.gate}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(draft)}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                  >
                    Add to Store
                  </button>
                </div>
                <div className="text-xs text-zinc-600">
                  <p className="font-semibold mb-1">Steps:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    {draft.steps.map((s, j) => <li key={j}>{s}</li>)}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
