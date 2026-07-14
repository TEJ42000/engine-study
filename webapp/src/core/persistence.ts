// v1-core/persistence.ts
// The export/import envelope + version gate (COSMOS_V1_SPEC.md F8 / AC8.1-8.3).
// The one non-negotiable behaviour: an unknown schemaVersion must BLOCK the
// import with a reason — it must never wipe or silently coerce the store.

import type { CosmosData } from './types';

export const SCHEMA_VERSION = 1;

export interface Envelope {
  schemaVersion: number;
  data: CosmosData;
}

export function emptyData(): CosmosData {
  return {
    courses: [],
    engines: [],
    testSessions: [],
    leaks: [],
    mockRuns: [],
    mockDrills: [],
  };
}

export function buildEnvelope(data: CosmosData): Envelope {
  return { schemaVersion: SCHEMA_VERSION, data };
}

export type ImportResult =
  | { ok: true; data: CosmosData }
  | { ok: false; reason: string };

/**
 * Parse and version-gate an exported envelope. On any problem returns
 * { ok: false, reason } and the caller must leave the existing store untouched
 * (AC8.3). Missing additive collections (e.g. a pre-v1.1 export with no
 * `mockDrills`) are defaulted to [].
 */
export function parseEnvelope(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'Not valid JSON.' };
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('schemaVersion' in parsed)
  ) {
    return {
      ok: false,
      reason: 'Missing schemaVersion — this is not an Engine Study export.',
    };
  }

  const env = parsed as { schemaVersion: unknown; data?: unknown };
  if (env.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      reason:
        `Unsupported schemaVersion ${String(env.schemaVersion)} ` +
        `(this build expects ${SCHEMA_VERSION}). Import blocked; your data is untouched.`,
    };
  }

  const incoming =
    typeof env.data === 'object' && env.data !== null
      ? (env.data as Partial<CosmosData>)
      : {};

  // Strict validation of core arrays (P1-002 fix)
  if (incoming.courses && !Array.isArray(incoming.courses)) return { ok: false, reason: "Invalid courses: expected array" };
  if (incoming.engines && !Array.isArray(incoming.engines)) return { ok: false, reason: "Invalid engines: expected array" };
  if (incoming.leaks && !Array.isArray(incoming.leaks)) return { ok: false, reason: "Invalid leaks: expected array" };
  if (incoming.mockRuns && !Array.isArray(incoming.mockRuns)) return { ok: false, reason: "Invalid mockRuns: expected array" };
  if (incoming.testSessions && !Array.isArray(incoming.testSessions)) return { ok: false, reason: "Invalid testSessions: expected array" };
  if (incoming.mockDrills && !Array.isArray(incoming.mockDrills)) return { ok: false, reason: "Invalid mockDrills: expected array" };

  const data: CosmosData = { ...emptyData(), ...incoming };
  if (!Array.isArray(data.mockDrills)) data.mockDrills = [];

  return { ok: true, data };
}
