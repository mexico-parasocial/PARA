import {type CommunityBoardView} from '#/state/queries/community-boards'
import {
  findCommunityTreeTwinGroup,
  getCommunityTreeTwins,
} from '#/features/communityCivicTree/communitySelection'

/**
 * The community whose documents are shown; `undefined` means all of them.
 *
 * `uris` is every board that is that community. A community is usually one board
 * but can exist more than once, and its documents are then spread across them.
 * An empty `uris` means no board could be found for `name`: the screen shows
 * nothing rather than falling back to everyone's documents.
 */
export type DocumentsScope = {name: string; uris: string[]}

export function scopeFromBoard(
  board: CommunityBoardView,
  boards: CommunityBoardView[],
): DocumentsScope {
  return {
    name: board.name,
    uris: getCommunityTreeTwins(board, boards).map(b => b.uri),
  }
}

/**
 * Resolves the community a Documents screen was opened for.
 *
 * A profile passes the board's URI, which is exact. Anything that only knows a
 * name (a deep link, a ninth) is matched against the boards we have, and only
 * a single community counts - "PAN" never lands on "PAN supporters".
 */
export function resolveDocumentsScope(
  params: {communityUri?: string; communityName?: string} | undefined,
  boards: CommunityBoardView[],
): DocumentsScope | undefined {
  const uri = params?.communityUri?.trim()
  const name = params?.communityName?.trim()
  if (uri) {
    const board = boards.find(b => b.uri === uri)
    return board
      ? scopeFromBoard(board, boards)
      : {name: name || uri, uris: [uri]}
  }
  if (name) {
    const group = findCommunityTreeTwinGroup(boards, name)
    return group.length > 0
      ? scopeFromBoard(group[0], boards)
      : {name, uris: []}
  }
  return undefined
}
