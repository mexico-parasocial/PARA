import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {fireEvent, render, screen} from '@testing-library/react-native'

import {delegateReach, type Mandate} from '#/lib/mandates/mandates'
import {ThemeProvider} from '#/alf'
import {DelegateReachCard} from '../DelegateReachCard'
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

function reach(lenders: number, voted: boolean, direct: string[] = []) {
  const mandates: Mandate[] = Array.from({length: lenders}, (_v, i) => ({
    id: `m${i}`,
    delegator: `did:plc:l${i}`,
    delegate: 'did:plc:ana',
    kind: 'standing',
    scope: {community: 'verde'},
    grantedAt: '2026-09-01T00:00:00Z',
  }))
  return delegateReach({
    delegate: 'did:plc:ana',
    delegateVoted: voted,
    mandates,
    directVoters: new Set(direct),
    proposal: {uri: 'p', community: 'verde', topics: [], delegable: true},
    eligibleMembers: 400,
    totalVotes: 200,
    now: NOW,
  })
}

describe('DelegateReachCard', () => {
  it('says how many votes, whose, and what share', () => {
    wrap(
      <DelegateReachCard
        handle="@ana"
        kind="policy"
        shadow
        reach={reach(12, true, ['did:plc:l0'])}
      />,
    )
    expect(screen.getByText('12 votos')).toBeTruthy()
    expect(
      screen.getByText('El suyo y el de 11 personas que se lo prestaron.'),
    ).toBeTruthy()
    expect(screen.getByText(/6% de los votos/)).toBeTruthy()
    expect(screen.getByText(/más de 40 personas/)).toBeTruthy()
    expect(
      screen.getByText(
        '1 persona votó por su cuenta: cuenta su voto, no este.',
      ),
    ).toBeTruthy()
    expect(screen.getByText(/la misma señal que el de @ana/)).toBeTruthy()
    expect(screen.getByText('EN SOMBRA')).toBeTruthy()
  })

  it('explains a cabildeo as one option per person, with no shadow badge', () => {
    wrap(
      <DelegateReachCard
        handle="@ana"
        kind="cabildeo"
        reach={reach(3, true)}
      />,
    )
    expect(screen.getByText('4 votos')).toBeTruthy()
    expect(screen.getByText(/va a la opción que elija @ana/)).toBeTruthy()
    expect(screen.queryByText('EN SOMBRA')).toBeNull()
    expect(screen.queryByText(/crédito/)).toBeNull()
  })

  it('carries nothing before the delegate votes', () => {
    wrap(
      <DelegateReachCard handle="@ana" kind="policy" reach={reach(5, false)} />,
    )
    expect(screen.getByText('0 votos')).toBeTruthy()
    expect(
      screen.getByText(
        'Todavía no vota, así que no lleva ningún voto prestado.',
      ),
    ).toBeTruthy()
  })
})

describe('VoteComposer', () => {
  it('weighs the signal, with no credits and no second knob', () => {
    const onCast = jest.fn()
    wrap(<VoteComposer onCast={onCast} />)
    expect(
      screen.getByText('0 cuenta tu participación sin mover el resultado.'),
    ).toBeTruthy()
    expect(screen.queryByLabelText('Increase units')).toBeNull()
    expect(screen.queryByText(/crédito/)).toBeNull()

    fireEvent.press(screen.getByLabelText('Strongly Support'))
    expect(
      screen.getByText('Tu voto suma +3 al conteo: +3 pesa el triple que +1.'),
    ).toBeTruthy()
    fireEvent.press(screen.getByLabelText('Oppose'))
    expect(
      screen.getByText('Tu voto suma -2 al conteo: +3 pesa el triple que +1.'),
    ).toBeTruthy()

    fireEvent.press(screen.getByText('Cast vote'))
    expect(onCast).toHaveBeenCalledWith(-2)
  })
})
