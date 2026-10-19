import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {fireEvent, render, screen} from '@testing-library/react-native'

import {ThemeProvider} from '#/alf'
import {PolicyCommunityVotes} from '../PolicyCommunityVotes'

/* Layout reaches Reanimated and the native bottom sheet, which jest cannot load. */
jest.mock('#/components/Layout', () =>
  jest.requireActual('#/components/Layout/const'),
)

jest.mock('@bsky.app/react-native-uitextview', () => ({
  UITextView: jest.requireActual('react-native').Text,
}))

const board = (name: string, uri: string, state = 'active') => ({
  uri,
  name,
  slug: name.toLowerCase(),
  communityId: name.toLowerCase(),
  quadrant: 'national',
  viewerMembershipState: state,
})

const mockVotes = jest.fn()
let mockBoards: ReturnType<typeof board>[] = []

jest.mock('#/state/queries/community-boards', () => ({
  useCommunityBoardQuery: () => ({data: {board: mockBoards[0]}}),
  useCommunityBoardsQuery: () => ({data: {boards: mockBoards}}),
}))
jest.mock('#/state/queries/policy-community-votes', () => ({
  usePolicyCommunityVotesQuery: (args: unknown) => mockVotes(args),
}))
jest.mock('#/state/session', () => ({
  useSession: () => ({currentAccount: {did: 'did:plc:me'}}),
}))
jest.mock('#/state/shell/political-affiliation', () => ({
  usePoliticalAffiliation: () => ({
    affiliations: [
      {id: 'party-pan', type: 'party', name: 'PAN', color: '#000'},
    ],
  }),
}))

i18n.loadAndActivate({locale: 'es', messages: {}})

function wrap(ui: React.ReactElement) {
  return render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme="light">{ui}</ThemeProvider>
    </I18nProvider>,
  )
}

const POLICY = 'at://did:plc:a/com.para.post/1'
const MORENA = 'at://b/com.para.community.board/morena'
const PAN = 'at://b/com.para.community.board/pan'

const votes = {
  community: {uri: MORENA, name: 'Morena'},
  memberCount: 10,
  voterCount: 4,
  signalAverage: '1.5',
  breakdown: [
    {signal: 3, count: 2},
    {signal: 0, count: 2},
  ],
  votes: [
    {
      did: 'did:plc:me',
      handle: 'alice.test',
      displayName: 'Alice',
      signal: 3,
      createdAt: '',
    },
    {did: 'did:plc:b', handle: 'bob.test', signal: -2, createdAt: ''},
  ],
}

beforeEach(() => {
  mockBoards = [board('Morena', MORENA)]
  mockVotes.mockReset()
})

describe('PolicyCommunityVotes', () => {
  it('shows how many members voted, the mean, and each vote', () => {
    mockVotes.mockReturnValue({data: votes, isLoading: false, isError: false})
    wrap(<PolicyCommunityVotes policyUri={POLICY} policyCommunity="morena" />)
    expect(screen.getByText(/de 10 miembros votaron/)).toBeTruthy()
    expect(screen.getByText('Promedio +1.5')).toBeTruthy()
    expect(screen.getByText(/Alice · Tú/)).toBeTruthy()
    expect(screen.getByText('@bob.test')).toBeTruthy()
    expect(screen.getAllByText('-2').length).toBeGreaterThan(0)
  })

  it('asks the AppView about the community the viewer belongs to', () => {
    mockVotes.mockReturnValue({data: votes, isLoading: false, isError: false})
    wrap(<PolicyCommunityVotes policyUri={POLICY} policyCommunity="morena" />)
    expect(mockVotes).toHaveBeenCalledWith({post: POLICY, community: MORENA})
  })

  it('lets the viewer switch between their communities', () => {
    mockBoards = [board('Morena', MORENA), board('PAN', PAN)]
    mockVotes.mockReturnValue({data: votes, isLoading: false, isError: false})
    wrap(<PolicyCommunityVotes policyUri={POLICY} policyCommunity="morena" />)
    fireEvent.press(screen.getByLabelText('PAN'))
    expect(mockVotes).toHaveBeenLastCalledWith({post: POLICY, community: PAN})
  })

  it('says so when nobody in the community has voted', () => {
    mockVotes.mockReturnValue({
      data: {...votes, voterCount: 0, votes: [], breakdown: []},
      isLoading: false,
      isError: false,
    })
    wrap(<PolicyCommunityVotes policyUri={POLICY} policyCommunity="morena" />)
    expect(screen.getByText(/ha votado todavía/)).toBeTruthy()
  })

  it('invites the viewer to join a community when they have none', () => {
    mockBoards = [board('Morena', MORENA, 'none')]
    mockVotes.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    })
    wrap(<PolicyCommunityVotes policyUri={POLICY} policyCommunity="morena" />)
    expect(screen.getByText(/Únete a una comunidad/)).toBeTruthy()
  })
})
