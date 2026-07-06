# FILE HEADER
- Course name: Legal History — University of Groningen (Profs. Fritz Brandsma & Jelle Jansen)
- Method used during: DAEN answer-structuring (Direct answer → Authority → Explain → No more); delivered via narrative walkthroughs, mnemonics, and self-built interactive revision tools
- Extraction date: 2026-07-05
- Exam outcome: pending
- Fidelity note: "Engine / Gate / Trigger / Satellites / Maturity" is not native vocabulary from this course. The only literal "engines" we built are the JavaScript components inside the revision app. Fields with no real correspondent are marked "unknown" rather than invented, per instruction.

## PART A — ENGINES

**1. Q&A / AI-Feedback Engine**
- Title: Q&A active-recall engine with live AI marking
- Gate: unknown (no gating concept used)
- Steps: question appears + timer starts → student types answer → "Get AI Feedback" → Anthropic API (claude-sonnet-4-20250514) returns score /10 + structured DAEN feedback → side-by-side compare (your answer vs. model answer) → self-mark Got it / Partial / Missed it (saved to localStorage)
- Trigger: opening the Q&A page / clicking "Get AI Feedback"
- Satellites: unknown (not a concept used)
- Maturity reached: fully built and shipped in single-file HTML; API-integrated, scored, persisted

**2. Write It Engine**
- Title: Structured free-recall writing engine
- Gate: unknown
- Steps: 24 structured prompts across all six weeks → category-tab filtering → type answer (auto-saves to localStorage) → reveal panel shows model answer point-by-point → free-form notes scratchpad (also auto-saves)
- Trigger: opening the Write It page
- Satellites: unknown
- Maturity reached: fully built (24 prompts, auto-save, per-prompt reveal)

**3. Weak-Qs Drill Engine**
- Title: Spaced weak-question drill loop
- Gate: unknown
- Steps: marking "Missed it"/"Partial" flags a question → banner shows count → "⚠ Weak Qs" drills only flagged questions in a loop until cleared → persists across sessions
- Trigger: marking a question weak / clicking "Weak Qs"
- Satellites: unknown
- Maturity reached: fully built

**4. React/JSX MCQ Quiz App**
- Title: Tap-based multiple-choice revision app (low-typing, shareable with study partner)
- Gate: unknown
- Steps: 100+ questions → select option → immediate feedback → progress through set
- Trigger: launching the app
- Satellites: unknown
- Maturity reached: built and debugged in-session (create_file used to avoid heredoc encoding issues)

**5. PDF Generation Pipeline**
- Title: ReportLab master-revision + Criminal-Law Q&A PDFs
- Gate: unknown
- Steps: read scanned image-PDFs via PyMuPDF at 2–2.5x → extract content visually → render formatted PDF (sections, timeline, mnemonics, model Q&As)
- Trigger: user requesting a PDF deliverable
- Satellites: unknown
- Maturity reached: delivered; present_files had intermittent display issues, worked around with an HTML fallback

## PART B — MECHANICS

- Recurring error types:
  - GATE_SKIP (dominant, real): answering with context/"understanding" instead of the direct answer first → zero marks. This was THE repeatedly-diagnosed failure. ("Skipping the direct-answer gate" is our mapping; not a label we used at the time.)
  - PRECISION (real): vague authorities where the professors demand exact names/dates/Latin — e.g. "Lex Citatio of 426" not "a law," "Montesquieu" not "a philosopher."
  - WRONG_TOOL (loose): (a) choosing the wrong interpretation method for a case; (b) a workflow friction where the tool defaulted to a website when the user wanted a PDF. Flagged as a loose mapping.
- What fixed each error: GATE_SKIP → the DAEN method + 0-pts-vs-2-pts contrast tables showing "shows understanding" vs "answers the question." PRECISION → drilling exact authorities + AI feedback calibrated to flag vague terms. WRONG_TOOL → method-selection practice on cases; asking format up front.
- The diagnosis loop: attempt practice question → compare against professors' model answer → flag DAEN violation + missing authority → restructure answer → re-drill via Weak-Qs. ("Diagnosis loop" is descriptive; not a named artefact we built.)
- What was distinct about THIS course: the marking style *is* the course content — interpretation means the question determines the answer, and answers are graded like a judge grades a lawyer (answer what's asked, not what you know). Also: every source file was a scanned image PDF (no extractable text), requiring rasterisation.
- Highest-value move: shifting focus from content mastery to exam technique — answer the exact question first (DAEN). Content knowledge was never the bottleneck; question-specific directness was.

## PART C — ONE-LINE SUMMARY
A content-rich Legal History resit where the winning move wasn't knowing more but answering the exact question first (DAEN), reinforced through self-built AI-marked recall engines.
