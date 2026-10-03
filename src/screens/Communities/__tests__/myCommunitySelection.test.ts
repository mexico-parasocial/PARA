import {
  inferPoliticalAffiliation,
  type PoliticalAffiliation,
} from '#/lib/political-affiliations'
import {type CommunityBoardView} from '#/state/queries/community-boards'
import {groupBoardsByState} from '../communityGrouping'
import {
  selectMyAffiliationCommunities,
  selectMyCommunityBoards,
} from '../myCommunitySelection'

const affiliation = (name: string): PoliticalAffiliation =>
  inferPoliticalAffiliation(name)!

const board = (
  name: string,
  quadrant: string,
  overrides: Partial<CommunityBoardView> = {},
): CommunityBoardView => ({
  uri: `at://did:plc:test/com.para.community.board/${name}`,
  cid: '',
  creatorDid: 'did:plc:test',
  communityId: name.toLowerCase().replace(/ /g, '-'),
  slug: name.toLowerCase().replace(/ /g, '-'),
  name,
  quadrant,
  delegatesChatId: '',
  subdelegatesChatId: '',
  memberCount: 1,
  viewerMembershipState: 'active',
  createdAt: '',
  ...overrides,
})

describe('selectMyCommunityBoards', () => {
  it('keeps saved affiliations visible when the backend has no matching boards', () => {
    const affiliations = [affiliation('Migala'), affiliation('Lib Right')]
    expect(selectMyAffiliationCommunities([], affiliations)).toEqual([
      {affiliation: affiliations[0], board: undefined},
      {affiliation: affiliations[1], board: undefined},
    ])
  })

  it('uses the real party board while preserving a ninth whose board is missing', () => {
    const party = board('Morena', 'national')
    const affiliations = [affiliation('Morena'), affiliation('Lib Right')]
    expect(selectMyAffiliationCommunities([party], affiliations)).toEqual([
      {affiliation: affiliations[0], board: party},
      {affiliation: affiliations[1], board: undefined},
    ])
  })
  it('shows only the saved party, selected ninth, and joined geographic boards', () => {
    const morena = board('Morena', 'national')
    const ninth = board('Lib Left', 'lib-left')
    const state = board('Agua', 'norte', {region: 'Jalisco'})
    expect(
      selectMyCommunityBoards(
        [
          morena,
          board('PAN', 'national'),
          ninth,
          board('Auth Left', 'auth-left'),
          state,
          board('Salud', 'norte'),
        ],
        [affiliation('Morena'), affiliation('Lib Left')],
      ),
    ).toEqual([morena, ninth, state])
  })

  it('uses saved political selections even without a board membership', () => {
    const party = board('Morena', 'national', {viewerMembershipState: 'none'})
    const ninth = board('Center Econocenter', 'center', {
      viewerMembershipState: 'none',
    })
    expect(
      selectMyCommunityBoards(
        [party, ninth],
        [affiliation('Morena'), affiliation('Center Econocenter')],
      ),
    ).toEqual([party, ninth])
  })

  it('excludes every geographic membership state except active', () => {
    const states: CommunityBoardView['viewerMembershipState'][] = [
      'none',
      'pending',
      'active',
      'left',
      'removed',
      'blocked',
    ]
    const boards = states.map(state =>
      board(state, 'Jalisco', {viewerMembershipState: state}),
    )
    expect(selectMyCommunityBoards(boards, [])).toEqual([boards[2]])
  })

  it('does not infer a ninth from the party or a precision-grid affiliation', () => {
    expect(
      selectMyCommunityBoards(
        [board('Center Left', 'center-left')],
        [
          affiliation('Morena'),
          {
            id: 'twenty-fifth-2-2',
            type: 'twentyFifth',
            name: 'Center',
            color: '',
          },
        ],
      ),
    ).toEqual([])
  })

  it('matches full party names and prefixed board identities exactly', () => {
    const mc = board('Movimiento Ciudadano', 'national')
    const pan = board('p/PAN', 'national')
    expect(selectMyCommunityBoards([mc], [affiliation('MC')])).toEqual([mc])
    expect(selectMyCommunityBoards([pan], [affiliation('PAN')])).toEqual([pan])
    expect(
      selectMyCommunityBoards(
        [board('PAN supporters', 'national')],
        [affiliation('PAN')],
      ),
    ).toEqual([])
  })

  it('prefers an active board for an affiliation over duplicate seed records', () => {
    const joined = board('Morena', 'national')
    const duplicate = {
      ...joined,
      uri: joined.uri + '-duplicate',
      viewerMembershipState: 'none' as const,
      memberCount: 100,
    }
    expect(
      selectMyCommunityBoards([duplicate, joined], [affiliation('Morena')]),
    ).toEqual([joined])
  })

  it('uses the most joined, then newest board when neither version is joined', () => {
    const older = board('Lib Left', 'lib-left', {
      viewerMembershipState: 'none',
      createdAt: '2026-01-01',
    })
    const newer = {...older, uri: older.uri + '-new', createdAt: '2026-02-01'}
    const popular = {...older, uri: older.uri + '-popular', memberCount: 10}
    expect(
      selectMyCommunityBoards([older, newer], [affiliation('Lib Left')]),
    ).toEqual([newer])
    expect(
      selectMyCommunityBoards([popular, newer], [affiliation('Lib Left')]),
    ).toEqual([popular])
  })

  it('updates when affiliations are changed or cleared, keeping joined states', () => {
    const morena = board('Morena', 'national')
    const pan = board('PAN', 'national')
    const state = board('Agua', 'Jalisco')
    const boards = [morena, pan, state]
    expect(selectMyCommunityBoards(boards, [affiliation('Morena')])).toEqual([
      morena,
      state,
    ])
    expect(selectMyCommunityBoards(boards, [affiliation('PAN')])).toEqual([
      pan,
      state,
    ])
    expect(selectMyCommunityBoards(boards, [])).toEqual([state])
  })

  it('groups only active geographic boards by their actual state', () => {
    const jalisco = board('Agua', 'norte', {region: 'Jalisco'})
    const yucatan = board('Movilidad', 'Yucatán')
    const groups = groupBoardsByState(
      selectMyCommunityBoards(
        [
          yucatan,
          jalisco,
          board('Salud en Jalisco', 'norte'),
          board('Pending', 'CDMX', {viewerMembershipState: 'pending'}),
        ],
        [],
      ),
    )
    expect(groups).toEqual([
      {state: 'Jalisco', boards: [jalisco]},
      {state: 'Yucatán', boards: [yucatan]},
    ])
  })
})
