import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  type AcuerdoLockRecord,
  type AcuerdoRecord,
} from '#/lib/api/acuerdo-lexicon'
import {useSession} from '#/state/session'

const STORAGE_KEY = 'para_acuerdos'
const LOCKS_KEY = 'para_acuerdo_locks'
const WATERMARK_KEY = 'para_acuerdo_watermark'

export type AcuerdoPhase =
  | 'forming'
  | 'active'
  | 'locked'
  | 'resolved'
  | 'cancelled'

export type AcuerdoView = AcuerdoRecord & {
  uri: string
  lockedCount: number
  signatoryCount: number
  isAdmin: boolean
  isLockedByViewer: boolean
}

export type AcuerdoLockView = AcuerdoLockRecord & {
  id: string
  acuerdoTitle?: string
  exitCooldownHours?: number
}

// ─── Delegation Resolution ──────────────────────────────────────────────────
export type DelegationChain = {
  acuerdoUri: string
  depth: number
  delegateTo?: string
  parentAcuerdo?: string
}

const MAX_DELEGATION_DEPTH = 5

export type DelegationError =
  | {type: 'max-depth-exceeded'; maxDepth: number}
  | {type: 'circular-reference'; chain: string[]}
  | {type: 'unresolved-delegate'; did: string}

// ─── Cooldown Constants ─────────────────────────────────────────────────────
const COOLDOWN_HOURS = 48
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000

// ─── Quorum Constants ───────────────────────────────────────────────────────
const QUORUM_CHECK_INTERVAL_MS = 30000 // Check quorum every 30s

// ─── Watermark ──────────────────────────────────────────────────────────────
export type WatermarkInfo = {
  viewerDid: string
  timestamp: string
  deviceFingerprint: string
}

// ─── Acuerdo Context ────────────────────────────────────────────────────────

type AcuerdoContextValue = {
  acuerdos: AcuerdoView[]
  myLocks: AcuerdoLockView[]
  isLoading: boolean

  // Actions
  createAcuerdo: (
    data: Omit<AcuerdoRecord, 'createdAt' | 'uri'>,
  ) => Promise<AcuerdoView>
  joinAcuerdo: (
    acuerdoUri: string,
    commitment: 'follow-acuerdo' | 'delegate-to-rep',
  ) => Promise<void>
  requestExit: (lockId: string) => Promise<void>
  cancelAcuerdo: (acuerdoUri: string, reason: string) => Promise<void>
  updateVisibility: (
    acuerdoUri: string,
    visibility: 'public' | 'private',
  ) => Promise<void>

  // Queries
  getAcuerdoByUri: (uri: string) => AcuerdoView | undefined
  getLocksForSubject: (subjectUri: string) => AcuerdoLockView[]
  isSubjectLocked: (subjectUri: string) => boolean
  isInCooldown: (acuerdoUri: string) => boolean
  getCooldownRemainingMs: (lockId: string) => number

  // Delegation
  resolveEffectiveVote: (
    acuerdoUri: string,
    depth?: number,
    visited?: Set<string>,
  ) => {
    effectiveDid: string | null
    chain: DelegationChain[]
    error?: DelegationError
  }

  // Watermark
  getWatermark: (acuerdoUri: string) => WatermarkInfo | null
  generateWatermark: (acuerdoUri: string) => WatermarkInfo

  // Quorum
  checkQuorum: (acuerdoUri: string) => {
    quorumMet: boolean
    lockedCount: number
    minQuorum: number
    shortfall: number
  }
}

const AcuerdoContext = createContext<AcuerdoContextValue | null>(null)

export function AcuerdoProvider({children}: {children: React.ReactNode}) {
  const {currentAccount} = useSession()
  const viewerDid = currentAccount?.did || 'did:plc:viewer'

  const [acuerdos, setAcuerdos] = useState<AcuerdoView[]>([])
  const [myLocks, setMyLocks] = useState<AcuerdoLockView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [watermarks, setWatermarks] = useState<Record<string, WatermarkInfo>>(
    {},
  )
  const quorumTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Load from storage ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [acuerdosJson, locksJson, watermarksJson] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(LOCKS_KEY),
          AsyncStorage.getItem(WATERMARK_KEY),
        ])
        if (acuerdosJson) setAcuerdos(JSON.parse(acuerdosJson))
        if (locksJson) setMyLocks(JSON.parse(locksJson))
        if (watermarksJson) setWatermarks(JSON.parse(watermarksJson))
      } catch (e) {
        console.error('Failed to load acuerdos:', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // ─── Persist ──────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(acuerdos))
  }, [acuerdos])

  useEffect(() => {
    AsyncStorage.setItem(LOCKS_KEY, JSON.stringify(myLocks))
  }, [myLocks])

  useEffect(() => {
    AsyncStorage.setItem(WATERMARK_KEY, JSON.stringify(watermarks))
  }, [watermarks])

  // ─── Quorum enforcement (auto-phase transitions) ──────────────────────────
  useEffect(() => {
    if (quorumTimerRef.current) {
      clearInterval(quorumTimerRef.current)
    }

    quorumTimerRef.current = setInterval(() => {
      setAcuerdos(prev =>
        prev.map(a => {
          if (a.phase === 'forming' || a.phase === 'active') {
            const lockedCount = a.lockedCount
            if (lockedCount >= a.minLockQuorum && a.phase === 'forming') {
              return {...a, phase: 'active'}
            }
            if (lockedCount < a.minLockQuorum && a.phase === 'active') {
              // Quorum lost — revert to forming
              return {...a, phase: 'forming'}
            }
          }
          return a
        }),
      )
    }, QUORUM_CHECK_INTERVAL_MS)

    return () => {
      if (quorumTimerRef.current) {
        clearInterval(quorumTimerRef.current)
      }
    }
  }, [])

  // ─── Cooldown helpers ─────────────────────────────────────────────────────
  const isInCooldown = useCallback(
    (acuerdoUri: string) => {
      const lock = myLocks.find(l => l.acuerdo === acuerdoUri)
      if (!lock?.exitCooldownEndsAt) return false
      return new Date(lock.exitCooldownEndsAt) > new Date()
    },
    [myLocks],
  )

  const getCooldownRemainingMs = useCallback(
    (lockId: string) => {
      const lock = myLocks.find(l => l.id === lockId)
      if (!lock?.exitCooldownEndsAt) return 0
      return Math.max(
        0,
        new Date(lock.exitCooldownEndsAt).getTime() - Date.now(),
      )
    },
    [myLocks],
  )

  // ─── Actions ──────────────────────────────────────────────────────────────

  const createAcuerdo = useCallback(
    async (
      data: Omit<AcuerdoRecord, 'createdAt' | 'uri'>,
    ): Promise<AcuerdoView> => {
      const now = new Date().toISOString()
      const uri = `at://${data.author}/com.para.civic.acuerdo/${Date.now()}`
      const acuerdo: AcuerdoView = {
        ...data,
        createdAt: now,
        uri,
        lockedCount: 0,
        signatoryCount: 0,
        isAdmin: true,
        isLockedByViewer: false,
      }
      setAcuerdos(prev => [acuerdo, ...prev])
      return acuerdo
    },
    [],
  )

  const joinAcuerdo = useCallback(
    async (
      acuerdoUri: string,
      commitment: 'follow-acuerdo' | 'delegate-to-rep',
    ) => {
      // FIX #1: Enforce cooldown
      if (isInCooldown(acuerdoUri)) {
        const lock = myLocks.find(l => l.acuerdo === acuerdoUri)
        const remainingMs = lock ? getCooldownRemainingMs(lock.id) : COOLDOWN_MS
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000))
        throw new Error(
          `Cooldown activo: debes esperar ${remainingHours}h antes de volver a unirte a este acuerdo`,
        )
      }

      // FIX #6: Check quorum cap (prevent flash-mob voting)
      const acuerdo = acuerdos.find(a => a.uri === acuerdoUri)
      if (acuerdo) {
        // If already locked and max quorum reached, prevent follow-voting
        // (delegation still allowed as it doesn't change count)
        if (commitment === 'follow-acuerdo' && acuerdo.phase === 'locked') {
          throw new Error(
            'Este acuerdo ya está bloqueado. Solo puedes delegar a un representante.',
          )
        }
      }

      const lock: AcuerdoLockView = {
        id: `lock_${Date.now()}`,
        acuerdo: acuerdoUri,
        voter: viewerDid,
        lockedAt: new Date().toISOString(),
        expiresAt: null,
        commitment: {type: commitment},
      }
      setMyLocks(prev => [...prev, lock])
      setAcuerdos(prev =>
        prev.map(a =>
          a.uri === acuerdoUri
            ? {...a, lockedCount: a.lockedCount + 1, isLockedByViewer: true}
            : a,
        ),
      )
    },
    [acuerdos, myLocks, isInCooldown, getCooldownRemainingMs],
  )

  const requestExit = useCallback(async (lockId: string) => {
    const cooldownEnds = new Date(Date.now() + COOLDOWN_MS).toISOString()
    setMyLocks(prev =>
      prev.map(lock =>
        lock.id === lockId
          ? {
              ...lock,
              exitRequestedAt: new Date().toISOString(),
              exitCooldownEndsAt: cooldownEnds,
            }
          : lock,
      ),
    )
  }, [])

  // FIX #2: Admin cancellation with cascading cleanup
  const cancelAcuerdo = useCallback(
    async (acuerdoUri: string, reason: string) => {
      // Get all acuerdos that are children of this one (cascade)
      const childUris = new Set<string>()
      const findChildren = (parentUri: string) => {
        acuerdos.forEach(a => {
          if (a.parentAcuerdo === parentUri) {
            childUris.add(a.uri)
            findChildren(a.uri)
          }
        })
      }
      findChildren(acuerdoUri)
      const allUrisToCancel = [acuerdoUri, ...Array.from(childUris)]

      // Cancel all affected acuerdos
      setAcuerdos(prev =>
        prev.map(a =>
          allUrisToCancel.includes(a.uri)
            ? {
                ...a,
                phase: 'cancelled' as AcuerdoPhase,
                description: `${a.description}\n\n[Cancelled: ${reason}]`,
              }
            : a,
        ),
      )

      // Release ALL locks for cancelled acuerdos (including children)
      setMyLocks(prev =>
        prev.filter(lock => !allUrisToCancel.includes(lock.acuerdo)),
      )
    },
    [acuerdos],
  )

  const updateVisibility = useCallback(
    async (acuerdoUri: string, visibility: 'public' | 'private') => {
      setAcuerdos(prev =>
        prev.map(a => (a.uri === acuerdoUri ? {...a, visibility} : a)),
      )
    },
    [],
  )

  // ─── Queries ──────────────────────────────────────────────────────────────

  const getAcuerdoByUri = useCallback(
    (uri: string) => acuerdos.find(a => a.uri === uri),
    [acuerdos],
  )

  const getLocksForSubject = useCallback(
    (subjectUri: string) => {
      const acuerdoUris = acuerdos
        .filter(a => a.scope.subjects.includes(subjectUri))
        .map(a => a.uri)
      return myLocks.filter(lock => acuerdoUris.includes(lock.acuerdo))
    },
    [acuerdos, myLocks],
  )

  const isSubjectLocked = useCallback(
    (subjectUri: string) => getLocksForSubject(subjectUri).length > 0,
    [getLocksForSubject],
  )

  // FIX #3: Recursive delegation with max depth + circular detection
  const resolveEffectiveVote = useCallback(
    (
      acuerdoUri: string,
      depth = 0,
      visited = new Set<string>(),
    ): {
      effectiveDid: string | null
      chain: DelegationChain[]
      error?: DelegationError
    } => {
      // Max depth guard
      if (depth > MAX_DELEGATION_DEPTH) {
        return {
          effectiveDid: null,
          chain: [],
          error: {type: 'max-depth-exceeded', maxDepth: MAX_DELEGATION_DEPTH},
        }
      }

      // Circular reference guard
      if (visited.has(acuerdoUri)) {
        return {
          effectiveDid: null,
          chain: [],
          error: {type: 'circular-reference', chain: Array.from(visited)},
        }
      }

      visited.add(acuerdoUri)
      const acuerdo = acuerdos.find(a => a.uri === acuerdoUri)

      if (!acuerdo) {
        return {
          effectiveDid: null,
          chain: [],
          error: {type: 'unresolved-delegate', did: acuerdoUri},
        }
      }

      const chain: DelegationChain[] = [
        {
          acuerdoUri,
          depth,
          delegateTo: acuerdo.delegateTo,
          parentAcuerdo: acuerdo.parentAcuerdo,
        },
      ]

      // Direct delegation takes precedence
      if (acuerdo.delegateTo) {
        return {
          effectiveDid: acuerdo.delegateTo,
          chain,
        }
      }

      // Check parent acuerdo delegation
      if (acuerdo.parentAcuerdo) {
        const parentResult = resolveEffectiveVote(
          acuerdo.parentAcuerdo,
          depth + 1,
          visited,
        )
        return {
          effectiveDid: parentResult.effectiveDid,
          chain: [...chain, ...parentResult.chain],
          error: parentResult.error,
        }
      }

      // No delegation — return the acuerdo itself as authority
      return {
        effectiveDid: acuerdo.admins[0] || null,
        chain,
      }
    },
    [acuerdos],
  )

  // FIX #4: Watermark generation for private acuerdos
  const getWatermark = useCallback(
    (acuerdoUri: string) => watermarks[acuerdoUri] || null,
    [watermarks],
  )

  const generateWatermark = useCallback(
    (acuerdoUri: string): WatermarkInfo => {
      const info: WatermarkInfo = {
        viewerDid,
        timestamp: new Date().toISOString(),
        deviceFingerprint: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      }
      setWatermarks(prev => ({...prev, [acuerdoUri]: info}))
      return info
    },
    [viewerDid],
  )

  // FIX #6: Quorum check
  const checkQuorum = useCallback(
    (acuerdoUri: string) => {
      const acuerdo = acuerdos.find(a => a.uri === acuerdoUri)
      if (!acuerdo) {
        return {quorumMet: false, lockedCount: 0, minQuorum: 0, shortfall: 0}
      }
      const lockedCount = acuerdo.lockedCount
      const minQuorum = acuerdo.minLockQuorum
      return {
        quorumMet: lockedCount >= minQuorum,
        lockedCount,
        minQuorum,
        shortfall: Math.max(0, minQuorum - lockedCount),
      }
    },
    [acuerdos],
  )

  const value = useMemo(
    () => ({
      acuerdos,
      myLocks,
      isLoading,
      createAcuerdo,
      joinAcuerdo,
      requestExit,
      cancelAcuerdo,
      updateVisibility,
      getAcuerdoByUri,
      getLocksForSubject,
      isSubjectLocked,
      isInCooldown,
      getCooldownRemainingMs,
      resolveEffectiveVote,
      getWatermark,
      generateWatermark,
      checkQuorum,
    }),
    [
      acuerdos,
      myLocks,
      isLoading,
      createAcuerdo,
      joinAcuerdo,
      requestExit,
      cancelAcuerdo,
      updateVisibility,
      getAcuerdoByUri,
      getLocksForSubject,
      isSubjectLocked,
      isInCooldown,
      getCooldownRemainingMs,
      resolveEffectiveVote,
      getWatermark,
      generateWatermark,
      checkQuorum,
    ],
  )

  return (
    <AcuerdoContext.Provider value={value}>{children}</AcuerdoContext.Provider>
  )
}

export function useAcuerdos() {
  const ctx = useContext(AcuerdoContext)
  if (!ctx) throw new Error('useAcuerdos must be inside AcuerdoProvider')
  return ctx
}
