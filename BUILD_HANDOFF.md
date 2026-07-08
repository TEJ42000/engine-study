# BUILD_HANDOFF — Engine Study v1 (ledger)

**This ledger mirrors the spec; the spec (`COSMOS_V1_SPEC.md`) wins on any conflict.
Do NOT paste this into any agent as a spec.** Full AC text lives in the spec §2.
Status snapshot: 2026-07-08.

## Legend
- **[agent-tested]** — passing `v1-core` unit checks, but NOT human-verified.
- **[ui-pending]** — the AC is only observable through a screen not yet built.
- **[not started]** — no logic and no screen.
- **Core logic** — is the deterministic logic present in `v1-core`? ✓ (agent-tested) / — (none yet).
- **Verified (Matej)** — manual walkthrough. **ALL unchecked (☐) until a human runs it** (realistically via the UI).

## Build order
F8 (data layer + envelope/versioning + export/import) → F1/F2 → **F3** (verify AC3.1–3.6 before shipping anything) → F4/F5 → F6/F7 → prototype-migration helper.

## Invariants (the three that must always hold)
- **I1** — no maturity movement without a recorded session.
- **I2** — no engine content in the DOM before Reveal (the v0 **L1** bug).
- **I3** — no PASS/FAIL without a non-empty written attempt.

> **I2 and I3 are enforced in the F3 UI state machine, which is NOT yet built.**
> These are the highest-care items in the remaining work — build with care; do not
> reintroduce L1. I1's logic is agent-tested in `recordSession` (maturity only moves
> on a recorded session), but I2/I3 are purely UI-enforcement and have no code yet.

---

## F1 — Course & exam profile
| AC | Requires | Core logic | Status | Verified (Matej) |
|---|---|---|---|---|
| AC1.1 | Create course w/ name + 4 profile fields; persists | — (needs form) | **[ui-pending]** | ☐ |
| AC1.2 | Drill-emphasis hint derived from profile | ✓ `deriveDrillEmphasisHint` | **[agent-tested]** | ☐ |
| AC1.3 | Delete course cascades (engines/sessions/leaks/mocks) + counts | ✓ `cascadeDeleteCourse` | **[agent-tested]** | ☐ |

## F2 — Engine editor
| AC | Requires | Core logic | Status | Verified (Matej) |
|---|---|---|---|---|
| AC2.1 | Create engine DOCTRINAL/ANSWER_STRUCTURE; type badge everywhere | — (needs editor) | **[ui-pending]** | ☐ |
| AC2.2 | Ordered steps add/remove/reorder; paste-split; empty rows filtered | ✓ `splitPastedLines` (split only) | **[ui-pending]** | ☐ |
| AC2.3 | "Mark precision" wraps selection in `{{ }}`; braces hidden on render | ✓ `stripPrecisionBraces`/`extract` | **[ui-pending]** | ☐ |
| AC2.4 | Deterministic precision suggester; each suggestion explicit-accept | ✓ `suggestPrecisionTargets` | **[ui-pending]** | ☐ |
| AC2.5 | New engine SHAKY/UNTESTED/streak0/stacking-false; two badges; SOLID→SHAKY only | ✓ types/defaults | **[ui-pending]** | ☐ |
| AC2.6 | `stacking` per-engine checkbox; never a global rule | ✓ type field | **[ui-pending]** | ☐ |

## F3 — Test runner (type → reveal → grade) — the critical flow
| AC | Requires | Core logic | Status | Verified (Matej) |
|---|---|---|---|---|
| AC3.1 | Reveal + PASS/FAIL disabled until both inputs non-empty (whitespace ≠ ok) | — (I3, UI) | **[ui-pending]** | ☐ |
| AC3.2 | PASS/FAIL + engine content absent from DOM until Reveal | — (I2, UI) | **[ui-pending]** | ☐ |
| AC3.3 | PASS→RELIABLE only w/ 3 passes, 3rd ≥48h after 1st; else FRAGILE | ✓ `applyMaturityTransition` | **[ui-pending]** | ☐ |
| AC3.4 | FAIL from RELIABLE→FRAGILE + streak reset; no axis moves w/o session | ✓ `applyMaturityTransition` | **[ui-pending]** | ☐ |
| AC3.5 | TestSession stores verbatim gate + full attempt; session list per engine | ✓ `recordSession` (store) | **[ui-pending]** | ☐ |
| AC3.6 | Refresh mid-test loses at most the in-progress attempt; no partial record | — (UI) | **[ui-pending]** | ☐ |

> **§1.2 maturity transitions + comprehension self-mark + `lastTestedAt`** — the write
> path behind AC3.3–3.5 — is **[agent-tested]** as `recordSession` in `mutations.ts`.
> The ACs above stay [ui-pending] because they're only demonstrable through the F3 screen.

## F4 — Precision-check mode
| AC | Requires | Core logic | Status | Verified (Matej) |
|---|---|---|---|---|
| AC4.1 | Offered only for engines w/ ≥1 `{{target}}`; targets → blanks | ✓ `extractPrecisionTargets`/`hasPrecisionTargets` | **[ui-pending]** | ☐ |
| AC4.2 | Fill → reveal → self-grade blanks; ≥1 wrong → PRECISION COMMITTED leak | ✓ `addLeak` (partial) | **[ui-pending]** | ☐ |
| AC4.3 | Passed check advances nothing; failed demotes RELIABLE→FRAGILE; mode PRECISION_CHECK | ✓ `applyMaturityTransition` | **[ui-pending]** | ☐ |

## F5 — Leak log
| AC | Requires | Core logic | Status | Verified (Matej) |
|---|---|---|---|---|
| AC5.1 | Filterable table (course/engine/type/status/source) + counts, COMMITTED vs GUARDED | — (needs table) | **[ui-pending]** | ☐ |
| AC5.2 | Manual leak entry (source MANUAL), either status, first-class | ✓ `addLeak` | **[ui-pending]** | ☐ |
| AC5.3 | Mock-sourced leaks appear when mock misses tagged (F6) | — (needs F6) | **[ui-pending]** | ☐ |

## F6 — Mock log + drill list
| AC | Requires | Core logic | Status | Verified (Matej) |
|---|---|---|---|---|
| AC6.1 | Record mock run + misses (desc + leak type + engine or "no engine") | — none yet | **[not started]** | ☐ |
| AC6.2 | Tagging a miss writes a COMMITTED LeakEntry (source MOCK) | — none yet | **[not started]** | ☐ |
| AC6.3 | "No engine" miss → create-engine-from-miss prompt | — none yet | **[not started]** | ☐ |
| AC6.4 | Drill list; miss cleared ONLY by explicit "mark drilled" (never auto on pass) | — none yet | **[not started]** | ☐ |

> ⚑ **F6 has no backing `v1-core` logic yet (no mock-run mutations/selectors) — core
> logic must be built before UI.** That's why it's [not started], not [ui-pending].

## F7 — Dashboard
| AC | Requires | Core logic | Status | Verified (Matej) |
|---|---|---|---|---|
| AC7.1 | Two-axis grid (comprehension × retrieval) per course + counts | — (needs grid) | **[ui-pending]** | ☐ |
| AC7.2 | "Study next" ordering (undrilled-miss → UNTESTED → FRAGILE oldest → RELIABLE) | ✓ `studyNext` | **[ui-pending]** | ☐ |
| AC7.3 | Per-course leak profile from COMMITTED leaks; "none" when only GUARDED | ✓ `computeLeakProfile` | **[ui-pending]** | ☐ |
| AC7.4 | Exam-profile drill hint on course header | ✓ `deriveDrillEmphasisHint` | **[ui-pending]** | ☐ |

> ⚑ Caveat: within AC7.2, the **undrilled-mock-miss ranking** depends on F6 data/logic
> that does not exist yet → treat that portion as **[not started]**. The rest rests on
> agent-tested logic and is unaffected: `studyNext`'s UNTESTED/FRAGILE/RELIABLE
> ordering, the maturity grid's §1.2 values (AC7.1), and `computeLeakProfile` (AC7.3).

## F8 — Data durability
| AC | Requires | Core logic | Status | Verified (Matej) |
|---|---|---|---|---|
| AC8.1 | Data survives refresh; envelope carries `schemaVersion` | ✓ `storage.ts` (load/save) | **[agent-tested]** | ☐ |
| AC8.2 | Export downloads JSON; import validates + shows counts + confirm | ✓ `exportToJson`/`importFromJson` (logic; buttons UI-pending) | **[agent-tested]** | ☐ |
| AC8.3 | Unknown `schemaVersion` never wipes — blocks w/ export option | ✓ `loadData` returns raw, no wipe | **[agent-tested]** | ☐ |

## Migration helper (prototype v0 → v1)
| Item | Core logic | Status | Verified (Matej) |
|---|---|---|---|
| v0 `AppData` → v1 `CosmosData` mapping (§5 step 6) | ✓ `migrateLegacy` | **[agent-tested]** | ☐ |

> **MIGRATION NOTE (DECISIONS.md 2026-07-08 ruling):** retrieval axis is **capped at
> FRAGILE** (REFLEX no longer imports as RELIABLE); comprehension carries as **SOLID**
> (for anything past DRAFTED); `passStreak = 0`. RELIABLE is re-earned only under the
> real 48h regime. ⚑ This **deviates from `COSMOS_V1_SPEC.md` §5 step 6** (still
> "REFLEX→SOLID/RELIABLE") — spec update pending; see OpenLoops.

---

## End-to-end cycle (the whole-loop acceptance, spec §6)
Create course with exam profile → author engines of both types with precision targets
→ cold-test (gate-first, type→reveal→grade) → fail one and log a leak → precision-check
one → record a mock with a tagged miss and a no-engine miss → drill list clears after an
explicit mark → dashboard shows the two-axis grid and leak profile → export, wipe, import,
everything intact. **Status: not runnable yet — no UI.**

## The app does NOT track / do (fence, spec §3)
- No global "stack all grounds" rule — only the per-engine `stacking` flag.
- No hardcoded dominant leak or fixed drill weights (v1 displays the profile only).
- No accounts / teams / payments / voice / cloud sync.
- No auto-advancing maturity, no generous auto-grading, no recognition-instead-of-recall.
- No AI anywhere in v1 (the precision suggester is regex on purpose).
