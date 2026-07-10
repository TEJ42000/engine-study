"use client";
/**
 * Client-side CosmosData store.
 *
 * Loads from /api/data on mount, exposes all v1-core mutations as typed
 * wrappers that (a) update the in-memory state immediately and (b) async-
 * persist to /api/data via a 500 ms debounce.
 *
 * All wrappers delegate to v1-core pure functions — no business logic here.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { v4 as uuid } from "uuid";
import type { CosmosData, Course, Engine, ExamProfile, LeakEntry, MockRun, TestSession } from "@/core/types";
import { emptyData, buildEnvelope } from "@/core/persistence";
import { NEW_ENGINE_DEFAULTS, cascadeDeleteCourse, upsertCourse, upsertEngine, recordSession as coreRecord, addLeak as coreAddLeak, addMockRun as coreAddMockRun, markMissDrilled as coreMark } from "@/core/mutations";
import type { CascadeCounts } from "@/core/mutations";

// ─── context shape ───────────────────────────────────────────────────────────

interface StoreCtx {
  data: CosmosData;
  loading: boolean;
  setData: (next: CosmosData) => void;
  // F1
  addCourse: (name: string, profile: ExamProfile) => Course;
  updateCourse: (id: string, name: string, profile: ExamProfile) => void;
  deleteCourse: (id: string) => CascadeCounts;
  // F2
  addEngine: (fields: Omit<Engine, "id" | "createdAt" | "comprehension" | "retrievalReliability" | "passStreak" | "lastTestedAt" | "stacking">) => Engine;
  updateEngine: (engine: Engine) => void;
  deleteEngine: (id: string) => void;
  // F3 / F4
  recordSession: (session: TestSession) => void;
  // F5
  addLeak: (leak: LeakEntry) => void;
  // F6
  addMockRun: (run: MockRun) => void;
  markMissDrilled: (mockRunId: string, missId: string) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

// ─── provider ────────────────────────────────────────────────────────────────

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setRaw] = useState<CosmosData>(emptyData());
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then(({ envelope }) => { if (envelope?.data) setRaw(envelope.data as CosmosData); })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback((next: CosmosData) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildEnvelope(next)),
      });
    }, 500);
  }, []);

  const mutate = useCallback((fn: (d: CosmosData) => CosmosData) => {
    setRaw((prev) => { const next = fn(prev); persist(next); return next; });
  }, [persist]);

  const setData = useCallback((next: CosmosData) => { setRaw(next); persist(next); }, [persist]);

  // ── F1 courses ──
  const addCourse = useCallback((name: string, profile: ExamProfile): Course => {
    const course: Course = { id: uuid(), name, examProfile: profile };
    mutate((d) => upsertCourse(d, course));
    return course;
  }, [mutate]);

  const updateCourse = useCallback((id: string, name: string, profile: ExamProfile) => {
    mutate((d) => upsertCourse(d, { id, name, examProfile: profile }));
  }, [mutate]);

  const deleteCourse = useCallback((id: string): CascadeCounts => {
    let counts!: CascadeCounts;
    mutate((d) => { const r = cascadeDeleteCourse(d, id); counts = r.counts; return r.data; });
    return counts;
  }, [mutate]);

  // ── F2 engines ──
  const addEngine = useCallback((
    fields: Omit<Engine, "id" | "createdAt" | "comprehension" | "retrievalReliability" | "passStreak" | "lastTestedAt" | "stacking">
  ): Engine => {
    const engine: Engine = { ...NEW_ENGINE_DEFAULTS, ...fields, id: uuid(), createdAt: new Date().toISOString() };
    mutate((d) => upsertEngine(d, engine));
    return engine;
  }, [mutate]);

  const updateEngine = useCallback((engine: Engine) => {
    mutate((d) => upsertEngine(d, engine));
  }, [mutate]);

  const deleteEngine = useCallback((id: string) => {
    mutate((d) => ({ ...d, engines: d.engines.filter((e) => e.id !== id) }));
  }, [mutate]);

  // ── F3 / F4 sessions ──
  const recordSession = useCallback((session: TestSession) => {
    mutate((d) => coreRecord(d, session));
  }, [mutate]);

  // ── F5 leaks ──
  const addLeak = useCallback((leak: LeakEntry) => {
    mutate((d) => coreAddLeak(d, leak));
  }, [mutate]);

  // ── F6 mocks ──
  const addMockRun = useCallback((run: MockRun) => {
    mutate((d) => coreAddMockRun(d, run));
  }, [mutate]);

  const markMissDrilled = useCallback((mockRunId: string, missId: string) => {
    mutate((d) => coreMark(d, mockRunId, missId));
  }, [mutate]);

  return (
    <Ctx.Provider value={{
      data, loading, setData,
      addCourse, updateCourse, deleteCourse,
      addEngine, updateEngine, deleteEngine,
      recordSession, addLeak, addMockRun, markMissDrilled,
    }}>
      {children}
    </Ctx.Provider>
  );
}
