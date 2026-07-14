"use client";
import { useStore } from "@/lib/store";
import { studyNext, maturityGrid, computeLeakProfile } from "@/core/selectors";
import { deriveDrillEmphasisHint } from "@/core/mutations";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToast } from "@/components/toast";

// ─── Daily Brief ────────────────────────────────────────────────────────────
function DailyBrief() {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    fetch("/api/ai/brief")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          if (r.status === 429) toast(d.brief || "Daily limit reached", "info");
          else toast(d.brief || "Failed to load brief", "error");
          return null;
        }
        return d;
      })
      .then((d) => {
        if (d) setBrief(d.brief);
      })
      .catch(() => {
        toast("Connection error loading brief", "error");
      })
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading)
    return <div className="h-16 rounded-xl bg-zinc-100 animate-pulse" />;
  if (!brief) return null;

  return (
    <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex gap-3 items-start">
      <span className="text-lg mt-0.5">✦</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest mb-1">Daily Brief</p>
        <p className="text-sm text-zinc-700 leading-relaxed">{brief}</p>
      </div>
    </div>
  );
}

// ─── Maturity Progress Bar ───────────────────────────────────────────────────
function MaturityBar({ reliable, fragile, untested, total }: { reliable: number; fragile: number; untested: number; total: number }) {
  if (total === 0) return <div className="h-2 rounded-full bg-zinc-100" />;
  const rPct = (reliable / total) * 100;
  const fPct = (fragile / total) * 100;
  const uPct = (untested / total) * 100;
  return (
    <div className="h-2 rounded-full overflow-hidden bg-zinc-100 flex">
      <div style={{ width: `${rPct}%` }} className="bg-emerald-500 transition-all" title={`Reliable: ${reliable}`} />
      <div style={{ width: `${fPct}%` }} className="bg-amber-400 transition-all" title={`Fragile: ${fragile}`} />
      <div style={{ width: `${uPct}%` }} className="bg-zinc-300 transition-all" title={`Untested: ${untested}`} />
    </div>
  );
}

// ─── Reliability Pill ───────────────────────────────────────────────────────
const PILL: Record<string, string> = {
  RELIABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FRAGILE:  "bg-amber-50 text-amber-700 border-amber-200",
  UNTESTED: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

// ─── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-40 rounded-lg bg-zinc-200" />
      <div className="h-16 rounded-xl bg-zinc-100" />
      {[1, 2].map((n) => (
        <div key={n} className="rounded-xl border border-zinc-100 bg-white p-5 space-y-4">
          <div className="h-5 w-48 rounded bg-zinc-200" />
          <div className="h-2 rounded-full bg-zinc-100" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((x) => <div key={x} className="h-14 rounded-lg bg-zinc-100" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, loading, deleteCourse } = useStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (loading) return <Skeleton />;

  if (data.courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-32 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-3xl">◈</div>
        <div>
          <p className="text-base font-semibold text-zinc-900">No courses yet</p>
          <p className="text-sm text-zinc-500 mt-1">Add your first course to start building revision engines.</p>
        </div>
        <Link href="/courses/new" className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
          Add your first course
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          {data.engines.length >= 2 && (
            <Link href="/mocks/drill/new"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm">
              ⏱ Timed Drill
            </Link>
          )}
          <Link href="/courses/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors shadow-sm">
            + Course
          </Link>
        </div>
      </div>

      <DailyBrief />

      {data.courses.map((course) => {
        const engines = data.engines.filter((e) => e.courseId === course.id);
        const engineIds = new Set(engines.map((e) => e.id));
        const sessionCount = data.testSessions.filter((s) => engineIds.has(s.engineId)).length;
        const leakCount = data.leaks.filter((l) => l.courseId === course.id).length;
        const mockRunCount = data.mockRuns.filter((m) => m.courseId === course.id).length;
        const mockDrillCount = data.mockDrills.filter((d) => d.items.some((i) => i.courseId === course.id)).length;

        const next = studyNext(engines, data.mockRuns);
        const grid = maturityGrid(engines);
        const leakProfile = computeLeakProfile(data.leaks, course.id, new Date().toISOString());
        const hint = deriveDrillEmphasisHint(course.examProfile);

        const reliable = (grid.SHAKY.RELIABLE + grid.SOLID.RELIABLE);
        const fragile  = (grid.SHAKY.FRAGILE  + grid.SOLID.FRAGILE);
        const untested = (grid.SHAKY.UNTESTED  + grid.SOLID.UNTESTED);
        const total    = grid.total;
        const mastery  = total > 0 ? Math.round((reliable / total) * 100) : 0;

        return (
          <section key={course.id} className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            {/* Course header */}
            <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-zinc-100">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/courses/${course.id}`} className="font-semibold text-zinc-900 hover:text-zinc-600 transition-colors truncate">
                    {course.name}
                  </Link>
                  <Link href={`/courses/${course.id}/edit`} className="text-zinc-300 hover:text-zinc-500 transition-colors" title="Edit">✎</Link>
                  <button onClick={() => setDeletingId(course.id)} className="text-zinc-300 hover:text-red-500 transition-colors" title="Delete">×</button>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">Focus: {hint}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link href={`/courses/${course.id}/generate`}
                  className="rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                  AI Generate
                </Link>
                <Link href={`/engines/new/edit?courseId=${course.id}`}
                  className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                  + Engine
                </Link>
              </div>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Delete confirmation */}
              {deletingId === course.id && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-xs font-medium text-red-800">
                    Delete "{course.name}"? Removes {engines.length} engines, {sessionCount} sessions,{" "}
                    {leakCount} leaks, {mockRunCount} mock runs, {mockDrillCount} drills.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => { deleteCourse(course.id); setDeletingId(null); }}
                      className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700">
                      Confirm Delete
                    </button>
                    <button onClick={() => setDeletingId(null)}
                      className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Mastery bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-600">{total} engines</span>
                  <span className="font-semibold text-zinc-800">{mastery}% mastery</span>
                </div>
                <MaturityBar reliable={reliable} fragile={fragile} untested={untested} total={total} />
                <div className="flex gap-4 text-[10px] text-zinc-400">
                  <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />{reliable} reliable</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />{fragile} fragile</span>
                  <span><span className="inline-block w-2 h-2 rounded-full bg-zinc-300 mr-1" />{untested} untested</span>
                </div>
              </div>

              {/* Maturity grid */}
              <div className="grid grid-cols-3 gap-2">
                {(["UNTESTED", "FRAGILE", "RELIABLE"] as const).map((rr) => (
                  <div key={rr} className="rounded-lg bg-zinc-50 border border-zinc-100 p-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{rr}</p>
                    {(["SHAKY", "SOLID"] as const).map((c) => (
                      <div key={c} className="flex justify-between items-center">
                        <span className="text-xs text-zinc-500">{c}</span>
                        <span className="text-sm font-semibold text-zinc-900 font-mono">{grid[c][rr]}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Study next */}
              {next.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Study next</p>
                  <div className="space-y-1">
                    {next.slice(0, 5).map((e) => (
                      <div key={e.id} className="flex items-center gap-1.5">
                        <Link href={`/engines/${e.id}/edit`} className="p-1 text-zinc-300 hover:text-zinc-500 transition-colors shrink-0" title="Edit">✎</Link>
                        <Link href={`/engines/${e.id}/test`}
                          className="flex items-center justify-between rounded-lg px-3 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 hover:border-zinc-200 transition-all flex-1 min-w-0 group">
                          <span className="text-sm text-zinc-800 truncate group-hover:text-zinc-900">{e.title}</span>
                          <span className={`ml-2 shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${PILL[e.retrievalReliability]}`}>
                            {e.retrievalReliability}
                          </span>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leak profile footer */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                {leakProfile.totalCommitted > 0 ? (
                  <p className="text-xs text-zinc-500">
                    {leakProfile.totalCommitted} committed leaks ·{" "}
                    dominant: <span className="font-medium text-zinc-700">{leakProfile.dominant}</span>
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400">No committed leaks yet</p>
                )}
                <Link href="/leaks" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">View leaks →</Link>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
