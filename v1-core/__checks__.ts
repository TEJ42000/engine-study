// v1-core/__checks__.ts
// Executable verification of the spec-critical logic. No test framework — compile
// with `tsc -p v1-core/tsconfig.json` and run `node v1-core/dist/__checks__.js`.
// Throws (non-zero exit) if any assertion fails.

import {
  applyMaturityTransition,
  currentStreakStart,
  type MaturityState,
} from './maturity';
import { studyNext, computeLeakProfile } from './selectors';
import { parseEnvelope, buildEnvelope, emptyData } from './persistence';
import {
  splitPastedLines,
  extractPrecisionTargets,
  stripPrecisionBraces,
  suggestPrecisionTargets,
  hasPrecisionTargets,
} from './text';
import { SEED } from './fixtures/seed';
import {
  loadData,
  saveData,
  exportToJson,
  importFromJson,
  type StorageLike,
} from './storage';
import {
  deriveDrillEmphasisHint,
  cascadeDeleteCourse,
  recordSession,
} from './mutations';
import { migrateLegacy, type LegacyAppData } from './migrate';
import type {
  CosmosData,
  Engine,
  LeakEntry,
  Result,
  SessionMode,
  TestSession,
} from './types';

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (cond) {
    console.log('  ✓ ' + msg);
  } else {
    failures++;
    console.error('  ✗ ' + msg);
  }
}

// Fold a chronological session list into a final maturity state, exactly as the
// store would: derive firstPassAt from streak-relevant history each step.
type Ev = { result: Result; sessionMode: SessionMode; recordedAt: string };
function fold(events: Ev[]): MaturityState {
  let state: MaturityState = {
    retrievalReliability: 'UNTESTED',
    passStreak: 0,
  };
  const streakHistory: { result: Result; recordedAt: string }[] = [];
  for (const e of events) {
    if (e.sessionMode === 'FULL_RECALL' || e.sessionMode === 'TIMED_MOCK') {
      streakHistory.push({ result: e.result, recordedAt: e.recordedAt });
    }
    const firstPassAt = currentStreakStart(streakHistory);
    state = applyMaturityTransition(state, { ...e, firstPassAt });
  }
  return state;
}

const t0 = '2026-07-01T09:00:00Z';
const tPlus1h = '2026-07-01T10:00:00Z';
const tPlus2h = '2026-07-01T11:00:00Z';
const t24 = '2026-07-02T09:00:00Z';
const t48 = '2026-07-03T09:00:00Z';
const t72 = '2026-07-04T09:00:00Z';
const P = (recordedAt: string, mode: SessionMode = 'FULL_RECALL'): Ev => ({
  result: 'PASS',
  sessionMode: mode,
  recordedAt,
});
const F = (recordedAt: string, mode: SessionMode = 'FULL_RECALL'): Ev => ({
  result: 'FAIL',
  sessionMode: mode,
  recordedAt,
});
const mkEngine = (
  id: string,
  retrievalReliability: Engine['retrievalReliability'],
  lastTestedAt: string | null,
): Engine => ({
  id,
  courseId: 'c1',
  engineType: 'DOCTRINAL',
  title: id,
  gate: '',
  steps: [],
  trigger: '',
  satellites: [],
  stacking: false,
  comprehension: 'SHAKY',
  retrievalReliability,
  passStreak: 0,
  lastTestedAt,
  createdAt: t0,
});

console.log('maturity:');
{
  const s = fold([P(t0), P(t24), P(t48)]);
  assert(
    s.retrievalReliability === 'RELIABLE' && s.passStreak === 3,
    '3 passes across >=48h -> RELIABLE (AC3.3)',
  );
}
{
  const s = fold([P(t0), P(tPlus1h), P(tPlus2h)]);
  assert(
    s.retrievalReliability === 'FRAGILE' && s.passStreak === 3,
    '3 passes within 48h -> stays FRAGILE, no cramming (AC3.3)',
  );
}
{
  const s = fold([P(t0), P(t24), P(t48), F(t72)]);
  assert(
    s.retrievalReliability === 'FRAGILE' && s.passStreak === 0,
    'FAIL from RELIABLE -> FRAGILE + streak reset (AC3.4)',
  );
}
{
  const s = fold([P(t0), P(t24), P(t48), F(t72, 'PRECISION_CHECK')]);
  assert(
    s.retrievalReliability === 'FRAGILE' && s.passStreak === 3,
    'PRECISION_CHECK FAIL demotes RELIABLE->FRAGILE, streak untouched',
  );
}
{
  const s = fold([P(t0), P(t24), P(t48), P(t72, 'PRECISION_CHECK')]);
  assert(
    s.retrievalReliability === 'RELIABLE' && s.passStreak === 3,
    'PRECISION_CHECK PASS is a no-op (asymmetric by design)',
  );
}
{
  const s = fold([P(t0, 'TIMED_MOCK'), P(t24, 'TIMED_MOCK'), P(t48, 'TIMED_MOCK')]);
  assert(
    s.retrievalReliability === 'RELIABLE' && s.passStreak === 3,
    'TIMED_MOCK passes feed maturity like full recall (v1.1)',
  );
}
{
  const s = fold([F(t0)]);
  assert(
    s.retrievalReliability === 'FRAGILE' && s.passStreak === 0,
    'first result (a FAIL) moves UNTESTED -> FRAGILE',
  );
}

console.log('studyNext:');
{
  const mk = (
    id: string,
    rel: Engine['retrievalReliability'],
    lastTestedAt: string | null,
  ): Engine => ({
    id,
    courseId: 'c1',
    engineType: 'DOCTRINAL',
    title: id,
    gate: '',
    steps: [],
    trigger: '',
    satellites: [],
    stacking: false,
    comprehension: 'SHAKY',
    retrievalReliability: rel,
    passStreak: 0,
    lastTestedAt,
    createdAt: t0,
  });
  const engines: Engine[] = [
    mk('reliable', 'RELIABLE', t0),
    mk('fragileNew', 'FRAGILE', t48),
    mk('fragileOld', 'FRAGILE', t0),
    mk('untested', 'UNTESTED', null),
    mk('flagged', 'RELIABLE', t72), // RELIABLE but has an undrilled miss -> group 0
  ];
  const mockRuns = [
    {
      id: 'm1',
      courseId: 'c1',
      label: 'past paper',
      takenAt: t0,
      notes: '',
      misses: [
        {
          id: 'x',
          description: '',
          engineId: 'flagged',
          leakType: 'GATE_SKIP' as const,
          drilled: false,
        },
      ],
    },
  ];
  const order = studyNext(engines, mockRuns).map((e) => e.id);
  assert(
    JSON.stringify(order) ===
      JSON.stringify([
        'flagged',
        'untested',
        'fragileOld',
        'fragileNew',
        'reliable',
      ]),
    'order: undrilled-miss -> UNTESTED -> FRAGILE(oldest) -> RELIABLE (AC7.2)',
  );
}

console.log('leakProfile:');
{
  const leak = (
    type: LeakEntry['type'],
    status: LeakEntry['status'],
    createdAt: string,
  ): LeakEntry => ({
    id: Math.random().toString(),
    engineId: 'e1',
    courseId: 'c1',
    type,
    status,
    source: 'COLD_TEST',
    description: '',
    createdAt,
  });
  const leaks: LeakEntry[] = [
    leak('PRECISION', 'COMMITTED', t72),
    leak('PRECISION', 'COMMITTED', t0),
    leak('GATE_SKIP', 'COMMITTED', t72),
    leak('GATE_SKIP', 'GUARDED', t72), // guarded -> ignored
    { ...leak('WRONG_TOOL', 'COMMITTED', t72), courseId: 'other' }, // other course -> ignored
  ];
  const prof = computeLeakProfile(leaks, 'c1', '2026-07-04T12:00:00Z');
  assert(prof.totalCommitted === 3, 'counts committed, this-course leaks only');
  assert(prof.dominant === 'PRECISION', 'dominant = most-committed type');
  assert(prof.counts.WRONG_TOOL === 0, 'other-course leak excluded');
  assert(
    prof.trend30Days.PRECISION === 2 && prof.counts.PRECISION === 2,
    'trend window counts recent committed leaks',
  );
}

console.log('persistence:');
{
  const env = buildEnvelope(emptyData());
  const good = parseEnvelope(JSON.stringify(env));
  assert(good.ok === true, 'round-trips a valid envelope');

  const bad = parseEnvelope(JSON.stringify({ schemaVersion: 99, data: {} }));
  assert(
    bad.ok === false && /Unsupported schemaVersion 99/.test(bad.reason),
    'unknown schemaVersion is BLOCKED, not wiped (AC8.3)',
  );

  const notJson = parseEnvelope('{ not json');
  assert(notJson.ok === false, 'malformed JSON is rejected cleanly');

  const older = parseEnvelope(
    JSON.stringify({ schemaVersion: 1, data: { courses: [] } }),
  );
  assert(
    older.ok === true && Array.isArray(older.data.mockDrills),
    'missing additive collection (mockDrills) defaults to []',
  );
}

console.log('text helpers:');
{
  assert(
    JSON.stringify(splitPastedLines('1. a\n2) b\n- c\n* d\n• e\n\n  f  ')) ===
      JSON.stringify(['a', 'b', 'c', 'd', 'e', 'f']),
    'splitPastedLines strips list markers, trims, drops blanks (AC2.2)',
  );
  assert(
    JSON.stringify(
      extractPrecisionTargets('see {{C-101/01}} and {{Art 2}} ok'),
    ) === JSON.stringify(['C-101/01', 'Art 2']),
    'extractPrecisionTargets pulls {{ }} spans',
  );
  assert(
    stripPrecisionBraces('ceiling is {{20M}} EUR') === 'ceiling is 20M EUR',
    'stripPrecisionBraces keeps inner text for normal render',
  );
  const sugg = suggestPrecisionTargets(
    'Under Art 6(1) and C-212/13 Ryneš in 2014, per Schrems v Facebook.',
  );
  assert(
    sugg.includes('Art 6(1)') &&
      sugg.includes('C-212/13') &&
      sugg.includes('2014') &&
      sugg.some((s) => /Schrems v/.test(s)),
    'suggestPrecisionTargets finds article refs, case numbers, years, X v Y (AC2.4)',
  );
}

console.log('seed fixture:');
{
  assert(
    SEED.courses.length >= 1 && SEED.engines.length >= 1,
    'seed has courses + engines',
  );
  const eng = SEED.engines.find((e) => e.id === 'gdpr-applies');
  assert(eng !== undefined, 'seed includes the gdpr-applies engine');
  if (eng) {
    const streakSessions = SEED.testSessions
      .filter(
        (s) =>
          s.engineId === eng.id &&
          (s.mode === 'FULL_RECALL' || s.mode === 'TIMED_MOCK'),
      )
      .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
      .map((s) => ({
        result: s.result,
        sessionMode: s.mode,
        recordedAt: s.recordedAt,
      }));
    const replayed = fold(streakSessions);
    assert(
      replayed.retrievalReliability === eng.retrievalReliability &&
        replayed.passStreak === eng.passStreak,
      'seed is consistent: replaying sessions reproduces stored maturity',
    );
  }
  assert(
    SEED.engines.some((e) =>
      hasPrecisionTargets([...e.steps, ...e.satellites].join(' ')),
    ),
    'seed exercises precision targets ({{ }} present)',
  );
}

console.log('storage:');
{
  const mem = new Map<string, string>();
  const store: StorageLike = {
    getItem: (k) => (mem.has(k) ? (mem.get(k) as string) : null),
    setItem: (k, v) => void mem.set(k, v),
  };
  const empty = loadData(store);
  assert(empty.ok && empty.fresh, 'empty storage -> fresh empty data');

  const data = emptyData();
  data.courses.push({
    id: 'c1',
    name: 'X',
    examProfile: { openBook: true, appliedVsMemorization: 'APPLIED', pathGraded: false, modes: [] },
  });
  saveData(store, data);
  const loaded = loadData(store);
  assert(
    loaded.ok && !loaded.fresh && loaded.data.courses.length === 1,
    'saveData -> loadData round-trips',
  );

  store.setItem('cosmos-v1', JSON.stringify({ schemaVersion: 99, data: {} }));
  const blocked = loadData(store);
  assert(
    !blocked.ok && /schemaVersion 99/.test(blocked.reason),
    'unknown stored schemaVersion -> ok:false WITH raw (never wiped, AC8.3)',
  );
  assert(importFromJson(exportToJson(data)).ok === true, 'export -> import round-trips');
}

console.log('mutations:');
{
  assert(
    deriveDrillEmphasisHint({ openBook: true, appliedVsMemorization: 'APPLIED', pathGraded: true, modes: [] }) ===
      'navigation/lookup + answer machinery + sequence order',
    'deriveDrillEmphasisHint composes profile flags (AC1.2)',
  );
  assert(
    deriveDrillEmphasisHint({ openBook: false, appliedVsMemorization: 'MEMORIZATION', pathGraded: false, modes: [] }) ===
      'spaced recall',
    'deriveDrillEmphasisHint: memorization -> spaced recall',
  );

  const d: CosmosData = {
    ...emptyData(),
    courses: [{ id: 'c1', name: 'C1', examProfile: { openBook: false, appliedVsMemorization: 'MIXED', pathGraded: false, modes: [] } }],
    engines: [mkEngine('e1', 'FRAGILE', t0)],
    testSessions: [{ id: 's0', engineId: 'e1', mode: 'FULL_RECALL', gateAttempt: 'g', attempt: 'a', result: 'PASS', comprehensionAfter: 'SOLID', startedAt: t0, recordedAt: t0 }],
    leaks: [{ id: 'l1', engineId: 'e1', courseId: 'c1', type: 'PRECISION', status: 'COMMITTED', source: 'COLD_TEST', description: 'x', createdAt: t0 }],
  };
  const { data: afterDel, counts } = cascadeDeleteCourse(d, 'c1');
  assert(
    counts.engines === 1 && counts.testSessions === 1 && counts.leaks === 1 &&
      afterDel.courses.length === 0 && afterDel.engines.length === 0 &&
      afterDel.testSessions.length === 0 && afterDel.leaks.length === 0,
    'cascadeDeleteCourse removes engines+sessions+leaks and reports counts (AC1.3)',
  );

  const eng = mkEngine('e2', 'UNTESTED', null);
  const base: CosmosData = { ...emptyData(), engines: [eng] };
  const sess: TestSession = { id: 's1', engineId: 'e2', mode: 'FULL_RECALL', gateAttempt: 'g', attempt: 'my recall', result: 'PASS', comprehensionAfter: 'SOLID', startedAt: t0, recordedAt: t0 };
  const after = recordSession(base, sess);
  const e2 = after.engines[0];
  assert(
    after.testSessions.length === 1 && e2.retrievalReliability === 'FRAGILE' &&
      e2.passStreak === 1 && e2.lastTestedAt === t0 && e2.comprehension === 'SOLID',
    'recordSession stores attempt + applies maturity + comprehension + lastTestedAt (F3/§1.2)',
  );
}

console.log('migrate (v0 -> v1):');
{
  const legacy: LegacyAppData = {
    courses: [{ id: 'c1', name: 'Tech Law' }],
    engines: [
      { id: 'e1', courseId: 'c1', title: 'T', gate: 'g', steps: ['s'], trigger: 't', satellites: [], maturity: 'REFLEX', lastTestedAt: t0 },
      { id: 'e2', courseId: 'c1', title: 'U', gate: 'g', steps: [], trigger: 't', satellites: [], maturity: 'DRAFTED', lastTestedAt: null },
    ],
    leaks: [{ id: 'l1', engineId: 'e1', description: 'slip', type: 'PRECISION', createdAt: t0 }],
  };
  const v1 = migrateLegacy(legacy);
  const e1 = v1.engines.find((e) => e.id === 'e1');
  const e2 = v1.engines.find((e) => e.id === 'e2');
  assert(
    e1 !== undefined && e1.retrievalReliability === 'RELIABLE' && e1.comprehension === 'SOLID',
    'REFLEX -> SOLID / RELIABLE (§5)',
  );
  assert(
    e2 !== undefined && e2.retrievalReliability === 'UNTESTED' && e2.comprehension === 'SHAKY',
    'DRAFTED -> SHAKY / UNTESTED (§5)',
  );
  assert(
    v1.leaks[0].status === 'COMMITTED' && v1.leaks[0].source === 'COLD_TEST' && v1.leaks[0].courseId === 'c1',
    'legacy leak -> COMMITTED / COLD_TEST with denormalized courseId (§5)',
  );
  assert(
    v1.courses[0].examProfile !== undefined && Array.isArray(v1.mockDrills),
    'migrated course gets a (placeholder) examProfile; v1 shape complete',
  );
}

if (failures > 0) {
  throw new Error(`\n${failures} check(s) FAILED`);
}
console.log('\nAll v1-core checks passed.');
