# v1-core — framework-agnostic core for the Cosmos build

This is a **verified, UI-agnostic implementation of the v1 (+v1.1) data model and
the correctness-critical logic**, transcribed straight from
[`../COSMOS_V1_SPEC.md`](../COSMOS_V1_SPEC.md) and
[`../SPEC_TIMED_MOCK.md`](../SPEC_TIMED_MOCK.md).

It exists so Augment Cosmos can **build the React UI on top of a core that's
already correct**, instead of re-deriving the fiddly rules (the two-axis maturity
machine, the 48h RELIABLE window, the precision-demotion asymmetry, study-next
ordering, the export version gate). Cosmos continues seamlessly from here — this
folder makes **no UI, component, styling, routing, or storage-mechanism
decisions**; those stay Cosmos's to make.

## What's here

| File | Contents | Spec ref |
|---|---|---|
| `types.ts` | The full v1 + v1.1 data model (`Course`, `Engine`, `TestSession`, `LeakEntry`, `MockRun`, `MockDrill`, `CosmosData`, …) | COSMOS_V1_SPEC §1, SPEC_TIMED_MOCK §2 |
| `maturity.ts` | `applyMaturityTransition` + `currentStreakStart` — the retrieval-reliability state machine (pure, no clock read) | §1.2 + locked decisions + SPEC_TIMED_MOCK §4 |
| `selectors.ts` | `studyNext`, `drillList`, `maturityGrid`, `computeLeakProfile`, `filterLeaks` / `leakCounts` | F5–F7 / AC5.1 / AC6.4 / AC7.1–7.3 / §1.6 |
| `persistence.ts` | `buildEnvelope` / `parseEnvelope` — export + the schemaVersion gate (unknown version BLOCKS, never wipes) | F8 / AC8.1–8.3 |
| `text.ts` | `splitPastedLines`, `extractPrecisionTargets` / `stripPrecisionBraces` / `suggestPrecisionTargets`, `engineHasPrecisionTargets` / `precisionItems` — editor + precision-check helpers | F2 / F4 / AC2.2 / AC2.4 / AC4.1 |
| `storage.ts` | `loadData` / `saveData` / `exportToJson` / `importFromJson` — the localStorage-backed versioned envelope (browser binding injected via `StorageLike`, so it's testable/neutral) | §0 / F8 / AC8.1–8.3 |
| `mutations.ts` | pure `CosmosData` transitions: `deriveDrillEmphasisHint`, `cascadeDeleteCourse` (+counts), `recordSession` (F3 write path), `addMockRun` (+MOCK leaks) / `markMissDrilled`, upserts / `addLeak`, `NEW_ENGINE_DEFAULTS` | F1 / F3 / F6 / AC1.2 / AC1.3 / AC2.5 / AC6.1–6.4 / §1.2 |
| `migrate.ts` | `migrateLegacy` — v0 prototype store → v1 `CosmosData` (single-axis ladder → two-axis) | §5 step 6 |
| `fixtures/seed.ts` | `SEED` — the four Tech Law engines in v1 shape (test data + content head-start); import from `./fixtures/seed` | — |
| `index.ts` | Barrel export — import the core from here | — |
| `__checks__.ts` | Executable verification of every rule above (incl. seed consistency) | — |

## It is isolated from the frozen prototype

`v1-core/` sits **outside** `src/`, and the prototype's build uses
`tsconfig.json` `include: ["src"]`. So `npm run build` (the prototype) neither
compiles nor bundles this folder — nothing here can break it, and vice-versa.
Cosmos may relocate this under its chosen structure (e.g. `src/core/`) when it
scaffolds the v1 app; it's plain TypeScript with no dependencies.

## Verify it

```bash
npx tsc -p v1-core/tsconfig.json      # typecheck + emit to v1-core/dist (gitignored)
node v1-core/dist/__checks__.js       # run the rule checks
```

The checks assert, among others: 3 passes across ≥48h → RELIABLE; 3 within 48h →
stays FRAGILE; FAIL from RELIABLE → FRAGILE + streak reset; precision-check FAIL
demotes but a pass is a no-op; timed-mock passes feed maturity like full recall;
study-next ordering; committed-only leak profile; and that an unknown
`schemaVersion` is blocked rather than wiping the store.

## What's intentionally NOT here

UI, React, screens, styling, routing, the actual `localStorage` read/write calls,
AI, voice — all of that is v1 build work for Cosmos (or out of scope entirely).
This is only the deterministic spine.
