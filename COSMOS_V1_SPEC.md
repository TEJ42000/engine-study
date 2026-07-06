# COSMOS v1 — Build Spec

_Generated 2026-07-05 from REFINEMENT.md + LEARNINGS.md + the full six-course extraction corpus in `extractions/` + the Legal History revision tool (read directly as the design reference for the v2 AI marker)._

_Provenance (reconciled 2026-07-05): all six course extractions now exist on disk under `extractions/` — COURSE_02–06 verbatim from their own course conversations; COURSE_01 (Tech Law) reconstructed from the four engines actually entered into the prototype + LEARNINGS.md (flagged as reconstructed inside that file, not an independent extraction). Evidence tags cited below (e.g. "strong 6/6") trace to these files. Method thresholds reflect the three confirmed decisions of 2026-07-05: RELIABLE requires a ≥48h decay window (§1.2/AC3.3); mock misses clear only by explicit user action (§1.5/F6); precision-check failure demotes RELIABLE→FRAGILE, an intentional asymmetry (§1.2)._

**Guiding principle (non-negotiable):** the app runs the method; it must NOT remove the effort the method depends on. Protect friction where friction is the point — cold recall, honest marking, earned mastery. Automate bookkeeping and scheduling; keep the cognitive work with the user. Every feature below was checked against this principle; where a convenience would weaken the method (e.g. showing engine content before a written attempt exists), the spec forbids it explicitly.

---

## 0. Tech stack & storage

Carry the prototype's stack forward — it proved sufficient and there is no requirement it fails:

- **Vite + React + TypeScript + Tailwind CSS.** Single-page app, client-side routing between screens (no router library needed; a screen enum like the prototype's is fine).
- **Persistence: localStorage**, single key `cosmos-v1`, storing a versioned envelope:
  ```ts
  { schemaVersion: 1, data: CosmosData }
  ```
  Every read checks `schemaVersion`; unknown versions refuse to load destructively (show an export-your-data screen instead of silently wiping). This is the one lesson the disposable prototype couldn't teach: v1 data is real study data and must survive schema evolution.
- **Export / import**: one button each. Export downloads the envelope as JSON; import validates `schemaVersion` and replaces the store after an explicit confirm. (Cheap insurance for real data + makes the validation corpus portable.)
- **No accounts, no backend, no payments, no teams, no voice** (REFINEMENT §5). Single-user local-first until the loop is proven.
- **No AI calls anywhere in v1.** The v2 section is spec-only.

---

## 1. Data model

All types below are the v1 storage contract. IDs are random strings; timestamps are ISO 8601 strings.

```ts
interface CosmosData {
  courses: Course[];
  engines: Engine[];
  testSessions: TestSession[];
  leaks: LeakEntry[];
  mockRuns: MockRun[];
}
```

### 1.1 Course + exam profile (REFINEMENT 1.3, evidence: strong 6/6)

```ts
interface Course {
  id: string;
  name: string;
  examProfile: ExamProfile;
}

interface ExamProfile {
  openBook: boolean;
  appliedVsMemorization: 'APPLIED' | 'MEMORIZATION' | 'MIXED';
  pathGraded: boolean;          // is the reasoning path itself the marks?
  modes: string[];              // e.g. ["open-book application", "closed-book case recall"]
}
```

The profile is captured at course creation (editable later) and **shapes emphasis, not gating**: v1 uses it to (a) display a per-course "how to drill this" hint line derived from the flags (open-book → "drill navigation/lookup", applied → "drill answer machinery", memorization → "drill spaced recall", path-graded → "drill sequence order"), and (b) sort the drill suggestions on the dashboard. It must be a first-class stored object so v2 can drive drill generation from it.

### 1.2 Engine (REFINEMENT 1.1 + 1.2, evidence: strong 6/6)

```ts
type EngineType = 'DOCTRINAL' | 'ANSWER_STRUCTURE';
type Comprehension = 'SHAKY' | 'SOLID';
type RetrievalReliability = 'UNTESTED' | 'FRAGILE' | 'RELIABLE';

interface Engine {
  id: string;
  courseId: string;
  engineType: EngineType;       // default DOCTRINAL
  title: string;                // names the SITUATION, never the sources (extraction rule)
  gate: string;                 // the wrong-tool / go-no-go question
  steps: string[];              // ordered; steps may contain {{precision target}} spans
  trigger: string;
  satellites: string[];
  stacking: boolean;            // default false — per-engine "stack all grounds" property (§5)
  comprehension: Comprehension;             // default SHAKY
  retrievalReliability: RetrievalReliability; // default UNTESTED
  passStreak: number;           // consecutive full-recall passes (drives RELIABLE)
  lastTestedAt: string | null;
  createdAt: string;
}
```

**Precision targets** are marked inline in step/satellite text with `{{double braces}}`: `"Fine ceiling is {{20 000 000 EUR or 4% of worldwide turnover}}"`. The editor provides a "mark selection as precision target" helper plus a deterministic (regex, non-AI) suggester for article numbers, case names, years, and Latin phrases — suggestions are always user-confirmed, never auto-applied. Rendering strips the braces everywhere except precision-check mode.

**Two-axis maturity replaces the single ladder.** Both axes advance only via recorded results — never automatically (the prototype's L1 lesson generalized):

| Axis | Moves up when | Moves down when |
|---|---|---|
| `retrievalReliability` | UNTESTED→FRAGILE: first recorded full-recall result (pass or fail — it has now been tested). FRAGILE→RELIABLE: 3 consecutive full-recall PASSes, with the 3rd at least **48h** after the 1st (two-day decay was the observed failure pattern — a RELIABLE engine must survive one across a decay window, so no cramming to RELIABLE inside a day or two). | Any full-recall FAIL → FRAGILE (from RELIABLE too — "slips under fatigue" is real signal, keep it). A failed precision check demotes RELIABLE→FRAGILE but a passed one never promotes (asymmetric on purpose: only full cold recall earns reliability). |
| `comprehension` | SHAKY→SOLID: self-marked at the end of a completed test session ("Do you understand this engine?"), i.e. only reachable through a recorded session. | User can flip SOLID→SHAKY at any time from the editor or a session (doubt is always allowed in). |

`passStreak` increments on full-recall PASS, resets to 0 on full-recall FAIL. Precision checks never touch `passStreak`.

### 1.3 TestSession (REFINEMENT 2.1 — the stored attempt)

```ts
type SessionMode = 'FULL_RECALL' | 'PRECISION_CHECK';

interface TestSession {
  id: string;
  engineId: string;
  mode: SessionMode;
  gateAttempt: string;          // step 1 of the gate-first flow (FULL_RECALL only)
  attempt: string;              // the typed recall; for PRECISION_CHECK, JSON of blank→answer pairs
  result: 'PASS' | 'FAIL';
  comprehensionAfter: Comprehension | null;  // end-of-session self-mark; null for PRECISION_CHECK
  startedAt: string;
  recordedAt: string;
}
```

Attempts are **permanent data**, not scratch: they feed session review ("how did my recall of this engine degrade?") and are the training substrate for the v2 AI marker. A PRECISION_CHECK session records `comprehensionAfter: null` and never changes the engine's `comprehension` axis — the comprehension self-mark (F3 step 6) belongs to full recall only.

### 1.4 LeakEntry (REFINEMENT 1.4 + 1.5, evidence: strong)

```ts
type LeakType = 'GATE_SKIP' | 'WRONG_TOOL' | 'PRECISION';
type LeakStatus = 'COMMITTED' | 'GUARDED';
type LeakSource = 'COLD_TEST' | 'PRECISION_CHECK' | 'MOCK' | 'MANUAL';

interface LeakEntry {
  id: string;
  engineId: string;
  courseId: string;             // denormalized — the leak profile is per-course
  type: LeakType;
  status: LeakStatus;           // COMMITTED = actually made; GUARDED = risk the gate prevents
  source: LeakSource;
  description: string;
  createdAt: string;
}
```

Only **COMMITTED** leaks feed the per-course leak profile (1.6 / feature F7). GUARDED leaks exist so the user can record "this gate is guarding a real risk I haven't yet committed" — they inform gate prominence, not drilling. UI copy notes a leak may concern the material or the execution.

### 1.5 MockRun + MockMiss (REFINEMENT 3.1 — loop mechanics only, no generation)

```ts
interface MockRun {
  id: string;
  courseId: string;
  label: string;                // e.g. "ITL 2021 1st chance"
  takenAt: string;
  notes: string;
  misses: MockMiss[];
}

interface MockMiss {
  id: string;
  description: string;
  engineId: string | null;      // null = no engine covers this miss yet
  leakType: LeakType;           // status is always COMMITTED for mock misses
  drilled: boolean;             // cleared ONLY by an explicit user "mark drilled" action (never auto)
}
```

A `MockMiss` with `engineId: null` is a first-class state, not an error: it means the course is missing an engine, and the UI turns it into a "create engine from this miss" prompt. Each tagged miss also writes a COMMITTED LeakEntry (source MOCK) so the leak profile sees mock data. **`drilled` is set only when the user explicitly marks the miss drilled — a cold-recall PASS does NOT auto-clear it.** A mock miss is usually an *applied* error (wrong routing, skipped gate under fresh facts); proving you can cold-recall the engine is not evidence you'd catch it in a fact pattern — the evidence type must match the failure type. Auto-clear on a matching-evidence pass only becomes acceptable in v2, once applied fact-pattern questions exist (§4.3). Until then, clearing a miss is a deliberate honesty call the user makes, not bookkeeping the app does for them.

### 1.6 Derived (not stored): per-course leak profile

Computed on render from COMMITTED leaks per course: count by type, dominant type, and a last-30-days trend. **Displayed only in v1** — no auto-weighting of drills (that is v2, and weightings are learned per user, never hardcoded).

---

## 2. Features & acceptance criteria

Every criterion is phrased so a tester can execute it manually against the running app. "Done" = all criteria pass.

### F1 — Course & exam profile setup

- **AC1.1** Creating a course requires a name and presents the four exam-profile fields (openBook toggle, applied/memorization/mixed select, pathGraded toggle, free-text modes list); saving persists all of them.
- **AC1.2** The course view shows a drill-emphasis hint derived from the profile (e.g. open-book+applied shows "navigation + answer-machinery"); changing the profile changes the hint without touching any engine data.
- **AC1.3** Deleting a course cascades to its engines, sessions, leaks, and mock runs, after a confirm that states the counts being deleted.

### F2 — Engine editor

- **AC2.1** An engine can be created with type DOCTRINAL or ANSWER_STRUCTURE; the type is visible as a badge on every surface an engine appears (editor, dashboard, runner, leak log).
- **AC2.2** All prototype editor capabilities carry over: ordered steps with add/remove/reorder, multiline paste splitting into steps/satellites with `1.`/`-`/`•` markers stripped, empty rows filtered on save.
- **AC2.3** Selecting text in a step or satellite and clicking "mark precision" wraps it in `{{ }}`; the braces never render outside precision-check mode and the editor.
- **AC2.4** The deterministic precision suggester highlights candidate targets (regex: `Art\.?\s*\d+`-style refs, `C-\d+/\d+` case numbers, 4-digit years, capitalized case names, Latin phrases) and each suggestion requires an explicit accept; nothing is marked without a click.
- **AC2.5** A new engine starts SHAKY / UNTESTED / `passStreak 0` / `stacking false`; both maturity axes are shown as separate badges. Neither axis is editable from the editor **except** SOLID→SHAKY (doubt), which is allowed.
- **AC2.6** The `stacking` flag is a per-engine checkbox labeled for cumulative-doctrine engines; it defaults off and nothing in the app treats it as a global rule (§5).

### F3 — Test runner: type → reveal → grade (the critical flow)

This fixes prototype bug L1. The order is enforced by the UI state machine, not convention:

1. **Gate-first prompt** (REFINEMENT 2.2): the first input asks only *"What's the gate — the first thing you check?"* Engine content fully hidden (not in the DOM, as in the prototype).
2. **Full recall box**: gate answered (non-empty) unlocks the main attempt textarea (steps in order, trigger, satellites).
3. **Reveal**: enabled only when both boxes are non-empty (whitespace doesn't count). Clicking it shows the full engine side-by-side with the typed attempt.
4. **Self-grade**: PASS/FAIL buttons appear only after reveal. Convention displayed: *skipped the gate or lost/added a whole step → FAIL; wording slips → PASS + PRECISION leak.*
5. **Record**: result + both attempt texts + timestamps are stored as a TestSession; maturity transitions from §1.2 are applied; on FAIL the leak form is required (must save or explicitly skip with a confirm), on PASS it is offered.
6. **Comprehension self-mark**: after grading, one question — "Do you understand this engine?" SHAKY/SOLID — stored on the session and applied to the engine.

Acceptance:

- **AC3.1** With both inputs empty, Reveal and PASS/FAIL are disabled; typing whitespace only does not enable them.
- **AC3.2** PASS/FAIL do not exist in the DOM until Reveal has been clicked; engine content does not exist in the DOM until Reveal.
- **AC3.3** A recorded PASS with `passStreak` reaching 3 (3rd pass ≥48h after the 1st) sets RELIABLE; three passes inside the same 48h window leave it FRAGILE.
- **AC3.4** A FAIL from RELIABLE demotes to FRAGILE and resets `passStreak`; no path advances either axis without a recorded session.
- **AC3.5** The stored TestSession contains the verbatim gate attempt and full attempt; a session list on the engine shows past attempts with results.
- **AC3.6** Refreshing mid-test loses at most the in-progress attempt — never records a partial result.

### F4 — Precision check mode (REFINEMENT 2.3)

- **AC4.1** Precision check is only offered for engines that have ≥1 `{{target}}`; it renders the steps/satellites with each target replaced by a blank input, everything else visible.
- **AC4.2** The user fills blanks, clicks Reveal, sees their answers against the targets, and self-grades each blank right/wrong; ≥1 wrong blank prompts a PRECISION COMMITTED leak (pre-filled with the missed targets, editable).
- **AC4.3** A passed precision check never advances either maturity axis; a failed one demotes RELIABLE→FRAGILE (AC per §1.2). Session stored with mode PRECISION_CHECK.

### F5 — Leak log

- **AC5.1** Table of all leaks filterable by course, engine, type, status, and source; counts per type shown, split COMMITTED vs GUARDED.
- **AC5.2** Manual leak entry (source MANUAL) is a first-class action from the leak log and from any engine (REFINEMENT 3.2) and allows either status.
- **AC5.3** Mock-sourced leaks appear automatically when mock misses are tagged (F6).

### F6 — Mock log + drill list (loop shell; no question generation)

- **AC6.1** A mock run records course, label, date, notes, and any number of misses; each miss requires a description + leak type and either an engine or explicit "no engine covers this".
- **AC6.2** Tagging a miss writes a COMMITTED LeakEntry (source MOCK) against the chosen engine/course.
- **AC6.3** A "no engine" miss shows a *create engine from this miss* button that opens the editor pre-filled with the description as a draft title.
- **AC6.4** The drill list shows engines referenced by undrilled misses, most-recent mock first; each undrilled miss has an explicit "mark drilled" control. Recording a full-recall PASS for the engine does **not** clear the miss — only the user's explicit mark does. (A test verifies a passing session leaves an untouched miss `drilled: false`.)

### F7 — Dashboard

- **AC7.1** Engines are shown per course in a two-axis display (comprehension × retrieval) so SOLID+FRAGILE — the state every course exhibited — is visible at a glance, with counts per cell.
- **AC7.2** "Study next" ordering: (1) engines with undrilled mock misses, (2) UNTESTED, (3) FRAGILE oldest-tested first, (4) RELIABLE oldest-tested first. Deterministic; no AI.
- **AC7.3** The per-course leak profile (counts by type, dominant type, 30-day trend) renders from COMMITTED leaks only; a course with only GUARDED leaks shows "no committed leaks yet".
- **AC7.4** The exam-profile drill hint (F1) appears on the course header.

### F8 — Data durability

- **AC8.1** All data survives refresh; the envelope carries `schemaVersion`.
- **AC8.2** Export downloads a JSON file of the envelope; import validates the version, shows what will be replaced (counts), and requires confirm.
- **AC8.3** Loading an envelope with an unknown `schemaVersion` never wipes data — it blocks with an export option.

---

## 3. What NOT to build (binding, from REFINEMENT §5)

- No global "stack all grounds" rule — it is the per-engine `stacking` flag only.
- No hardcoded dominant leak or fixed drill weights — v1 displays the profile; learning-based weighting is v2 and per-user.
- No accounts / teams / payments / voice / cloud sync.
- No auto-advancing maturity, no generous auto-grading, no recognition-instead-of-recall anywhere. If a future feature idea shows engine content before a stored written attempt exists, it is wrong by definition.
- No AI in v1 — not even "just for suggestions" (the precision suggester is regex on purpose).

---

## 4. 🔒 V2 ROADMAP — SPEC ONLY, DO NOT BUILD IN V1

_Everything here is fenced. It is specced now so the v1 data model doesn't paint it into a corner (stored attempts, exam profiles, engine types, and the leak profile are all v2 inputs)._

### 4.1 AI engine generation from source (the product-maker, L2)

Paste syllabus / lecture notes / a textbook section → the model drafts DOCTRINAL and ANSWER_STRUCTURE engines → the user edits and saves. Non-negotiable first v2 feature.

- **Prompt basis:** `EXTRACTION.md` (extraction prompt v2) is the system-prompt core: title = situation not sources; gate = the wrong-tool question; 5–9 steps in exam-execution order (impose decision order on taxonomy-shaped material); cases + verbatim qualifiers as satellites; lists >4 items become satellites or their own engine. Add: emit `{{precision targets}}` inline; propose `engineType` and `stacking`; use the course's `ExamProfile` to shape step granularity.
- **Output contract:** structured output (JSON schema) matching the `Engine` type minus id/maturity fields — drafts always land as SHAKY/UNTESTED with `lastTestedAt: null`. **Generation never touches maturity** (friction principle).
- **UX:** generated engines open in the editor as drafts requiring an explicit save; nothing enters the store unreviewed.

### 4.2 AI-marked recall — Legal History design is the reference implementation

The working precedent lives in `Legal_History_Revision.html` (Desktop). Reproduce its behaviors, generalized:

- **Marking call:** one message per marking. System prompt = strict examiner persona parameterized by the course's ANSWER_STRUCTURE engine (DAEN was Legal History's; IRAC etc. for others) + the exam profile. Feedback structure to reproduce verbatim from the prototype: **(1) `Score: X/10` — one line; (2) What you got right (2–4 bullets); (3) What was missing or wrong (2–4 bullets); (4) answer-structure check (did they answer directly first? name an authority? stop when done?); (5) One key thing to add next time.** Under 300 words, direct and honest. Explicitly instruct flagging of vague terms where precision was required — the PRECISION-leak connection.
- **User prompt:** question (or engine title), model answer (the engine content / stored reference), student answer (the stored TestSession attempt — this is why v1 stores attempts).
- **UI behaviors to reproduce:** score badge with ≥7 / 4–6 / <4 tiers; side-by-side "your answer vs model answer"; self-mark row (Got it / Partial / Missed it) revealed only **after** feedback — the AI advises, the human still grades (friction preserved); a "skip to model answer" path that bypasses AI marking.
- **What to fix from the prototype:** it called `api.anthropic.com` from the browser with no auth header and a now-deprecated model (`claude-sonnet-4-20250514`, retires 2026-06-15). v2 must (a) use a current model, (b) handle the key properly — for a local-first single-user app, a user-supplied API key entered in settings; if Cosmos ever goes multi-user, a thin server proxy.
- **Model choice (as of 2026-07):** default `claude-opus-4-8` ($5/$25 per MTok). A marking call is small — roughly 1–2K input tokens (rubric + engine + answer) and ~400 output tokens — so even on Opus a marking costs well under a cent ($0.005–0.015/call); hundreds of markings per exam season is pocket change, so don't trade quality for cost here without measuring. If cost ever matters at product scale, `claude-sonnet-4-6` ($3/$15) and `claude-haiku-4-5` ($1/$5) are the fallbacks — evaluate against a rubric of stored human self-grades before downgrading. Use adaptive thinking defaults; structured output for the score so no regex parsing (the prototype regexed `Score: X/10` out of prose).

### 4.3 Applied fact-pattern questions (L3)

Generate a scenario from an engine (or a set of engines in a course) where the student must **route** to the right engine and **clear its gate** under fresh facts — the marks-bearing skill per the course analysis. Keep cold recall AND applied questions; they train different things.

- Generation input: engine(s) + exam profile (pathGraded courses get "show the path" instructions).
- Marking reuses 4.2's machinery; a routing error is a WRONG_TOOL leak, a missed gate is GATE_SKIP — applied questions are the natural source of the two leak types cold recall can't elicit.
- Mock auto-generation (REFINEMENT 3.1's fenced half) is this feature applied N times with an exam profile's structure.
- **Unlocks mock-miss auto-clear (the v1 deferral).** Once applied questions exist, passing an applied question that reproduces a mock miss's *failure type* IS matching evidence — so a mock miss may auto-clear on a passing applied session (not on cold recall). This is the "evidence type must match failure type" rule that v1 couldn't satisfy, which is why v1 keeps mock-miss clearing manual (§1.5, F6).

### 4.4 Learned drill weighting (REFINEMENT 3.3's fenced half)

Weight study-next and drill selection toward the user's dominant COMMITTED leak type per course. Learned from the leak profile, never hardcoded; v1's deterministic ordering stays as the fallback.

---

## 5. Suggested build order

1. Data layer + envelope/versioning + export/import (F8) — everything else writes through it.
2. Course + exam profile (F1), engine editor with types/precision markers (F2).
3. **Test runner (F3)** — the core loop; build and verify AC3.1–3.6 before anything else ships.
4. Precision check (F4), leak log (F5).
5. Mock log + drill list (F6), dashboard (F7).
6. Migration helper: one-time import of the prototype's `engine-study-v1` localStorage data (map old maturity → axes: DRAFTED→SHAKY/UNTESTED, TESTED/STABLE→SOLID/FRAGILE, REFLEX→SOLID/RELIABLE; old leaks become COMMITTED/COLD_TEST). Low effort, preserves the Tech Law corpus.

## 6. Definition of done (v1)

- All acceptance criteria F1–F8 pass by manual walkthrough.
- The three prototype-era invariants hold under adversarial clicking: no maturity movement without a recorded session; no engine content in the DOM before Reveal; no PASS/FAIL without a non-empty written attempt.
- A full realistic cycle works end to end: create course with exam profile → author engines of both types with precision targets → cold-test (gate-first, type→reveal→grade) → fail one and log a leak → precision-check one → record a mock with a tagged miss and a no-engine miss → drill list clears after a pass → dashboard shows the two-axis grid and leak profile → export, wipe, import, everything intact.
