import { useMemo, useState } from 'react'
import type { Store } from '../store'
import type { Engine, Maturity } from '../types'
import { MATURITY_ORDER } from '../types'
import { MaturityBadge, formatDate } from '../ui'

interface Props {
  store: Store
  onEdit: (engineId: string | null) => void
  onTest: (engineId: string | null) => void
}

// oldest tested first; never-tested (null) sorts first
function dueSort(a: Engine, b: Engine): number {
  if (a.lastTestedAt === b.lastTestedAt) return 0
  if (a.lastTestedAt === null) return -1
  if (b.lastTestedAt === null) return 1
  return a.lastTestedAt.localeCompare(b.lastTestedAt)
}

export function Dashboard({ store, onEdit, onTest }: Props) {
  const { data, addCourse, deleteCourse } = store
  const [newCourse, setNewCourse] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<string | 'ALL'>('ALL')

  const counts = useMemo(() => {
    const c: Record<Maturity, number> = {
      DRAFTED: 0,
      TESTED: 0,
      STABLE: 0,
      REFLEX: 0,
    }
    for (const e of data.engines) c[e.maturity]++
    return c
  }, [data.engines])

  const visibleEngines =
    selectedCourse === 'ALL'
      ? data.engines
      : data.engines.filter((e) => e.courseId === selectedCourse)

  const studyNext = useMemo(
    () => [...visibleEngines].sort(dueSort),
    [visibleEngines],
  )

  const courseName = (id: string) =>
    data.courses.find((c) => c.id === id)?.name ?? '(no course)'

  const handleAddCourse = () => {
    const name = newCourse.trim()
    if (!name) return
    const course = addCourse(name)
    setNewCourse('')
    setSelectedCourse(course.id)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <section className="grid grid-cols-4 gap-3">
        {MATURITY_ORDER.map((m) => (
          <div
            key={m}
            className="rounded-lg border border-slate-200 bg-white p-3 text-center"
          >
            <div className="text-2xl font-bold">{counts[m]}</div>
            <div className="mt-1">
              <MaturityBadge maturity={m} />
            </div>
          </div>
        ))}
      </section>

      {/* Courses */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Courses
        </h2>
        <div className="mb-3 flex gap-2">
          <input
            value={newCourse}
            onChange={(e) => setNewCourse(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCourse()}
            placeholder="New course name…"
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
          />
          <button
            onClick={handleAddCourse}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Add course
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCourse('ALL')}
            className={`rounded-full px-3 py-1 text-sm ${
              selectedCourse === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({data.engines.length})
          </button>
          {data.courses.map((c) => {
            const n = data.engines.filter((e) => e.courseId === c.id).length
            return (
              <span key={c.id} className="inline-flex items-center">
                <button
                  onClick={() => setSelectedCourse(c.id)}
                  className={`rounded-l-full px-3 py-1 text-sm ${
                    selectedCourse === c.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c.name} ({n})
                </button>
                <button
                  title="Delete course and its engines"
                  onClick={() => {
                    if (
                      confirm(
                        `Delete course "${c.name}" and its ${n} engine(s)?`,
                      )
                    ) {
                      if (selectedCourse === c.id) setSelectedCourse('ALL')
                      deleteCourse(c.id)
                    }
                  }}
                  className={`rounded-r-full px-2 py-1 text-sm ${
                    selectedCourse === c.id
                      ? 'bg-slate-700 text-white hover:bg-rose-600'
                      : 'bg-slate-200 text-slate-500 hover:bg-rose-200 hover:text-rose-700'
                  }`}
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      </section>

      {/* Engines grouped by course */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Engines
          </h2>
          <button
            onClick={() => onEdit(null)}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + New engine
          </button>
        </div>

        {data.courses.length === 0 && (
          <p className="text-sm text-slate-500">
            Create a course first, then add engines.
          </p>
        )}

        <div className="space-y-4">
          {data.courses
            .filter((c) => selectedCourse === 'ALL' || c.id === selectedCourse)
            .map((course) => {
              const engines = data.engines.filter(
                (e) => e.courseId === course.id,
              )
              return (
                <div key={course.id}>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    {course.name}
                  </h3>
                  {engines.length === 0 ? (
                    <p className="text-sm text-slate-400">No engines yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {engines.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2"
                        >
                          <span className="font-medium">{e.title}</span>
                          <MaturityBadge maturity={e.maturity} />
                          <span className="ml-auto text-xs text-slate-400">
                            tested {formatDate(e.lastTestedAt)}
                          </span>
                          <button
                            onClick={() => onTest(e.id)}
                            className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                          >
                            Test
                          </button>
                          <button
                            onClick={() => onEdit(e.id)}
                            className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                          >
                            Edit
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
        </div>
      </section>

      {/* Study next */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Study next
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Most due to test (never-tested first, then oldest).
        </p>
        {studyNext.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing to study yet.</p>
        ) : (
          <ol className="space-y-2">
            {studyNext.slice(0, 10).map((e, i) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2"
              >
                <span className="w-5 text-sm font-semibold text-slate-400">
                  {i + 1}
                </span>
                <span className="font-medium">{e.title}</span>
                <span className="text-xs text-slate-400">
                  {courseName(e.courseId)}
                </span>
                <MaturityBadge maturity={e.maturity} />
                <span className="ml-auto text-xs text-slate-400">
                  {formatDate(e.lastTestedAt)}
                </span>
                <button
                  onClick={() => onTest(e.id)}
                  className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                >
                  Test
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
