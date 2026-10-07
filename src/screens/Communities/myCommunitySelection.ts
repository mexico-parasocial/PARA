import {officialParties} from '#/lib/constants/communities'
import {PARTY_FEED_PROFILES} from '#/lib/party-feeds'
import {
  NINTH_NAME_TO_COMPASS_ID,
  type PoliticalAffiliation,
} from '#/lib/political-affiliations'
import {normalizeCommunitySearchName} from '#/lib/strings/community-names'
import {type CommunityBoardView} from '#/state/queries/community-boards'
import {classifyCommunityBoard} from './communityGrouping'

const normalize = (value: string) =>
  normalizeCommunitySearchName(value).toLowerCase()

export type AffiliationCommunity = {
  affiliation: PoliticalAffiliation
  board?: CommunityBoardView
}

// A saved affiliation remains visible even if its board has not been published.
// Missing boards carry no invented URI, membership, or member statistics.
export function selectMyAffiliationCommunities(
  boards: CommunityBoardView[],
  affiliations: PoliticalAffiliation[],
): AffiliationCommunity[] {
  const selectedBoards = selectMyCommunityBoards(boards, affiliations)
  return affiliations
    .filter(item => item.type === 'party' || item.type === 'ninth')
    .map(affiliation => ({
      affiliation,
      board: selectedBoards.find(
        board => classifyCommunityBoard(board).group === affiliation.type,
      ),
    }))
}

export function selectMyCommunityBoards(
  boards: CommunityBoardView[],
  affiliations: PoliticalAffiliation[],
): CommunityBoardView[] {
  const party = affiliations.find(item => item.type === 'party')
  const ninth = affiliations.find(item => item.type === 'ninth')
  const partyProfile = PARTY_FEED_PROFILES.find(
    profile => profile.partyId === party?.id,
  )
  const officialParty = officialParties.find(
    item =>
      normalize(item.name) ===
      normalize(partyProfile?.name ?? party?.name ?? ''),
  )
  const partyNames = [
    party?.name,
    partyProfile?.name,
    partyProfile?.shortName,
    officialParty?.fullName,
  ]
    .filter((name): name is string => Boolean(name))
    .map(normalize)
  const ninthId = ninth ? NINTH_NAME_TO_COMPASS_ID[ninth.name] : undefined
  const selected = new Map<'party' | 'ninth', CommunityBoardView>()
  const geographic = new Map<string, CommunityBoardView>()

  for (const board of boards) {
    const classification = classifyCommunityBoard(board)
    if (classification.group === 'state') {
      if (board.viewerMembershipState === 'active') {
        geographic.set(board.uri, board)
      }
      continue
    }
    const matches =
      classification.group === 'party'
        ? [board.name, board.slug, board.communityId].some(value =>
            partyNames.includes(normalize(value)),
          )
        : classification.group === 'ninth' && classification.ninth === ninthId
    if (!matches || classification.group === 'other') continue

    // Repeated seeds can publish several boards for one affiliation. Prefer
    // the viewer's active board, then the most joined/newest published board.
    const current = selected.get(classification.group)
    const active = board.viewerMembershipState === 'active'
    const currentActive = current?.viewerMembershipState === 'active'
    if (
      !current ||
      (active && !currentActive) ||
      (active === currentActive &&
        (board.memberCount > current.memberCount ||
          (board.memberCount === current.memberCount &&
            board.createdAt > current.createdAt)))
    ) {
      selected.set(classification.group, board)
    }
  }

  return [...selected.values(), ...geographic.values()]
}
