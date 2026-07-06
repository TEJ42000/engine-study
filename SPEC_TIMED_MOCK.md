# SPEC — Timed 2-Question Mock Drill

_Companion feature spec to [`COSMOS_V1_SPEC.md`](COSMOS_V1_SPEC.md). Version 2026-07-06._

## 0. Status & scope

**Candidate feature (target: v1.1).** This is a spec-complete, build-ready design
for the timed mock drill. It is **not** auto-merged into the locked v1 scope
(F1–F8) — whether it ships in v1, v1.1, or later is a scope decision for the
owner. The locked `COSMOS_V1_SPEC.md` is deliberately left untouched; this file
is additive.

**This spec supersedes the experimental sketch** at
`experimental/src/frontend/components/MiniMockTrainer.tsx`. That sketch is a
throwaway UI shell with four disqualifying defects, all fixed here:

1. **It discards the typed attempt.** On context-switch it calls
   `setStudentResponse('')` and saves nothing; on lock it saves nothing. The
   answer is lost. This violates the project's #1 rule (the written attempt MUST
   be stored — see `COSMOS_V1_SPEC.md` F3 / the L1 fix in `LEARNINGS.md`).
2. **It lies about it.** The lock screen shows "Response saved to diagnostic
   storage" while nothing is persisted.
3. **No reveal / self-grade / maturity / leak integration** — it just locks.
4. Hardcoded sample questions; recreates its interval every tick; no persistence
   across refresh.

The friction principle is non-negotiable here: **content stays cold until every
attempt is recorded, attempts are persisted, and maturity never moves without a
recorded graded result.**

---

## 1. Purpose & relationship to existing features

**What it trains:** context-switching between unrelated topics under time
pressure — decelerating out of one framework and accelerating into another
without carry-over confusion or mid-exam fatigue. The six-course analysis
(`REFINEMENT.md`, and the CTL two-mode exam in `extractions/COURSE_02…`) flagged
this as a real, distinct exam skill that single-engine drilling doesn't build.

**How it differs from what already exists:**

| Feature | What it is |
|---|---|
| Test Runner (F3) | One engine, untimed, gate-first scaffold. Trains a single sequence. |
| Mock Log (F6) | Records results of **external** past papers taken on paper. |
| **Timed Mock Drill (this spec)** | 2+ engines, **timed**, back-to-back, in-app, exam-sim (no gate-first scaffold). Trains context-switching under the clock. |

**What it reuses:** the cold-hide rule, attempt storage via `TestSession`, and
the self-grade → maturity + leak machinery. A graded mock item is cold recall
under harder (timed) conditions, so it feeds the retrieval-reliability axis like
a full-recall result.

---

## 2. Data model additions

All additions are backward-compatible with the locked v1 model (new optional
fields + one new collection + one new `SessionMode` value).

```ts
// Extend the locked SessionMode union (COSMOS_V1_SPEC.md §1.3):
type SessionMode = 'FULL_RECALL' | 'PRECISION_CHECK' | 'TIMED_MOCK';

// Extend CosmosData with one collection:
interface CosmosData {
  // ...existing: courses, engines, testSessions, leaks, mockRuns...
  mockDrills: MockDrill[];
}

interface MockDrill {
  id: string;
  startedAt: string;                 // ISO 8601
  completedAt: string | null;
  status: 'IN_PROGRESS' | 'REVEALED' | 'COMPLETED' | 'ABANDONED';
  perQuestionSeconds: number;        // default 450 (7.5 min); configurable
  items: MockDrillItem[];            // ordered; default length 2
}

interface MockDrillItem {
  engineId: string;
  courseId: string;
  attempt: string;                   // typed cold attempt — PERSISTED the instant the
                                     // user leaves this item (the core fix). Never blanked.
  elapsedSeconds: number;            // time spent on this item
  timedOut: boolean;                 // true = clock hit 0; false = committed early
  result: 'PASS' | 'FAIL' | null;    // null until self-graded at reveal
  comprehensionAfter: Comprehension | null;
  testSessionId: string | null;      // the TestSession created when this item is graded
}

// TestSession gains optional, additive fields (contract otherwise unchanged —
// a TestSession is still created only at grade time, always with a result):
interface TestSession {
  // ...existing fields...
  timed?: boolean;                   // true for TIMED_MOCK items
  mockDrillId?: string | null;       // links back to the MockDrill
  elapsedSeconds?: number;
  timedOut?: boolean;
}
```

The `MockDrillItem.attempt` is the durable home for the writing during the drill
(so nothing is ever lost, even on abandonment). When an item is graded, a
canonical `TestSession` (mode `TIMED_MOCK`) is created carrying the same attempt.

---

## 3. Screen flow

### 3.1 Setup
- Entry point: a "Timed Mock Drill" action on the Dashboard.
- **Engine selection.** Default: pick 2 engines that are **most due** (oldest
  `lastTestedAt`, nulls first) from **≥2 different courses**, to force a genuine
  context switch. User can override the picks. If fewer than 2 courses/engines
  exist, allow same-course selection but show a note that the context-switch
  benefit is reduced.
- **Config:** `perQuestionSeconds` (default 450), `questionCount` (default 2;
  allow 2–4). Start button creates a `MockDrill` (`status: IN_PROGRESS`).

### 3.2 Per-question (cold + timed)
- Show only the engine **title**, course, and a countdown. Engine content
  (gate/steps/trigger/satellites) is **hidden and not present in the DOM** (same
  guarantee as F3).
- A textarea for the attempt. Countdown from `perQuestionSeconds`; visible
  warning under 60s.
- The user either **Commits & switches** early or the clock hits 0 (auto-advance).
- **On leaving the item (commit or timeout):** immediately persist
  `attempt`, `elapsedSeconds`, `timedOut` onto the `MockDrillItem`. *Then* clear
  the input and load the next item with a fresh clock. The prior attempt is saved
  before the field is cleared — this is the fix for the sketch's discard bug.
- During question N, no earlier attempt or engine content is shown (stays cold).

### 3.3 Reveal + self-grade (only after all attempts recorded)
- When the last item is committed, `MockDrill.status → REVEALED`.
- For each item, show **side-by-side**: the user's stored attempt vs the full
  revealed engine content.
- The user self-grades each item **PASS/FAIL** using the standing convention
  (gate skipped, or a whole step lost/added → FAIL; wording slip → PASS + a
  `PRECISION` leak). On FAIL, prompt a leak (required, or skip-with-confirm —
  same as F3). Optional comprehension self-mark per item.
- Grading an item creates a `TestSession` (`mode: TIMED_MOCK`, `timed: true`,
  `mockDrillId`, `elapsedSeconds`, `timedOut`, `attempt`, `result`,
  `comprehensionAfter`) and applies the maturity transition + any leak.

### 3.4 Completion
- When all items are graded, `MockDrill.status → COMPLETED`, `completedAt` set.
- Summary: per item — result, elapsed time, `timedOut`, any leak — plus a
  context-switch readout (total time; whether either item timed out).

### 3.5 Abandonment
- Leaving mid-drill sets `status: ABANDONED`. **Any already-committed attempts are
  retained** (never discarded). Ungraded items produce no `TestSession` and move
  no maturity (no recorded result = no maturity movement — the core rule holds).

---

## 4. Maturity & leak rules

- A graded `TIMED_MOCK` item behaves as a **full-recall result** for maturity
  (it is cold recall, under time):
  - **PASS** → increment `passStreak`; may reach RELIABLE **only** under the
    locked 48h-window rule (3 passes, 3rd ≥48h after the 1st).
  - **FAIL** → set FRAGILE (from any state); reset `passStreak` to 0.
- **Ungraded/abandoned items never move maturity.**
- `timed: true` is recorded for analytics — "holds up under time" is the
  strongest retrieval-reliability evidence (see Open Decisions §8 for an optional
  stricter rule).
- Leaks logged from a mock item are `COMMITTED`, `source: MOCK` conceptually — but
  since they arise in an in-app drill, use a dedicated `source` value
  `TIMED_MOCK` (add to the `LeakSource` union) so the leak profile can tell
  in-app timed drills from external past-paper `MOCK` misses.

---

## 5. Friction-principle compliance (the checklist this must pass)

- ✅ **Cold-hide preserved** — engine content is not in the DOM until every
  attempt is recorded and the drill reaches REVEALED.
- ✅ **Attempts persisted** — each `MockDrillItem.attempt` is written the moment
  the user leaves the item; nothing is discarded, even on abandonment. (This is
  the concrete fix that makes the sketch's "Response saved" message true.)
- ✅ **No maturity without a recorded graded result** — abandonment and ungraded
  items move nothing.
- ✅ **No recognition-substitutes-for-recall** — the user writes cold before any
  reveal; grading is against the revealed model, self-marked.

---

## 6. Configuration & defaults

| Setting | Default | Range |
|---|---|---|
| `questionCount` | 2 | 2–4 |
| `perQuestionSeconds` | 450 (7.5 min) | 60–1800 |
| Engine selection | cross-course, most-due | user-overridable |

---

## 7. Acceptance criteria (testable)

- **ACM.1** Starting a drill with 2 engines hides all engine content (not in the
  DOM) and shows a per-question countdown from `perQuestionSeconds`.
- **ACM.2** Committing Q1 early **or** letting it time out **persists** the Q1
  attempt (survives to the reveal screen and is stored on the `MockDrillItem`);
  it is never blanked. A test asserts the Q1 text is retrievable after switching.
- **ACM.3** Q2 starts with a fresh clock and an empty input; Q1's attempt and all
  engine content are not shown during Q2.
- **ACM.4** The reveal screen appears **only** after both attempts are recorded,
  and shows both engines' content side-by-side with the stored attempts.
- **ACM.5** Grading an item PASS creates a `TestSession` (`mode: TIMED_MOCK`,
  `timed: true`, `mockDrillId` set) and applies the **same** maturity transition
  as a full-recall PASS (streak++, RELIABLE only with the 48h window).
- **ACM.6** Grading FAIL prompts a leak, sets FRAGILE, resets the streak; a
  `source: TIMED_MOCK`, `status: COMMITTED` leak is recorded.
- **ACM.7** Abandoning mid-drill sets `status: ABANDONED`, retains any committed
  attempts, and moves no maturity (a test asserts engine maturity is unchanged).
- **ACM.8** The completion summary shows per-item result, elapsed time,
  `timedOut`, and any leaks.
- **ACM.9** `MockDrill` records + produced `TestSession`s + leaks survive refresh
  and are included in export/import.

---

## 8. Export / versioning & open decisions

- **Export:** the envelope (`COSMOS_V1_SPEC.md` F8) gains a `mockDrills` array.
  This is additive; if `schemaVersion` is bumped, old exports lacking the field
  default it to `[]` on import.
- **Open decision — scope:** ship in v1.1, or defer to v2 alongside AI question
  generation? (Manual selection needs no AI, so v1.1 is viable now; auto-selecting
  cross-topic questions is trivial and deterministic.)
- **Open decision — stricter RELIABLE (optional):** consider requiring at least
  one `timed: true` PASS in the streak before an engine can reach RELIABLE
  ("must hold up under time"). Not baked in here because it would alter the locked
  v1 maturity contract; flagged for the owner.
- **Open decision — selection algorithm:** cross-course most-due is the default;
  a future refinement could weight toward the user's dominant leak type
  (v2 personalization, `REFINEMENT.md` 3.3).
