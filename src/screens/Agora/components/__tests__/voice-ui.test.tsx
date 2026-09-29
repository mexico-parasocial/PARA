import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {fireEvent, render, screen} from '@testing-library/react-native'

import {delegateVoice, type Mandate} from '#/lib/mandates/voice'
import {ThemeProvider} from '#/alf'
import {DelegatedVoiceCard} from '../DelegatedVoiceCard'
import {VoteComposer} from '../VoteComposer'

/*
 * #/alf imports Layout only for its constants; the rest of Layout reaches
 * Reanimated and the native bottom sheet, which do not load under jest.
 */
jest.mock('#/components/Layout', () =>
  jest.requireActual('#/components/Layout/const'),
)

// Typography's native text view ships untransformed ESM.
jest.mock('@bsky.app/react-native-uitextview', () => ({
  UITextView: jest.requireActual('react-native').Text,
}))

/* A pressable with the button's label is all these tests need. */
jest.mock('#/components/Button', () => {
  const {Pressable, Text} = jest.requireActual('react-native')
  return {
    Button: ({label, onPress, disabled, children}: any) => (
      <Pressable
        accessibilityLabel={label}
        accessibilityHint=""
        onPress={disabled ? undefined : onPress}>
        {children}
      </Pressable>
    ),
    ButtonText: ({children}: any) => <Text>{children}</Text>,
  }
})

i18n.loadAndActivate({locale: 'es', messages: {}})

function wrap(ui: React.ReactElement) {
  return render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme="light">{ui}</ThemeProvider>
    </I18nProvider>,
  )
}

const NOW = new Date('2026-09-29T00:00:00Z')

function voice(lenders: number, own: number, direct: string[] = []) {
  const mandates: Mandate[] = Array.from({length: lenders}, (_v, i) => ({
    id: `m${i}`,
    delegator: `did:plc:l${i}`,
    delegate: 'did:plc:ana',
    kind: 'standing',
    scope: {community: 'verde'},
    maxIntensity: 1,
    grantedAt: '2026-09-01T00:00:00Z',
  }))
  return delegateVoice({
    delegate: 'did:plc:ana',
    delegateIntensity: own,
    mandates,
    directVoters: new Set(direct),
    proposal: {uri: 'p', community: 'verde', topics: [], delegable: true},
    eligibleMembers: 400,
    totalVoices: 200,
    now: NOW,
  })
}

describe('DelegatedVoiceCard', () => {
  it('says how many voices, whose, and what share', () => {
    wrap(
      <DelegatedVoiceCard handle="@ana" voice={voice(12, 2, ['did:plc:l0'])} />,
    )
    expect(screen.getByText('13 voces')).toBeTruthy()
    expect(
      screen.getByText('La suya y la de 11 personas que se la prestaron.'),
    ).toBeTruthy()
    expect(screen.getByText(/7% de todas las voces/)).toBeTruthy()
    expect(screen.getByText(/más de 40 personas/)).toBeTruthy()
    expect(
      screen.getByText(
        '1 persona votó por su cuenta: cuenta su voto, no este.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('EN SOMBRA')).toBeTruthy()
  })

  it('carries nothing before the delegate votes', () => {
    wrap(<DelegatedVoiceCard handle="@ana" voice={voice(5, 0)} />)
    expect(screen.getByText('0 voces')).toBeTruthy()
    expect(
      screen.getByText(
        'Todavía no vota, así que no lleva ninguna voz prestada.',
      ),
    ).toBeTruthy()
  })
})

describe('VoteComposer', () => {
  it('prices the signal as a square, with no second intensity knob', () => {
    const onCast = jest.fn()
    wrap(<VoteComposer onCast={onCast} />)
    expect(screen.getByText('Neutral no gasta créditos.')).toBeTruthy()
    expect(screen.queryByLabelText('Increase units')).toBeNull()

    fireEvent.press(screen.getByLabelText('Strongly Support'))
    expect(screen.getByText('Este voto cuesta 9 de tus créditos.')).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Oppose'))
    expect(screen.getByText('Este voto cuesta 4 de tus créditos.')).toBeTruthy()

    fireEvent.press(screen.getByText('Cast vote'))
    expect(onCast).toHaveBeenCalledWith(-2)
  })
})
