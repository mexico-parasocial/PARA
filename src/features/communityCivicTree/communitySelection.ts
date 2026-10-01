import {
  COMPASS_POSITION_IDS,
  COMPASS_POSITION_NAMES,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {officialParties} from '#/lib/constants/communities'
import {normalizeCommunitySearchName} from '#/lib/strings/community-names'
import {type CommunityBoardView} from '#/state/queries/community-boards'

export type CommunityTreeCategory = 'official' | 'unofficial' | 'ninth'

const normalize = (value: string) =>
  normalizeCommunitySearchName(value).toLowerCase()

function identities(board: CommunityBoardView) {
  return [board.communityId, board.slug, board.name].map(normalize)
}

function matchingBoards(boards: CommunityBoardView[], name: string) {
  const identity = normalize(name)
  if (!identity) return []
  const ninth = COMPASS_POSITION_IDS.find(id =>
    [id, COMPASS_POSITION_NAMES[id]].some(
      value => normalize(value) === identity,
    ),
  )
  const names = ninth
    ? [identity, normalize(ninth), normalize(COMPASS_POSITION_NAMES[ninth])]
    : [identity]
  return Array.from(
    new Map(
      boards
        .filter(board => identities(board).some(value => names.includes(value)))
        .map(board => [board.uri, board]),
    ).values(),
  )
}

export function findCommunityTreeBoard(
  boards: CommunityBoardView[],
  name: string,
) {
  const matches = matchingBoards(boards, name)
  return matches.length === 1 ? matches[0] : undefined
}

/*
 * Boards published more than once (a re-run seed, a second founder) share a
 * name and a category but not a record, and the reader sees two identical
 * choices. Twins are collapsed to one so pickers list each community once, and
 * a scope on it spans all of them. The cost: two genuinely different
 * communities with the same name are grouped here. The civic tree selector
 * exposes a separate version chooser so each record remains reachable.
 */
function twinKey(board: CommunityBoardView) {
  return `${getCommunityTreeCategory(board)}:${normalize(board.name)}`
}

/** The boards that are the same community as `board`, itself included. */
export function getCommunityTreeTwins(
  board: CommunityBoardView,
  boards: CommunityBoardView[],
): CommunityBoardView[] {
  const key = twinKey(board)
  const twins = Array.from(
    new Map(
      boards.filter(b => twinKey(b) === key).map(b => [b.uri, b]),
    ).values(),
  )
  return twins.some(b => b.uri === board.uri) ? twins : [board, ...twins]
}

/** One representative per community: the most joined, then the newest. */
export function collapseCommunityTreeTwins(
  boards: CommunityBoardView[],
): CommunityBoardView[] {
  const best = new Map<string, CommunityBoardView>()
  for (const board of boards) {
    const key = twinKey(board)
    const current = best.get(key)
    if (
      !current ||
      board.memberCount > current.memberCount ||
      (board.memberCount === current.memberCount &&
        board.createdAt > current.createdAt)
    ) {
      best.set(key, board)
    }
  }
  return boards.filter(board => best.get(twinKey(board))?.uri === board.uri)
}

/**
 * Like findCommunityTreeBoard, but accepts several matches when they are all
 * the same community. Returns every twin; empty when nothing matches or
 * the name is ambiguous between different communities.
 */
export function findCommunityTreeTwinGroup(
  boards: CommunityBoardView[],
  name: string,
): CommunityBoardView[] {
  const matches = matchingBoards(boards, name)
  if (matches.length === 0) return []
  const key = twinKey(matches[0])
  return matches.every(board => twinKey(board) === key) ? matches : []
}

export function getCommunityTreeNinth(
  board: CommunityBoardView,
): CompassPositionId | undefined {
  const values = identities(board)
  return COMPASS_POSITION_IDS.find(
    id =>
      values.includes(normalize(COMPASS_POSITION_NAMES[id])) ||
      values.includes(normalize(id)),
  )
}

export function getCommunityTreeCategory(
  board: CommunityBoardView,
): CommunityTreeCategory {
  const values = identities(board)
  if (
    COMPASS_POSITION_IDS.some(
      id =>
        values.includes(normalize(id)) ||
        values.includes(normalize(COMPASS_POSITION_NAMES[id])),
    )
  )
    return 'ninth'
  // "Official" here means the existing official-party catalog. Board lexicons
  // do not carry a verified/official status; published officials are not proof.
  return officialParties.some(party =>
    [party.name, party.fullName].some(name => values.includes(normalize(name))),
  )
    ? 'official'
    : 'unofficial'
}

export function groupCommunityTreeBoards(
  boards: CommunityBoardView[],
  category: CommunityTreeCategory,
  options?: {collapseTwins?: boolean},
): {id: CommunityTreeCategory; boards: CommunityBoardView[]}[] {
  const deduped = Array.from(
    new Map(boards.filter(b => b.uri).map(b => [b.uri, b])).values(),
  )
  const unique = (
    options?.collapseTwins ? collapseCommunityTreeTwins(deduped) : deduped
  ).sort((a, b) => a.name.localeCompare(b.name))
  return [
    {
      id: category,
      boards: unique.filter(
        board => getCommunityTreeCategory(board) === category,
      ),
    },
  ]
}

// A cached screen must honor new profile navigation before any effect runs.
export function resolveCommunityTreeUri({
  entryKey,
  selection,
  initialUri,
}: {
  entryKey: string
  selection: {entryKey: string; uri?: string}
  initialUri?: string
}) {
  return selection.entryKey === entryKey ? selection.uri : initialUri
}
