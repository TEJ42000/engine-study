"use client";
/**
 * F1 — Edit course (AC1.2).
 * Captures name + four ExamProfile fields and delegates to the store.
 */
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import type { ExamProfile } from "@/core/types";

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, updateCourse } = useStore();
  const existing = data.courses.find((c) => c.id === id);

  const [name, setName] = useState("");
  const [profile, setProfile] = useState<ExamProfile | null>(null);
  const [modesInput, setModesInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setProfile(existing.examProfile);
      setModesInput(existing.examProfile.modes.join("\n"));
    }
  }, [existing]);

  if (!existing || !profile) {
    return <p className="text-zinc-500 text-sm">Course not found.</p>;
  }

  function set<K extends keyof ExamProfile>(k: K, v: ExamProfile[K]) {
    setProfile((p) => (p ? { ...p, [k]: v } : null));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Course name is required.");
      return;
    }
    const modes = modesInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    updateCourse(id, name.trim(), { ...profile, modes } as ExamProfile);
    router.push("/");
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900">Edit course</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">Course name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <fieldset className="space-y-4 rounded-lg border border-zinc-200 p-4">
          <legend className="text-sm font-medium text-zinc-700 px-1">Exam profile</legend>
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input type="checkbox" checked={profile.openBook} onChange={(e) => set("openBook", e.target.checked)} className="rounded" />
            Open book
          </label>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-600">Applied vs memorisation</label>
            <select
              value={profile.appliedVsMemorization}
              onChange={(e) => set("appliedVsMemorization", e.target.value as ExamProfile["appliedVsMemorization"])}
              className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="MEMORIZATION">Memorisation (closed-book recall)</option>
              <option value="APPLIED">Applied (routing + machinery)</option>
              <option value="MIXED">Mixed</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input type="checkbox" checked={profile.pathGraded} onChange={(e) => set("pathGraded", e.target.checked)} className="rounded" />
            Path graded (reasoning path carries marks)
          </label>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-zinc-600">Exam modes (one per line)</label>
            <textarea
              rows={3}
              value={modesInput}
              onChange={(e) => setModesInput(e.target.value)}
              className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm font-mono resize-none"
            />
          </div>
        </fieldset>

        <div className="flex gap-3">
          <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
            Save changes
          </button>
          <button type="button" onClick={() => router.push("/")} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
