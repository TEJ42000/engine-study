# prototype-v0 — ARCHIVED (frozen v0 prototype)

This is the original disposable prototype, moved here on 2026-07-08 when the real
v1 build began in `../src/`. It is **archival only**:

- **Not built** — the repo's Vite build (`../index.html` → `../src/main.tsx`) points
  at the v1 app, not this.
- **Not imported** — the v1 app imports the verified core via `@core` (`../v1-core/`)
  and never from here.
- **Different data model** — it uses the retired single-axis maturity ladder
  (DRAFTED→TESTED→STABLE→REFLEX) and its own `localStorage` key `engine-study-v1`,
  distinct from v1's `cosmos-v1`.

Kept for reference and because `../v1-core/migrate.ts` maps its old `AppData` shape
into v1 `CosmosData` (COSMOS_V1_SPEC §5 step 6). Do not extend it.
