import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  getPrimaryPoliticalAffiliation,
  inferPoliticalAffiliation,
  normalizePoliticalAffiliation,
  normalizePoliticalAffiliations,
  type PoliticalAffiliation,
  type PoliticalAffiliationType,
  upsertPoliticalAffiliation,
} from '#/lib/political-affiliations'
import {NINTH_ID_TO_USER_FLAIR, type UserFlair} from '#/lib/tags'

const STORAGE_KEY = 'para_political_affiliation'
const COOLDOWN_KEY = 'para_affiliation_cooldowns'

export type CooldownConfig = {
  ninth: number // ms (48h default)
  twentyFifth: number // ms (48h default)
  party: number // ms (7d default)
}

export const DEFAULT_COOLDOWNS: CooldownConfig = {
  ninth: 48 * 60 * 60 * 1000, // 48 hours
  twentyFifth: 48 * 60 * 60 * 1000, // 48 hours
  party: 7 * 24 * 60 * 60 * 1000, // 7 days
}

export type CooldownState = {
  ninth?: string // ISO timestamp of last change
  twentyFifth?: string
  party?: string
}

export type BadgeInfo = {
  type: 'party' | 'ninth' | 'twentyFifth'
  name: string
  color: string
  description: string
  responsibilities: string[]
}

export const BADGE_INFO: Record<PoliticalAffiliationType, BadgeInfo> = {
  party: {
    type: 'party',
    name: 'Party Affiliation',
    color: '#888888',
    description:
      'Indicates your registered or self-identified political party membership.',
    responsibilities: [
      'Represents organizational alignment, not personal opinion.',
      'Visible to all users on your profile and posts.',
      'Cooldown: 7 days — party switching is a significant commitment.',
      'Can be removed at any time, but re-adding follows cooldown.',
    ],
  },
  ninth: {
    type: 'ninth',
    name: 'Political Compass',
    color: '#FFCC00',
    description:
      'Your position on the 9-point political compass (Auth Left → Lib Right).',
    responsibilities: [
      'Reflects your ideological lean across authority and economic axes.',
      'Visible to all users on your profile and posts.',
      'Cooldown: 48 hours — prevents rapid position flipping.',
      'Derived from the classic political compass model.',
    ],
  },
  twentyFifth: {
    type: 'twentyFifth',
    name: 'Precision Grid',
    color: '#30B0C7',
    description:
      'Fine-grained 5×5 grid position for precise ideological mapping.',
    responsibilities: [
      'Optional precision layer atop your 9th grid position.',
      'Not shown publicly on badges — used for matching and recommendations.',
      'Cooldown: 48 hours.',
      'Best for users who want accurate alignment data without broadcasting it.',
    ],
  },
}

type PoliticalAffiliationContextValue = {
  affiliations: PoliticalAffiliation[]
  affiliation: string | null
  setAffiliations: (items: PoliticalAffiliation[]) => Promise<void>
  setAffiliation: (name: string | null) => Promise<void>
  isPublic: boolean
  setIsPublic: (isPublic: boolean) => Promise<void>
  isLoading: boolean

  // Cooldown system
  cooldowns: CooldownState
  getCooldownRemaining: (type: PoliticalAffiliationType) => number | null
  canChangeAffiliation: (type: PoliticalAffiliationType) => boolean
  recordCooldown: (type: PoliticalAffiliationType) => Promise<void>

  // Unified flair
  activeFlair: UserFlair | null
}

const PoliticalAffiliationContext =
  createContext<PoliticalAffiliationContextValue | null>(null)

export function PoliticalAffiliationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [storedAffiliations, setStoredAffiliations] = useState<
    PoliticalAffiliation[]
  >([])
  const [storedIsPublic, setStoredIsPublic] = useState<boolean>(false)
  const [cooldowns, setCooldowns] = useState<CooldownState>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAffiliation = async () => {
      try {
        const [storedAffiliation, storedIsPublic, storedCooldowns] =
          await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY),
            AsyncStorage.getItem(STORAGE_KEY + '_is_public'),
            AsyncStorage.getItem(COOLDOWN_KEY),
          ])
        const nextAffiliations = (() => {
          if (!storedAffiliation) return []

          try {
            const parsed = JSON.parse(storedAffiliation) as unknown
            if (Array.isArray(parsed)) {
              return normalizePoliticalAffiliations(parsed)
            }
            const normalized = normalizePoliticalAffiliation(parsed)
            return normalized ? [normalized] : []
          } catch {
            const inferred = inferPoliticalAffiliation(storedAffiliation)
            return inferred ? [inferred] : []
          }
        })()

        setStoredAffiliations(nextAffiliations)
        setStoredIsPublic(storedIsPublic === 'true')
        if (storedCooldowns) {
          try {
            setCooldowns(JSON.parse(storedCooldowns))
          } catch {
            setCooldowns({})
          }
        }
      } catch (e) {
        console.error('Failed to load political affiliation', e)
      } finally {
        setIsLoading(false)
      }
    }
    void loadAffiliation()
  }, [])

  const setAffiliations = useCallback(async (items: PoliticalAffiliation[]) => {
    try {
      const normalized = normalizePoliticalAffiliations(items)
      if (normalized.length === 0) {
        await AsyncStorage.removeItem(STORAGE_KEY)
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
      }
      setStoredAffiliations(normalized)
    } catch (e) {
      console.error('Failed to save political affiliation', e)
    }
  }, [])

  const setAffiliation = useCallback(
    async (name: string | null) => {
      if (name === null) {
        await setAffiliations([])
        return
      }

      const inferred = inferPoliticalAffiliation(name)
      if (!inferred) return

      await setAffiliations(
        upsertPoliticalAffiliation(storedAffiliations, inferred),
      )
    },
    [setAffiliations, storedAffiliations],
  )

  const setIsPublic = useCallback(async (val: boolean) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY + '_is_public',
        val ? 'true' : 'false',
      )
      setStoredIsPublic(val)
    } catch (e) {
      console.error('Failed to save public status', e)
    }
  }, [])

  const getCooldownRemaining = useCallback(
    (type: PoliticalAffiliationType): number | null => {
      const lastChange = cooldowns[type]
      if (!lastChange) return null

      const cooldownMs = DEFAULT_COOLDOWNS[type]
      const elapsed = Date.now() - new Date(lastChange).getTime()
      const remaining = cooldownMs - elapsed

      return remaining > 0 ? remaining : null
    },
    [cooldowns],
  )

  const canChangeAffiliation = useCallback(
    (type: PoliticalAffiliationType): boolean => {
      return getCooldownRemaining(type) === null
    },
    [getCooldownRemaining],
  )

  const recordCooldown = useCallback(
    async (type: PoliticalAffiliationType) => {
      try {
        const next = {...cooldowns, [type]: new Date().toISOString()}
        await AsyncStorage.setItem(COOLDOWN_KEY, JSON.stringify(next))
        setCooldowns(next)
      } catch (e) {
        console.error('Failed to record cooldown', e)
      }
    },
    [cooldowns],
  )

  const affiliations = storedAffiliations
  const isPublic = storedIsPublic
  const affiliation = getPrimaryPoliticalAffiliation(affiliations)?.name ?? null

  // Derive active flair from 9th grid affiliation
  const activeFlair = useMemo((): UserFlair | null => {
    const ninth = affiliations.find(a => a.type === 'ninth')
    if (!ninth) return null
    return NINTH_ID_TO_USER_FLAIR[ninth.id] || null
  }, [affiliations])

  const value = useMemo(
    () => ({
      affiliations,
      affiliation,
      setAffiliations,
      setAffiliation,
      isPublic,
      setIsPublic,
      isLoading,
      cooldowns,
      getCooldownRemaining,
      canChangeAffiliation,
      recordCooldown,
      activeFlair,
    }),
    [
      affiliations,
      affiliation,
      isLoading,
      isPublic,
      setAffiliation,
      setAffiliations,
      setIsPublic,
      cooldowns,
      getCooldownRemaining,
      canChangeAffiliation,
      recordCooldown,
      activeFlair,
    ],
  )

  return (
    <PoliticalAffiliationContext.Provider value={value}>
      {children}
    </PoliticalAffiliationContext.Provider>
  )
}

export function usePoliticalAffiliation() {
  const ctx = useContext(PoliticalAffiliationContext)
  if (!ctx) {
    throw new Error(
      'usePoliticalAffiliation must be used within a PoliticalAffiliationProvider',
    )
  }
  return ctx
}
