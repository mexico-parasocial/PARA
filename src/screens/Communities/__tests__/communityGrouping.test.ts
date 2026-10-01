import {findMexicanState} from '#/lib/constants/mexico'
import {type CommunityBoardView} from '#/state/queries/community-boards'
import {classifyCommunityBoard, groupBoardsByState} from '../communityGrouping'

const board = (name: string, quadrant: string): CommunityBoardView => ({
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
})

describe('classifyCommunityBoard', () => {
  it('treats national and political boards as parties', () => {
    expect(classifyCommunityBoard(board('Morena', 'national')).group).toBe(
      'party',
    )
    expect(classifyCommunityBoard(board('Whatever', 'political')).group).toBe(
      'party',
    )
    expect(classifyCommunityBoard(board('PRD', '')).group).toBe('party')
  })

  it('recognizes ninths by quadrant id or by name', () => {
    expect(classifyCommunityBoard(board('Left Hub', 'lib-left'))).toEqual({
      group: 'ninth',
      ninth: 'lib-left',
    })
    expect(classifyCommunityBoard(board('Auth Right', ''))).toEqual({
      group: 'ninth',
      ninth: 'auth-right',
    })
  })

  it('is geographic only when the quadrant names a state', () => {
    expect(classifyCommunityBoard(board('Agua', 'Nuevo León'))).toEqual({
      group: 'state',
      state: 'Nuevo León',
    })
    expect(classifyCommunityBoard(board('Agua', 'cdmx'))).toEqual({
      group: 'state',
      state: 'Ciudad de México',
    })
  })

  it('uses the state the backend returns, ahead of the quadrant', () => {
    expect(
      classifyCommunityBoard({...board('Agua', 'norte'), region: 'Jalisco'}),
    ).toEqual({group: 'state', state: 'Jalisco'})
    expect(
      classifyCommunityBoard({...board('Agua', 'norte'), region: ''}).group,
    ).toBe('other')
  })

  it('never calls macro-regions or unknown quadrants geographic', () => {
    for (const quadrant of ['norte', 'sur', 'centro', '', 'unknown']) {
      expect(classifyCommunityBoard(board('Salud', quadrant)).group).toBe(
        'other',
      )
    }
  })
})

describe('groupBoardsByState', () => {
  it('groups state boards and orders states alphabetically', () => {
    const groups = groupBoardsByState([
      board('A', 'Yucatán'),
      board('B', 'Jalisco'),
      board('C', 'jalisco'),
      board('D', 'norte'),
    ])
    expect(groups.map(g => [g.state, g.boards.length])).toEqual([
      ['Jalisco', 2],
      ['Yucatán', 1],
    ])
  })
})

describe('findMexicanState', () => {
  it('maps UI labels to the stored region value', () => {
    expect(findMexicanState('CDMX')).toBe('Ciudad de México')
    expect(findMexicanState('nuevo leon')).toBe('Nuevo León')
    expect(findMexicanState('Yucatán')).toBe('Yucatán')
    expect(findMexicanState('Cualquiera')).toBeUndefined()
    expect(findMexicanState('All')).toBeUndefined()
  })
})
