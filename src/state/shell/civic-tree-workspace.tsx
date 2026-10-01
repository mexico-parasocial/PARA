import {createContext, useCallback, useContext, useState} from 'react'
import {useFocusEffect} from '@react-navigation/native'

const Context = createContext({
  expanded: false,
  setExpanded: (_: boolean) => {},
})

export function CivicTreeWorkspaceProvider({
  children,
}: React.PropsWithChildren) {
  const [expanded, setExpanded] = useState(false)
  return (
    <Context.Provider value={{expanded, setExpanded}}>
      {children}
    </Context.Provider>
  )
}

export function useCivicTreeWorkspace() {
  return useContext(Context).expanded
}

// A focus-scoped claim keeps cached navigation screens from hiding the sidebar.
export function useExpandCivicTreeWorkspace(enabled: boolean) {
  const {setExpanded} = useContext(Context)
  useFocusEffect(
    useCallback(() => {
      setExpanded(enabled)
      return () => setExpanded(false)
    }, [enabled, setExpanded]),
  )
}
