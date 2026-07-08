# DECISIONS — Engine Study / Cosmos

_A single log of the locked calls, so the rationale lives in one place. Referenced
by `experimental/src/pipeline/evaluator.py`. Newest last._

---

## 2026-07-05 — prototype run + v1 spec

- **Prototype is frozen.** The `src/` prototype validated the method and is now
  reference only — not to be extended or hand-patched. (`LEARNINGS.md` L1.)
- **Type → reveal → grade testing.** The runner must take a written recall attempt
  before revealing engine content; PASS/FAIL is disabled until an attempt exists;
  the attempt is stored. Fixes the prototype's critical bug (Pass on an empty
  recall). Content stays out of the DOM until a result is recorded.
- **Two-axis maturity** replaces the single DRAFTED→TESTED→STABLE→REFLEX ladder:
  `comprehension` (SHAKY/SOLID) × `retrievalReliability` (UNTESTED/FRAGILE/RELIABLE).
  Advances only on recorded results, never automatically.
- **Exam profile** is a first-class per-course object (open-book, applied vs
  memorization, path-graded, modes) that shapes drilling emphasis.
- **Leak model:** keep the `GATE_SKIP / WRONG_TOOL / PRECISION` taxonomy; add a
  `COMMITTED` vs `GUARDED` status — only COMMITTED leaks feed the leak profile.
- **RELIABLE threshold:** 3 consecutive full-recall passes, with the 3rd **≥48h**
  after the 1st (widened from an initial 24h — two-day decay was the observed
  failure pattern; no cramming to RELIABLE inside the window).
- **Mock-miss clearing is MANUAL.** A cold-recall pass does **not** auto-clear a
  mock miss; the user marks it drilled. (Evidence type must match failure type —
  auto-clear only returns in v2 once applied questions exist.)
- **Precision-check demotion is asymmetric:** a failed precision check demotes
  RELIABLE→FRAGILE; a passed one never promotes. Only full cold recall earns
  reliability.
- **v1 scope fence:** no AI, no voice, no backend, no accounts, no payments —
  client-side TypeScript/React + `localStorage` only.

## 2026-07-06 — v1.1, honesty, foundation

- **Timed 2-question mock confirmed as v1.1** (`SPEC_TIMED_MOCK.md`): v1.1 = the
  locked v1 core **plus** this feature. It extends the v1 data model, so the v1
  core must be built first; it must not be built onto the frozen prototype.
- **Marketing is honest.** No vaporware funnel: advertise only shipped features,
  no payment for unbuilt features, no failed-exam targeting or fake scarcity. The
  €29 figure was a Gemini suggestion, not committed — intent is free-at-first.
  (`marketing/validation.md`.)
- **`v1-core/` is the build foundation.** A verified, UI-agnostic TypeScript core
  (data model + maturity machine + selectors + export gate) that Cosmos builds the
  React UI on top of. Makes no UI/architecture decisions.
- **Export `schemaVersion` is the number `1`** (not the string `"1.0.0"`) — matches
  `COSMOS_V1_SPEC.md` §0 and `v1-core/persistence.ts`. An unknown version blocks
  the import; it never wipes the store.
- **Repo made public.** Resolves the prior external-404 (the repo was private, not
  un-pushed — a private URL 404s for unauthorized viewers). Accepted tradeoff: the
  six-course extraction corpus + specs are now world-readable. Standing rule set
  alongside: **no API keys or secrets are ever committed** — v2's user-supplied API
  key stays env/local and `.gitignore`'d. (Verified when logging this: no key/token
  patterns in any tracked file.)

## 2026-07-08 — v1 build lane, public repo, migration ruling

- **Rewrote `COSMOS_WORKSPACE_INIT` to v1-only scope; quarantined the dual-agent /
  Veo / Gemini / voice-wakeword / 3D-typography architecture** to v2/v3 design stubs.
  Reason: the old init doc contradicted COSMOS_V1_SPEC (v1 has no backend/AI/voice).
- **Building v1 as far as possible in Claude Code ahead of the California/Cosmos
  window**, not solely in Cosmos. COSMOS_V1_SPEC.md stays source of truth across both lanes.
- **Core-first v1 build landed in `v1-core/`** (storage.ts, mutations.ts, migrate.ts):
  pure, injected StorageLike, unit checks green (agent-tested, not yet human-verified).
  Prototype left frozen.
- **Confirmed: PRECISION_CHECK does NOT update `lastTestedAt`** — only cold recall
  (FULL_RECALL/TIMED) does, since study-next keys on cold-recall recency.
- **Confirmed: migrated engines start `passStreak=0`** (no v0 pass met the 48h regime).
- **MIGRATION RULING:** migrated engines cap at FRAGILE on the retrieval axis and
  re-earn RELIABLE under the real 48h regime; comprehension carries as SOLID. Reason:
  RELIABLE is defined as proven under spaced cold recall, which v0 never applied —
  importing it would be unearned mastery (friction principle). Revises the earlier
  REFLEX→SOLID/RELIABLE mapping. **DONE:** `migrate.ts` now caps retrieval at FRAGILE
  (checks green). ⚑ **OPEN CONFLICT:** `COSMOS_V1_SPEC.md` §5 step 6 still reads
  "REFLEX→SOLID/RELIABLE" — the spec is source of truth and now contradicts this
  ruling; §5 needs updating. Not changed here (spec left untouched pending the call).
- **Reconciled `COSMOS_V1_SPEC` §5 step 6 to the FRAGILE-cap migration ruling** (was
  REFLEX→SOLID/RELIABLE). Spec now matches `migrate.ts` and prior decisions; closes the
  SPEC RECONCILIATION open loop. (Supersedes the "OPEN CONFLICT / not changed here"
  note in the MIGRATION RULING entry above.)
