# Engine Study — Refinement Spec (input for Cosmos v1)

_Date: 2026-07-05. Purpose: this file is the instruction set for generating the Cosmos v1 build spec. It consolidates (a) the prototype learnings and (b) the six-course analysis findings into concrete build requirements. Hand this to Claude Code with the instruction: "Generate the Cosmos v1 build spec from this refinement file plus LEARNINGS.md and the six EXTRACTION files."_

_Evidence base: six real courses analyzed (Tech Law, Contract & Tort, Comparative Constitutional Law, IEL, Legal History, Criminal Law) across six different exam formats. Findings tagged by how well-supported they are so the spec doesn't overbuild on thin evidence._

---

## HOW TO READ THIS FILE

Each requirement is tagged:
- **[BUILD-V1]** — build in the first Cosmos version.
- **[BUILD-V2]** — spec it, fence it off, build after v1 works.
- **[EVIDENCE: strong / medium / provisional]** — how many courses / how cleanly it's supported.

Guiding principle (unchanged): the app runs the method; it must NOT remove the effort the method depends on. Protect friction where friction is the point (cold recall, honest marking, earned mastery). Automate bookkeeping and scheduling; keep the cognitive work with the user.

---

## SECTION 1 — DATA MODEL CHANGES (the core of v1)

### 1.1 Two engine TYPES [BUILD-V1] [EVIDENCE: strong — 6/6 courses]
Engines come in two distinct kinds and are drilled differently. The model must distinguish them:
- **DOCTRINAL engine** — a reasoning sequence (the gate + ordered steps + trigger + satellites). E.g. GDPR Four Gates, ARSIWA state responsibility, the Tripartite liability framework.
- **ANSWER-STRUCTURE engine** — how to present an answer. E.g. IRAC, DAEN (Direct answer → Authority → Explain → No more), definitions-first. These *wrap* doctrinal engines.

Add a field `engineType: "DOCTRINAL" | "ANSWER_STRUCTURE"`. A test/answer typically uses one answer-structure engine wrapping one doctrinal engine. (Nearly every course had both; Criminal Law and Legal History made the split explicit.)

### 1.2 Two-axis maturity, replacing the single ladder [BUILD-V1] [EVIDENCE: strong — 6/6 courses]
The single DRAFTED→TESTED→STABLE→REFLEX ladder collapses two things that all six courses showed are separate. Replace with two independent axes:
- `comprehension: "SHAKY" | "SOLID"` — do I understand this engine?
- `retrievalReliability: "UNTESTED" | "FRAGILE" | "RELIABLE"` — does it hold up cold, under time/fatigue?

An engine can be SOLID comprehension + FRAGILE retrieval (understood but slips under fatigue) — this exact state appeared in every course ("reflex but slips under fatigue", "concept reflex, citation shaky", "retrieval-fragile on the list"). Maturity advances on each axis independently, and only via recorded results (never automatically).

### 1.3 Exam profile as a first-class object [BUILD-V1] [EVIDENCE: strong — 6/6 distinct shapes]
Each course has an exam profile that SHAPES how the app drills. Six courses produced six different shapes, so this is not optional. Fields:
- `openBook: boolean`
- `applied_vs_memorization: "APPLIED" | "MEMORIZATION" | "MIXED"`
- `pathGraded: boolean` — is the reasoning path itself the marks? (IEL: "disapply alone scores zero.")
- `modes: string[]` — e.g. ["open-book application", "closed-book case recall"] for two-mode exams (CTL).

The app uses this to decide what to emphasize: open-book → navigation/lookup drills; applied → answer-machinery drills; memorization → spaced recall; path-graded → sequence/ordering drills.

### 1.4 Leak model: committed vs guarded [BUILD-V1] [EVIDENCE: strong — sharpened by courses 5-6]
A leak type can be either actively committed or merely a risk the method guards against. Track the difference:
- `LeakEntry.status: "COMMITTED" | "GUARDED"` — COMMITTED = an error actually made; GUARDED = a risk the engine's gate is designed to prevent.
Only COMMITTED leaks drive the personalization/drill-weighting. GUARDED leaks inform which gates to keep prominent. (Criminal Law showed GATE_SKIP as guarded-not-committed; Legal History showed it committed. Same tag, different status.)

### 1.5 Keep the leak taxonomy [BUILD-V1] [EVIDENCE: strong — 6/6 sort cleanly]
`LeakEntry.type: "GATE_SKIP" | "WRONG_TOOL" | "PRECISION"` stays. All six courses sorted cleanly. Note in UI copy that a leak may concern the *material* or *execution*.

---

## SECTION 2 — THE TEST FLOW (fix the critical bug)

### 2.1 Type → Reveal → Grade [BUILD-V1] [EVIDENCE: critical bug L1 from prototype]
The prototype's #1 bug: Pass fires on an empty recall and advances maturity — which makes the data fiction. The v1 test runner MUST enforce:
1. Engine content (gate/steps/trigger/satellites) hidden.
2. User types their recall attempt into a required text box.
3. Pass/Fail buttons DISABLED until the attempt is non-empty.
4. User clicks "Reveal" → sees the full engine.
5. User self-grades Pass/Fail against what they now see.
6. The typed attempt is STORED on the TestSession (needed for review + the v2 AI marker).

This is self-graded and cannot verify correctness — but forcing a written attempt before reveal is the closest software gets to real cold recall, and matches how the method actually works.

### 2.2 Gate-first testing [BUILD-V1] [EVIDENCE: strong — gate discipline is the top habit to build]
The test should specifically prompt the gate first ("What's the gate — the first thing you check?") before the full sequence. Gate-skip is the highest-value habit to train across all courses, even where it wasn't the most-committed leak.

### 2.3 PRECISION drilling deserves first-class support [BUILD-V1] [EVIDENCE: strong — most-committed leak in 4/6]
PRECISION (exact article numbers, authorities, dates, Latin) was the dominant *committed* leak in most courses. Support a "precision check" mode: the app hides just the exact citations/labels within an engine's steps and asks the user to fill them, separate from full-sequence recall. This targets the leak that actually costs the most marks for most users.

---

## SECTION 3 — DIAGNOSTIC MECHANICS

### 3.1 Cold-mock loop as flagship diagnostic [BUILD-V1 core, V2 for auto-generation] [EVIDENCE: strong in 3/6, prescribed in others]
The cold mock → map each miss to a leak → drill that leak → re-test loop was the top diagnostic where it was actually run. Build the *loop mechanics* in v1 (record a mock result, tag each miss to an engine + leak type, surface the drill list). AUTO-GENERATING the mock questions is [BUILD-V2] (needs AI).

### 3.2 Lighter diagnostic channels [BUILD-V1] [EVIDENCE: medium — IEL diagnosed without a sat mock]
Not every diagnosis comes from a full mock (IEL used live correction + triage instead). Support single-engine drills and manual leak-logging as first-class ways to surface weaknesses, not only mocks.

### 3.3 Per-user, per-course leak profile [BUILD-V1 tracking, V2 smart-weighting] [EVIDENCE: strong — 6 different mixes]
Each course had a different dominant committed leak. v1: compute and display the user's dominant leak type per course from COMMITTED leaks. v2: auto-weight drill selection toward the dominant leak. IMPORTANT: weightings are LEARNED per user, never hardcoded — what's dominant for one student won't be for another.

---

## SECTION 4 — V2 (AI LAYER) — SPEC NOW, BUILD AFTER V1

### 4.1 Engine generation from source [BUILD-V2] [EVIDENCE: L2 — the central product problem]
Manual authoring is the #1 reason a non-Matej user bounces. v2: paste a syllabus / lecture notes / textbook section → AI drafts DOCTRINAL and ANSWER-STRUCTURE engines (gate, steps, trigger, satellites) → user edits. This is what turns "my tool" into "a product." Non-negotiable as the first v2 feature.

### 4.2 AI-marked recall — DESIGN REFERENCE EXISTS [BUILD-V2] [EVIDENCE: strong — Legal History built a working precedent]
The Legal History course already contains a working prototype of this: a Q&A engine calling the Anthropic API that returns a score /10 + structured DAEN feedback, with a side-by-side "your answer vs model answer" compare, self-mark to localStorage, and feedback "calibrated to flag vague terms." USE THE LEGAL HISTORY EXTRACTION AS THE DESIGN SPEC for this feature — don't reinvent it. Key behaviors to reproduce: score, structured feedback tied to the answer-structure engine (IRAC/DAEN), explicit flagging of PRECISION vagueness, side-by-side compare.

### 4.3 Applied-question generation [BUILD-V2] [EVIDENCE: L3 + strong across courses]
Beyond cold recall, generate *applied fact-pattern* questions from an engine (a scenario where the user must route to the right engine and clear its gate under fresh facts). This mirrors the exam better than pure recall and targets routing + gate-clearing, which the analysis says is where marks live. Keep BOTH cold recall (locks sequences) and applied questions (mirrors exam).

---

## SECTION 5 — WHAT NOT TO BUILD / DROPPED ASSUMPTIONS

- **Do NOT hardcode "stack all grounds, don't pick one" as universal** [EVIDENCE: broke at course 3]. It only applies to cumulative-doctrine topics (cybercrime article stacking, contract validity grounds). Treat it as a per-engine property, not a global rule.
- **Do NOT assume a fixed dominant leak for all users.** Personalization is learned per user (Section 3.3).
- **v1 scope discipline:** no accounts/teams/payments/voice in v1. Single-user local-first is fine to start (matches prototype). Auth/multi-user is a later concern once the loop is proven.
- **Do NOT let the app auto-advance maturity, auto-grade generously, or let recognition substitute for recall.** Protecting friction is a feature.

---

## SECTION 6 — INSTRUCTION TO CLAUDE CODE

Generate a Cosmos v1 build spec from THIS file + LEARNINGS.md + the six EXTRACTION files. The v1 spec should include:
- Full data model with: two engine types (1.1), two-axis maturity (1.2), exam profile object (1.3), committed/guarded leak status (1.4), leak taxonomy (1.5).
- Test flow enforcing type→reveal→grade with stored attempts (2.1), gate-first prompting (2.2), and a precision-check mode (2.3).
- Diagnostic mechanics: cold-mock loop shell (3.1), lighter drill/log channels (3.2), per-course dominant-leak display (3.3).
- A clearly FENCED v2 section describing (but not building): AI engine generation (4.1), AI-marked recall using the Legal History design (4.2), applied-question generation (4.3).
- Tech: keep it buildable and simple; carry forward the prototype's stack unless there's a strong reason to change. Specify acceptance criteria for every v1 feature so "done" is testable.
- Respect Section 5 (what not to build).

Output a single markdown build spec with a data model, feature list, acceptance criteria, and a fenced v2 roadmap.
