// v1-core/maturity.ts
// The two-axis maturity state machine (retrieval-reliability axis).
// Pure, deterministic, spec-faithful — COSMOS_V1_SPEC.md §1.2 + the locked
// decisions (2026-07-05) + SPEC_TIMED_MOCK.md §4.
//
// Comprehension axis is a plain self-mark (SHAKY/SOLID) handled in the UI; it
// has no state machine, so it lives with the UI, not here.

import type { Result, RetrievalReliability, SessionMode } from './types';

export interface MaturityState {
  retrievalReliability: RetrievalReliability;
  passStreak: number;
}

export interface MaturityEvent {
  result: Result;
  sessionMode: SessionMode;
  recordedAt: string; // ISO 8601
  // Start of the CURRENT unbroken full-recall/timed pass streak, INCLUDING the
  // event being applied. Derive with currentStreakStart(). null if streak is 0.
  firstPassAt: string | null;
}

export interface MaturityConfig {
  requiredStreak: number; // consecutive passes for FRAGILE -> RELIABLE
  decayWindowHours: number; // min hours between pass #1 and pass #N
}

// Locked decisions: 3 passes, 3rd >= 48h after the 1st.
export const DEFAULT_MATURITY_CONFIG: MaturityConfig = {
  requiredStreak: 3,
  decayWindowHours: 48,
};

// A timed mock item is cold recall under harder conditions — it feeds the
// retrieval axis exactly like a full-recall result (SPEC_TIMED_MOCK §4).
const countsTowardStreak = (m: SessionMode): boolean =>
  m === 'FULL_RECALL' || m === 'TIMED_MOCK';

/**
 * Apply one recorded result to an engine's maturity. Pure: same inputs ->
 * same output, no side effects, no clock read (recordedAt is supplied).
 *
 * Rules:
 *  - Full-recall / timed PASS: streak++; UNTESTED->FRAGILE on first test;
 *    FRAGILE->RELIABLE only if streak >= requiredStreak AND
 *    (recordedAt - firstPassAt) >= decayWindowHours.
 *  - Full-recall / timed FAIL: -> FRAGILE (from any state, incl. RELIABLE);
 *    reset streak to 0.
 *  - PRECISION_CHECK FAIL: demote RELIABLE -> FRAGILE; streak unchanged.
 *  - PRECISION_CHECK PASS: no change (asymmetric by design — only full cold
 *    recall earns reliability).
 */
export function applyMaturityTransition(
  current: MaturityState,
  event: MaturityEvent,
  config: MaturityConfig = DEFAULT_MATURITY_CONFIG,
): MaturityState {
  let reliability: RetrievalReliability = current.retrievalReliability;
  let passStreak = current.passStreak;

  if (countsTowardStreak(event.sessionMode)) {
    if (event.result === 'PASS') {
      passStreak += 1;
      if (reliability === 'UNTESTED') reliability = 'FRAGILE';
      if (
        reliability !== 'RELIABLE' &&
        passStreak >= config.requiredStreak &&
        event.firstPassAt
      ) {
        const elapsedHours =
          (Date.parse(event.recordedAt) - Date.parse(event.firstPassAt)) /
          3_600_000;
        if (elapsedHours >= config.decayWindowHours) reliability = 'RELIABLE';
      }
    } else {
      reliability = 'FRAGILE';
      passStreak = 0;
    }
  } else if (event.sessionMode === 'PRECISION_CHECK') {
    if (event.result === 'FAIL' && reliability === 'RELIABLE') {
      reliability = 'FRAGILE';
    }
    // PASS: no change; streak untouched.
  }

  return { retrievalReliability: reliability, passStreak };
}

/**
 * The recordedAt of the first pass in the current unbroken pass streak, given
 * an engine's streak-relevant sessions (FULL_RECALL + TIMED_MOCK only) in
 * chronological order. Any FAIL resets the streak. null when the current
 * streak is empty. Precision-check sessions must be filtered out before calling.
 */
export function currentStreakStart(
  streakSessionsChrono: ReadonlyArray<{ result: Result; recordedAt: string }>,
): string | null {
  let start: string | null = null;
  for (const s of streakSessionsChrono) {
    if (s.result === 'PASS') {
      if (start === null) start = s.recordedAt;
    } else {
      start = null;
    }
  }
  return start;
}
