import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import * as persisted from '#/state/persisted'

type StateContext = persisted.Schema['showPartyShields']
type SetContext = (v: persisted.Schema['showPartyShields']) => void

const stateContext = createContext<StateContext>(
  persisted.defaults.showPartyShields,
)
stateContext.displayName = 'ShowPartyShieldsStateContext'
const setContext = createContext<SetContext>(
  (_: persisted.Schema['showPartyShields']) => {},
)
setContext.displayName = 'ShowPartyShieldsSetContext'

export function Provider({children}: PropsWithChildren<{}>) {
  const [state, setState] = useState(persisted.get('showPartyShields'))

  const setStateWrapped = useCallback(
    (showPartyShields: persisted.Schema['showPartyShields']) => {
      setState(showPartyShields)
      persisted.write('showPartyShields', showPartyShields)
    },
    [setState],
  )

  useEffect(() => {
    return persisted.onUpdate('showPartyShields', nextShowPartyShields => {
      setState(nextShowPartyShields)
    })
  }, [setStateWrapped])

  return (
    <stateContext.Provider value={state}>
      <setContext.Provider value={setStateWrapped}>
        {children}
      </setContext.Provider>
    </stateContext.Provider>
  )
}

export function useShowPartyShields() {
  return useContext(stateContext)
}

export function useSetShowPartyShields() {
  return useContext(setContext)
}
