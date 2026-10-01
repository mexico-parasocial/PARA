import {
  COMPASS_POSITION_IDS,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {findMexicanState, MEXICAN_STATES} from '#/lib/constants/mexico'
import {PARTY_FEED_PROFILES} from '#/lib/party-feeds'
import {type CommunityBoardView} from '#/state/queries/community-boards'
import {getCommunityTreeNinth} from '#/features/communityCivicTree/communitySelection'

export type CommunityGroup = 'party' | 'ninth' | 'state' | 'other'

export type CommunityClassification =
  | {group: 'party'}
  | {group: 'ninth'; ninth: CompassPositionId}
  | {group: 'state'; state: string}
  | {group: 'other'}

// The board lexicon has no kind field. `quadrant` classifies parties
// ('national' / 'political') and ninths (a compass id). A board is geographic
// when the backend returns a `region` (a Mexican state) for it, or when its
// quadrant names a state. Everything else, e.g. the 'norte' / 'sur' /
// 'centro' topic communities, is "other"; it is not geographic and must not be
// inferred from free text.
const PARTY_QUADRANTS = ['national', 'political']

const normalize = (value: string) => value.trim().toLowerCase()

export function isPartyBoard(board: CommunityBoardView) {
  if (PARTY_QUADRANTS.includes(normalize(board.quadrant))) return true
  const keys = [board.name, board.slug, board.communityId].map(v =>
    normalize(v.replace(/^p\//i, '')),
  )
  return PARTY_FEED_PROFILES.some(profile =>
    [profile.name, profile.shortName].some(name =>
      keys.includes(normalize(name)),
    ),
  )
}

export function classifyCommunityBoard(
  board: CommunityBoardView,
): CommunityClassification {
  if (isPartyBoard(board)) return {group: 'party'}
  const quadrant = normalize(board.quadrant).replace(/\s+/g, '-')
  const ninth =
    COMPASS_POSITION_IDS.find(id => id === quadrant) ??
    getCommunityTreeNinth(board)
  if (ninth) return {group: 'ninth', ninth}
  const state =
    (board.region ? findMexicanState(board.region) : undefined) ??
    findMexicanState(board.quadrant)
  if (state) return {group: 'state', state}
  return {group: 'other'}
}

export function groupBoardsByState(boards: CommunityBoardView[]) {
  const byState = new Map<string, CommunityBoardView[]>()
  for (const board of boards) {
    const result = classifyCommunityBoard(board)
    if (result.group !== 'state') continue
    byState.set(result.state, [...(byState.get(result.state) ?? []), board])
  }
  return MEXICAN_STATES.filter(state => byState.has(state)).map(state => ({
    state,
    boards: byState.get(state) ?? [],
  }))
}
