import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {fireEvent, render, screen} from '@testing-library/react-native'

import {type PolicyLedgerEntry} from '#/state/queries/policy-ledger'
import {ThemeProvider} from '#/alf'
import {SeeVotesScreen} from '../SeeVotesScreen'

const mockNavigate = jest.fn()
let mockLedger: {
  data?: {entries: PolicyLedgerEntry[]; truncated: boolean}
  isLoading: boolean
  isError: boolean
  refetch: () => void
}

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate}),
}))

jest.mock('#/state/session', () => ({
  useSession: () => ({currentAccount: {did: 'did:plc:me'}}),
}))

jest.mock('#/state/queries/profile', () => ({
  useProfileQuery: () => ({data: {handle: 'someone.test'}}),
}))

jest.mock('#/state/queries/policy-ledger', () => ({
  usePolicyLedgerQuery: () => mockLedger,
}))

jest.mock('#/state/queries/policy-tally', () => ({
  usePolicyTallyQuery: (uri: string | undefined) => ({
    isLoading: false,
    data: uri
      ? {
          voteCount: 12,
          signalAverage: '0.8',
          outcome: 'passed',
          official: true,
          community: '',
          breakdown: [],
          quorumTarget: 10,
        }
      : undefined,
  }),
}))

jest.mock('#/state/queries/community-boards', () => ({
  useCommunityBoardQuery: () => ({data: undefined}),
}))

jest.mock('#/components/Post/PostFlairStrip', () => {
  const {Text} = jest.requireActual('react-native')
  return {
    PostFlairStrip: ({badges}: {badges: {kind: string}[]}) => (
      <Text>{`flairs:${badges.map(badge => badge.kind).join(',')}`}</Text>
    ),
  }
})

// Both pull in Reanimated, which has no native half under Jest.
jest.mock('#/components/civic/PolicyBallotControl', () => ({
  PolicyBallotControl: () => null,
}))
jest.mock('#/components/Lists', () => ({
  ListMaybePlaceholder: () => null,
}))

jest.mock('#/components/Layout', () => {
  const {View, Text} = jest.requireActual('react-native')
  return {
    ...jest.requireActual('#/components/Layout/const'),
    Screen: View,
    Center: View,
    Header: {
      Outer: View,
      BackButton: () => null,
      Content: View,
      TitleText: Text,
      Slot: View,
    },
  }
})

jest.mock('@bsky.app/react-native-uitextview', () => ({
  UITextView: jest.requireActual('react-native').Text,
}))

jest.mock('#/components/Button', () => {
  const {Pressable, Text} = jest.requireActual('react-native')
  return {
    Button: ({label, onPress, children}: any) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint=""
        onPress={onPress}>
        {children}
      </Pressable>
    ),
    ButtonText: Text,
  }
})

function policyPost(uri: string, text: string) {
  return {
    uri,
    cid: 'cid',
    author: {did: 'did:plc:author', handle: 'author.test'},
    record: {
      text,
      postType: 'policy',
      flairs: ['||#EmpresaPublicaDeAgua', '|#IndustriaHidrica'],
    },
    indexedAt: '2026-10-01T00:00:00.000Z',
  } as unknown as PolicyLedgerEntry['post']
}

const ENTRIES: PolicyLedgerEntry[] = [
  {
    uri: 'at://did:plc:me/com.para.civic.vote/3',
    policyUri: 'at://did:plc:author/com.para.post/a',
    signal: 2,
    createdAt: '2026-10-26T00:00:00.000Z',
    post: policyPost('at://did:plc:author/com.para.post/a', 'Agua pública'),
  },
  {
    uri: 'at://did:plc:me/com.para.civic.vote/2',
    policyUri: 'at://did:plc:author/com.para.post/b',
    signal: -3,
    createdAt: '2026-10-20T00:00:00.000Z',
    post: policyPost('at://did:plc:author/com.para.post/b', 'Peaje urbano'),
  },
  {
    uri: 'at://did:plc:me/com.para.civic.vote/1',
    policyUri: 'at://did:plc:author/com.para.post/gone',
    signal: 0,
    createdAt: '2026-10-10T00:00:00.000Z',
    post: null,
  },
]

function renderScreen(did?: string) {
  return render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme="light">
        <SeeVotesScreen
          route={{key: 'SeeVotes', name: 'SeeVotes', params: {did}} as any}
          navigation={{} as any}
        />
      </ThemeProvider>
    </I18nProvider>,
  )
}

beforeAll(() => {
  i18n.loadAndActivate({locale: 'en', messages: {}})
})

beforeEach(() => {
  mockNavigate.mockClear()
  mockLedger = {
    data: {entries: ENTRIES, truncated: false},
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }
})

describe('SeeVotesScreen', () => {
  it('lists policy ballots with their weight and the community standing', () => {
    renderScreen()
    expect(screen.getByText('Tus votos en policies')).toBeTruthy()
    expect(screen.getByText('Agua pública')).toBeTruthy()
    expect(screen.getByText('Peaje urbano')).toBeTruthy()
    // The histogram's axis prints every weight once; each badge adds one.
    expect(screen.getAllByText('+2')).toHaveLength(2)
    expect(screen.getAllByText('-3')).toHaveLength(2)
    expect(screen.getByText('Rechazo total')).toBeTruthy()
    expect(screen.getByText('Policy no disponible')).toBeTruthy()
    expect(screen.getAllByText('Con apoyo')).toHaveLength(2)
    // The policy's own flair is shown beside its matter.
    expect(screen.getAllByText('flairs:policy,matter')).toHaveLength(2)
    // Nothing from debates: no phases, options or delegation.
    expect(screen.queryByText(/Deliberating|Delegated|Direct/)).toBeNull()
  })

  it('filters by stance', () => {
    renderScreen()
    fireEvent.press(screen.getByLabelText('Rechazo: 1'))
    expect(screen.queryByText('Agua pública')).toBeNull()
    expect(screen.getByText('Peaje urbano')).toBeTruthy()
  })

  it('opens the policy when a row is pressed', () => {
    renderScreen()
    fireEvent.press(screen.getByLabelText('Agua pública. Tu voto: +2'))
    expect(mockNavigate).toHaveBeenCalledWith('PolicyDetails', {
      policyUri: 'at://did:plc:author/com.para.post/a',
    })
  })

  it('describes someone else’s ledger as theirs', () => {
    mockLedger.data = {entries: [], truncated: false}
    renderScreen('did:plc:other')
    expect(screen.getByText('Votos en policies')).toBeTruthy()
    expect(screen.getByText('Todavía no hay votos en policies')).toBeTruthy()
    expect(screen.queryByLabelText('Ver policies')).toBeNull()
  })
})
