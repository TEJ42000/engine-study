# COSMOS_WORKSPACE_INIT — Engine Study v1

## 0. SCOPE FENCE (read first, binding)
You are building Engine Study v1 ONLY, exactly as defined in COSMOS_V1_SPEC.md,
which is the single source of truth. Where any other file conflicts with it, the
spec wins and you flag the conflict rather than resolving it yourself.

v1 is local-first and single-user. It has:
  NO backend, NO accounts, NO payments, NO teams
  NO AI calls of any kind
  NO voice / wakeword / audio
  NO video or 3D-asset generation
If a task appears to require any of the above, STOP and surface it as out-of-scope.
Do not implement it; do not scaffold for it.

## 1. WHAT V1 IS
Implement the v1 data model and features F1–F8 with their acceptance criteria
verbatim from COSMOS_V1_SPEC.md. "Done" = every AC passes by manual test.
Build order: F8 (data layer + envelope/versioning + export/import) → F1/F2 →
F3 (verify AC3.1–3.6 before shipping anything) → F4/F5 → F6/F7 → prototype-migration
helper.

## 2. GRADING (v1, deterministic — no AI)
Self-grade only; maturity transitions per spec §1.2 (48h window, passStreak→RELIABLE,
FAIL demotes RELIABLE→FRAGILE). No text matching, no partial credit, no generated
feedback. The Gate-Skip concept is enforced by the runner asking for the gate FIRST.

## 3. QUARANTINED — v2/v3, DO NOT BUILD (design stubs only, e.g. /docs/ROADMAP.md)
  v2: AI engine generation, AI-marked recall (user-supplied API key), applied
      fact-pattern questions, learned drill weighting.
  v3: accounts/multi-user, Brightspace LTI 1.3 + API, instructor dashboards, GDPR review.
The creator-agent / analyst-agent / Veo / Gemini / CHIME_IN_WAKEWORD / 3D-typography
architecture is NOT in any current scope. Do not scaffold it. It enters only through
a written decision in DECISIONS.md, never through this file.

## 4. INIT SEQUENCE
1. Confirm repo `engine-study-core`.
2. Read COSMOS_V1_SPEC.md as truth; read REFINEMENT.md and LEARNINGS.md for rationale.
3. Build the data model + storage/export/import first (it is the pilot's measurement
   instrument — load-bearing).
4. Implement F1→F8 in the order above; after each, list which ACs now pass.
5. Report any spec ambiguity or conflict back to me instead of guessing.
