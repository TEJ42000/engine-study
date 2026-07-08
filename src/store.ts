import { useCallback, useState } from 'react'
import { loadData, saveData, type CosmosData } from '@core'

// The v1 app's single source of state. Load on start; persist on every mutation
// through the verified core write path (loadData/saveData in v1-core/storage.ts).
// Components call core mutations and hand the result to commit() — they never
// reimplement business logic.

export type StoreState =
  | { status: 'ok'; data: CosmosData }
  // Unknown schemaVersion (or corrupt store): surfaced, NEVER wiped (AC8.3).
  // `raw` is the untouched stored string so the user can export it.
  | { status: 'blocked'; reason: string; raw: string }

export interface Store {
  state: StoreState
  /** Persist `next` and update state. The only write path. */
  commit: (next: CosmosData) => void
  /** Re-read from storage (e.g. after an import). */
  reload: () => void
}

function read(): StoreState {
  const res = loadData(window.localStorage)
  return res.ok
    ? { status: 'ok', data: res.data }
    : { status: 'blocked', reason: res.reason, raw: res.raw }
}

export function useStore(): Store {
  const [state, setState] = useState<StoreState>(read)

  const commit = useCallback((next: CosmosData) => {
    saveData(window.localStorage, next)
    setState({ status: 'ok', data: next })
  }, [])

  const reload = useCallback(() => setState(read()), [])

  return { state, commit, reload }
}
