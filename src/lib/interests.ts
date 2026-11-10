import {useMemo} from 'react'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {MATTER_GROUPS} from '#/lib/matter-filter'

// ─── Civic Categories ────────────────────────────────────────────────────────
// Organized by the 6 pillars of civic governance that PARA tracks.

export type CivicCategoryKey =
  | 'internal-revenue'
  | 'public-services'
  | 'economy'
  | 'internal-affairs'
  | 'external-affairs'
  | 'social-issues'

export interface CivicCategory {
  label: string
  emoji: string
  interests: string[]
  interestLabels: Record<string, string>
}

/**
 * The catalog's six parts (`FLAIR_GROUPS.MATTER`, the composer's own list) mapped
 * to the six pillars. Interests are the matters' flair tags as written on posts
 * (`|#DemandaPorSalud`), so what someone picks here is what the AppView matches
 * when it ranks the accounts that post about it.
 */
const PILLAR_BY_MATTER_GROUP: Record<string, CivicCategoryKey> = {
  '1. SERVICIOS PÚBLICOS': 'public-services',
  '2. HACIENDA': 'internal-revenue',
  '3. ECONOMÍA': 'economy',
  '4. ASUNTOS SOCIALES': 'social-issues',
  '5. ASUNTOS EXTERIORES': 'external-affairs',
  '6. INTERIOR': 'internal-affairs',
}

function mattersOf(pillar: CivicCategoryKey) {
  const group = MATTER_GROUPS.find(
    g => PILLAR_BY_MATTER_GROUP[g.key] === pillar,
  )
  const matters = group?.matters ?? []
  return {
    interests: matters.map(m => m.tag),
    interestLabels: Object.fromEntries(matters.map(m => [m.tag, m.label])),
  }
}

export function useCivicCategories(): Record<CivicCategoryKey, CivicCategory> {
  const {_} = useLingui()

  return useMemo(
    () => ({
      'internal-revenue': {
        label: _(msg`Internal Revenue`),
        emoji: '🏛️',
        ...mattersOf('internal-revenue'),
      },
      'public-services': {
        label: _(msg`Public Services`),
        emoji: '🏥',
        ...mattersOf('public-services'),
      },
      economy: {
        label: _(msg`Economy`),
        emoji: '📊',
        ...mattersOf('economy'),
      },
      'internal-affairs': {
        label: _(msg`Internal Affairs`),
        emoji: '⚖️',
        ...mattersOf('internal-affairs'),
      },
      'external-affairs': {
        label: _(msg`External Affairs`),
        emoji: '🌎',
        ...mattersOf('external-affairs'),
      },
      'social-issues': {
        label: _(msg`Social Issues`),
        emoji: '🤝',
        ...mattersOf('social-issues'),
      },
    }),
    [_],
  )
}

// ─── Legacy compatibility ────────────────────────────────────────────────────
// The old flat interests array is still used by the AT Proto setInterestsPref
// API. We keep it exported so existing code doesn't break, but the onboarding
// UI now uses the structured civic categories above.

export const interests = [
  'animals',
  'art',
  'books',
  'comedy',
  'comics',
  'culture',
  'dev',
  'education',
  'finance',
  'food',
  'gaming',
  'journalism',
  'movies',
  'music',
  'nature',
  'news',
  'pets',
  'photography',
  'politics',
  'science',
  'sports',
  'tech',
  'tv',
  'writers',
] as const
export type Interest = (typeof interests)[number]

// most popular selected interests
export const popularInterests = [
  'art',
  'gaming',
  'sports',
  'comics',
  'music',
  'politics',
  'photography',
  'science',
  'news',
] satisfies Interest[]

export function useInterestsDisplayNames() {
  const {_} = useLingui()

  return useMemo<Record<string, string>>(() => {
    return {
      // Keep this alphabetized
      animals: _(msg`Animals`),
      art: _(msg`Art`),
      books: _(msg`Books`),
      comedy: _(msg`Comedy`),
      comics: _(msg`Comics`),
      culture: _(msg`Culture`),
      dev: _(msg`Software Dev`),
      education: _(msg`Education`),
      finance: _(msg`Finance`),
      food: _(msg`Food`),
      gaming: _(msg`Video Games`),
      journalism: _(msg`Journalism`),
      movies: _(msg`Movies`),
      music: _(msg`Music`),
      nature: _(msg`Nature`),
      news: _(msg`News`),
      pets: _(msg`Pets`),
      photography: _(msg`Photography`),
      politics: _(msg`Politics`),
      science: _(msg`Science`),
      sports: _(msg`Sports`),
      tech: _(msg`Tech`),
      tv: _(msg`TV`),
      writers: _(msg`Writers`),
    } satisfies Record<Interest, string>
  }, [_])
}

// ─── PARA-native interest helpers ────────────────────────────────────────────
// Used by suggested-accounts onboarding and the interest settings screen.

/** Top-level PARA civic categories — used as chip filter values. */
export const PARA_INTEREST_KEYS = [
  'public-services',
  'internal-revenue',
  'economy',
  'social-issues',
  'external-affairs',
  'internal-affairs',
] as const satisfies readonly CivicCategoryKey[]

/** Flat display-name map for both the 6 civic pillars AND their nested sub-interests. */
export function useParaInterestsDisplayNames(): Record<string, string> {
  const categories = useCivicCategories()
  return useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const key of PARA_INTEREST_KEYS) {
      const cat = categories[key]
      out[key] = `${cat.emoji} ${cat.label}`
      for (const sub of cat.interests) {
        out[sub] = cat.interestLabels[sub] ?? sub
      }
    }
    return out
  }, [categories])
}
