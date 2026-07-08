// v1-core/migrate.ts
// One-time migration from the v0 prototype store to v1 CosmosData
// (COSMOS_V1_SPEC §5 step 6). Pure. The legacy shape is defined here so v1-core
// stays self-contained — no import from the frozen prototype.
//
// The prototype stored `AppData { courses, engines, leaks }` under localStorage
// key `engine-study-v1`, using the single-axis ladder.

import type {
  Comprehension,
  CosmosData,
  Engine,
  ExamProfile,
  LeakEntry,
  LeakType,
  RetrievalReliability,
} from './types';

export interface LegacyCourse {
  id: string;
  name: string;
}
export interface LegacyEngine {
  id: string;
  courseId: string;
  title: string;
  gate: string;
  steps: string[];
  trigger: string;
  satellites: string[];
  maturity: 'DRAFTED' | 'TESTED' | 'STABLE' | 'REFLEX';
  lastTestedAt: string | null;
}
export interface LegacyLeak {
  id: string;
  engineId: string;
  description: string;
  type: LeakType;
  createdAt: string;
}
export interface LegacyAppData {
  courses: LegacyCourse[];
  engines: LegacyEngine[];
  leaks: LegacyLeak[];
}

// §5 mapping: DRAFTED→SHAKY/UNTESTED, TESTED/STABLE→SOLID/FRAGILE, REFLEX→SOLID/RELIABLE.
// ⚑ passStreak is unspecified by §5 — set to 0 for every migrated engine (a fresh
// v1 start; v0 passes weren't under the 48h regime, so they don't carry). The
// retrievalReliability axis carries the maturity signal.
function mapMaturity(m: LegacyEngine['maturity']): {
  comprehension: Comprehension;
  retrievalReliability: RetrievalReliability;
} {
  switch (m) {
    case 'DRAFTED':
      return { comprehension: 'SHAKY', retrievalReliability: 'UNTESTED' };
    case 'TESTED':
    case 'STABLE':
      return { comprehension: 'SOLID', retrievalReliability: 'FRAGILE' };
    case 'REFLEX':
      return { comprehension: 'SOLID', retrievalReliability: 'RELIABLE' };
  }
}

// ⚑ v0 had no exam profile — this placeholder is intended for the user to edit
// after migrating (F1). MIXED / no flags is the least-assuming default.
const PLACEHOLDER_PROFILE: ExamProfile = {
  openBook: false,
  appliedVsMemorization: 'MIXED',
  pathGraded: false,
  modes: [],
};

export function migrateLegacy(
  legacy: LegacyAppData,
  createdAt = new Date(0).toISOString(),
): CosmosData {
  const engineCourse = new Map(legacy.engines.map((e) => [e.id, e.courseId]));

  const engines: Engine[] = legacy.engines.map((e) => {
    const mat = mapMaturity(e.maturity);
    return {
      id: e.id,
      courseId: e.courseId,
      engineType: 'DOCTRINAL',
      title: e.title,
      gate: e.gate,
      steps: e.steps,
      trigger: e.trigger,
      satellites: e.satellites,
      stacking: false,
      comprehension: mat.comprehension,
      retrievalReliability: mat.retrievalReliability,
      passStreak: 0,
      lastTestedAt: e.lastTestedAt,
      createdAt,
    };
  });

  const leaks: LeakEntry[] = legacy.leaks.map((l) => ({
    id: l.id,
    engineId: l.engineId,
    courseId: engineCourse.get(l.engineId) ?? '',
    type: l.type,
    status: 'COMMITTED', // §5: old leaks become COMMITTED / COLD_TEST
    source: 'COLD_TEST',
    description: l.description,
    createdAt: l.createdAt,
  }));

  return {
    courses: legacy.courses.map((c) => ({
      id: c.id,
      name: c.name,
      examProfile: { ...PLACEHOLDER_PROFILE },
    })),
    engines,
    testSessions: [],
    leaks,
    mockRuns: [],
    mockDrills: [],
  };
}
