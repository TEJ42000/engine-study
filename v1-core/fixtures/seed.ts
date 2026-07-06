// v1-core/fixtures/seed.ts
// A small, internally-consistent seed dataset in the v1 shape — the four Tech Law
// GDPR engines from extractions/COURSE_01, mapped into the two-axis model.
//
// Two purposes:
//   1. Test data for the Cosmos build (exercises courses+profile, engines both
//      fresh and tested, a stored session, a committed leak, precision targets).
//   2. A real content head-start — import this to start drilling actual engines.
//
// The "gdpr-applies" engine reflects the real prototype run: one cold-recall PASS
// (-> FRAGILE, streak 1) plus the real PRECISION leak. The other three are fresh
// (UNTESTED / SHAKY). Precision targets ({{ }}) are seeded on the case citations.
//
// NOTE: examProfile values are seed placeholders — verify against the real exam.

import type { CosmosData } from '../types';

const CREATED = '2026-07-05T16:00:00Z';
const TESTED_STARTED = '2026-07-05T17:10:00Z';
const TESTED_AT = '2026-07-05T17:18:00Z';

export const SEED: CosmosData = {
  courses: [
    {
      id: 'tech-law',
      name: 'Introduction to Technology Law',
      examProfile: {
        openBook: false, // seed placeholder — verify
        appliedVsMemorization: 'APPLIED',
        pathGraded: true, // GDPR reasoning is gate/sequence-heavy
        modes: [],
      },
    },
  ],

  engines: [
    {
      id: 'gdpr-applies',
      courseId: 'tech-law',
      engineType: 'DOCTRINAL',
      title: 'Does the GDPR apply? (Art 2–3 scope)',
      gate: 'Is personal data being PROCESSED at all? If there is no personal data or no processing, stop — GDPR analysis ends here.',
      steps: [
        'Name the personal data — any information relating to an identified or identifiable natural person (the data subject).',
        'Name the processing — any operation on that data (collection, storage, use, alteration, disclosure…).',
        'Material scope (Art 2): processing wholly/partly automated, OR non-automated but part of an (intended) filing system.',
        'Run the four Art 2 exceptions: outside EU law scope / CFSP / purely personal or household / law enforcement (LED applies instead).',
        'Stress-test the household exception: publishing online for everyone (Lindqvist) and CCTV covering public space (Ryneš) do NOT qualify.',
        'Territorial scope (Art 3): establishment of a controller or processor in the Union — regardless of where processing happens.',
        'No EU establishment? Check: offering goods/services to EU data subjects, monitoring their behaviour in the EU, or MS law via public international law.',
        'Conclude: GDPR applies or not; label the actors — controller (determines purposes and means) vs processor (acts on the controller’s behalf).',
      ],
      trigger:
        'Fact pattern where info about a person is collected, stored or used — run BEFORE any lawfulness or data-subject-rights discussion.',
      satellites: [
        '{{C-101/01}} Lindqvist — online publication accessible to all ≠ household exception',
        '{{C-212/13}} Ryneš — home CCTV recording public space ≠ household exception',
        'Police / criminal-justice processing → Law Enforcement Directive applies, not GDPR',
        'Privacy (Art 7 CFREU) and data protection (Art 8 CFREU) are DISTINCT rights in the EU',
      ],
      stacking: false,
      comprehension: 'SOLID',
      retrievalReliability: 'FRAGILE', // one recorded pass (see the session below)
      passStreak: 1,
      lastTestedAt: TESTED_AT,
      createdAt: CREATED,
    },
    {
      id: 'lawful-basis',
      courseId: 'tech-law',
      engineType: 'DOCTRINAL',
      title: 'Which lawful basis carries this processing? (Art 6)',
      gate: 'Ordinary personal data? If it’s sensitive data (Art 9 list), this engine alone is the wrong tool — the Art 9 exception regime governs.',
      steps: [
        'Recite the six bases: consent / contract / legal obligation / vital interests / public task / legitimate interests.',
        'Do not default to consent — it is one ground among six, not the master ground.',
        'Match facts to a basis via its “necessary for…” wording; discard bases whose necessity wording the facts don’t satisfy.',
        'If legitimate interests: name the concrete interest of the controller or a third party.',
        'Necessity test: could the aim be achieved by less intrusive means? Processing must be strictly necessary.',
        'Balancing test: do the data subject’s fundamental rights and freedoms override that interest?',
        'Conclude one basis and say in one line why the runner-up bases fail.',
      ],
      trigger:
        'Fact pattern asks whether a company or authority MAY process the data (lawfulness) — run after applicability is settled.',
      satellites: [
        'Art 6(1)(a)–(f) keywords: consent — contract — legal obligation — vital interests — public task — legitimate interests',
        'Asociaţia de Proprietari (CJEU): building CCTV lawful under LEGITIMATE INTERESTS (protection of property/life) — consent NOT required; strict necessity + balancing stressed',
        '“Necessary” appears in five of the six bases — consent is the only basis without a necessity test',
        'The legitimate interest may be pursued by the controller OR a third party',
      ],
      stacking: false,
      comprehension: 'SHAKY',
      retrievalReliability: 'UNTESTED',
      passStreak: 0,
      lastTestedAt: null,
      createdAt: CREATED,
    },
    {
      id: 'consent-valid',
      courseId: 'tech-law',
      engineType: 'DOCTRINAL',
      title: 'Is this consent valid? (Arts 7–8)',
      gate: 'Is consent actually the basis relied on? If another Art 6 basis carries the processing, consent validity is the wrong fight.',
      steps: [
        'Four validity requirements: freely given, specific, informed, unambiguous.',
        'Affirmative action: a clear affirmative act — silence or pre-ticked boxes don’t count.',
        'Clear language: transparent information in clear, plain language.',
        'Withdrawal: possible at any time, and AS EASY as giving it was.',
        'Escalation check — EXPLICIT consent needed for: sensitive data, 3rd-country transfer without other safeguards, automated decision-making.',
        'Age: under 16 (Member States may lower to 13) → parental authorization required.',
        'Proof: the controller must be able to DEMONSTRATE valid consent was obtained.',
      ],
      trigger:
        'A business points at a checkbox / T&C click / cookie banner as its justification for processing.',
      satellites: [
        'The three explicit-consent triggers: sensitive data — transfers w/o safeguards — automated decision-making',
        'Age of consent: 16 default; Member State floor is 13; below → parental authorization',
        'Withdrawal asymmetry (harder to withdraw than to give) invalidates consent',
        'Burden of proof is on the CONTROLLER',
      ],
      stacking: false,
      comprehension: 'SHAKY',
      retrievalReliability: 'UNTESTED',
      passStreak: 0,
      lastTestedAt: null,
      createdAt: CREATED,
    },
    {
      id: 'third-country-transfer',
      courseId: 'tech-law',
      engineType: 'DOCTRINAL',
      title: 'Route a transfer to a third country (Ch. V)',
      gate: 'Is personal data actually leaving the EU to a third country? Intra-EU flows are free — no transfer regime applies.',
      steps: [
        'Adequacy decision for the destination? If the Commission has found adequate protection → free flow, done.',
        'No adequacy → appropriate safeguards: legally binding instruments between public authorities, BCRs, SCCs, codes of conduct, certification.',
        'If relying on SCCs: verify CASE BY CASE that the recipient country’s law lets them be honored; if not → suspend transfers (Schrems II duty).',
        'No safeguards → derogations for specific situations: explicit consent, contract, important public interest, legal claims, vital interests, public register, compelling controller interest.',
        'Keep the ladder order: adequacy → safeguards → derogations (derogations are last-resort, read narrowly).',
        'Conclude the lawful route — or that the transfer must not proceed.',
      ],
      trigger:
        'Fact pattern sends personal data outside the EU (US cloud/host, offshore analytics, group company abroad).',
      satellites: [
        'Schrems II: Privacy Shield INVALID — US surveillance beyond strict necessity, no actionable rights for EU subjects, ombudsman ineffective',
        'Schrems II: SCCs remain VALID — but with a case-by-case verification duty on the transferring controller',
        'Schrems I already killed Safe Harbour — Privacy Shield was its failed successor',
        'Explicit consent appears HERE as a derogation — not a safeguard',
      ],
      stacking: false,
      comprehension: 'SHAKY',
      retrievalReliability: 'UNTESTED',
      passStreak: 0,
      lastTestedAt: null,
      createdAt: CREATED,
    },
  ],

  testSessions: [
    {
      id: 'sess-gdpr-1',
      engineId: 'gdpr-applies',
      mode: 'FULL_RECALL',
      gateAttempt:
        'Is personal data actually being processed? If no personal data or no processing, GDPR does not apply — stop.',
      attempt:
        'Personal data = info about an identifiable person. Processing = any operation. Material scope Art 2: automated, or non-automated in a filing system. Exceptions: outside EU law, CFSP, household, law enforcement. Lindqvist + Ryneš limit the household exception. Territorial scope Art 3: establishment in the Union; or targeting/monitoring EU subjects. Controller vs processor.',
      result: 'PASS',
      comprehensionAfter: 'SOLID',
      startedAt: TESTED_STARTED,
      recordedAt: TESTED_AT,
    },
  ],

  leaks: [
    {
      id: 'leak-gdpr-precision-1',
      engineId: 'gdpr-applies',
      courseId: 'tech-law',
      type: 'PRECISION',
      status: 'COMMITTED',
      source: 'COLD_TEST',
      description:
        'Recalled the Art 2 exception as just “household” — actual wording is “PURELY PERSONAL and household activities”; the qualifier is what Lindqvist/Ryneš turn on.',
      createdAt: TESTED_AT,
    },
  ],

  mockRuns: [],
  mockDrills: [],
};
