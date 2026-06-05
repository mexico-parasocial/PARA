import {useMemo} from 'react'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

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

export function useCivicCategories(): Record<CivicCategoryKey, CivicCategory> {
  const {_} = useLingui()

  return useMemo(
    () => ({
      'internal-revenue': {
        label: _(msg`Internal Revenue`),
        emoji: '🏛️',
        interests: [
          'tax-reform',
          'fiscal-transparency',
          'public-debt',
          'audit-accountability',
          'tax-evasion',
        ],
        interestLabels: {
          'tax-reform': _(msg`Tax Reform`),
          'fiscal-transparency': _(msg`Fiscal Transparency`),
          'public-debt': _(msg`Public Debt`),
          'audit-accountability': _(msg`Audit & Accountability`),
          'tax-evasion': _(msg`Tax Evasion`),
        },
      },
      'public-services': {
        label: _(msg`Public Services`),
        emoji: '🏥',
        interests: [
          'healthcare',
          'education',
          'infrastructure',
          'public-transport',
          'water-sanitation',
        ],
        interestLabels: {
          healthcare: _(msg`Healthcare`),
          education: _(msg`Education`),
          infrastructure: _(msg`Infrastructure`),
          'public-transport': _(msg`Public Transport`),
          'water-sanitation': _(msg`Water & Sanitation`),
        },
      },
      economy: {
        label: _(msg`Economy`),
        emoji: '📊',
        interests: [
          'employment',
          'inflation',
          'trade-policy',
          'minimum-wage',
          'small-business',
        ],
        interestLabels: {
          employment: _(msg`Employment`),
          inflation: _(msg`Inflation`),
          'trade-policy': _(msg`Trade Policy`),
          'minimum-wage': _(msg`Minimum Wage`),
          'small-business': _(msg`Small Business`),
        },
      },
      'internal-affairs': {
        label: _(msg`Internal Affairs`),
        emoji: '⚖️',
        interests: [
          'security',
          'justice-reform',
          'corruption',
          'civil-rights',
          'indigenous-rights',
        ],
        interestLabels: {
          security: _(msg`Security`),
          'justice-reform': _(msg`Justice Reform`),
          corruption: _(msg`Corruption`),
          'civil-rights': _(msg`Civil Rights`),
          'indigenous-rights': _(msg`Indigenous Rights`),
        },
      },
      'external-affairs': {
        label: _(msg`External Affairs`),
        emoji: '🌎',
        interests: [
          'diplomacy',
          'migration',
          'trade-agreements',
          'border-policy',
          'international-aid',
        ],
        interestLabels: {
          diplomacy: _(msg`Diplomacy`),
          migration: _(msg`Migration`),
          'trade-agreements': _(msg`Trade Agreements`),
          'border-policy': _(msg`Border Policy`),
          'international-aid': _(msg`International Aid`),
        },
      },
      'social-issues': {
        label: _(msg`Social Issues`),
        emoji: '🤝',
        interests: [
          'gender-equality',
          'lgbtq-rights',
          'disability-rights',
          'housing',
          'environmental-justice',
        ],
        interestLabels: {
          'gender-equality': _(msg`Gender Equality`),
          'lgbtq-rights': _(msg`LGBTQ+ Rights`),
          'disability-rights': _(msg`Disability Rights`),
          housing: _(msg`Housing`),
          'environmental-justice': _(msg`Environmental Justice`),
        },
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
