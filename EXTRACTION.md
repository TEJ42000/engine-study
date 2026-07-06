# Engine extraction prompt (v2)

Use this when turning course material (charts, notes, readers) into engines.
Refined after the first Tech Law run — see LEARNINGS.md for why each rule exists.

---

Turn the given topic into ONE engine with this shape:

**Title** — name the *situation or task*, phrased as the question you'd face in an
exam ("Does the GDPR apply?", "Is this consent valid?"). NEVER put legal sources,
article numbers, or answer content in the title — the title stays visible during
cold recall, so anything in it is a free hint.

**Gate** — the go/no-go question that tells you this engine is the WRONG tool.
Not a summary of step 1. It should stop you before you waste time: "Is data even
leaving the EU? If not, no transfer regime applies."

**Steps (5–9, ordered)** — the sequence you would actually *execute* in an exam
answer, not the order the source material presents things. Course charts are
usually taxonomies (categories, definitions); you must impose the decision order:
identify → classify → check exceptions → stress-test edge cases → conclude.
- Each step is one action or one check.
- If a step contains a list longer than ~4 items, pull the list into a satellite
  or split it into its own engine.
- A step references a case only when the case IS the decision point.
- End with an explicit "conclude" step that states what the output of the
  procedure is.

**Trigger** — the cue in a fact pattern that says "run this engine now", and
where it sits relative to other engines ("run BEFORE any lawfulness discussion").

**Satellites (2–5)** — the exact distinctions, qualifiers, and holdings that flip
outcomes, phrased as close to verbatim as possible ("PURELY PERSONAL and
household activities" — the qualifier is the answer). Cases live here as
one-liners: name + what it turned on. Numbers, ages, deadlines live here too.

**Test conventions** (used in the runner):
- Skipped the gate, or lost/added a whole step → FAIL.
- Wording slips → PASS, but log a PRECISION leak immediately.
- Recall in the scratchpad BEFORE revealing — no head-only recall.
