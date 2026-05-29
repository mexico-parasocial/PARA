import {createContext, useCallback, useContext, useMemo, useState} from 'react'

type ViewMode = 'View official parties' | "View by 9th's" | 'Followed policies'

interface CompassFilterContextValue {
  selectedFilters: string[]
  activeFilters: string[]
  viewMode: ViewMode
  selectedState: string
  activeState: string
  showCommunities: boolean
  setSelectedState: (state: string) => void
  setViewMode: (mode: ViewMode) => void
  setShowCommunities: (show: boolean) => void
  toggleFilter: (name: string) => void
  applyFilters: () => void
  removeActiveFilter: (name: string) => void
  resetFilters: () => void
}

const CompassFilterContext = createContext<CompassFilterContextValue | null>(
  null,
)

export function CompassFilterProvider({children}: {children: React.ReactNode}) {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('View official parties')
  const [selectedState, setSelectedState] = useState<string>('None')
  const [activeState, setActiveState] = useState<string>('None')
  const [showCommunities, setShowCommunities] = useState(true)

  const toggleFilter = useCallback((name: string) => {
    setSelectedFilters(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name],
    )
  }, [])

  const applyFilters = useCallback(() => {
    setActiveFilters(selectedFilters)
    setActiveState(selectedState)
  }, [selectedFilters, selectedState])

  const removeActiveFilter = useCallback(
    (name: string) => {
      setActiveFilters(prev => prev.filter(item => item !== name))
      setSelectedFilters(prev => prev.filter(item => item !== name))
      if (selectedState === name) {
        setSelectedState('None')
      }
      if (activeState === name) {
        setActiveState('None')
      }
    },
    [activeState, selectedState],
  )

  const resetFilters = useCallback(() => {
    setSelectedFilters([])
    setActiveFilters([])
    setViewMode('View official parties')
    setSelectedState('None')
    setActiveState('None')
    setShowCommunities(true)
  }, [])

  const value = useMemo(
    () => ({
      selectedFilters,
      activeFilters,
      viewMode,
      selectedState,
      activeState,
      showCommunities,
      setSelectedState,
      setViewMode,
      setShowCommunities,
      toggleFilter,
      applyFilters,
      removeActiveFilter,
      resetFilters,
    }),
    [
      selectedFilters,
      activeFilters,
      viewMode,
      selectedState,
      activeState,
      showCommunities,
      toggleFilter,
      applyFilters,
      removeActiveFilter,
      resetFilters,
    ],
  )

  return (
    <CompassFilterContext.Provider value={value}>
      {children}
    </CompassFilterContext.Provider>
  )
}

export function useCompassFilter() {
  const ctx = useContext(CompassFilterContext)
  if (!ctx) {
    throw new Error(
      'useCompassFilter must be used within a CompassFilterProvider',
    )
  }
  return ctx
}
