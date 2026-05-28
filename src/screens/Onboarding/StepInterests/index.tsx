import {useCallback, useState} from 'react'
import {Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type CivicCategoryKey, useCivicCategories} from '#/lib/interests'
import {logEvent} from '#/lib/statsig/statsig'
import {logger} from '#/logger'
import {
  OnboardingControls,
  OnboardingDescriptionText,
  OnboardingPosition,
  OnboardingTitleText,
} from '#/screens/Onboarding/Layout'
import {useOnboardingInternalState} from '#/screens/Onboarding/state'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Toggle from '#/components/forms/Toggle'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronDown,
  ChevronTop_Stroke2_Corner0_Rounded as ChevronUp,
} from '#/components/icons/Chevron'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

export function StepInterests() {
  const {_} = useLingui()
  const t = useTheme()
  const civicCategories = useCivicCategories()

  const {state, dispatch} = useOnboardingInternalState()
  const [saving, setSaving] = useState(false)
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    state.interestsStepResults.selectedInterests.map(i => i),
  )
  const [expandedCategory, setExpandedCategory] =
    useState<CivicCategoryKey | null>(null)

  const saveInterests = useCallback(async () => {
    setSaving(true)

    try {
      setSaving(false)
      dispatch({
        type: 'setInterestsStepResults',
        selectedInterests,
      })
      dispatch({type: 'next'})
      logEvent('onboarding:interests:nextPressed', {
        selectedInterests,
        selectedInterestsLength: selectedInterests.length,
      })
    } catch (e: unknown) {
      logger.info(`onboarding: error saving interests`)
      logger.error(String(e))
    }
  }, [selectedInterests, setSaving, dispatch])

  const toggleCategory = (key: CivicCategoryKey) => {
    setExpandedCategory(prev => (prev === key ? null : key))
  }

  const categoryKeys = Object.keys(civicCategories) as CivicCategoryKey[]

  return (
    <View style={[a.align_start, a.gap_sm]} testID="onboardingInterests">
      <OnboardingPosition />
      <OnboardingTitleText>
        <Trans>What civic matters interest you?</Trans>
      </OnboardingTitleText>
      <OnboardingDescriptionText>
        <Trans>
          Choose policies and issues that affect your life. We'll shape your
          communities and conversations around what you care about.
        </Trans>
      </OnboardingDescriptionText>

      <View style={[a.w_full, a.pt_lg, a.gap_sm]}>
        <Toggle.Group
          values={selectedInterests}
          onChange={setSelectedInterests}
          label={_(msg`Select civic issues that matter to you`)}>
          {categoryKeys.map(categoryKey => {
            const category = civicCategories[categoryKey]
            const isExpanded = expandedCategory === categoryKey
            const selectedCount = category.interests.filter(i =>
              selectedInterests.includes(i),
            ).length

            return (
              <View key={categoryKey} style={[a.w_full]}>
                {/* Category header */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={_(
                    msg`${category.label} — ${selectedCount} selected`,
                  )}
                  accessibilityHint={_(msg`Expand or collapse this category`)}
                  onPress={() => toggleCategory(categoryKey)}
                  style={[
                    a.flex_row,
                    a.align_center,
                    a.justify_between,
                    a.px_lg,
                    a.py_md,
                    a.rounded_md,
                    a.border,
                    isExpanded
                      ? {
                          backgroundColor: t.palette.primary_50,
                          borderColor: t.palette.primary_200,
                          borderBottomLeftRadius: 0,
                          borderBottomRightRadius: 0,
                        }
                      : {
                          backgroundColor:
                            t.atoms.bg_contrast_25.backgroundColor,
                          borderColor: t.atoms.border_contrast_low.borderColor,
                        },
                  ]}>
                  <View style={[a.flex_row, a.align_center, a.gap_md]}>
                    <Text style={[{fontSize: 22}]}>{category.emoji}</Text>
                    <Text style={[a.font_semi_bold, a.text_md]}>
                      {category.label}
                    </Text>
                  </View>
                  <View style={[a.flex_row, a.align_center, a.gap_sm]}>
                    {selectedCount > 0 && (
                      <View
                        style={[
                          a.rounded_full,
                          a.align_center,
                          a.justify_center,
                          {
                            width: 22,
                            height: 22,
                            backgroundColor: t.palette.primary_500,
                          },
                        ]}>
                        <Text
                          style={[a.text_xs, a.font_bold, {color: 'white'}]}>
                          {selectedCount}
                        </Text>
                      </View>
                    )}
                    {isExpanded ? (
                      <ChevronUp
                        size="sm"
                        fill={t.atoms.text_contrast_medium.color}
                      />
                    ) : (
                      <ChevronDown
                        size="sm"
                        fill={t.atoms.text_contrast_medium.color}
                      />
                    )}
                  </View>
                </Pressable>

                {/* Expanded issue pills */}
                {isExpanded && (
                  <View
                    style={[
                      a.px_lg,
                      a.py_md,
                      a.border_b,
                      a.border_l,
                      a.border_r,
                      a.rounded_md,
                      a.flex_row,
                      a.flex_wrap,
                      a.gap_sm,
                      {
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                        borderColor: t.atoms.border_contrast_low.borderColor,
                        backgroundColor: t.atoms.bg_contrast_25.backgroundColor,
                      },
                    ]}>
                    {category.interests.map(interest => (
                      <Toggle.Item
                        key={interest}
                        name={interest}
                        label={category.interestLabels[interest] || interest}>
                        <CivicInterestPill
                          label={category.interestLabels[interest] || interest}
                        />
                      </Toggle.Item>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
        </Toggle.Group>
      </View>

      <OnboardingControls.Portal>
        <Button
          disabled={saving}
          testID="onboardingContinue"
          variant="solid"
          color="primary"
          size="large"
          label={_(msg`Continue to next step`)}
          onPress={saveInterests}>
          <ButtonText>
            <Trans>Continue</Trans>
          </ButtonText>
          {saving && <ButtonIcon icon={Loader} />}
        </Button>
      </OnboardingControls.Portal>
    </View>
  )
}

function CivicInterestPill({label}: {label: string}) {
  const t = useTheme()
  const ctx = Toggle.useItemContext()

  return (
    <View
      style={[
        a.rounded_full,
        a.px_lg,
        {paddingVertical: 10},
        ctx.selected
          ? {backgroundColor: t.palette.contrast_900}
          : {backgroundColor: t.palette.contrast_100},
        ctx.hovered && !ctx.selected
          ? {backgroundColor: t.palette.contrast_200}
          : {},
      ]}>
      <Text
        style={[
          a.font_semi_bold,
          a.text_sm,
          ctx.selected
            ? {color: t.palette.contrast_100}
            : {color: t.palette.contrast_900},
        ]}>
        {label}
      </Text>
    </View>
  )
}
