# experimental/ — NOT v1. Do not build against this.

This directory is a **quarantine for speculative "v2-spike" artifacts** that are
**out of scope** for Cosmos v1 as locked in [`../COSMOS_V1_SPEC.md`](../COSMOS_V1_SPEC.md).
They live here so the v1 build stays clean and internally coherent.

## Why these are quarantined, not in v1

Every file here violates at least one hard v1 constraint (COSMOS_V1_SPEC.md §0 and §3):

- **No AI in v1** — `AISystemPrompts.md`, `src/pipeline/evaluator.py`
- **No voice in v1** — `src/frontend/hooks/useChimeInInterrupt.ts`
- **No backend in v1** (client-side TS + localStorage only) — `config/settings.py`, `src/core/taxonomy.py`, `src/pipeline/evaluator.py`

Nothing in this folder is imported by, wired into, or run by the v1 React/TypeScript
app. It is design reference for a *possible* v2 only. `evaluator.py`'s public entry
point (`execute_zero_flattery_evaluation`) intentionally raises `NotImplementedError`
in v1.

## Contents

| Path | What it is | v1 status |
|---|---|---|
| `AISystemPrompts.md` | Zero-flattery AI examiner mandate | v2 (no AI in v1) |
| `CosmosWorkplace.md` | Cosmos workspace / directory-constraints note | reference |
| `DATA_INGESTION_SCHEMA.md` | Telemetry + export/import schema (partly v2/institutional) | mixed |
| `config/settings.py` | Python constants (models, maturity thresholds) | v2 (no backend in v1) |
| `src/core/taxonomy.py` | Python enums mirroring the v1 TS taxonomy | reference |
| `src/pipeline/evaluator.py` | Zero-flattery evaluator contract + maturity state machine | v2 |
| `src/frontend/components/MiniMockTrainer.tsx` | Timed 2-question mock component | not in v1 F1–F8 |
| `src/frontend/hooks/useChimeInInterrupt.ts` | SpeechRecognition wakeword hook | v2 (no voice in v1) |

## Deliberately NOT included

The B2C marketing funnel (`B2CValMarketing.md`) from the source dump is **not** here.
As written it advertises the unbuilt `[V2]` AI-voice feature and collects €29
pre-payments for it, targeted at students right after exam results. Filing
ready-to-run copy that takes money for features that don't exist is out — the folder
location doesn't fix that. An honest validation page (free waitlist, describes only
what v1 does, no failed-exam targeting) can be written instead if wanted.

## The source of truth is elsewhere

The locked v1 spec (`../COSMOS_V1_SPEC.md`) and the v1 app under `../src/`
(`screens/`, `store.ts`, `types.ts`, `App.tsx`, `ui.tsx`) are untouched and remain
the single source of truth for what to build.
