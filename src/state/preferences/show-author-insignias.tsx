import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import * as persisted from '#/state/persisted'

type StateContext = persisted.Schema['showAuthorInsignias']
type SetContext = (v: persisted.Schema['showAuthorInsignias']) => void

const stateContext = createContext<StateContext>(
  persisted.defaults.showAuthorInsignias,
)
stateContext.displayName = 'ShowAuthorInsigniasStateContext'
const setContext = createContext<SetContext>(
  (_: persisted.Schema['showAuthorInsignias']) => {},
)
setContext.displayName = 'ShowAuthorInsigniasSetContext'

export function Provider({children}: PropsWithChildren<{}>) {
  const [state, setState] = useState(persisted.get('showAuthorInsignias'))

  const setStateWrapped = useCallback(
    (showAuthorInsignias: persisted.Schema['showAuthorInsignias']) => {
      setState(showAuthorInsignias)
      persisted.write('showAuthorInsignias', showAuthorInsignias)
    },
    [setState],
  )

  useEffect(() => {
    return persisted.onUpdate(
      'showAuthorInsignias',
      nextShowAuthorInsignias => {
        setState(nextShowAuthorInsignias)
      },
    )
  }, [setStateWrapped])

  return (
    <stateContext.Provider value={state}>
      <setContext.Provider value={setStateWrapped}>
        {children}
      </setContext.Provider>
    </stateContext.Provider>
  )
}

export function useShowAuthorInsignias() {
  return useContext(stateContext)
}

export function useSetShowAuthorInsignias() {
  return useContext(setContext)
}
