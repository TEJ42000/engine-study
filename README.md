# Engine Study

An execution-first study method and the app that runs it. The method: turn each
course topic into an **engine** (an ordered procedure fronted by a go/no-go
**gate**), test each engine **cold** from memory, and log every mistake
(**leak**) by type. Maturity advances only on a genuine, recorded pass.

---

## ⭐ Source of truth for the build

**[`COSMOS_V1_SPEC.md`](COSMOS_V1_SPEC.md) is the single source of truth for what to build (Cosmos v1).**
It contains the full data model, per-feature acceptance criteria (**F1–F8**), and
a fenced v2 roadmap. Build v1 to that spec.

### For a build agent (Augment Cosmos) — read this first

- ✅ **Build only what `COSMOS_V1_SPEC.md` specifies for v1** (features F1–F8; each has acceptance criteria).
- 🧱 **Start from [`v1-core/`](v1-core/)** — a verified, UI-agnostic TypeScript implementation of the data model + the correctness-critical logic (two-axis maturity machine, study-next ordering, leak profile, export version gate). Build the React UI on top of it; don't re-derive those rules. It's isolated from the frozen prototype and its checks pass (`cd v1-core && npm run check`).
- ⛔ **Do NOT build anything under [`experimental/`](experimental/).** It is out-of-scope v2-spike work (voice, AI marking, Python backend), quarantined and labelled. See [`experimental/README.md`](experimental/README.md).
- ⛔ **v1 has no AI, no voice, no backend, no accounts, no payments** — client-side TypeScript/React + `localStorage` only (spec §0 and §3).
- **Three locked method decisions** (spec provenance note, 2026-07-05): RELIABLE requires 3 full-recall passes across a ≥48h window; mock misses clear only by explicit user action (never auto on a cold-recall pass); a failed precision check demotes RELIABLE→FRAGILE (intentional asymmetry).
- **Protect friction.** The core rule the whole method depends on: never advance maturity without a recorded result, never reveal engine content before a written attempt exists, never let recognition substitute for recall.

---

## Repository map

```
COSMOS_V1_SPEC.md   ← BUILD THIS. Data model, F1–F8 acceptance criteria, fenced v2 roadmap.
SPEC_TIMED_MOCK.md  Companion feature spec: timed 2-question mock drill (CONFIRMED v1.1 = v1 core + this; build v1 first).
v1-core/            Verified, UI-agnostic TS core (data model + pure logic) — the foundation Cosmos builds the React app on. Isolated from the prototype.
REFINEMENT.md       Six-course analysis consolidated into the requirements the spec was generated from.
LEARNINGS.md        Prototype findings (the critical test-flow bug L1 + fixes) that drove the spec.
EXTRACTION.md       Prompt v2 for turning course material into engines (feeds v2 AI generation).
DECISIONS.md        Single chronological log of the locked decisions (the "why").
extractions/        Six-course extraction corpus (COURSE_01–06): validation + seed data + pitch evidence.
src/                FROZEN reference prototype (see below). Do NOT extend; it predates the spec.
experimental/       Quarantined v2-spike. NOT v1. Do not build. (voice / AI marking / Python backend)
marketing/          Honest validation/landing copy (planning; describes only real v1 features). Not part of the build.
index.html, vite.config.ts, tsconfig.json, package.json, tailwind/postcss configs — prototype build.
```

---

## The frozen prototype (`src/`)

`src/` holds a disposable prototype (Vite + React + TypeScript + Tailwind,
`localStorage`) that validated the method and produced the findings in
`LEARNINGS.md`. **It is frozen reference, not the v1 codebase.** In particular it
still uses the old single-axis maturity ladder (`DRAFTED → TESTED → STABLE →
REFLEX`), which the spec **replaces** with a two-axis model (comprehension ×
retrieval reliability). When building v1, follow `COSMOS_V1_SPEC.md`, not the
prototype's data model.

Run the prototype:

```bash
npm install
npm run dev   # http://localhost:5173
```

---

## What's intentionally not here

- **No marketing/vaporware funnel.** Willingness-to-pay validation should describe only what v1 actually does and must not collect payment for unbuilt features; no such artifact is committed.
- **No AI / voice / backend in the v1 tree** — those surfaces exist only, fenced, under `experimental/`, as reference for a possible v2.

---

## Storage & privacy

Everything the app stores lives in the browser's `localStorage`. No backend, no
accounts, no telemetry in v1. Clearing site data wipes it; export/import (spec
F8) is the backup path.
