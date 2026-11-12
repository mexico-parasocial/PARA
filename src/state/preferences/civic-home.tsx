import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import * as persisted from '#/state/persisted'

/**
 * The Mexican state the user calls their civic home, chosen during onboarding.
 *
 * It is a device preference only: it pre-selects state filters (Communities,
 * Cabildeos) and is never published, so it is not evidence of residency and
 * must not gate eligibility. Stored with the `MEXICAN_STATES` spelling;
 * undefined means no state (national).
 */
type StateContext = string | undefined
type SetContext = (v: string | undefined) => void

const stateContext = createContext<StateContext>(
  persisted.defaults.civicHomeState,
)
stateContext.displayName = 'CivicHomeStateContext'
const setContext = createContext<SetContext>((_: string | undefined) => {})
setContext.displayName = 'CivicHomeSetContext'

export function Provider({children}: {children: ReactNode}) {
  const [state, setState] = useState(persisted.get('civicHomeState'))

  const setStateWrapped = useCallback((next: string | undefined) => {
    setState(next)
    persisted.write('civicHomeState', next)
  }, [])

  useEffect(() => {
    return persisted.onUpdate('civicHomeState', next => {
      setState(next)
    })
  }, [])

  return (
    <stateContext.Provider value={state}>
      <setContext.Provider value={setStateWrapped}>
        {children}
      </setContext.Provider>
    </stateContext.Provider>
  )
}

export const useCivicHomeState = () => useContext(stateContext)
export const useSetCivicHomeState = () => useContext(setContext)
