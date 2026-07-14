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
import type { CosmosData, Course, Engine, ExamProfile, LeakEntry, MockDrill, MockRun, TestSession } from "@/core/types";
import { emptyData, buildEnvelope } from "@/core/persistence";
import { NEW_ENGINE_DEFAULTS, cascadeDeleteCourse, cascadeDeleteEngine, upsertCourse, upsertEngine, recordSession as coreRecord, addLeak as coreAddLeak, addMockRun as coreAddMockRun, markMissDrilled as coreMark, addMockDrill as coreAddMockDrill, updateMockDrill as coreUpdateMockDrill } from "@/core/mutations";
import type { CascadeCounts } from "@/core/mutations";

// ─── context shape ───────────────────────────────────────────────────────────

interface StoreCtx {
  data: CosmosData;
  loading: boolean;
  syncStatus: "SAVED" | "SAVING" | "ERROR";
  setData: (next: CosmosData) => void;
  // F1
  addCourse: (name: string, profile: ExamProfile) => Course;
  updateCourse: (id: string, name: string, profile: ExamProfile) => void;
  deleteCourse: (id: string) => CascadeCounts;
  // F2
  addEngine: (fields: Omit<Engine, "id" | "createdAt" | "comprehension" | "retrievalReliability" | "passStreak" | "lastTestedAt">) => Engine;
  updateEngine: (engine: Engine) => void;
  deleteEngine: (id: string) => CascadeCounts;
  // F3 / F4
  recordSession: (session: TestSession) => void;
  // F5
  addLeak: (leak: LeakEntry) => void;
  // F6
  addMockRun: (run: MockRun) => void;
  markMissDrilled: (mockRunId: string, missId: string) => void;
  // v1.1 Timed Mock Drill
  addMockDrill: (drill: MockDrill) => void;
  updateMockDrill: (drill: MockDrill) => void;
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
  const [syncStatus, setSyncStatus] = useState<"SAVED" | "SAVING" | "ERROR">("SAVED");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<CosmosData>(data);
  dataRef.current = data;

  // Final flush using navigator.sendBeacon for tab-close reliability.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        const blob = new Blob(
          [JSON.stringify(buildEnvelope(dataRef.current))],
          { type: "application/json" }
        );
        navigator.sendBeacon("/api/data", blob);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then(({ envelope }) => { if (envelope?.data) setRaw(envelope.data as CosmosData); })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback((next: CosmosData) => {
    if (timer.current) clearTimeout(timer.current);
    setSyncStatus("SAVING");
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildEnvelope(next)),
        });
        if (!res.ok) throw new Error("Save failed");
        setSyncStatus("SAVED");
        timer.current = null;
      } catch (err) {
        console.error("[Store] Persist error:", err);
        setSyncStatus("ERROR");
      }
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
    fields: Omit<Engine, "id" | "createdAt" | "comprehension" | "retrievalReliability" | "passStreak" | "lastTestedAt">
  ): Engine => {
    const engine: Engine = { ...NEW_ENGINE_DEFAULTS, ...fields, id: uuid(), createdAt: new Date().toISOString() };
    mutate((d) => upsertEngine(d, engine));
    return engine;
  }, [mutate]);

  const updateEngine = useCallback((engine: Engine) => {
    mutate((d) => upsertEngine(d, engine));
  }, [mutate]);

  const deleteEngine = useCallback((id: string): CascadeCounts => {
    let counts!: CascadeCounts;
    mutate((d) => {
      const r = cascadeDeleteEngine(d, id);
      counts = r.counts;
      return r.data;
    });
    return counts;
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

  const addMockDrill = useCallback((drill: MockDrill) => {
    mutate((d) => coreAddMockDrill(d, drill));
  }, [mutate]);

  const updateMockDrill = useCallback((drill: MockDrill) => {
    mutate((d) => coreUpdateMockDrill(d, drill));
  }, [mutate]);

  return (
    <Ctx.Provider value={{
      data, loading, syncStatus, setData,
      addCourse, updateCourse, deleteCourse,
      addEngine, updateEngine, deleteEngine,
      recordSession, addLeak, addMockRun, markMissDrilled,
      addMockDrill, updateMockDrill,
    }}>
      {children}
    </Ctx.Provider>
  );
}
