import {createContext, useContext, useState} from 'react'

interface DataFilterContextType {
  selectedCommunities: string[]
  toggleCommunity: (community: string) => void
  setCommunities: (communities: string[]) => void
  clearCommunities: () => void
}

const DataFilterContext = createContext<DataFilterContextType>({
  selectedCommunities: [],
  toggleCommunity: () => {},
  setCommunities: () => {},
  clearCommunities: () => {},
})

export function DataFilterProvider({children}: {children: React.ReactNode}) {
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([])

  const toggleCommunity = (community: string) => {
    setSelectedCommunities(prev =>
      prev.includes(community)
        ? prev.filter(c => c !== community)
        : [...prev, community],
    )
  }

  const setCommunities = (communities: string[]) => {
    setSelectedCommunities(communities)
  }

  const clearCommunities = () => {
    setSelectedCommunities([])
  }

  return (
    <DataFilterContext.Provider
      value={{
        selectedCommunities,
        toggleCommunity,
        setCommunities,
        clearCommunities,
      }}>
      {children}
    </DataFilterContext.Provider>
  )
}

export const useGlobalFilter = () => useContext(DataFilterContext)
