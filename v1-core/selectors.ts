// v1-core/selectors.ts
// Pure derived views: the "study next" ordering (COSMOS_V1_SPEC.md F7 / AC7.2)
// and the per-course leak profile (§1.6 / AC7.3). No UI, no I/O.

import type { Engine, LeakEntry, LeakType, MockRun } from './types';

const LEAK_TYPES: readonly LeakType[] = ['GATE_SKIP', 'WRONG_TOOL', 'PRECISION'];

/** engineIds referenced by at least one undrilled mock miss. */
export function engineIdsWithUndrilledMisses(
  mockRuns: ReadonlyArray<MockRun>,
): Set<string> {
  const ids = new Set<string>();
  for (const run of mockRuns) {
    for (const miss of run.misses) {
      if (!miss.drilled && miss.engineId) ids.add(miss.engineId);
    }
  }
  return ids;
}

/**
 * AC7.2 ordering, deterministic:
 *   (1) engines with an undrilled mock miss
 *   (2) UNTESTED
 *   (3) FRAGILE, oldest-tested first
 *   (4) RELIABLE, oldest-tested first
 * Within every group, tie-break by lastTestedAt ascending (never-tested first).
 */
export function studyNext(
  engines: ReadonlyArray<Engine>,
  mockRuns: ReadonlyArray<MockRun>,
): Engine[] {
  const flagged = engineIdsWithUndrilledMisses(mockRuns);
  const rank = (e: Engine): number => {
    if (flagged.has(e.id)) return 0;
    if (e.retrievalReliability === 'UNTESTED') return 1;
    if (e.retrievalReliability === 'FRAGILE') return 2;
    return 3; // RELIABLE
  };
  // never-tested (null) sorts first == "oldest".
  const testedKey = (e: Engine): number =>
    e.lastTestedAt ? Date.parse(e.lastTestedAt) : Number.NEGATIVE_INFINITY;
  return [...engines].sort(
    (a, b) => rank(a) - rank(b) || testedKey(a) - testedKey(b),
  );
}

export interface LeakProfile {
  counts: Record<LeakType, number>; // COMMITTED only
  dominant: LeakType | null; // null if no committed leaks; ties break by taxonomy order
  totalCommitted: number;
  trend30Days: Record<LeakType, number>; // committed leaks within the window
}

/**
 * Per-course leak profile from COMMITTED leaks only (GUARDED leaks never count).
 * `nowIso` is injected for determinism; `windowDays` defaults to 30.
 */
export function computeLeakProfile(
  leaks: ReadonlyArray<LeakEntry>,
  courseId: string,
  nowIso: string,
  windowDays = 30,
): LeakProfile {
  const counts: Record<LeakType, number> = {
    GATE_SKIP: 0,
    WRONG_TOOL: 0,
    PRECISION: 0,
  };
  const trend30Days: Record<LeakType, number> = {
    GATE_SKIP: 0,
    WRONG_TOOL: 0,
    PRECISION: 0,
  };
  const cutoff = Date.parse(nowIso) - windowDays * 86_400_000;
  let totalCommitted = 0;

  for (const l of leaks) {
    if (l.courseId !== courseId || l.status !== 'COMMITTED') continue;
    counts[l.type] += 1;
    totalCommitted += 1;
    if (Date.parse(l.createdAt) >= cutoff) trend30Days[l.type] += 1;
  }

  let dominant: LeakType | null = null;
  let max = 0;
  for (const t of LEAK_TYPES) {
    if (counts[t] > max) {
      max = counts[t];
      dominant = t;
    }
  }

  return { counts, dominant, totalCommitted, trend30Days };
}
