import {useCallback, useMemo, useState} from 'react'
import {Pressable, View} from 'react-native'
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

interface CompassQuestion {
  id: string
  text: string
}

function useCompassQuestions(): CompassQuestion[] {
  const {_} = useLingui()
  return useMemo(
    () => [
      {
        id: 'q1',
        text: _(
          msg`The government should provide universal basic services like healthcare and education to all citizens.`,
        ),
      },
      {
        id: 'q2',
        text: _(
          msg`Individual freedoms should take priority over collective security measures.`,
        ),
      },
      {
        id: 'q3',
        text: _(
          msg`Economic policy should prioritize reducing inequality over maximizing growth.`,
        ),
      },
    ],
    [_],
  )
}

export function StepCompassPreview() {
  const {_} = useLingui()
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const {dispatch} = useOnboardingInternalState()
  const questions = useCompassQuestions()

  const [answers, setAnswers] = useState<Record<string, 'agree' | 'disagree'>>(
    {},
  )

  const setAnswer = (questionId: string, value: 'agree' | 'disagree') => {
    setAnswers(prev => ({...prev, [questionId]: value}))
  }

  // Simple compass position derived from answers
  const compassPosition = useMemo(() => {
    let x = 0
    let y = 0
    if (answers.q1 === 'agree') {
      x -= 1
    } else if (answers.q1 === 'disagree') {
      x += 1
    }
    if (answers.q2 === 'agree') {
      y -= 1
    } else if (answers.q2 === 'disagree') {
      y += 1
    }
    if (answers.q3 === 'agree') {
      x -= 0.5
      y += 0.5
    } else if (answers.q3 === 'disagree') {
      x += 0.5
      y -= 0.5
    }
    // Normalize to 0..1 range where 0.5 is center
    return {
      x: Math.max(0, Math.min(1, 0.5 + x * 0.2)),
      y: Math.max(0, Math.min(1, 0.5 + y * 0.2)),
    }
  }, [answers])

  const answeredCount = Object.keys(answers).length
  const hasAnswers = answeredCount > 0

  const onContinue = useCallback(() => {
    dispatch({
      type: 'setCompassStepResults',
      answers,
    })
    dispatch({type: 'next'})
    logEvent('onboarding:compass:nextPressed', {
      answeredCount,
    })
  }, [dispatch, answers, answeredCount])

  return (
    <View style={[a.align_start, a.gap_md]} testID="onboardingCompass">
      <OnboardingPosition />
      <OnboardingTitleText>
        <Trans>Where do you stand?</Trans>
      </OnboardingTitleText>
      <OnboardingDescriptionText>
        <Trans>
          Your political compass helps you understand your perspective. Answer a
          few questions now, or explore it later from your Base.
        </Trans>
      </OnboardingDescriptionText>

      {/* Mini compass preview */}
      <View style={[a.w_full, a.align_center, a.mt_sm]}>
        <View
          style={[
            a.rounded_md,
            a.overflow_hidden,
            a.border,
            {
              width: gtMobile ? 160 : 130,
              height: gtMobile ? 160 : 130,
              borderColor: t.atoms.border_contrast_low.borderColor,
              backgroundColor: t.atoms.bg_contrast_25.backgroundColor,
            },
          ]}>
          {/* Quadrant grid lines */}
          <View
            style={[
              a.absolute,
              {
                left: '50%',
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: t.atoms.border_contrast_low.borderColor,
              },
            ]}
          />
          <View
            style={[
              a.absolute,
              {
                top: '50%',
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: t.atoms.border_contrast_low.borderColor,
              },
            ]}
          />
          {/* Quadrant labels */}
          <Text
            style={[
              a.absolute,
              a.text_2xs,
              t.atoms.text_contrast_low,
              {top: 4, left: 6, opacity: 0.6},
            ]}>
            AL
          </Text>
          <Text
            style={[
              a.absolute,
              a.text_2xs,
              t.atoms.text_contrast_low,
              {top: 4, right: 6, opacity: 0.6},
            ]}>
            AR
          </Text>
          <Text
            style={[
              a.absolute,
              a.text_2xs,
              t.atoms.text_contrast_low,
              {bottom: 4, left: 6, opacity: 0.6},
            ]}>
            LL
          </Text>
          <Text
            style={[
              a.absolute,
              a.text_2xs,
              t.atoms.text_contrast_low,
              {bottom: 4, right: 6, opacity: 0.6},
            ]}>
            LR
          </Text>
          {/* Position dot */}
          {hasAnswers && (
            <View
              style={[
                a.absolute,
                a.rounded_full,
                {
                  width: 14,
                  height: 14,
                  backgroundColor: t.palette.primary_500,
                  left: `${compassPosition.x * 100}%`,
                  top: `${compassPosition.y * 100}%`,
                  marginLeft: -7,
                  marginTop: -7,
                  shadowColor: t.palette.primary_500,
                  shadowOffset: {width: 0, height: 0},
                  shadowOpacity: 0.5,
                  shadowRadius: 6,
                },
              ]}
            />
          )}
        </View>
      </View>

      {/* Questions */}
      <View style={[a.w_full, a.gap_md, a.mt_sm]}>
        {questions.map(question => (
          <View
            key={question.id}
            style={[
              a.w_full,
              a.rounded_md,
              a.border,
              a.p_lg,
              {
                backgroundColor: t.atoms.bg_contrast_25.backgroundColor,
                borderColor: answers[question.id]
                  ? t.palette.primary_200
                  : t.atoms.border_contrast_low.borderColor,
              },
            ]}>
            <Text style={[a.text_sm, a.leading_snug, a.mb_md]}>
              {question.text}
            </Text>
            <View style={[a.flex_row, a.gap_sm]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={_(msg`Agree`)}
                accessibilityHint={_(msg`Mark this question as agree`)}
                onPress={() => setAnswer(question.id, 'agree')}
                style={[
                  a.flex_1,
                  a.py_sm,
                  a.rounded_full,
                  a.align_center,
                  a.border,
                  answers[question.id] === 'agree'
                    ? {
                        backgroundColor: '#059669',
                        borderColor: '#059669',
                      }
                    : {
                        backgroundColor: 'transparent',
                        borderColor: t.atoms.border_contrast_low.borderColor,
                      },
                ]}>
                <Text
                  style={[
                    a.font_semi_bold,
                    a.text_sm,
                    answers[question.id] === 'agree'
                      ? {color: 'white'}
                      : t.atoms.text,
                  ]}>
                  <Trans>Agree</Trans>
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={_(msg`Disagree`)}
                accessibilityHint={_(msg`Mark this question as disagree`)}
                onPress={() => setAnswer(question.id, 'disagree')}
                style={[
                  a.flex_1,
                  a.py_sm,
                  a.rounded_full,
                  a.align_center,
                  a.border,
                  answers[question.id] === 'disagree'
                    ? {
                        backgroundColor: '#DC2626',
                        borderColor: '#DC2626',
                      }
                    : {
                        backgroundColor: 'transparent',
                        borderColor: t.atoms.border_contrast_low.borderColor,
                      },
                ]}>
                <Text
                  style={[
                    a.font_semi_bold,
                    a.text_sm,
                    answers[question.id] === 'disagree'
                      ? {color: 'white'}
                      : t.atoms.text,
                  ]}>
                  <Trans>Disagree</Trans>
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <OnboardingControls.Portal>
        <View style={[a.gap_md, gtMobile && a.flex_row]}>
          <Button
            color="secondary"
            size="large"
            label={_(msg`Skip for now`)}
            onPress={() => {
              dispatch({type: 'next'})
              logEvent('onboarding:compass:skipPressed', {})
            }}>
            <ButtonText>
              <Trans>Skip for now</Trans>
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
