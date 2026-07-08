# OpenLoops.md — Engine Study

_Unresolved threads / questions. Not decisions (those live in `DECISIONS.md`).
Close a loop by moving its resolution into `DECISIONS.md`._

## 2026-07-08

- **CONFIRM FROM BUILD LANE:** did the reconciliation fix run (init doc → v1 scope
  in repo, secrets scan, push verification) and Fix A/B/C? Contaminants
  `useChimeInInterrupt.ts` (voice) and `MiniMockTrainer.tsx` (applied-question sim
  w/ implied AI marking) are still live in `src/` per "nothing in src/ touched."
  PLAN: sweep them by archiving old `src/` wholesale when the prototype is archived;
  build UI in `v1-core/` importing ONLY the verified core — no screen imports old `src/`.
  - **⤷ BUILD-LANE ANSWER (2026-07-08):** reconciliation fix ran — `COSMOS_WORKSPACE_INIT.md`
    is now at repo root (v1 scope); secrets scan clean (tracked + full history, 0);
    push verified (synced, spec + all six extractions present). **Correction:** the
    two contaminants are **NOT in `src/`** — the audit found they were already
    quarantined in `experimental/src/frontend/…`, imported by nothing. `src/` holds
    only the frozen v0 prototype (`Dashboard/EngineEditor/TestRunner/LeakLog`) — **zero
    voice/AI/network** in it. "Nothing in src/ touched" referred to the v1-core work
    leaving the frozen prototype alone, not to contaminants living in `src/`. The
    archive-old-`src/`-wholesale plan still holds for when the prototype is retired.

- **LEDGER:** core-logic ACs are agent-tested, NOT human-verified — AC8.1/8.2/8.3,
  AC1.2, AC1.3, §1.2 transitions in `recordSession`, migration. "Verified (Matej)"
  stays unchecked until manual walkthrough (realistically via the UI).

- **METHOD-CRITICAL UI STILL AHEAD (not plumbing):** I2 (no engine content in DOM
  before Reveal — the L1 bug), I3 (no PASS/FAIL without a non-empty attempt), and
  type→reveal→grade state-machine enforcement. None exist yet; build with care.

- **Existing loops still open:** verify latest spec+extractions are the pushed commit;
  DUO WO enrollment figures unverified; EU/Brightspace comparable pricing unresearched;
  COURSE_01 is a reconstruction; pending grades (IEL resit, Legal History, Criminal Law).

- **SPEC RECONCILIATION — ✅ RESOLVED 2026-07-08:** `COSMOS_V1_SPEC.md` §5 step 6 now
  states the FRAGILE-cap migration mapping, matching `migrate.ts` + `DECISIONS.md`.
  Spec, code, and docs are consistent on the migration mapping. (Was: §5 said
  "REFLEX→SOLID/RELIABLE" while the ruling capped retrieval at FRAGILE.)

- **IMPORT GUARDRAIL:** `experimental/` is world-readable (public repo); `v1-core/` and
  the eventual UI must NEVER import from `experimental/`.
