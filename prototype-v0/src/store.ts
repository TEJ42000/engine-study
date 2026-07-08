import { useCallback, useEffect, useState } from 'react'
import type { AppData, Course, Engine, Leak } from './types'

const STORAGE_KEY = 'engine-study-v1'

const EMPTY: AppData = { courses: [], engines: [], leaks: [] }

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw)
    return {
      courses: parsed.courses ?? [],
      engines: parsed.engines ?? [],
      leaks: parsed.leaks ?? [],
    }
  } catch {
    return EMPTY
  }
}

function save(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// Simple single-store hook. One source of truth, persisted on every change.
export function useStore() {
  const [data, setData] = useState<AppData>(() => load())

  useEffect(() => {
    save(data)
  }, [data])

  const addCourse = useCallback((name: string): Course => {
    const course: Course = { id: uid(), name: name.trim() }
    setData((d) => ({ ...d, courses: [...d.courses, course] }))
    return course
  }, [])

  const deleteCourse = useCallback((courseId: string) => {
    setData((d) => {
      const engineIds = new Set(
        d.engines.filter((e) => e.courseId === courseId).map((e) => e.id),
      )
      return {
        courses: d.courses.filter((c) => c.id !== courseId),
        engines: d.engines.filter((e) => e.courseId !== courseId),
        leaks: d.leaks.filter((l) => !engineIds.has(l.engineId)),
      }
    })
  }, [])

  const saveEngine = useCallback((engine: Engine) => {
    setData((d) => {
      const exists = d.engines.some((e) => e.id === engine.id)
      return {
        ...d,
        engines: exists
          ? d.engines.map((e) => (e.id === engine.id ? engine : e))
          : [...d.engines, engine],
      }
    })
  }, [])

  const deleteEngine = useCallback((engineId: string) => {
    setData((d) => ({
      ...d,
      engines: d.engines.filter((e) => e.id !== engineId),
      leaks: d.leaks.filter((l) => l.engineId !== engineId),
    }))
  }, [])

  const addLeak = useCallback((leak: Leak) => {
    setData((d) => ({ ...d, leaks: [leak, ...d.leaks] }))
  }, [])

  return { data, addCourse, deleteCourse, saveEngine, deleteEngine, addLeak }
}

export type Store = ReturnType<typeof useStore>
