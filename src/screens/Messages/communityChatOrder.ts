import {COMPASS_COLORS, COMPASS_LABEL_COLORS} from '#/lib/compass/compassColors'
import {PARTY_FEED_PROFILES} from '#/lib/party-feeds'
import {type PoliticalAffiliation} from '#/lib/political-affiliations'
import {type CommunityBoardView} from '#/state/queries/community-boards'
import {
  classifyCommunityBoard,
  type CommunityGroup,
} from '../Communities/communityGrouping'
import {selectMyCommunityBoards} from '../Communities/myCommunitySelection'

export type CommunityChatSectionKey = 'affiliations' | 'unread' | CommunityGroup

export type CommunityChatSection = {
  key: CommunityChatSectionKey
  boards: CommunityBoardView[]
}

const TYPE_ORDER: CommunityGroup[] = ['party', 'ninth', 'state', 'other']

const byName = (x: CommunityBoardView, y: CommunityBoardView) =>
  x.name.localeCompare(y.name)

/**
 * The joined boards of the viewer's saved party and ninth, party first. These
 * are pinned above everything else in both chat surfaces. A saved affiliation
 * whose board the viewer has not joined has no chat, so it is not pinned.
 */
export function pinnedAffiliationUris(
  boards: CommunityBoardView[],
  affiliations: PoliticalAffiliation[],
): string[] {
  const joined = boards.filter(b => b.viewerMembershipState === 'active')
  const rank = (b: CommunityBoardView) =>
    classifyCommunityBoard(b).group === 'party' ? 0 : 1
  return selectMyCommunityBoards(joined, affiliations)
    .filter(b => {
      const group = classifyCommunityBoard(b).group
      return group === 'party' || group === 'ninth'
    })
    .sort((x, y) => rank(x) - rank(y))
    .map(b => b.uri)
}

/**
 * Sort key shared by the Messages strip and the Community Chats screen:
 * pinned affiliations, then unread count, then name.
 */
export function compareCommunityChats(
  x: {uri: string; name: string; unread: number},
  y: {uri: string; name: string; unread: number},
  pinned: string[],
) {
  const px = pinned.indexOf(x.uri)
  const py = pinned.indexOf(y.uri)
  const rx = px === -1 ? pinned.length : px
  const ry = py === -1 ? pinned.length : py
  return rx - ry || y.unread - x.unread || x.name.localeCompare(y.name)
}

/**
 * Sections for the Community Chats screen. Each joined board appears once:
 * pinned affiliations first, then boards with unread messages, then the rest
 * by community type. Empty sections are dropped.
 */
export function buildCommunityChatSections({
  boards,
  affiliations,
  unreadByCommunity,
}: {
  boards: CommunityBoardView[]
  affiliations: PoliticalAffiliation[]
  unreadByCommunity: Map<string, number>
}): CommunityChatSection[] {
  const joined = boards.filter(b => b.viewerMembershipState === 'active')
  const pinned = pinnedAffiliationUris(joined, affiliations)
  const unread = (b: CommunityBoardView) => unreadByCommunity.get(b.uri) ?? 0

  const affiliationBoards = pinned
    .map(uri => joined.find(b => b.uri === uri))
    .filter((b): b is CommunityBoardView => !!b)
  const rest = joined.filter(b => !pinned.includes(b.uri))
  const withUnread = rest
    .filter(b => unread(b) > 0)
    .sort((x, y) => unread(y) - unread(x) || byName(x, y))
  const quiet = rest.filter(b => unread(b) === 0)

  return [
    {key: 'affiliations' as const, boards: affiliationBoards},
    {key: 'unread' as const, boards: withUnread},
    ...TYPE_ORDER.map(group => ({
      key: group,
      boards: quiet
        .filter(b => classifyCommunityBoard(b).group === group)
        .sort(byName),
    })),
  ].filter(section => section.boards.length > 0)
}

export type CommunityIdentity = {
  monogram: string
  /** Absent for communities without an identity color; use the theme tint. */
  background?: string
  foreground?: string
}

/**
 * Avatar identity for a community without an image: a party uses its party
 * color and logo letter, a ninth its canonical compass color. Everything else
 * falls back to the theme.
 */
export function communityIdentity(
  board: CommunityBoardView,
): CommunityIdentity {
  const monogram = board.name.trim().charAt(0).toUpperCase() || '#'
  const classification = classifyCommunityBoard(board)
  if (classification.group === 'ninth') {
    return {
      monogram,
      background: COMPASS_COLORS[classification.ninth],
      foreground: COMPASS_LABEL_COLORS[classification.ninth],
    }
  }
  if (classification.group === 'party') {
    const keys = [board.name, board.slug, board.communityId].map(v =>
      v.replace(/^p\//i, '').trim().toLowerCase(),
    )
    const profile = PARTY_FEED_PROFILES.find(p =>
      [p.name, p.shortName].some(n => keys.includes(n.toLowerCase())),
    )
    if (profile) {
      return {
        monogram: profile.logo || monogram,
        background: profile.color,
        foreground: readableOn(profile.color),
      }
    }
  }
  return {monogram}
}

// Party colors range from dark red to bright yellow, so the monogram color is
// chosen from the background's relative luminance.
function readableOn(hex: string) {
  const value = hex.replace('#', '')
  if (value.length !== 6) return '#ffffff'
  const channel = (offset: number) => {
    const c = parseInt(value.slice(offset, offset + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luminance =
    0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  return luminance > 0.4 ? '#1a1a1a' : '#ffffff'
}
