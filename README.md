# Engine Study (prototype)

A disposable, local, single-user prototype for a study method: turn each course
topic into an **engine** (an ordered procedure), test each engine **cold** from
memory on a recurring basis, and log every mistake (**leak**). An engine's
maturity only advances when you pass a cold test.

## Run

```bash
npm install
npm run dev
```

Then open the printed URL (default http://localhost:5173).

## Concept

- **Course** — a subject, groups engines.
- **Engine** — `title`, `gate` (precondition), ordered `steps`, `trigger` (the
  cue to use it), `satellites` (related facts). Maturity:
  `DRAFTED → TESTED → STABLE → REFLEX`.
- **Leak** — a logged mistake: `GATE_SKIP`, `WRONG_TOOL`, or `PRECISION`.

## Screens

1. **Dashboard** — create/select courses, see engines by course with maturity
   badges, a "Study next" list (most due first), and maturity counts.
2. **Engine Editor** — create/edit an engine, add/remove/reorder steps.
3. **Test Runner** — the core loop. Content is **hidden** for cold recall; you
   press PASS or FAIL first. FAIL logs a leak and never advances maturity; PASS
   advances one step and stamps the test time (and can optionally log a leak).
   Only *after* recording is the full engine revealed for self-check.
4. **Leak Log** — all leaks, filterable by type and engine, with counts.

## Storage

Everything lives in `localStorage` under the key `engine-study-v1`. No backend,
no accounts. Clearing site data wipes it.

## Rules that matter

- Maturity **never** advances automatically — only on a recorded PASS.
- The Test Runner hides engine content until a result is recorded.
