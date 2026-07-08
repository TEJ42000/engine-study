export type Maturity = 'DRAFTED' | 'TESTED' | 'STABLE' | 'REFLEX'

export const MATURITY_ORDER: Maturity[] = ['DRAFTED', 'TESTED', 'STABLE', 'REFLEX']

export function nextMaturity(m: Maturity): Maturity {
  const i = MATURITY_ORDER.indexOf(m)
  if (i < 0 || i >= MATURITY_ORDER.length - 1) return m
  return MATURITY_ORDER[i + 1]
}

export type LeakType = 'GATE_SKIP' | 'WRONG_TOOL' | 'PRECISION'

export const LEAK_TYPES: LeakType[] = ['GATE_SKIP', 'WRONG_TOOL', 'PRECISION']

export interface Course {
  id: string
  name: string
}

export interface Engine {
  id: string
  courseId: string
  title: string
  gate: string
  steps: string[]
  trigger: string
  satellites: string[]
  maturity: Maturity
  lastTestedAt: string | null
}

export interface Leak {
  id: string
  engineId: string
  description: string
  type: LeakType
  createdAt: string
}

export interface AppData {
  courses: Course[]
  engines: Engine[]
  leaks: Leak[]
}
