// v1-core/storage.ts
// The load-bearing data layer (COSMOS_V1_SPEC §0 / F8): localStorage-backed,
// versioned envelope, with the "unknown version never wipes" gate (AC8.3).
//
// The browser binding is INJECTED (StorageLike) rather than reaching for a
// global `localStorage`, so this is testable and framework-neutral. The app
// passes `window.localStorage`; a test passes an in-memory mock.

import type { CosmosData } from './types';
import {
  buildEnvelope,
  parseEnvelope,
  emptyData,
  type ImportResult,
} from './persistence';

export const STORAGE_KEY = 'cosmos-v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type LoadResult =
  // fresh = nothing was stored yet (first run)
  | { ok: true; data: CosmosData; fresh: boolean }
  // ok:false carries the raw string so the app can offer "export your data"
  // instead of overwriting it — e.g. an unknown schemaVersion (AC8.3).
  | { ok: false; reason: string; raw: string };

/** Load + version-gate the store. Never mutates storage. */
export function loadData(storage: StorageLike, key = STORAGE_KEY): LoadResult {
  const raw = storage.getItem(key);
  if (raw === null || raw === '') {
    return { ok: true, data: emptyData(), fresh: true };
  }
  const res = parseEnvelope(raw);
  if (res.ok) return { ok: true, data: res.data, fresh: false };
  return { ok: false, reason: res.reason, raw };
}

/** Persist the store as a versioned envelope. */
export function saveData(storage: StorageLike, data: CosmosData, key = STORAGE_KEY): void {
  storage.setItem(key, JSON.stringify(buildEnvelope(data)));
}

/** The pretty JSON string to hand to a download (F8 export). */
export function exportToJson(data: CosmosData): string {
  return JSON.stringify(buildEnvelope(data), null, 2);
}

/** Validate + parse an imported file (delegates to the version gate). */
export function importFromJson(json: string): ImportResult {
  return parseEnvelope(json);
}
