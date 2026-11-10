import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native'

import {
  inferPoliticalAffiliation,
  type PoliticalAffiliation,
} from '#/lib/political-affiliations'
import {
  PoliticalAffiliationProvider,
  usePoliticalAffiliation,
} from '#/state/shell/political-affiliation'
import {Context, createInitialOnboardingState} from '#/screens/Onboarding/state'
import {ThemeProvider} from '#/alf'
import {StepCompassPreview} from '.'

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
    Button: ({label, onPress, disabled, children}: any) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint=""
        accessibilityState={{disabled: !!disabled}}
        disabled={disabled}
        onPress={onPress}>
        {children}
      </Pressable>
    ),
    ButtonText: Text,
  }
})

const STORAGE_KEY = 'para_political_affiliation'
const affiliation = (name: string) => inferPoliticalAffiliation(name)!
const dispatch = jest.fn()

function Ready() {
  const {isLoading} = usePoliticalAffiliation()
  return isLoading ? null : <StepCompassPreview />
}

async function openStep(initial: PoliticalAffiliation[] = []) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme="light">
        <PoliticalAffiliationProvider>
          <Context.Provider
            value={{state: createInitialOnboardingState(), dispatch}}>
            <Ready />
          </Context.Provider>
        </PoliticalAffiliationProvider>
      </ThemeProvider>
    </I18nProvider>,
  )
  await screen.findByTestId('onboardingCompass')
}

async function savedAffiliations() {
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith({type: 'next'}))
  return JSON.parse(
    (await AsyncStorage.getItem(STORAGE_KEY)) ?? '[]',
  ) as PoliticalAffiliation[]
}

beforeEach(async () => {
  jest.clearAllMocks()
  await AsyncStorage.clear()
  i18n.loadAndActivate({locale: 'en', messages: {}})
})

it('asks no questionnaire and saves the chosen ninth and party', async () => {
  await openStep()
  expect(screen.queryByText('Agree')).toBeNull()

  const continueButton = screen.getByRole('button', {
    name: 'Continue to next step',
  })
  expect(continueButton).toBeDisabled()

  fireEvent.press(screen.getByTestId('onboardingNinth-lib-right'))
  fireEvent.press(screen.getByRole('radio', {name: 'Yes'}))
  // A member must name the party before continuing.
  expect(continueButton).toBeDisabled()
  fireEvent.press(screen.getByTestId('onboardingParty-party-pan'))
  fireEvent.press(continueButton)

  expect(await savedAffiliations()).toEqual([
    affiliation('PAN'),
    affiliation('Lib Right'),
  ])
  expect(dispatch).toHaveBeenCalledWith({
    type: 'setCompassStepResults',
    ninthId: 'lib-right',
    isPartyMember: true,
    partyId: 'party-pan',
  })
})

it('answering No clears a saved party but keeps the saved ninth', async () => {
  await openStep([affiliation('Morena'), affiliation('Auth Left')])
  fireEvent.press(screen.getByRole('radio', {name: 'No'}))
  expect(screen.queryByTestId('onboardingParty-party-pan')).toBeNull()
  fireEvent.press(screen.getByRole('button', {name: 'Continue to next step'}))

  await waitFor(async () =>
    expect(await savedAffiliations()).toEqual([affiliation('Auth Left')]),
  )
})
