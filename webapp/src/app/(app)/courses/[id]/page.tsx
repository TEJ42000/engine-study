"use client";
/**
 * Course engine browser — all engines for a course with test/edit links.
 */
import { use } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/badge";

export default function CourseBrowserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = use(params);
  const { data } = useStore();
  const course = data.courses.find((c) => c.id === courseId);
  const engines = data.engines.filter((e) => e.courseId === courseId);

  if (!course) return <p className="text-zinc-500 p-8 text-center">Course not found.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
            <Link href="/dashboard" className="hover:text-zinc-600">Dashboard</Link> /
          </p>
          <h1 className="text-xl font-semibold text-zinc-900">{course.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/courses/${courseId}/generate`}
            className="rounded-md border border-blue-100 bg-blue-50/50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
            AI Generate
          </Link>
          <Link href={`/engines/new/edit?courseId=${courseId}`}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            + Engine
          </Link>
        </div>
      </div>

      {/* Exam profile summary */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 flex flex-wrap gap-3 text-xs text-zinc-600">
        <span><span className="text-zinc-400">Open book:</span> {course.examProfile.openBook ? "Yes" : "No"}</span>
        <span><span className="text-zinc-400">Style:</span> {course.examProfile.appliedVsMemorization}</span>
        <span><span className="text-zinc-400">Path graded:</span> {course.examProfile.pathGraded ? "Yes" : "No"}</span>
        {course.examProfile.modes.length > 0 && (
          <span><span className="text-zinc-400">Modes:</span> {course.examProfile.modes.join(", ")}</span>
        )}
        <Link href={`/courses/${courseId}/edit`} className="text-zinc-400 hover:text-zinc-700 underline ml-auto">
          Edit profile
        </Link>
      </div>

      {engines.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-zinc-500 text-sm">No engines yet.</p>
          <div className="flex justify-center gap-3">
            <Link href={`/courses/${courseId}/generate`}
              className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
              Generate with AI
            </Link>
            <Link href={`/engines/new/edit?courseId=${courseId}`}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
              Add manually
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-zinc-400">{engines.length} engine{engines.length !== 1 ? "s" : ""}</p>
          {engines
            .slice()
            .sort((a, b) => {
              // Most due first (nulls first, then oldest)
              if (!a.lastTestedAt && !b.lastTestedAt) return 0;
              if (!a.lastTestedAt) return -1;
              if (!b.lastTestedAt) return 1;
              return Date.parse(a.lastTestedAt) - Date.parse(b.lastTestedAt);
            })
            .map((engine) => {
              const sessionCount = data.testSessions.filter((s) => s.engineId === engine.id).length;
              const leakCount = data.leaks.filter((l) => l.engineId === engine.id).length;
              return (
                <div key={engine.id}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-zinc-900 text-sm truncate">{engine.title}</span>
                      <Badge variant={engine.engineType === "DOCTRINAL" ? "doctrinal" : "answer-structure"}>
                        {engine.engineType === "DOCTRINAL" ? "DOC" : "ANS"}
                      </Badge>
                      <Badge variant={engine.retrievalReliability === "RELIABLE" ? "reliable" : engine.retrievalReliability === "FRAGILE" ? "fragile" : "untested"}>
                        {engine.retrievalReliability}
                      </Badge>
                      <Badge variant={engine.comprehension === "SOLID" ? "solid" : "shaky"}>
                        {engine.comprehension}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {sessionCount} session{sessionCount !== 1 ? "s" : ""}
                      {leakCount > 0 ? ` · ${leakCount} leak${leakCount !== 1 ? "s" : ""}` : ""}
                      {engine.lastTestedAt
                        ? ` · last tested ${new Date(engine.lastTestedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                        : " · never tested"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link href={`/engines/${engine.id}/test`}
                      className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors">
                      Test
                    </Link>
                    <Link href={`/engines/${engine.id}/edit`}
                      className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                      Edit
                    </Link>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
