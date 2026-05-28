import {useMemo, useReducer} from 'react'
import {View} from 'react-native'

import {
  Layout,
  OnboardingControls,
  OnboardingHeaderSlot,
} from '#/screens/Onboarding/Layout'
import {
  Context,
  createInitialOnboardingState,
  reducer,
} from '#/screens/Onboarding/state'
import {StepChooseCommunity} from '#/screens/Onboarding/StepChooseCommunity'
import {StepCompassPreview} from '#/screens/Onboarding/StepCompassPreview'
import {StepFinished} from '#/screens/Onboarding/StepFinished'
import {StepInterests} from '#/screens/Onboarding/StepInterests'
import {StepProfile} from '#/screens/Onboarding/StepProfile'
import {StepSuggestedAccounts} from '#/screens/Onboarding/StepSuggestedAccounts'
import {atoms as a, useTheme} from '#/alf'
import {Portal} from '#/components/Portal'
import {ScreenTransition} from '#/components/ScreenTransition'

export function Onboarding() {
  const t = useTheme()

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    createInitialOnboardingState,
  )

  return (
    <Portal>
      <View style={[a.absolute, a.inset_0, t.atoms.bg]}>
        <OnboardingControls.Provider>
          <OnboardingHeaderSlot.Provider>
            <Context.Provider
              value={useMemo(() => ({state, dispatch}), [state, dispatch])}>
              <ScreenTransition
                key={state.activeStep}
                direction={state.stepTransitionDirection}
                style={a.flex_1}>
                <Layout>
                  {state.activeStep === 'profile' && <StepProfile />}
                  {state.activeStep === 'interests' && <StepInterests />}
                  {state.activeStep === 'suggested-accounts' && (
                    <StepSuggestedAccounts />
                  )}
                  {state.activeStep === 'choose-community' && (
                    <StepChooseCommunity />
                  )}
                  {state.activeStep === 'compass-preview' && (
                    <StepCompassPreview />
                  )}
                  {state.activeStep === 'finished' && <StepFinished />}
                </Layout>
              </ScreenTransition>
            </Context.Provider>
          </OnboardingHeaderSlot.Provider>
        </OnboardingControls.Provider>
      </View>
    </Portal>
  )
}
