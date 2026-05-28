/**
 * React Context for managing highlight mode state
 */
import {createContext, useCallback, useContext, useState} from 'react'

import {type HighlightModeState, type PendingHighlight} from './highlightTypes'

interface HighlightContextValue {
  state: HighlightModeState
  enterHighlightMode: (postUri: string) => void
  exitHighlightMode: () => void
  setPendingHighlight: (pending: PendingHighlight | null) => void
}

const defaultState: HighlightModeState = {
  isActive: false,
  postUri: null,
  pendingHighlight: null,
}

const HighlightContext = createContext<HighlightContextValue | null>(null)

export function HighlightProvider({children}: {children: React.ReactNode}) {
  const [state, setState] = useState<HighlightModeState>(defaultState)

  const enterHighlightMode = useCallback((postUri: string) => {
    setState({
      isActive: true,
      postUri,
      pendingHighlight: null,
    })
  }, [])

  const exitHighlightMode = useCallback(() => {
    setState(defaultState)
  }, [])

  const setPendingHighlight = useCallback(
    (pending: PendingHighlight | null) => {
      setState(prev => ({
        ...prev,
        pendingHighlight: pending,
      }))
    },
    [],
  )

  return (
    <HighlightContext.Provider
      value={{
        state,
        enterHighlightMode,
        exitHighlightMode,
        setPendingHighlight,
      }}>
      {children}
    </HighlightContext.Provider>
  )
}

export function useHighlightMode(): HighlightContextValue {
  const context = useContext(HighlightContext)
  if (!context) {
    throw new Error('useHighlightMode must be used within HighlightProvider')
  }
  return context
}

/**
 * Hook to check if highlight mode is active for a specific post
 */
export function useIsHighlightModeActive(postUri: string): boolean {
  const {state} = useHighlightMode()
  return state.isActive && state.postUri === postUri
}
