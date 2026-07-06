// v1-core/types.ts
// The canonical v1 (+ v1.1) data model, transcribed verbatim from
// COSMOS_V1_SPEC.md (§1) and SPEC_TIMED_MOCK.md (§2). This is the shared
// contract: framework-agnostic, no UI. Build the React app on top of it.
//
// IDs are opaque strings; timestamps are ISO 8601 strings.

export type EngineType = 'DOCTRINAL' | 'ANSWER_STRUCTURE';
export type Comprehension = 'SHAKY' | 'SOLID';
export type RetrievalReliability = 'UNTESTED' | 'FRAGILE' | 'RELIABLE';
export type Result = 'PASS' | 'FAIL';

// FULL_RECALL + PRECISION_CHECK are v1 (COSMOS_V1_SPEC §1.3).
// TIMED_MOCK is the v1.1 addition (SPEC_TIMED_MOCK §2).
export type SessionMode = 'FULL_RECALL' | 'PRECISION_CHECK' | 'TIMED_MOCK';

export type LeakType = 'GATE_SKIP' | 'WRONG_TOOL' | 'PRECISION';
export type LeakStatus = 'COMMITTED' | 'GUARDED';
// COLD_TEST/PRECISION_CHECK/MOCK/MANUAL are v1; TIMED_MOCK is v1.1.
export type LeakSource =
  | 'COLD_TEST'
  | 'PRECISION_CHECK'
  | 'MOCK'
  | 'MANUAL'
  | 'TIMED_MOCK';

export interface ExamProfile {
  openBook: boolean;
  appliedVsMemorization: 'APPLIED' | 'MEMORIZATION' | 'MIXED';
  pathGraded: boolean;
  modes: string[];
}

export interface Course {
  id: string;
  name: string;
  examProfile: ExamProfile;
}

export interface Engine {
  id: string;
  courseId: string;
  engineType: EngineType; // default DOCTRINAL
  title: string; // names the situation, never the sources
  gate: string; // the wrong-tool / go-no-go question
  steps: string[]; // ordered; may contain {{precision target}} spans
  trigger: string;
  satellites: string[];
  stacking: boolean; // default false — per-engine "stack all grounds" property
  comprehension: Comprehension; // default SHAKY
  retrievalReliability: RetrievalReliability; // default UNTESTED
  passStreak: number; // consecutive full-recall/timed passes
  lastTestedAt: string | null;
  createdAt: string;
}

export interface TestSession {
  id: string;
  engineId: string;
  mode: SessionMode;
  gateAttempt: string; // FULL_RECALL only
  attempt: string; // stored verbatim — never discarded (the L1 rule)
  result: Result;
  comprehensionAfter: Comprehension | null; // null for PRECISION_CHECK / TIMED_MOCK
  startedAt: string;
  recordedAt: string;
  // v1.1 additive (SPEC_TIMED_MOCK §2) — optional, backward-compatible:
  timed?: boolean;
  mockDrillId?: string | null;
  elapsedSeconds?: number;
  timedOut?: boolean;
}

export interface LeakEntry {
  id: string;
  engineId: string;
  courseId: string; // denormalized — the leak profile is per-course
  type: LeakType;
  status: LeakStatus; // only COMMITTED feeds the leak profile
  source: LeakSource;
  description: string;
  createdAt: string;
}

export interface MockMiss {
  id: string;
  description: string;
  engineId: string | null; // null = no engine covers this miss yet
  leakType: LeakType;
  drilled: boolean; // cleared ONLY by explicit user action (never auto)
}

export interface MockRun {
  id: string;
  courseId: string;
  label: string;
  takenAt: string;
  notes: string;
  misses: MockMiss[];
}

// v1.1 — timed 2-question mock drill (SPEC_TIMED_MOCK §2)
export interface MockDrillItem {
  engineId: string;
  courseId: string;
  attempt: string; // persisted the instant the user leaves the item
  elapsedSeconds: number;
  timedOut: boolean;
  result: Result | null; // null until self-graded at reveal
  comprehensionAfter: Comprehension | null;
  testSessionId: string | null;
}

export interface MockDrill {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: 'IN_PROGRESS' | 'REVEALED' | 'COMPLETED' | 'ABANDONED';
  perQuestionSeconds: number; // default 450
  items: MockDrillItem[];
}

export interface CosmosData {
  courses: Course[];
  engines: Engine[];
  testSessions: TestSession[];
  leaks: LeakEntry[];
  mockRuns: MockRun[];
  mockDrills: MockDrill[]; // v1.1
}
