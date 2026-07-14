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
  MockDrill,
  MockRun,
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
  mockDrills: number;
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
    mockDrills: data.mockDrills.filter((d) => d.items.some((i) => i.courseId === courseId)).length,
  };
  const next: CosmosData = {
    ...data,
    courses: data.courses.filter((c) => c.id !== courseId),
    engines: data.engines.filter((e) => e.courseId !== courseId),
    testSessions: data.testSessions.filter((s) => !engineIds.has(s.engineId)),
    leaks: data.leaks.filter((l) => l.courseId !== courseId),
    mockRuns: data.mockRuns.filter((m) => m.courseId !== courseId),
    mockDrills: data.mockDrills.filter((d) => !d.items.some((i) => i.courseId === courseId)),
  };
  return { data: next, counts };
}

export function cascadeDeleteEngine(
  data: CosmosData,
  engineId: string,
): { data: CosmosData; counts: CascadeCounts } {
  const counts: CascadeCounts = {
    engines: 1,
    testSessions: data.testSessions.filter((s) => s.engineId === engineId).length,
    leaks: data.leaks.filter((l) => l.engineId === engineId).length,
    mockRuns: 0, // Mock runs aren't deleted, just their misses are updated
    mockDrills: data.mockDrills.filter((d) => d.items.some((i) => i.engineId === engineId))
      .length,
  };

  const next: CosmosData = {
    ...data,
    engines: data.engines.filter((e) => e.id !== engineId),
    testSessions: data.testSessions.filter((s) => s.engineId !== engineId),
    leaks: data.leaks.filter((l) => l.engineId !== engineId),
    mockRuns: data.mockRuns.map((m) => ({
      ...m,
      misses: m.misses.map((miss) =>
        miss.engineId === engineId ? { ...miss, engineId: null } : miss,
      ),
    })),
    mockDrills: data.mockDrills.filter(
      (d) => !d.items.some((i) => i.engineId === engineId),
    ),
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

// F2 AC2.5 — the mandatory defaults for a newly created engine. The caller adds
// id / courseId / title / gate / steps / trigger / satellites / createdAt; these
// fields are fixed so the invariant (DOCTRINAL / SHAKY / UNTESTED / streak 0 /
// stacking false) can't drift. Neither maturity axis starts advanced.
export const NEW_ENGINE_DEFAULTS = {
  engineType: 'DOCTRINAL',
  stacking: false,
  comprehension: 'SHAKY',
  retrievalReliability: 'UNTESTED',
  passStreak: 0,
  lastTestedAt: null,
} as const;

// F6 AC6.1 / AC6.2 — record a mock run; for every miss tagged with an engine,
// write a COMMITTED LeakEntry (source MOCK). Leak id + createdAt are DERIVED
// (miss id + the run's takenAt), so this stays pure/deterministic — no id or
// clock generation inside the core. Misses with engineId: null produce no leak
// (nothing to attribute) and surface in the UI as "create engine from this miss".
export function addMockRun(data: CosmosData, run: MockRun): CosmosData {
  const mockLeaks: LeakEntry[] = run.misses
    .filter((m) => m.engineId !== null)
    .map((m) => ({
      id: `leak:mock:${m.id}`,
      engineId: m.engineId as string,
      courseId: run.courseId,
      type: m.leakType,
      status: 'COMMITTED',
      source: 'MOCK',
      description: m.description,
      createdAt: run.takenAt,
    }));
  return {
    ...data,
    mockRuns: [...data.mockRuns, run],
    leaks: [...data.leaks, ...mockLeaks],
  };
}

// v1.1 — MockDrill mutations (SPEC_TIMED_MOCK.md)
export function addMockDrill(data: CosmosData, drill: MockDrill): CosmosData {
  return { ...data, mockDrills: [...data.mockDrills, drill] };
}

export function updateMockDrill(data: CosmosData, drill: MockDrill): CosmosData {
  return {
    ...data,
    mockDrills: data.mockDrills.map((d) => (d.id === drill.id ? drill : d)),
  };
}

// F6 AC6.4 — mark one mock miss drilled. ONLY via explicit user action; a
// cold-recall PASS must NEVER auto-clear a miss (that's a fenced v2 rule — the
// evidence type must match the failure type).
export function markMissDrilled(
  data: CosmosData,
  mockRunId: string,
  missId: string,
): CosmosData {
  return {
    ...data,
    mockRuns: data.mockRuns.map((run) =>
      run.id !== mockRunId
        ? run
        : {
            ...run,
            misses: run.misses.map((m) =>
              m.id === missId ? { ...m, drilled: true } : m,
            ),
          },
    ),
  };
}
