import {type ParaIdentityRecord} from '#/lib/api/para-lexicons'

export type PassportFlag = keyof Pick<
  ParaIdentityRecord,
  | 'publicVotes'
  | 'publicDelegations'
  | 'publicPolicies'
  | 'publicRaq'
  | 'publicQuestions'
  | 'publicActivities'
  | 'publicHighlights'
>

export const PASSPORT_SECTIONS = [
  {id: 'votes', flag: 'publicVotes'},
  {id: 'delegations', flag: 'publicDelegations'},
  {id: 'policies', flag: 'publicPolicies'},
  {id: 'raq', flag: 'publicRaq'},
  {id: 'questions', flag: 'publicQuestions'},
  {id: 'activities', flag: 'publicActivities'},
  {id: 'highlights', flag: 'publicHighlights'},
] as const satisfies readonly {id: string; flag: PassportFlag}[]

export type PassportSectionId = (typeof PASSPORT_SECTIONS)[number]['id']

/**
 * Flags Profile Visibility already mirrors into AsyncStorage. Keep writing the
 * mirror so that screen and the passport menu never show different values.
 */
export const LEGACY_STORAGE_KEYS: Partial<Record<PassportFlag, string>> = {
  publicVotes: 'para_public_votes',
  publicRaq: 'para_public_raq',
  publicHighlights: 'para_public_highlights',
}

/** Public Figure mode forces these on, as the Profile Visibility screen does. */
export const PUBLIC_FIGURE_FLAGS: readonly PassportFlag[] = [
  'publicVotes',
  'publicRaq',
  'publicHighlights',
]

/** Nothing is shared until the person opts in. */
export function isFlagOn(
  identity: ParaIdentityRecord | null | undefined,
  flag: PassportFlag,
): boolean {
  if (identity?.isVerifiedPublicFigure && PUBLIC_FIGURE_FLAGS.includes(flag)) {
    return true
  }
  return identity?.[flag] === true
}
