import {type AtUriString} from '@atproto/syntax'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {fireEvent, render, screen} from '@testing-library/react-native'

import {
  type ConclusionOfCabildeo,
  type ConclusionView,
} from '#/lib/api/conclusion'
import {type CabildeoKind} from '#/lib/api/para-lexicons'
import {ConclusionSection} from '../components/ConclusionSection'

const CABILDEO = 'at://did:plc:a/com.para.civic.cabildeo/1'
const BOARD = 'at://did:plc:a/com.para.community.board/b'
const mockRefetch = jest.fn()
const mockMutate = jest.fn()
const mockQueryEnabled = jest.fn()
let mockData: ConclusionOfCabildeo | undefined
let mockIsError = false
let mockCanOrganize = false
let mockPending = false

jest.mock('#/state/queries/conclusion', () => ({
  useConclusionQuery: (_uri: string, opts: {enabled?: boolean}) => {
    mockQueryEnabled(opts.enabled)
    return {data: mockData, isError: mockIsError, refetch: mockRefetch}
  },
  usePublishConclusionMutation: () => ({
    mutate: mockMutate,
    isPending: mockPending,
  }),
}))
jest.mock('#/state/queries/profile', () => ({
  useProfileQuery: () => ({data: {handle: 'ana.test'}}),
}))
jest.mock('#/state/queries/community-activities', () => ({
  useCommunityOrganizers: () => ({canOrganize: mockCanOrganize}),
}))
jest.mock('#/components/Toast', () => ({show: jest.fn()}))
jest.mock('#/lib/strings/errors', () => ({
  cleanError: (e: Error) => e.message,
}))
jest.mock('#/alf', () => ({
  atoms: {},
  useTheme: () => ({
    atoms: {},
    palette: {primary_500: '#00c'},
  }),
}))
jest.mock('#/components/Typography', () => ({
  Text: jest.requireActual('react-native').Text,
}))
jest.mock('#/components/Button', () => {
  const {Pressable, Text} = jest.requireActual('react-native')
  return {
    Button: ({label, children, onPress, disabled}: any) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint=""
        accessibilityState={{disabled: Boolean(disabled)}}
        disabled={disabled}
        onPress={onPress}>
        {children}
      </Pressable>
    ),
    ButtonText: Text,
  }
})
jest.mock('#/components/forms/TextField', () => {
  const {View, Text, TextInput} = jest.requireActual('react-native')
  return {
    Root: View,
    LabelText: Text,
    Input: ({label, onChangeText, value}: any) => (
      <TextInput
        accessibilityLabel={label}
        accessibilityHint=""
        value={value}
        onChangeText={onChangeText}
      />
    ),
  }
})

const conclusion = (fields: Partial<ConclusionView> = {}): ConclusionView => ({
  uri: 'at://did:plc:s/com.para.civic.conclusion/1',
  cid: 'c',
  author: 'did:plc:s',
  cabildeo: CABILDEO,
  communityUri: BOARD,
  text: 'Hay acuerdo en la sombra.',
  cited: [],
  edited: false,
  createdAt: '2026-11-02T00:00:00.000Z',
  ...fields,
})

const positions = [
  {
    uri: 'at://did:plc:d/com.para.civic.position/1' as AtUriString,
    cabildeo: CABILDEO,
    stance: 'for' as const,
    text: 'Un parque con sombra.',
    createdAt: '2026-11-01T00:00:00.000Z',
  },
]

function renderSection(
  kind: CabildeoKind | 'unknown' = 'forum',
  phase = 'open',
) {
  return render(
    <I18nProvider i18n={i18n}>
      <ConclusionSection
        cabildeoUri={CABILDEO}
        community="parque"
        kind={kind === 'unknown' ? undefined : kind}
        phase={phase}
        positions={positions}
      />
    </I18nProvider>,
  )
}

beforeEach(() => {
  i18n.loadAndActivate({locale: 'en', messages: {}})
  mockRefetch.mockReset()
  mockMutate.mockReset()
  mockQueryEnabled.mockReset()
  mockData = {conclusion: conclusion(), earlier: [], communityUri: BOARD}
  mockIsError = false
  mockCanOrganize = false
  mockPending = false
})

describe('ConclusionSection for readers', () => {
  it('does not ask for or draw anything for an activity', () => {
    renderSection('activity', 'resolved')
    expect(screen.queryByText('Conclusión')).toBeNull()
    expect(mockQueryEnabled).toHaveBeenLastCalledWith(false)
  })

  it('does not ask for or draw anything for a draft or an unknown kind', () => {
    renderSection('forum', 'draft')
    expect(mockQueryEnabled).toHaveBeenLastCalledWith(false)
    renderSection('unknown', 'open')
    expect(mockQueryEnabled).toHaveBeenLastCalledWith(false)
  })

  it('shows the steward reading and says it is not a vote result', () => {
    renderSection()
    expect(screen.getByText('Hay acuerdo en la sombra.')).toBeTruthy()
    expect(screen.getByText(/No es un resultado votado/)).toBeTruthy()
    expect(screen.getByText(/@ana\.test/)).toBeTruthy()
  })

  it('shows the positions it cites', () => {
    mockData = {
      conclusion: conclusion({
        cited: [
          {
            uri: positions[0].uri,
            author: 'did:plc:d',
            stance: 'for',
            text: 'Un parque con sombra.',
          },
        ],
      }),
      earlier: [],
      communityUri: BOARD,
    }
    renderSection()
    expect(screen.getByText('Posturas en las que se basa')).toBeTruthy()
    expect(screen.getByText('Un parque con sombra.')).toBeTruthy()
  })

  it('says when a conclusion was edited and shows the original', () => {
    mockData = {
      conclusion: conclusion({edited: true}),
      earlier: [],
      communityUri: BOARD,
    }
    renderSection()
    expect(screen.getByText(/se editó después de publicarse/)).toBeTruthy()
  })

  it('keeps earlier conclusions behind a toggle', () => {
    mockData = {
      conclusion: conclusion(),
      earlier: [
        conclusion({
          uri: 'at://did:plc:s/com.para.civic.conclusion/old',
          text: 'Primera lectura.',
        }),
      ],
      communityUri: BOARD,
    }
    renderSection()
    expect(screen.queryByText('Primera lectura.')).toBeNull()
    fireEvent.press(screen.getByLabelText('Conclusiones anteriores'))
    expect(screen.getByText('Primera lectura.')).toBeTruthy()
  })

  it('draws nothing when there is no conclusion and the viewer is not a steward', () => {
    mockData = {conclusion: null, earlier: [], communityUri: BOARD}
    renderSection()
    expect(screen.queryByText('Conclusión')).toBeNull()
  })

  it('offers a retry when the read fails', () => {
    mockIsError = true
    mockData = undefined
    renderSection()
    fireEvent.press(screen.getByLabelText('Reintentar'))
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })
})

describe('ConclusionSection for stewards', () => {
  beforeEach(() => {
    mockCanOrganize = true
    mockData = {conclusion: null, earlier: [], communityUri: BOARD}
  })

  it('offers to write one when there is none', () => {
    renderSection()
    expect(screen.getByLabelText('Escribir una conclusión')).toBeTruthy()
  })

  it('does not offer it when the board is not known', () => {
    mockData = {conclusion: null, earlier: [], communityUri: null}
    renderSection()
    expect(screen.queryByText('Conclusión')).toBeNull()
  })

  it('offers a new one, not an edit, when one exists', () => {
    mockData = {conclusion: conclusion(), earlier: [], communityUri: BOARD}
    renderSection()
    expect(screen.getByLabelText('Escribir una nueva conclusión')).toBeTruthy()
  })

  it('publishes the text and the cited positions naming the board', () => {
    renderSection()
    fireEvent.press(screen.getByLabelText('Escribir una conclusión'))
    fireEvent.changeText(
      screen.getByLabelText('Conclusión', {exact: true}),
      '  Hay acuerdo.  ',
    )
    fireEvent.press(screen.getByLabelText(/A favor: Un parque con sombra\./))
    fireEvent.press(screen.getByLabelText('Publicar conclusión'))
    expect(mockMutate).toHaveBeenCalledTimes(1)
    expect(mockMutate.mock.calls[0][0]).toEqual({
      cabildeo: CABILDEO,
      communityUri: BOARD,
      text: 'Hay acuerdo.',
      cited: [positions[0].uri],
    })
  })

  it('cannot publish an empty conclusion', () => {
    renderSection()
    fireEvent.press(screen.getByLabelText('Escribir una conclusión'))
    fireEvent.press(screen.getByLabelText('Publicar conclusión'))
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('closes the form on cancel without publishing', () => {
    renderSection()
    fireEvent.press(screen.getByLabelText('Escribir una conclusión'))
    fireEvent.press(screen.getByLabelText('Cancelar'))
    expect(mockMutate).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Escribir una conclusión')).toBeTruthy()
  })
})
