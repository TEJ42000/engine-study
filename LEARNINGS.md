# Engine Study — LEARNINGS & Next Steps

_Started: 2026-07-05. This file is the real output of the prototype phase. The code is disposable; these notes become the Cosmos build spec._

---

## What's working (verified by use)

- The prototype runs locally, four screens exist, the engine editor saves an engine as DRAFTED.
- The data model (title / course / gate / ordered steps / trigger / satellites) holds a real engine cleanly — entered the GDPR Four Gates from Tech Law and it fit.
- Test Runner reveals the full engine after a result is recorded — this reveal-after-recording behavior is correct and should stay.

---

## LEAK LOG — bugs & friction found by using it

### L1 — CRITICAL: Test Runner allows "Pass" on an empty recall
- **What happened:** In Test Runner, pressed Pass without writing/recalling anything. The engine advanced in maturity anyway.
- **Why it matters:** This breaks the core rule of the whole app — maturity must only advance on a *genuine* cold-recall pass. Letting Pass fire on an empty attempt makes the maturity data fiction and defeats the method.
- **Required fix (for Cosmos build, do NOT hand-patch the prototype):**
  - Enforce **type-then-reveal-then-grade**: the engine content stays hidden; the user must type their recall attempt into a text box; only then is "Reveal" enabled; after reveal, the user self-grades Pass/Fail against what they see.
  - Pass/Fail must be disabled until a non-empty recall attempt exists.
  - Store the recall attempt with the TestSession (useful later for review and for the AI layer).
- **Note on limits:** the app is self-graded, so it can never fully verify correctness — but forcing a written attempt before reveal is the closest software gets to real cold recall, and matches how the method actually works (reproduce from memory, then check against source).

### L2 — Manual authoring is heavy (the central product problem)
- **What happened:** Entering one engine by hand (gate, 4 steps, trigger, 3 satellites) is real work.
- **Why it matters:** *I* will do this because I think in engines; a typical student won't. The blank six-field form is where a new user bounces. This confirms the four-course finding: the thing that makes it a *product* is the layer that *fills* the engine for the user.
- **Implication for build order:** v1 = manual authoring (done). v2 = AI generates draft engines from pasted syllabus / lecture notes / textbook, user edits. v2 is non-negotiable and is what makes it sellable.

### L3 — Recall vs applied questions (a real fork, not a gap)
- **Observation:** v1's "test" = reproduce the engine from memory (cold recall). There is no explicit question field, and that's fine for v1.
- **But:** the exam-realistic test is an *applied fact pattern* — a scenario where the user must route to the right engine and clear its gate under fresh facts. The four-course analysis said this (routing + gate-clearing) is where the marks actually live.
- **Implication:** v2 should generate applied fact-pattern questions from an engine, not only cold recall. Keep cold recall (good for locking sequences) AND add applied questions (mirrors the exam).

---

## SPEC CHANGES EARNED BY THE FOUR-COURSE ANALYSIS
_(These are not guesses — four real courses argued for each. Fold into the Cosmos data model from the start.)_

1. **Two-axis maturity, not one ladder.** All four courses flagged engines that were *understood* but *fragile under fatigue/time* ("reflex but slips under fatigue", "concept reflex, citation shaky", "retrieval-fragile on the list"). Split maturity into two dimensions:
   - **Comprehension** (do I understand this engine?)
   - **Retrieval reliability** (does it hold up cold, under time?)
   An engine can be high on one and low on the other. The current single DRAFTED→TESTED→STABLE→REFLEX ladder collapses these and loses real signal.

2. **Exam type as a first-class field that shapes the method.** Four courses = four different method shapes, driven by exam format (open-book navigation / two-mode / applied-technique / dual-strand path-graded). v2's first question must characterize the exam along several axes: open vs closed book, applied vs memorization, path-graded (is the reasoning path the marks?). This selects how the app drills.

3. **Per-user, per-course leak profile (personalization).** Each course had a *different dominant leak* (precision-under-fatigue vs gate-skip vs stacking). The app should learn which leak type dominates for this user in this course (from logged fails) and weight drilling toward it.

4. **GATE_SKIP is the central, universal enemy.** 4/4 courses named it the core failure. The app's #1 job is to make "clear the gate before the test" a reflex — so the gate field should be prominent everywhere, and testing should specifically check the gate first.

5. **The cold-mock loop is the primary diagnostic — but not the only one.** It was the top diagnostic in 3/4 courses; the 4th diagnosed via live correction + triage instead. So build the cold-mock-and-map-each-miss loop as the flagship, but also support lighter diagnostic channels (single-question drills, live correction) for when a full mock isn't run.

6. **Keep the leak taxonomy: GATE_SKIP / WRONG_TOOL / PRECISION.** Validated 4/4, everything sorted cleanly. This is the reliable spine for leak-tagging. (Note: a leak can be about the *material* or about *execution/tooling* — the tag still fits.)

7. **Dropped assumption:** "stack all grounds, don't pick one" is NOT universal — it only appears in cumulative-doctrine courses (cybercrime articles, contract validity). Don't build it as a global rule.

---

## WHAT TO DO NEXT (in order)

1. **Put the app down for now.** The prototype has already done its job: it produced L1–L3 and confirmed the four-course spec changes. You don't need to keep revising today.

2. **Keep this file as the single source of truth** for the Cosmos build. Add to the LEAK LOG section any time you use the prototype again and something feels wrong. Every friction point = a free spec improvement.

3. **(Optional, low effort) If you want a real study environment for next semester now:** enter your four courses' engines from the extractions into the prototype and actually use it — but only after deciding you're OK doing that in a form that will be redesigned. Otherwise wait for v2.

4. **Before California / in California — turn this file into the Cosmos v1 spec.** The build spec should now include, from day one: type-then-reveal-then-grade testing (L1), two-axis maturity (#1), exam-type field (#2), leak-profile tracking (#3), and the leak taxonomy (#6). AI engine-generation (L2/#2) and applied-question generation (L3) are v2 — specced but built after v1 works.

5. **For the pitch:** the four extractions are not just seed data — they are a validation corpus. Four courses, four different exam formats, one method adapted to each. That is the evidence a professor or a paying student wants. Keep them.

---

## ONE-LINE STATUS
Prototype works and has served its purpose: it surfaced the critical testing bug (L1), confirmed the manual-authoring problem that justifies the AI layer (L2), and validated the four spec changes the real data earned. Ready to stop revising and move to specifying the real build.

---

## APPENDIX — actual prototype state (factual record, so the spec doesn't misremember the code)

_As of 2026-07-05 evening. Reference only; per L1, no further hand-patching._

- The Test Runner has an **optional, unenforced** recall scratchpad (added same day): typing an attempt shows it side-by-side with the reveal, but Pass/Fail still work on an empty attempt and the attempt is **not stored**. So L1 stands in full — the current flow is also grade-then-reveal, not the required type→reveal→grade.
- Editor supports multiline paste (lines → steps/satellites, numbering stripped); deleting the runner's selected engine no longer strands it on a dead card.
- `EXTRACTION.md` in this folder holds the extraction prompt v2 (title = situation not sources; gate = wrong-tool question; 5–9 steps in exam order; verbatim qualifiers as satellites) — feeds directly into the v2 AI-generation spec (L2).
- Data currently in the app (localStorage key `engine-study-v1`): course *Tech Law*, 4 engines — "Does the GDPR apply?" (TESTED), "Which lawful basis carries this processing?", "Is this consent valid?", "Route a transfer to a third country" (DRAFTED) — plus 1 PRECISION leak from the first real cold test.
