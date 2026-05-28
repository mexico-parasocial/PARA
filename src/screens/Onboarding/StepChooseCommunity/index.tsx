import {useCallback, useState} from 'react'
import {Pressable, ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {logEvent} from '#/lib/statsig/statsig'
import {
  OnboardingControls,
  OnboardingDescriptionText,
  OnboardingPosition,
  OnboardingTitleText,
} from '#/screens/Onboarding/Layout'
import {useOnboardingInternalState} from '#/screens/Onboarding/state'
import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'

// Mexican states + Nacional
const COMMUNITIES = [
  {key: 'nacional', label: 'Nacional', emoji: '🇲🇽'},
  {key: 'aguascalientes', label: 'Aguascalientes', emoji: '🏛️'},
  {key: 'baja-california', label: 'Baja California', emoji: '🌊'},
  {key: 'baja-california-sur', label: 'Baja California Sur', emoji: '🏖️'},
  {key: 'campeche', label: 'Campeche', emoji: '🏯'},
  {key: 'chiapas', label: 'Chiapas', emoji: '🌿'},
  {key: 'chihuahua', label: 'Chihuahua', emoji: '🏜️'},
  {key: 'cdmx', label: 'Ciudad de México', emoji: '🏙️'},
  {key: 'coahuila', label: 'Coahuila', emoji: '⛏️'},
  {key: 'colima', label: 'Colima', emoji: '🌋'},
  {key: 'durango', label: 'Durango', emoji: '🏔️'},
  {key: 'estado-de-mexico', label: 'Estado de México', emoji: '🏛️'},
  {key: 'guanajuato', label: 'Guanajuato', emoji: '🎭'},
  {key: 'guerrero', label: 'Guerrero', emoji: '⚔️'},
  {key: 'hidalgo', label: 'Hidalgo', emoji: '🏗️'},
  {key: 'jalisco', label: 'Jalisco', emoji: '🌮'},
  {key: 'michoacan', label: 'Michoacán', emoji: '🦋'},
  {key: 'morelos', label: 'Morelos', emoji: '🌺'},
  {key: 'nayarit', label: 'Nayarit', emoji: '🎨'},
  {key: 'nuevo-leon', label: 'Nuevo León', emoji: '🏭'},
  {key: 'oaxaca', label: 'Oaxaca', emoji: '🎪'},
  {key: 'puebla', label: 'Puebla', emoji: '⛪'},
  {key: 'queretaro', label: 'Querétaro', emoji: '🏛️'},
  {key: 'quintana-roo', label: 'Quintana Roo', emoji: '🏝️'},
  {key: 'san-luis-potosi', label: 'San Luis Potosí', emoji: '⛰️'},
  {key: 'sinaloa', label: 'Sinaloa', emoji: '🌾'},
  {key: 'sonora', label: 'Sonora', emoji: '☀️'},
  {key: 'tabasco', label: 'Tabasco', emoji: '🛢️'},
  {key: 'tamaulipas', label: 'Tamaulipas', emoji: '🌊'},
  {key: 'tlaxcala', label: 'Tlaxcala', emoji: '🌽'},
  {key: 'veracruz', label: 'Veracruz', emoji: '⚓'},
  {key: 'yucatan', label: 'Yucatán', emoji: '🏛️'},
  {key: 'zacatecas', label: 'Zacatecas', emoji: '⛏️'},
]

export function StepChooseCommunity() {
  const {_} = useLingui()
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const {state, dispatch} = useOnboardingInternalState()

  const [selected, setSelected] = useState<string | null>(
    state.communityStepResults.selectedCommunity,
  )

  const onContinue = useCallback(() => {
    dispatch({
      type: 'setCommunityStepResults',
      selectedCommunity: selected,
    })
    dispatch({type: 'next'})
    logEvent('onboarding:community:nextPressed', {
      community: selected ?? 'none',
    })
  }, [dispatch, selected])

  return (
    <View style={[a.align_start, a.gap_sm]} testID="onboardingCommunity">
      <OnboardingPosition />
      <OnboardingTitleText>
        <Trans>Where is your civic home?</Trans>
      </OnboardingTitleText>
      <OnboardingDescriptionText>
        <Trans>
          Pick the state or region where you live or care about most. You can
          always join more communities later.
        </Trans>
      </OnboardingDescriptionText>

      <ScrollView
        style={[a.w_full, a.mt_md, {maxHeight: gtMobile ? 500 : 380}]}
        contentContainerStyle={[a.gap_sm]}
        showsVerticalScrollIndicator={false}>
        <View style={[a.flex_row, a.flex_wrap, a.gap_sm, a.justify_center]}>
          {COMMUNITIES.map(community => {
            const isSelected = selected === community.key
            return (
              <Pressable
                key={community.key}
                accessibilityRole="button"
                accessibilityLabel={_(
                  msg`Select ${community.label} as your community`,
                )}
                accessibilityHint={_(msg`Tap to select this community`)}
                accessibilityState={{selected: isSelected}}
                onPress={() =>
                  setSelected(prev =>
                    prev === community.key ? null : community.key,
                  )
                }
                style={[
                  a.rounded_md,
                  a.px_lg,
                  a.py_sm,
                  a.border,
                  a.align_center,
                  {minWidth: gtMobile ? 140 : '46%'},
                  isSelected
                    ? {
                        backgroundColor: t.palette.primary_500,
                        borderColor: t.palette.primary_500,
                      }
                    : {
                        backgroundColor: t.atoms.bg_contrast_25.backgroundColor,
                        borderColor: t.atoms.border_contrast_low.borderColor,
                      },
                ]}>
                <Text style={[{fontSize: 24}]}>{community.emoji}</Text>
                <Text
                  style={[
                    a.font_semi_bold,
                    a.text_sm,
                    a.text_center,
                    a.mt_xs,
                    isSelected ? {color: 'white'} : t.atoms.text,
                  ]}>
                  {community.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <OnboardingControls.Portal>
        <View style={[a.gap_md, gtMobile && a.flex_row]}>
          <Button
            color="secondary"
            size="large"
            label={_(msg`Skip this step`)}
            onPress={() => {
              dispatch({type: 'next'})
              logEvent('onboarding:community:skipPressed', {})
            }}>
            <ButtonText>
              <Trans>Skip</Trans>
            </ButtonText>
          </Button>
          <Button
            testID="onboardingContinue"
            color="primary"
            size="large"
            label={_(msg`Continue to next step`)}
            onPress={onContinue}>
            <ButtonText>
              <Trans>Continue</Trans>
            </ButtonText>
          </Button>
        </View>
      </OnboardingControls.Portal>
    </View>
  )
}
