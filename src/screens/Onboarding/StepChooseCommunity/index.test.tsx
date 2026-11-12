import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {fireEvent, render, screen} from '@testing-library/react-native'

import {MEXICAN_STATES} from '#/lib/constants/mexico'
import {Context, createInitialOnboardingState} from '#/screens/Onboarding/state'
import {ThemeProvider} from '#/alf'
import {StepChooseCommunity} from '.'

const mockSetCivicHomeState = jest.fn()
let mockCivicHomeState: string | undefined

jest.mock('#/state/preferences', () => ({
  useCivicHomeState: () => mockCivicHomeState,
  useSetCivicHomeState: () => mockSetCivicHomeState,
}))

jest.mock('#/screens/Onboarding/Layout', () => {
  const {Text} = jest.requireActual('react-native')
  return {
    OnboardingControls: {Portal: ({children}: any) => children},
    OnboardingPosition: () => null,
    OnboardingTitleText: Text,
    OnboardingDescriptionText: Text,
  }
})

// The real Layout loads Reanimated, which this jest setup cannot initialize;
// '#/alf' reaches it through Layout, as in MyAffiliationsScreen.test.tsx.
jest.mock('#/components/Layout', () =>
  jest.requireActual('#/components/Layout/const'),
)

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

const dispatch = jest.fn()

function openStep() {
  render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme="light">
        <Context.Provider
          value={{state: createInitialOnboardingState(), dispatch}}>
          <StepChooseCommunity />
        </Context.Provider>
      </ThemeProvider>
    </I18nProvider>,
  )
}

const pick = (label: string) =>
  fireEvent.press(
    screen.getByRole('button', {name: `Select ${label} as your community`}),
  )
const pressContinue = () =>
  fireEvent.press(screen.getByRole('button', {name: 'Continue to next step'}))

beforeEach(() => {
  jest.clearAllMocks()
  mockCivicHomeState = undefined
  i18n.loadAndActivate({locale: 'en', messages: {}})
})

it('offers every state under its canonical name', () => {
  openStep()
  for (const state of MEXICAN_STATES.filter(s => s !== 'All')) {
    expect(
      screen.getByRole('button', {name: `Select ${state} as your community`}),
    ).toBeTruthy()
  }
})

it('saves the chosen state as the civic home', () => {
  openStep()
  pick('Ciudad de México')
  pressContinue()
  expect(mockSetCivicHomeState).toHaveBeenCalledWith('Ciudad de México')
  expect(dispatch).toHaveBeenCalledWith({type: 'next'})
})

it('clears the civic home for Nacional', () => {
  mockCivicHomeState = 'Jalisco'
  openStep()
  pick('Nacional')
  pressContinue()
  expect(mockSetCivicHomeState).toHaveBeenCalledWith(undefined)
})

it('preselects a saved civic home and keeps it when skipped', () => {
  mockCivicHomeState = 'Jalisco'
  openStep()
  expect(
    screen.getByRole('button', {name: 'Select Jalisco as your community'}),
  ).toBeSelected()
  fireEvent.press(screen.getByRole('button', {name: 'Skip this step'}))
  expect(mockSetCivicHomeState).not.toHaveBeenCalled()
})
