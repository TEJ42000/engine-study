"use client";
import { useStore } from "@/lib/store";
import { studyNext, maturityGrid, computeLeakProfile } from "@/core/selectors";
import { deriveDrillEmphasisHint } from "@/core/mutations";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/toast";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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

// ─── Course Section ──────────────────────────────────────────────────────────
function CourseSection({
  course,
  engines,
  testSessions,
  leaks,
  mockRuns,
  mockDrills,
  deleteCourse
}: {
  course: any;
  engines: any[];
  testSessions: any[];
  leaks: any[];
  mockRuns: any[];
  mockDrills: any[];
  deleteCourse: (id: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    sessionCount, leakCount, mockRunCount, mockDrillCount,
    next, grid, leakProfile, hint,
    reliable, fragile, untested, total, mastery
  } = useMemo(() => {
    const engineIds = new Set(engines.map((e) => e.id));
    const sCount = testSessions.length;
    const lCount = leaks.length;
    const mrCount = mockRuns.length;
    const mdCount = mockDrills.length;

    const nxt = studyNext(engines, mockRuns);
    const grd = maturityGrid(engines);
    const lp = computeLeakProfile(leaks, course.id, new Date().toISOString());
    const hnt = deriveDrillEmphasisHint(course.examProfile);

    const rel = (grd.SHAKY.RELIABLE + grd.SOLID.RELIABLE);
    const fra = (grd.SHAKY.FRAGILE  + grd.SOLID.FRAGILE);
    const unt = (grd.SHAKY.UNTESTED  + grd.SOLID.UNTESTED);
    const tot = grd.total;
    const mas = tot > 0 ? Math.round((rel / tot) * 100) : 0;

    return {
      sessionCount: sCount,
      leakCount: lCount,
      mockRunCount: mrCount,
      mockDrillCount: mdCount,
      next: nxt,
      grid: grd,
      leakProfile: lp,
      hint: hnt,
      reliable: rel,
      fragile: fra,
      untested: unt,
      total: tot,
      mastery: mas
    };
  }, [course, engines, testSessions, leaks, mockRuns, mockDrills]);

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
}

function LoadErrorView() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-32 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-3xl">⚠</div>
      <div>
        <p className="text-base font-semibold text-zinc-900">Failed to load data</p>
        <p className="text-sm text-zinc-500 mt-1">Check your connection and try refreshing the page.</p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
function ExtensionHelper() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-xl shadow-inner text-white">🧩</div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Sync with Brightspace</h3>
          <p className="text-xs text-zinc-500">Master your law courses directly from the source.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2 text-xs text-zinc-600">
        <div className="space-y-1">
          <p className="font-bold text-zinc-900">1. Install</p>
          <p>Add the Engine Study extension to Chrome.</p>
        </div>
        <div className="space-y-1">
          <p className="font-bold text-zinc-900">2. Browse</p>
          <p>Navigate to your legal syllabus or slides in Brightspace.</p>
        </div>
        <div className="space-y-1">
          <p className="font-bold text-zinc-900">3. Recall</p>
          <p>Click "Sync Engine" to auto-extract the doctrinal structure.</p>
        </div>
      </div>
      <a 
        href="#" 
        className="inline-block text-xs font-medium text-zinc-500 underline hover:text-zinc-900 transition-colors"
      >
        Download Chrome Extension (v1.0.4) →
      </a>
    </div>
  );
}

function DashboardContent() {
  const { data, loading, loadError, isPro, deleteCourse } = useStore();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast("Welcome to Engine Study Pro!", "success");
    }
    if (searchParams.get("canceled") === "true") {
      toast("Subscription canceled", "info");
    }
  }, [searchParams, toast]);

  const courseDataSlices = useMemo(() => {
    if (loadError) return [];
    return data.courses.map(course => {
      const engines = data.engines.filter((e) => e.courseId === course.id);
      const engineIds = new Set(engines.map((e) => e.id));
      return {
        course,
        engines,
        testSessions: data.testSessions.filter((s) => engineIds.has(s.engineId)),
        leaks: data.leaks.filter((l) => l.courseId === course.id),
        mockRuns: data.mockRuns.filter((m) => m.courseId === course.id),
        mockDrills: data.mockDrills.filter((d) => d.items.some((i) => i.courseId === course.id))
      };
    });
  }, [data, loadError]);

  if (loading) return <Skeleton />;
  if (loadError) return <LoadErrorView />;

  if (data.courses.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-12 py-12">
        <div className="flex flex-col items-center justify-center gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-3xl">◈</div>
          <div>
            <p className="text-base font-semibold text-zinc-900">No courses yet</p>
            <p className="text-sm text-zinc-500 mt-1">Add your first course to start building revision engines.</p>
          </div>
          <Link href="/courses/new" className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
            Add your first course
          </Link>
        </div>

        <ExtensionHelper />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
          {isPro && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Pro
            </span>
          )}
        </div>
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

      {courseDataSlices.map((slice) => (
        <CourseSection
          key={slice.course.id}
          {...slice}
          deleteCourse={deleteCourse}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
