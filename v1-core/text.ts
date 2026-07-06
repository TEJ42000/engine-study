// v1-core/text.ts
// Pure text helpers shared by the engine editor (F2) and precision-check mode
// (F4). Deterministic, no UI, no AI. The precision "suggester" is regex-only and
// always user-confirmed in the UI, so occasional false positives are fine.

// F2 AC2.2 — pasting multiple lines splits into entries; strip common list markers.
const LIST_MARKER_RE = /^\s*(?:\d+[.)]|[-*•])\s*/;

export function splitPastedLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(LIST_MARKER_RE, '').trim())
    .filter((line) => line.length > 0);
}

// Precision targets are stored wrapped in {{double braces}} inside step/satellite
// text. Braces are the storage form; they are stripped on normal render and only
// turned into blanks in precision-check mode.
const PRECISION_SPAN_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function extractPrecisionTargets(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(PRECISION_SPAN_RE)) out.push(m[1]);
  return out;
}

export function hasPrecisionTargets(text: string): boolean {
  return extractPrecisionTargets(text).length > 0;
}

// Remove the braces, keep the inner text — for normal (non-precision) rendering.
export function stripPrecisionBraces(text: string): string {
  return text.replace(PRECISION_SPAN_RE, '$1');
}

// F2 AC2.4 — deterministic candidate suggester. Returns unique substrings worth
// marking as precision targets. A hint the user confirms per-item, not an oracle.
const SUGGEST_PATTERNS: readonly RegExp[] = [
  /\bArt(?:icle|\.)?\s*\d+[a-z]?(?:\(\d+\))?(?:\([a-z]\))?/gi, // Art 6, Art. 6(1), Art 79(3)
  /\bC-\d+\/\d+\b/g, // CJEU case numbers, e.g. C-101/01
  /\b(?:1[0-9]{3}|20[0-9]{2})\b/g, // 4-digit years
  // "X v Y" case names (capitalised words either side of " v " / " v. ")
  /\b[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)*\s+v\.?\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)*/g,
];

export function suggestPrecisionTargets(text: string): string[] {
  const found = new Set<string>();
  for (const re of SUGGEST_PATTERNS) {
    for (const m of text.matchAll(re)) found.add(m[0].trim());
  }
  return [...found];
}
