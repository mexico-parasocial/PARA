import {COMPASS_COLORS} from '#/lib/compass/compassColors'
import {
  inferPoliticalAffiliation,
  type PoliticalAffiliation,
} from '#/lib/political-affiliations'
import {type CommunityBoardView} from '#/state/queries/community-boards'
import {
  buildCommunityChatSections,
  communityIdentity,
  compareCommunityChats,
  pinnedAffiliationUris,
} from '../communityChatOrder'

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

const morena = board('Morena', 'national')
const pan = board('PAN', 'national')
const libRight = board('Lib Right', 'lib-right')
const agua = board('Agua y Presas de Jalisco', 'centro', {region: 'Jalisco'})
const movilidad = board('Movilidad Sostenible Norte', 'norte')

describe('pinnedAffiliationUris', () => {
  it('pins the joined party then the joined ninth', () => {
    expect(
      pinnedAffiliationUris(
        [libRight, pan, morena],
        [affiliation('Lib Right'), affiliation('Morena')],
      ),
    ).toEqual([morena.uri, libRight.uri])
  })

  it('does not pin an affiliation whose board the viewer has not joined', () => {
    const notJoined = {...morena, viewerMembershipState: 'none' as const}
    expect(pinnedAffiliationUris([notJoined], [affiliation('Morena')])).toEqual(
      [],
    )
  })
})

describe('compareCommunityChats', () => {
  it('orders pinned, then unread, then name', () => {
    const rows = [
      {uri: 'c', name: 'C', unread: 0},
      {uri: 'b', name: 'B', unread: 5},
      {uri: 'a', name: 'A', unread: 0},
      {uri: 'p', name: 'Z', unread: 0},
    ]
    expect(
      rows.sort((x, y) => compareCommunityChats(x, y, ['p'])).map(r => r.uri),
    ).toEqual(['p', 'b', 'a', 'c'])
  })
})

describe('buildCommunityChatSections', () => {
  it('lists each joined board once: affiliations, unread, then by type', () => {
    const sections = buildCommunityChatSections({
      boards: [movilidad, agua, pan, morena, libRight],
      affiliations: [affiliation('Morena')],
      unreadByCommunity: new Map([
        [movilidad.uri, 2],
        [morena.uri, 9],
      ]),
    })
    expect(
      sections.map(s => [s.key, s.boards.map(b => b.name)] as const),
    ).toEqual([
      ['affiliations', ['Morena']],
      ['unread', ['Movilidad Sostenible Norte']],
      ['party', ['PAN']],
      ['ninth', ['Lib Right']],
      ['state', ['Agua y Presas de Jalisco']],
    ])
  })

  it('leaves out boards the viewer has not joined', () => {
    const sections = buildCommunityChatSections({
      boards: [{...pan, viewerMembershipState: 'pending'}],
      affiliations: [],
      unreadByCommunity: new Map(),
    })
    expect(sections).toEqual([])
  })
})

describe('communityIdentity', () => {
  it('uses the canonical compass color for a ninth', () => {
    expect(communityIdentity(libRight).background).toBe(
      COMPASS_COLORS['lib-right'],
    )
  })

  it('uses dark text on a light party color', () => {
    expect(communityIdentity(board('PRD', 'national')).foreground).toBe(
      '#1a1a1a',
    )
    expect(communityIdentity(morena).foreground).toBe('#ffffff')
  })

  it('falls back to the theme for other communities', () => {
    expect(communityIdentity(movilidad)).toEqual({monogram: 'M'})
  })
})
