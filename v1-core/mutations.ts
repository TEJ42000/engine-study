// v1-core/mutations.ts
// Pure CosmosData state transitions — no UI, no I/O. Given data + an action,
// return the next data. Compose with any state-management approach (context+
// reducer, Zustand, etc.); these make no architectural choice for the UI.
//
// Spec-derived: F1 (§1.1 / AC1.2 / AC1.3) and F3 (§1.2 maturity write path).

import type {
  Course,
  CosmosData,
  Engine,
  ExamProfile,
  LeakEntry,
  TestSession,
} from './types';
import {
  applyMaturityTransition,
  currentStreakStart,
  type MaturityEvent,
} from './maturity';

// F1 AC1.2 — the drill-emphasis hint derived from the exam profile flags
// (mappings from §1.1). Deterministic; changing the profile changes the hint.
export function deriveDrillEmphasisHint(p: ExamProfile): string {
  const parts: string[] = [];
  if (p.openBook) parts.push('navigation/lookup');
  if (p.appliedVsMemorization === 'APPLIED' || p.appliedVsMemorization === 'MIXED') {
    parts.push('answer machinery');
  }
  if (p.appliedVsMemorization === 'MEMORIZATION' || p.appliedVsMemorization === 'MIXED') {
    parts.push('spaced recall');
  }
  if (p.pathGraded) parts.push('sequence order');
  return parts.length ? parts.join(' + ') : 'cold recall';
}

// F1 AC1.3 — deleting a course cascades to its engines, sessions, leaks, mock
// runs. Returns the next data plus the counts to show in the confirm dialog.
export interface CascadeCounts {
  engines: number;
  testSessions: number;
  leaks: number;
  mockRuns: number;
}

export function cascadeDeleteCourse(
  data: CosmosData,
  courseId: string,
): { data: CosmosData; counts: CascadeCounts } {
  const engineIds = new Set(
    data.engines.filter((e) => e.courseId === courseId).map((e) => e.id),
  );
  const counts: CascadeCounts = {
    engines: engineIds.size,
    testSessions: data.testSessions.filter((s) => engineIds.has(s.engineId)).length,
    leaks: data.leaks.filter((l) => l.courseId === courseId).length,
    mockRuns: data.mockRuns.filter((m) => m.courseId === courseId).length,
  };
  const next: CosmosData = {
    ...data,
    courses: data.courses.filter((c) => c.id !== courseId),
    engines: data.engines.filter((e) => e.courseId !== courseId),
    testSessions: data.testSessions.filter((s) => !engineIds.has(s.engineId)),
    leaks: data.leaks.filter((l) => l.courseId !== courseId),
    mockRuns: data.mockRuns.filter((m) => m.courseId !== courseId),
  };
  return { data: next, counts };
}

// F3 steps 5–6 / §1.2 — record a test session: insert it, apply the maturity
// transition to its engine, apply the comprehension self-mark (null = no change),
// and stamp lastTestedAt.
//
// ⚑ Spec ambiguity (flagged, not silently resolved): the spec does not say
// whether a PRECISION_CHECK updates lastTestedAt. This updates it only for cold
// recall (FULL_RECALL / TIMED_MOCK), since "study next" ordering keys on
// cold-recall recency. Change here if the spec is later clarified.
export function recordSession(data: CosmosData, session: TestSession): CosmosData {
  const engine = data.engines.find((e) => e.id === session.engineId);
  const withSession = { ...data, testSessions: [...data.testSessions, session] };
  if (!engine) return withSession;

  const isColdRecall =
    session.mode === 'FULL_RECALL' || session.mode === 'TIMED_MOCK';

  // streak-relevant history INCLUDING this session, chronological
  const streakHistory = withSession.testSessions
    .filter(
      (s) =>
        s.engineId === engine.id &&
        (s.mode === 'FULL_RECALL' || s.mode === 'TIMED_MOCK'),
    )
    .slice()
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
    .map((s) => ({ result: s.result, recordedAt: s.recordedAt }));

  const event: MaturityEvent = {
    result: session.result,
    sessionMode: session.mode,
    recordedAt: session.recordedAt,
    firstPassAt: currentStreakStart(streakHistory),
  };
  const maturity = applyMaturityTransition(
    {
      retrievalReliability: engine.retrievalReliability,
      passStreak: engine.passStreak,
    },
    event,
  );

  const nextEngine: Engine = {
    ...engine,
    retrievalReliability: maturity.retrievalReliability,
    passStreak: maturity.passStreak,
    lastTestedAt: isColdRecall ? session.recordedAt : engine.lastTestedAt,
    // comprehension self-mark: apply if present (SHAKY or SOLID), else unchanged.
    comprehension: session.comprehensionAfter ?? engine.comprehension,
  };

  return {
    ...withSession,
    engines: data.engines.map((e) => (e.id === engine.id ? nextEngine : e)),
  };
}

export function addLeak(data: CosmosData, leak: LeakEntry): CosmosData {
  return { ...data, leaks: [...data.leaks, leak] };
}

export function upsertCourse(data: CosmosData, course: Course): CosmosData {
  const exists = data.courses.some((c) => c.id === course.id);
  return {
    ...data,
    courses: exists
      ? data.courses.map((c) => (c.id === course.id ? course : c))
      : [...data.courses, course],
  };
}

export function upsertEngine(data: CosmosData, engine: Engine): CosmosData {
  const exists = data.engines.some((e) => e.id === engine.id);
  return {
    ...data,
    engines: exists
      ? data.engines.map((e) => (e.id === engine.id ? engine : e))
      : [...data.engines, engine],
  };
}
