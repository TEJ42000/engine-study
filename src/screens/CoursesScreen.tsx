import { useState } from 'react'
import {
  upsertCourse,
  deriveDrillEmphasisHint,
  cascadeDeleteCourse,
  type Course,
  type ExamProfile,
} from '@core'
import type { Store } from '../store'
import { newId } from '../download'

const EMPTY_PROFILE: ExamProfile = {
  openBook: false,
  appliedVsMemorization: 'MIXED',
  pathGraded: false,
  modes: [],
}

// F1 — courses + exam profile (AC1.1), drill-emphasis hint (AC1.2),
// cascade delete with counts (AC1.3).
export function CoursesScreen({ store }: { store: Store }) {
  if (store.state.status !== 'ok') return null
  const data = store.state.data

  const [name, setName] = useState('')
  const [profile, setProfile] = useState<ExamProfile>(EMPTY_PROFILE)
  const [modesText, setModesText] = useState('')
  const [pendingDelete, setPendingDelete] = useState<{
    course: Course
    counts: { engines: number; testSessions: number; leaks: number; mockRuns: number }
  } | null>(null)

  const hint = deriveDrillEmphasisHint(profile)

  function resetForm() {
    setName('')
    setProfile(EMPTY_PROFILE)
    setModesText('')
  }

  function addCourse() {
    const trimmed = name.trim()
    if (!trimmed) return
    const course: Course = {
      id: newId(),
      name: trimmed,
      examProfile: {
        ...profile,
        modes: modesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      },
    }
    store.commit(upsertCourse(data, course))
    resetForm()
  }

  function askDelete(course: Course) {
    const { counts } = cascadeDeleteCourse(data, course.id)
    setPendingDelete({ course, counts })
  }

  function confirmDelete() {
    if (!pendingDelete) return
    const { data: next } = cascadeDeleteCourse(data, pendingDelete.course.id)
    store.commit(next)
    setPendingDelete(null)
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">New course</h2>
        <div className="space-y-3">
          <input
            data-testid="course-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Course name (e.g. Tech Law)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                data-testid="profile-openbook"
                type="checkbox"
                checked={profile.openBook}
                onChange={(e) => setProfile((p) => ({ ...p, openBook: e.target.checked }))}
              />
              Open book
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                data-testid="profile-pathgraded"
                type="checkbox"
                checked={profile.pathGraded}
                onChange={(e) => setProfile((p) => ({ ...p, pathGraded: e.target.checked }))}
              />
              Path-graded (sequence matters)
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Applied vs memorization
              <select
                data-testid="profile-applied"
                value={profile.appliedVsMemorization}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    appliedVsMemorization: e.target.value as ExamProfile['appliedVsMemorization'],
                  }))
                }
                className="rounded-md border border-slate-300 px-2 py-1.5"
              >
                <option value="APPLIED">Applied</option>
                <option value="MEMORIZATION">Memorization</option>
                <option value="MIXED">Mixed</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Modes (comma-separated)
              <input
                data-testid="profile-modes"
                value={modesText}
                onChange={(e) => setModesText(e.target.value)}
                placeholder="essay, MCQ"
                className="rounded-md border border-slate-300 px-2 py-1.5"
              />
            </label>
          </div>
          <p data-testid="hint" className="text-xs text-slate-500">
            Drill emphasis: <span className="font-medium text-slate-700">{hint}</span>
          </p>
          <button
            data-testid="add-course"
            onClick={addCourse}
            disabled={!name.trim()}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            Add course
          </button>
        </div>
      </section>

      {/* List */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">
          Courses ({data.courses.length})
        </h2>
        {data.courses.length === 0 && (
          <p className="text-sm text-slate-400">No courses yet.</p>
        )}
        {data.courses.map((c) => {
          const engineCount = data.engines.filter((e) => e.courseId === c.id).length
          return (
            <div
              key={c.id}
              data-testid="course-row"
              className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="font-medium text-slate-800">{c.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {c.examProfile.openBook ? 'open-book' : 'closed-book'} ·{' '}
                  {c.examProfile.appliedVsMemorization.toLowerCase()}
                  {c.examProfile.pathGraded ? ' · path-graded' : ''}
                  {c.examProfile.modes.length ? ` · ${c.examProfile.modes.join(', ')}` : ''}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Drill emphasis:{' '}
                  <span className="font-medium text-slate-700">
                    {deriveDrillEmphasisHint(c.examProfile)}
                  </span>{' '}
                  · {engineCount} engine{engineCount === 1 ? '' : 's'}
                </p>
              </div>
              <button
                data-testid="delete-course"
                onClick={() => askDelete(c)}
                className="shrink-0 rounded-md border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
              >
                Delete
              </button>
            </div>
          )
        })}
      </section>

      {/* Cascade-delete confirm (AC1.3) */}
      {pendingDelete && (
        <div
          data-testid="delete-confirm"
          className="fixed inset-0 flex items-center justify-center bg-black/30 p-6"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-slate-800">
              Delete “{pendingDelete.course.name}”?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This also permanently deletes:
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
              <li>{pendingDelete.counts.engines} engine(s)</li>
              <li>{pendingDelete.counts.testSessions} test session(s)</li>
              <li>{pendingDelete.counts.leaks} leak(s)</li>
              <li>{pendingDelete.counts.mockRuns} mock run(s)</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                data-testid="delete-confirm-btn"
                onClick={confirmDelete}
                className="rounded-md bg-rose-700 px-4 py-2 text-sm text-white hover:bg-rose-600"
              >
                Delete everything
              </button>
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
