import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {act, fireEvent, render, screen} from '@testing-library/react-native'

import {type CabildeoView} from '#/lib/cabildeo-client'
import {type PolicyTally} from '#/lib/policy-display'
import {LobbyingCard} from '#/screens/Communities/LobbyingCard'
import {ThemeProvider} from '#/alf'
import {PolicyBallotControl} from '../PolicyBallotControl'
import {
  PolicyConsensusMeter,
  PolicyConsensusPanel,
  PolicyStanding,
} from '../PolicyConsensus'

/* Layout reaches Reanimated and the native bottom sheet, which jest cannot load. */
jest.mock('#/components/Layout', () =>
  jest.requireActual('#/components/Layout/const'),
)

jest.mock('@bsky.app/react-native-uitextview', () => ({
  UITextView: jest.requireActual('react-native').Text,
}))

const mockOpenNotice = jest.fn()
const mockMutate = jest.fn()
let mockSignals: Record<string, number> | undefined

jest.mock('#/components/Dialog', () => ({
  useDialogControl: () => ({open: mockOpenNotice, close: jest.fn()}),
}))

jest.mock('#/components/Toast', () => ({show: jest.fn()}))
jest.mock('#/state/cache/post-shadow', () => ({updatePostShadow: jest.fn()}))

// The slider's gesture needs native modules; a button that reports a vote stands in.
jest.mock('#/components/VotingButtonHorizontal', () => {
  const {Pressable, Text} = jest.requireActual('react-native')
  return {
    VotingButtonHorizontal: ({initialVote, onVoteChange}: any) => (
      <Pressable
        accessibilityLabel="slider"
        accessibilityHint=""
        onPress={() => onVoteChange(2)}>
        <Text>{`vote:${initialVote}`}</Text>
      </Pressable>
    ),
  }
})

// The notice is a dialog; a button that confirms it is all the flow needs.
jest.mock('#/components/civic/PublicRecordNotice', () => {
  const {Pressable, Text} = jest.requireActual('react-native')
  return {
    PublicBallotNotice: ({onConfirm, onClose}: any) => (
      <Pressable
        accessibilityLabel="confirm-notice"
        accessibilityHint=""
        onPress={() => {
          onConfirm()
          onClose?.()
        }}>
        <Text>confirmar</Text>
      </Pressable>
    ),
  }
})

jest.mock('#/state/queries/policy-vote', () => ({
  usePolicyVoteMutation: () => ({
    mutate: mockMutate,
    isPending: false,
    variables: undefined,
  }),
  useViewerPolicySignalsQuery: () => ({data: mockSignals}),
}))

i18n.loadAndActivate({locale: 'es', messages: {}})

function wrap(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nProvider i18n={i18n}>
        <ThemeProvider theme="light">{ui}</ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>,
  )
}

const POLICY = 'at://did:plc:a/com.para.post/1'

function tally(overrides: Partial<PolicyTally> = {}): PolicyTally {
  return {
    subject: POLICY,
    subjectType: 'policy',
    community: 'Verde',
    voteCount: 14,
    directVoteCount: 12,
    delegatedVoteCount: 2,
    signalSum: 21,
    signalAverage: '1.5',
    eligibleVoterCount: 40,
    quorumTarget: 10,
    quorumMet: true,
    official: false,
    certified: false,
    outcome: 'passed',
    state: 'voting',
    breakdown: [
      {signal: 3, count: 6},
      {signal: 1, count: 6},
      {signal: -2, count: 2},
    ],
    computedAt: '2026-10-13T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  mockOpenNotice.mockClear()
  mockMutate.mockClear()
  mockSignals = undefined
})

describe('PolicyBallotControl', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  function settle() {
    act(() => {
      jest.advanceTimersByTime(1500)
    })
  }

  it("starts from the viewer's own ballot", () => {
    mockSignals = {[POLICY]: -2}
    wrap(<PolicyBallotControl policyUri={POLICY} variant="horizontal" />)
    expect(screen.getByText('vote:-2')).toBeTruthy()
  })

  it('casts once the person stops adjusting, with no notice when it is off', () => {
    wrap(
      <PolicyBallotControl
        policyUri={POLICY}
        variant="horizontal"
        showNotice={false}
      />,
    )
    fireEvent.press(screen.getByLabelText('slider'))
    expect(mockMutate).not.toHaveBeenCalled()
    settle()
    expect(mockMutate).toHaveBeenCalledWith(
      {policyUri: POLICY, signal: 2},
      expect.any(Object),
    )
    expect(mockOpenNotice).not.toHaveBeenCalled()
  })

  it('opens the public-ballot notice instead of casting when it is on', () => {
    wrap(<PolicyBallotControl policyUri={POLICY} variant="horizontal" />)
    fireEvent.press(screen.getByLabelText('slider'))
    settle()
    expect(mockOpenNotice).toHaveBeenCalledTimes(1)
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('does not cast again for the vote already committed', () => {
    mockSignals = {[POLICY]: 2}
    wrap(
      <PolicyBallotControl
        policyUri={POLICY}
        variant="horizontal"
        showNotice={false}
      />,
    )
    fireEvent.press(screen.getByLabelText('slider'))
    settle()
    expect(mockMutate).not.toHaveBeenCalled()
  })
})

describe('PolicyConsensusPanel', () => {
  it('reports the mean, quorum and spread instead of option shares', () => {
    wrap(<PolicyConsensusPanel tally={tally()} />)
    expect(screen.getByText('+1.5')).toBeTruthy()
    expect(screen.getByText('Con apoyo')).toBeTruthy()
    expect(screen.getByText('14 / 10')).toBeTruthy()
    expect(screen.getByText('Quórum alcanzado.')).toBeTruthy()
    expect(screen.queryByText(/opción/i)).toBeNull()
  })

  it('says how many votes are missing when quorum is not met', () => {
    wrap(
      <PolicyConsensusPanel
        tally={tally({
          voteCount: 4,
          quorumMet: false,
          outcome: 'insufficient_quorum',
        })}
      />,
    )
    expect(screen.getByText('Sin quórum')).toBeTruthy()
    expect(screen.getByText(/Faltan 6 votos/)).toBeTruthy()
  })

  it('explains an empty tally without inventing numbers', () => {
    wrap(<PolicyConsensusPanel tally={null} />)
    expect(screen.getByText('Todavía no hay votos')).toBeTruthy()
  })
})

describe('PolicyConsensusMeter', () => {
  it('summarises a tally on one line', () => {
    wrap(<PolicyConsensusMeter tally={tally()} />)
    expect(screen.getByText(/Promedio \+1\.5/)).toBeTruthy()
    expect(screen.getByText(/14 votos/)).toBeTruthy()
  })

  it('treats a missing tally as no votes yet', () => {
    wrap(<PolicyConsensusMeter tally={null} />)
    expect(screen.getByText('Nadie ha votado todavía')).toBeTruthy()
  })
})

describe('PolicyStanding', () => {
  it('says how far above the community the viewer sits', () => {
    wrap(<PolicyStanding viewerSignal={3} tally={tally()} />)
    expect(screen.getByText('Comunidad +1.5')).toBeTruthy()
    expect(screen.getByText('Tú +3')).toBeTruthy()
    expect(screen.getByText(/1\.5 puntos más a favor/)).toBeTruthy()
  })

  it('says how far below, and when the two agree', () => {
    wrap(<PolicyStanding viewerSignal={-1} tally={tally()} />)
    expect(screen.getByText(/2\.5 puntos más en contra/)).toBeTruthy()
    wrap(
      <PolicyStanding viewerSignal={1} tally={tally({signalAverage: '1.2'})} />,
    )
    expect(screen.getByText(/coincide con la de la comunidad/)).toBeTruthy()
  })

  it('shows nothing without a vote of their own or any community votes', () => {
    wrap(<PolicyStanding viewerSignal={undefined} tally={tally()} />)
    wrap(<PolicyStanding viewerSignal={2} tally={tally({voteCount: 0})} />)
    expect(screen.queryByText(/Comunidad/)).toBeNull()
  })
})

describe('LobbyingCard', () => {
  const cabildeo = {
    uri: 'at://did:plc:a/com.para.civic.cabildeo/1',
    title: 'Agua para el norte',
    description: 'Debate sobre el reparto del agua.',
    community: 'Verde',
    communities: [],
    phase: 'voting',
    flairs: ['||#Agua'],
    options: [{label: 'Presa nueva'}, {label: 'Reuso'}],
    optionSummary: [
      {optionIndex: 0, label: 'Presa nueva', votes: 6, positions: 1},
      {optionIndex: 1, label: 'Reuso', votes: 2, positions: 0},
    ],
    positionCounts: {total: 3, for: 2, against: 1, amendment: 0, byOption: []},
    voteTotals: {total: 8, direct: 7, delegated: 1},
  } as unknown as CabildeoView

  it('keeps the phase and pairs it with participation and the leading option', () => {
    const onPress = jest.fn()
    wrap(<LobbyingCard cabildeo={cabildeo} onPress={onPress} />)
    expect(screen.getByText('Agua para el norte')).toBeTruthy()
    expect(screen.getByText(/Votación/)).toBeTruthy()
    expect(screen.getByText('Participantes')).toBeTruthy()
    expect(screen.getByText('Presa nueva')).toBeTruthy()
    expect(screen.getByText('75%')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Agua para el norte'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
