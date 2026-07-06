// v1-core/index.ts
// Barrel export for the framework-agnostic v1 (+v1.1) core.
// The UI layer (React app, built by Augment Cosmos) imports from here.

export * from './types';
export * from './maturity';
export * from './selectors';
export * from './persistence';
export * from './text';
// Seed/test data is intentionally NOT re-exported here — import it explicitly
// from './fixtures/seed' when you want it.
