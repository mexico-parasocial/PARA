import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import {
  Reanimated3DefaultSpringConfig,
  type SharedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import {useFocusEffect} from '@react-navigation/native'

type StateContext = {
  footerMode: SharedValue<number>
}
type SetContext = {
  add: () => void
  subtract: () => void
}

const stateContext = createContext<StateContext | null>(null)
stateContext.displayName = 'MinimalModeStateContext'
const setContext = createContext<SetContext | null>(null)
setContext.displayName = 'MinimalModeSetContext'

export function Provider({children}: React.PropsWithChildren<{}>) {
  const footerMode = useSharedValue(0)

  const setModeWorklet = useCallback(
    (v: boolean) => {
      'worklet'
      footerMode.set(
        withSpring(v ? 1 : 0, {
          ...Reanimated3DefaultSpringConfig,
          overshootClamping: true,
        }),
      )
    },
    [footerMode],
  )

  // defaults to "visible", if the count is >0 it gets hidden
  const countRef = useRef(0)
  // Whether the imperative `set` (see useSetMinimalShellMode) currently holds
  // one claim, so repeated set(true) calls don't creep the refcount up.
  const setClaimedRef = useRef(false)
  const add = useCallback(() => {
    // 0 -> 1 = hide
    if (countRef.current === 0) setModeWorklet(true)

    countRef.current += 1
  }, [setModeWorklet])
  const subtract = useCallback(() => {
    // 1 -> 0 = show
    if (countRef.current === 1) setModeWorklet(false)

    // count must never go below 0
    if (countRef.current > 0) countRef.current -= 1
  }, [setModeWorklet])
  const set = useCallback(
    (v: boolean) => {
      // Idempotent boolean setter on top of the refcount: holds at most one
      // claim so it coexists with the useEnableMinimalShellMode claimants.
      if (v && !setClaimedRef.current) {
        setClaimedRef.current = true
        if (countRef.current === 0) setModeWorklet(true)
        countRef.current += 1
      } else if (!v && setClaimedRef.current) {
        setClaimedRef.current = false
        countRef.current = Math.max(0, countRef.current - 1)
        if (countRef.current === 0) setModeWorklet(false)
      }
    },
    [setModeWorklet],
  )

  const setters = useMemo(
    () => ({
      add,
      subtract,
      set,
    }),
    [add, subtract, set],
  )

  const value = useMemo(
    () => ({
      footerMode,
    }),
    [footerMode],
  )
  return (
    <stateContext.Provider value={value}>
      <setContext.Provider value={setters}>{children}</setContext.Provider>
    </stateContext.Provider>
  )
}

export function useMinimalShellMode() {
  const context = useContext(stateContext)
  if (!context)
    throw new Error(
      'useMinimalShellMode must be used within a MinimalModeProvider',
    )
  return context
}

export function useMinimalShellModeSetters() {
  const context = useContext(setContext)
  if (!context)
    throw new Error(
      'useMinimalShellModeSetters must be used within a MinimalModeProvider',
    )
  return context
}

/**
 * Pre-refcounting (#10319) boolean API, still imported by ~30 screens:
 * `set(true)` hides the footer, `set(false)` shows it. Idempotent.
 */
export function useSetMinimalShellMode() {
  const setters = useMinimalShellModeSetters()
  return setters.set
}

export function useEnableMinimalShellMode({enabled} = {enabled: true}) {
  const setters = useMinimalShellModeSetters()
  useEffect(() => {
    if (enabled) {
      setters.add()
      return () => setters.subtract()
    }
  }, [enabled, setters])
}

export function useEnableMinimalShellModeForScreen(
  {enabled} = {enabled: true},
) {
  const setters = useMinimalShellModeSetters()
  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        setters.add()
        return () => setters.subtract()
      }
    }, [enabled, setters]),
  )
}
