import {type CommunityBoardView} from '#/state/queries/community-boards'
import {
  collapseCommunityTreeTwins,
  findCommunityTreeBoard,
  findCommunityTreeTwinGroup,
  getCommunityTreeCategory,
  getCommunityTreeNinth,
  getCommunityTreeTwins,
  groupCommunityTreeBoards,
  resolveCommunityTreeUri,
} from '../communitySelection'

const board = (name: string, quadrant = ''): CommunityBoardView => ({
  uri: `at://did:plc:test/com.para.community.board/${name}`,
  cid: '',
  creatorDid: 'did:plc:test',
  communityId: `p/${name}`,
  slug: name.toLowerCase().replace(/ /g, '-'),
  name,
  quadrant,
  delegatesChatId: '',
  subdelegatesChatId: '',
  memberCount: 1,
  viewerMembershipState: 'none',
  createdAt: '',
})

describe('community tree selection', () => {
  it('honors a newly opened profile over a cached manual selection', () => {
    expect(
      resolveCommunityTreeUri({
        entryKey: 'profile-b',
        initialUri: 'community-b',
        selection: {entryKey: 'profile-a', uri: 'community-c'},
      }),
    ).toBe('community-b')
    expect(
      resolveCommunityTreeUri({
        entryKey: 'profile-a',
        initialUri: 'community-a',
        selection: {entryKey: 'profile-a', uri: 'community-c'},
      }),
    ).toBe('community-c')
  })

  it('requires an exact community identity instead of the first search hit', () => {
    const boards = [board('PAN supporters'), board('PAN')]
    expect(findCommunityTreeBoard(boards, 'p/PAN')).toBe(boards[1])
    expect(findCommunityTreeBoard(boards, 'missing')).toBeUndefined()
    expect(findCommunityTreeBoard(boards, '')).toBeUndefined()
    expect(
      findCommunityTreeBoard([board('auth-center')], 'Auth Econocenter')?.name,
    ).toBe('auth-center')
    const duplicate = {...boards[1], uri: `${boards[1].uri}-other`}
    expect(
      findCommunityTreeBoard([...boards, duplicate], 'PAN'),
    ).toBeUndefined()
    expect(
      findCommunityTreeBoard([board('Cultura Indígena')], 'cultura-indigena')
        ?.name,
    ).toBe('Cultura Indígena')
  })

  it('separates official parties, other communities, and ninth communities', () => {
    expect(getCommunityTreeCategory(board('Morena', 'center-left'))).toBe(
      'official',
    )
    expect(getCommunityTreeCategory(board('Morena supporters'))).toBe(
      'unofficial',
    )
    expect(getCommunityTreeCategory(board('Auth Econocenter'))).toBe('ninth')
    const grassroots = board('Water assembly', 'lib-left')
    grassroots.governanceSummary = {
      officialCount: 5,
      moderatorCount: 1,
      deputyRoleCount: 0,
    }
    expect(getCommunityTreeCategory(grassroots)).toBe('unofficial')
  })

  it('keeps the categories disjoint and never treats quadrant members as ninths', () => {
    const left = board('Water assembly', 'lib-left')
    const ninth = board('Auth Left')
    const official = board('PAN', 'center-right')
    const boards = [left, ninth, ninth, official]
    expect(groupCommunityTreeBoards(boards, 'ninth')[0].boards).toEqual([ninth])
    expect(groupCommunityTreeBoards(boards, 'official')[0].boards).toEqual([
      official,
    ])
    expect(groupCommunityTreeBoards(boards, 'unofficial')[0].boards).toEqual([
      left,
    ])
    expect(getCommunityTreeNinth(left)).toBeUndefined()
    expect(getCommunityTreeNinth(ninth)).toBe('auth-left')
    expect(groupCommunityTreeBoards([], 'ninth')[0].boards).toEqual([])
  })
})

describe('community twins', () => {
  it('does not count a selected board again when the directory also contains it', () => {
    const selected = board('Cultura Indígena')
    const other = {...selected, uri: `${selected.uri}-other`}
    expect(
      getCommunityTreeTwins(selected, [selected, other, selected]),
    ).toEqual([selected, other])
  })
  const twin = (
    name: string,
    rkey: string,
    memberCount: number,
    at: string,
  ) => ({
    ...board(name),
    uri: `at://did:plc:test/com.para.community.board/${rkey}`,
    memberCount,
    createdAt: at,
  })

  it('collapses a party published twice to its most joined board', () => {
    const small = twin('PAN', 'a', 3, '2026-01-01')
    const big = twin('PAN', 'b', 19, '2026-02-01')
    const morena = twin('Morena', 'c', 1, '2026-01-01')
    expect(collapseCommunityTreeTwins([small, big, morena])).toEqual([
      big,
      morena,
    ])
  })

  it('breaks a member-count tie with the newest board', () => {
    const old = twin('PAN', 'a', 5, '2026-01-01')
    const fresh = twin('PAN', 'b', 5, '2026-02-01')
    expect(collapseCommunityTreeTwins([old, fresh])).toEqual([fresh])
  })

  it('collapses same-named ordinary communities too', () => {
    const a = twin('Salud Pública', 'a', 1, '2026-01-01')
    const b = twin('Salud Pública', 'b', 2, '2026-01-01')
    expect(collapseCommunityTreeTwins([a, b])).toEqual([b])
  })

  it('keeps communities with different names apart', () => {
    const a = twin('PAN', 'a', 1, '2026-01-01')
    const b = twin('PAN supporters', 'b', 2, '2026-01-01')
    expect(collapseCommunityTreeTwins([a, b])).toEqual([a, b])
  })

  it('lists a party once in the grouped picker when asked to', () => {
    const a = twin('PAN', 'a', 1, '2026-01-01')
    const b = twin('PAN', 'b', 2, '2026-01-01')
    expect(
      groupCommunityTreeBoards([a, b], 'official', {collapseTwins: true})[0]
        .boards,
    ).toEqual([b])
    expect(groupCommunityTreeBoards([a, b], 'official')[0].boards).toHaveLength(
      2,
    )
  })

  it('finds the twin group of a community, but not a longer name', () => {
    const a = twin('PAN', 'a', 1, '2026-01-01')
    const b = twin('PAN', 'b', 2, '2026-01-01')
    expect(findCommunityTreeTwinGroup([a, b], 'PAN')).toEqual([a, b])
    const c = twin('PAN supporters', 'c', 1, '2026-01-01')
    expect(findCommunityTreeTwinGroup([a, b, c], 'PAN')).toEqual([a, b])
    expect(getCommunityTreeTwins(a, [a, b, c])).toEqual([a, b])
  })
})
