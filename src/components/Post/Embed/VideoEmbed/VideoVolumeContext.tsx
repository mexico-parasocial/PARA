import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useMemo,
  useState,
} from 'react'

const Context = createContext<{
  // native
  muted: boolean
  setMuted: Dispatch<SetStateAction<boolean>>
  // web
  volume: number
  setVolume: Dispatch<SetStateAction<number>>
} | null>(null)
Context.displayName = 'VideoVolumeContext'

export function Provider({children}: {children: ReactNode}) {
  const [muted, setMuted] = useState(true)
  const [volume, setVolume] = useState(1)

  const value = useMemo(
    () => ({
      muted,
      setMuted,
      volume,
      setVolume,
    }),
    [muted, setMuted, volume, setVolume],
  )

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useVideoVolumeState() {
  const context = useContext(Context)
  if (!context) {
    throw new Error(
      'useVideoVolumeState must be used within a VideoVolumeProvider',
    )
  }
  return [context.volume, context.setVolume] as const
}

export function useVideoMuteState() {
  const context = useContext(Context)
  if (!context) {
    throw new Error(
      'useVideoMuteState must be used within a VideoVolumeProvider',
    )
  }
  return [context.muted, context.setMuted] as const
}
