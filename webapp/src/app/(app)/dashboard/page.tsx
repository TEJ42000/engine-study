"use client";
/**
 * Dashboard (F7) — stub.
 * Shows a loading skeleton until the store hydrates, then renders per-course
 * study-next ordering and the two-axis maturity grid.
 * Full AC7.1–7.4 UI is built in the Phase 2 UI sprint.
 */
import { useStore } from "@/lib/store";
import { studyNext, maturityGrid, computeLeakProfile } from "@/core/selectors";
import { deriveDrillEmphasisHint } from "@/core/mutations";
import Link from "next/link";
import { useState } from "react";

export default function DashboardPage() {
  const { data, loading, deleteCourse } = useStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-24 rounded-lg bg-zinc-200" />
        ))}
      </div>
    );
  }

  if (data.courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-zinc-500 text-sm">No courses yet.</p>
        <Link
          href="/courses/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          Add your first course
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
        <Link href="/courses/new" className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
          + Course
        </Link>
      </div>

      {data.courses.map((course) => {
        const engines = data.engines.filter((e) => e.courseId === course.id);
        const next = studyNext(engines, data.mockRuns);
        const grid = maturityGrid(engines);
        const leakProfile = computeLeakProfile(data.leaks, course.id, new Date().toISOString());
        const hint = deriveDrillEmphasisHint(course.examProfile);

        return (
          <section key={course.id} className="rounded-lg border border-zinc-200 bg-white p-5 space-y-4">
            {/* Course header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-zinc-900 truncate">{course.name}</h2>
                  <button
                    onClick={() => setDeletingId(course.id)}
                    className="text-zinc-300 hover:text-red-500 transition-colors p-1"
                    title="Delete course"
                  >
                    ×
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">Drill: {hint}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/courses/${course.id}/generate`}
                  className="rounded-md border border-blue-100 bg-blue-50/50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  AI Generate
                </Link>
                <Link
                  href={`/engines/new/edit?courseId=${course.id}`}
                  className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  + Engine
                </Link>
              </div>
            </div>

            {/* Delete Confirmation Overlay */}
            {deletingId === course.id && (
              <div className="rounded border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="text-xs font-medium text-red-800">
                  Delete "{course.name}"? This will also delete all {engines.length} engines, sessions, and leaks.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { deleteCourse(course.id); setDeletingId(null); }}
                    className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Two-axis maturity grid (AC7.1) */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(["UNTESTED", "FRAGILE", "RELIABLE"] as const).map((rr) => (
                <div key={rr} className="rounded-md bg-zinc-50 p-2">
                  <div className="font-medium text-zinc-700 mb-1">{rr}</div>
                  {(["SHAKY", "SOLID"] as const).map((c) => (
                    <div key={c} className="flex justify-between text-zinc-500">
                      <span>{c}</span>
                      <span className="font-mono">{grid[c][rr]}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Study next (AC7.2) */}
            {next.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-1.5">Study next</p>
                <div className="space-y-1">
                  {next.slice(0, 5).map((e) => (
                    <div key={e.id} className="flex items-center gap-1">
                      <Link
                        href={`/engines/${e.id}/edit`}
                        className="text-xs text-zinc-400 hover:text-zinc-600 px-1"
                        title="Edit engine"
                      >
                        ✎
                      </Link>
                      <Link
                        href={`/engines/${e.id}/test`}
                        className="flex items-center justify-between rounded-md px-3 py-2 bg-zinc-50 hover:bg-zinc-100 transition-colors flex-1 min-w-0"
                      >
                        <span className="text-sm text-zinc-800 truncate">{e.title}</span>
                        <span className="text-xs text-zinc-400 ml-2 shrink-0">{e.retrievalReliability}</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leak profile (AC7.3) */}
            {leakProfile.totalCommitted > 0 ? (
              <p className="text-xs text-zinc-500">
                Committed leaks: {leakProfile.totalCommitted} — dominant:{" "}
                <span className="font-medium">{leakProfile.dominant ?? "—"}</span>
              </p>
            ) : (
              <p className="text-xs text-zinc-400">No committed leaks yet.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
