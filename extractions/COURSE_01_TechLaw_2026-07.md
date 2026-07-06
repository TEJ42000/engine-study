# FILE HEADER
- Course name: Introduction to Technology Law (Tech Law) — University of Groningen LLB. Source material: *Tech law in Charts V* (Charts 30–41, data-protection / GDPR).
- Method used during: 2026-07-05 — the first real run of the Engine Study prototype (course + four engines entered through the app, one cold test sat).
- Extraction date: 2026-07-05
- Exam outcome: n/a — no Tech Law exam sat during the prototype run; this was the method's first live trial, not an exam campaign.
- **Fidelity note:** unlike COURSE_02–06 (produced by running the extraction prompt in each course's own conversation), this file is **reconstructed from the four engines actually entered into the Engine Study prototype** during this project plus the mechanics recorded in `LEARNINGS.md`. The engines below are the verbatim gate/steps/trigger/satellites stored in the app (localStorage key `engine-study-v1`). It is placed here to complete the six-course corpus on disk; it is not an independent course-conversation extraction. If a "real" COURSE_01 extraction exists elsewhere, swap it in.

## PART A — ENGINES

### Engine: Does the GDPR apply? (Art 2–3 scope)
- Gate: Is personal data being PROCESSED at all? If there is no personal data or no processing, stop — GDPR analysis ends here.
- Steps:
  1. Name the personal data — any information relating to an identified or identifiable natural person (the data subject).
  2. Name the processing — any operation on that data (collection, storage, use, alteration, disclosure…).
  3. Material scope (Art 2): processing wholly/partly automated, OR non-automated but part of an (intended) filing system.
  4. Run the four Art 2 exceptions: outside EU law scope / CFSP / purely personal or household / law enforcement (LED applies instead).
  5. Stress-test the household exception: publishing online for everyone (Lindqvist) and CCTV covering public space (Ryneš) do NOT qualify.
  6. Territorial scope (Art 3): establishment of a controller or processor in the Union — regardless of where processing happens.
  7. No EU establishment? Check: offering goods/services to EU data subjects, monitoring their behaviour in the EU, or MS law via public international law.
  8. Conclude: GDPR applies or not; label the actors — controller (determines purposes and means) vs processor (acts on the controller's behalf).
- Trigger: Fact pattern where info about a person is collected, stored or used — run BEFORE any lawfulness or data-subject-rights discussion.
- Satellites:
  - C-101/01 Lindqvist — online publication accessible to all ≠ household exception
  - C-212/13 Ryneš — home CCTV recording public space ≠ household exception
  - Police / criminal-justice processing → Law Enforcement Directive applies, not GDPR
  - Privacy (Art 7 CFREU) and data protection (Art 8 CFREU) are DISTINCT rights in the EU
- Maturity reached: TESTED (one cold test, passed on the prototype's single-axis ladder). One PRECISION leak logged — recalled the Art 2 exception as just "household" when the wording is "PURELY PERSONAL and household activities"; that qualifier is what Lindqvist/Ryneš turn on.

### Engine: Which lawful basis carries this processing? (Art 6)
- Gate: Ordinary personal data? If it's sensitive data (Art 9 list), this engine alone is the wrong tool — the Art 9 exception regime governs.
- Steps:
  1. Recite the six bases: consent / contract / legal obligation / vital interests / public task / legitimate interests.
  2. Do not default to consent — it is one ground among six, not the master ground.
  3. Match facts to a basis via its 'necessary for…' wording; discard bases whose necessity wording the facts don't satisfy.
  4. If legitimate interests: name the concrete interest of the controller or a third party.
  5. Necessity test: could the aim be achieved by less intrusive means? Processing must be strictly necessary.
  6. Balancing test: do the data subject's fundamental rights and freedoms override that interest?
  7. Conclude one basis and say in one line why the runner-up bases fail.
- Trigger: Fact pattern asks whether a company or authority MAY process the data (lawfulness) — run after applicability is settled.
- Satellites:
  - Art 6(1)(a)–(f) keywords: consent — contract — legal obligation — vital interests — public task — legitimate interests
  - Asociaţia de Proprietari (CJEU): building CCTV lawful under LEGITIMATE INTERESTS (protection of property/life) — consent NOT required; strict necessity + balancing stressed
  - 'Necessary' appears in five of the six bases — consent is the only basis without a necessity test
  - The legitimate interest may be pursued by the controller OR a third party
- Maturity reached: DRAFTED — authored, never cold-tested.

### Engine: Is this consent valid? (Arts 7–8)
- Gate: Is consent actually the basis relied on? If another Art 6 basis carries the processing, consent validity is the wrong fight.
- Steps:
  1. Four validity requirements: freely given, specific, informed, unambiguous.
  2. Affirmative action: a clear affirmative act — silence or pre-ticked boxes don't count.
  3. Clear language: transparent information in clear, plain language.
  4. Withdrawal: possible at any time, and AS EASY as giving it was.
  5. Escalation check — EXPLICIT consent needed for: sensitive data, 3rd-country transfer without other safeguards, automated decision-making.
  6. Age: under 16 (Member States may lower to 13) → parental authorization required.
  7. Proof: the controller must be able to DEMONSTRATE valid consent was obtained.
- Trigger: A business points at a checkbox / T&C click / cookie banner as its justification for processing.
- Satellites:
  - The three explicit-consent triggers: sensitive data — transfers w/o safeguards — automated decision-making
  - Age of consent: 16 default; Member State floor is 13; below → parental authorization
  - Withdrawal asymmetry (harder to withdraw than to give) invalidates consent
  - Burden of proof is on the CONTROLLER
- Maturity reached: DRAFTED — authored, never cold-tested.

### Engine: Route a transfer to a third country (Ch. V)
- Gate: Is personal data actually leaving the EU to a third country? Intra-EU flows are free — no transfer regime applies.
- Steps:
  1. Adequacy decision for the destination? If the Commission has found adequate protection → free flow, done.
  2. No adequacy → appropriate safeguards: legally binding instruments between public authorities, BCRs, SCCs, codes of conduct, certification.
  3. If relying on SCCs: verify CASE BY CASE that the recipient country's law lets them be honored; if not → suspend transfers (Schrems II duty).
  4. No safeguards → derogations for specific situations: explicit consent, contract, important public interest, legal claims, vital interests, public register, compelling controller interest.
  5. Keep the ladder order: adequacy → safeguards → derogations (derogations are last-resort, read narrowly).
  6. Conclude the lawful route — or that the transfer must not proceed.
- Trigger: Fact pattern sends personal data outside the EU (US cloud/host, offshore analytics, group company abroad).
- Satellites:
  - Schrems II: Privacy Shield INVALID — US surveillance beyond strict necessity, no actionable rights for EU subjects, ombudsman ineffective
  - Schrems II: SCCs remain VALID — but with a case-by-case verification duty on the transferring controller
  - Schrems I already killed Safe Harbour — Privacy Shield was its failed successor
  - Explicit consent appears HERE as a derogation — not a safeguard
- Maturity reached: DRAFTED — authored, never cold-tested.

## PART B — MECHANICS

- Recurring error types (single data point — one cold test):
  - **PRECISION** (the one committed leak): dropping the qualifier "PURELY PERSONAL" from the Art 2 household exception. Exactly the verbatim-qualifier failure the satellites are meant to pin down.
  - **GATE_SKIP / WRONG_TOOL**: guarded, not committed — each engine's gate is built to prevent them (applicability before lawfulness; consent-is-the-basis before consent-validity; sensitive-data fork before Art 6; data-actually-leaving-the-EU before the transfer ladder). No committed instances logged in the single run.
- What fixed each error: PRECISION → the satellites carry the exact qualifier verbatim; the leak was logged so the miss is drilled next cycle. (Only one cold test was run, so this is a first data point, not a trend.)
- The diagnosis loop: author engine from the charts → cold test (gate-first recall → reveal → self-grade) → log the miss as a typed leak → reveal for self-check. This run validated the loop mechanics rather than producing an exam-campaign diagnosis.
- What was distinct about THIS course: the source material (*Tech law in Charts*) is a **taxonomy, not a procedure** — the charts give categories, exceptions, and definitions but no decision order. The whole extraction move was **imposing the sequence you'd actually execute in an exam answer** (personal data? → processing? → material scope → exceptions → household stress-test → territorial scope → extraterritorial hooks → conclude) onto material that presents itself as flat boxes. This is the finding that drove extraction-prompt rule #1 (order steps as you'd execute them, not as the source presents them). Titles leaking the answer (an early "(Art 2–3 scope)" title primed the recall) drove the "title names the situation, never the sources" rule.
- Highest-value move: cold-testing a single engine through the type→reveal→grade flow and logging the precise leak. It surfaced the exact wording gap (PURELY PERSONAL) that pure re-reading would have hidden, and it stress-tested the app's core loop — which in turn generated the L1–L3 findings and the whole Cosmos spec.

## PART C — ONE-LINE SUMMARY
The prototype's first live run: four GDPR engines extracted from a taxonomy-shaped chart deck by imposing exam-execution order onto flat categories — the run's one committed leak (a dropped "PURELY PERSONAL" qualifier) is exactly the verbatim-precision failure the satellites and the two-axis maturity model are built to catch.
