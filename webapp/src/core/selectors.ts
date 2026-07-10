// v1-core/selectors.ts
// Pure derived views: the "study next" ordering (COSMOS_V1_SPEC.md F7 / AC7.2)
// and the per-course leak profile (§1.6 / AC7.3). No UI, no I/O.

import type {
  Engine,
  LeakEntry,
  LeakSource,
  LeakStatus,
  LeakType,
  MockRun,
  RetrievalReliability,
} from './types';

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

// F6 AC6.4 — the drill list: engines with ≥1 UNDRILLED mock miss, most-recent
// mock first. (Undrilled state is cleared only by an explicit user mark — see
// mutations.markMissDrilled — never by a passing session.)
export interface DrillListItem {
  engine: Engine;
  mostRecentMockAt: string;
  undrilledMissCount: number;
}

export function drillList(
  engines: ReadonlyArray<Engine>,
  mockRuns: ReadonlyArray<MockRun>,
): DrillListItem[] {
  const byEngine = new Map<string, { at: string; count: number }>();
  for (const run of mockRuns) {
    for (const miss of run.misses) {
      if (miss.drilled || !miss.engineId) continue;
      const cur = byEngine.get(miss.engineId);
      if (!cur) {
        byEngine.set(miss.engineId, { at: run.takenAt, count: 1 });
      } else {
        byEngine.set(miss.engineId, {
          at: run.takenAt > cur.at ? run.takenAt : cur.at,
          count: cur.count + 1,
        });
      }
    }
  }
  const items: DrillListItem[] = [];
  for (const e of engines) {
    const hit = byEngine.get(e.id);
    if (hit) {
      items.push({
        engine: e,
        mostRecentMockAt: hit.at,
        undrilledMissCount: hit.count,
      });
    }
  }
  // most-recent mock first (ISO strings sort chronologically)
  return items.sort((a, b) =>
    a.mostRecentMockAt < b.mostRecentMockAt
      ? 1
      : a.mostRecentMockAt > b.mostRecentMockAt
        ? -1
        : 0,
  );
}

// F7 AC7.1 — two-axis maturity grid (comprehension × retrieval) counts, optionally
// scoped to a course. Renders as the dashboard's "SOLID+FRAGILE at a glance" grid.
export interface MaturityGrid {
  SHAKY: Record<RetrievalReliability, number>;
  SOLID: Record<RetrievalReliability, number>;
  total: number;
}

export function maturityGrid(
  engines: ReadonlyArray<Engine>,
  courseId?: string,
): MaturityGrid {
  const zero = (): Record<RetrievalReliability, number> => ({
    UNTESTED: 0,
    FRAGILE: 0,
    RELIABLE: 0,
  });
  const grid: MaturityGrid = { SHAKY: zero(), SOLID: zero(), total: 0 };
  for (const e of engines) {
    if (courseId !== undefined && e.courseId !== courseId) continue;
    grid[e.comprehension][e.retrievalReliability] += 1;
    grid.total += 1;
  }
  return grid;
}

// F5 AC5.1 — leak-log filtering + counts. filterLeaks applies any subset of the
// five filters; leakCounts tallies by type, split COMMITTED vs GUARDED.
export interface LeakFilter {
  courseId?: string;
  engineId?: string;
  type?: LeakType;
  status?: LeakStatus;
  source?: LeakSource;
}

export function filterLeaks(
  leaks: ReadonlyArray<LeakEntry>,
  f: LeakFilter = {},
): LeakEntry[] {
  return leaks.filter(
    (l) =>
      (f.courseId === undefined || l.courseId === f.courseId) &&
      (f.engineId === undefined || l.engineId === f.engineId) &&
      (f.type === undefined || l.type === f.type) &&
      (f.status === undefined || l.status === f.status) &&
      (f.source === undefined || l.source === f.source),
  );
}

export interface LeakCounts {
  committed: Record<LeakType, number>;
  guarded: Record<LeakType, number>;
  total: number;
}

export function leakCounts(leaks: ReadonlyArray<LeakEntry>): LeakCounts {
  const zero = (): Record<LeakType, number> => ({
    GATE_SKIP: 0,
    WRONG_TOOL: 0,
    PRECISION: 0,
  });
  const out: LeakCounts = { committed: zero(), guarded: zero(), total: 0 };
  for (const l of leaks) {
    (l.status === 'COMMITTED' ? out.committed : out.guarded)[l.type] += 1;
    out.total += 1;
  }
  return out;
}
