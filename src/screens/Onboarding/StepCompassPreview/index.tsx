import {useState} from 'react'
import {Pressable, View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {
  COMPASS_COLORS,
  COMPASS_GRID_ROWS,
  COMPASS_LABEL_COLORS,
  COMPASS_POSITION_NAMES,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {
  COMPASS_ID_TO_NINTH_NAME,
  POLITICAL_AFFILIATION_OPTIONS,
  type PoliticalAffiliation,
  upsertPoliticalAffiliation,
} from '#/lib/political-affiliations'
import {logEvent} from '#/lib/statsig/statsig'
import {usePoliticalAffiliation} from '#/state/shell/political-affiliation'
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

/**
 * Onboarding asks only for a self-placed ninth and party membership. The
 * questionnaire that refines a position lives in RAQ; asking a few unweighted
 * questions here produced a position the user never chose.
 */
export function StepCompassPreview() {
  const {t: l} = useLingui()
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const {state, dispatch} = useOnboardingInternalState()
  const {affiliations, setAffiliations} = usePoliticalAffiliation()

  const [ninthId, setNinthId] = useState<CompassPositionId | null>(
    state.compassStepResults.ninthId,
  )
  const [isPartyMember, setIsPartyMember] = useState<boolean | null>(
    state.compassStepResults.isPartyMember,
  )
  const [partyId, setPartyId] = useState<string | null>(
    state.compassStepResults.partyId,
  )

  const needsParty = isPartyMember === true && !partyId
  const hasAnswer = ninthId !== null || isPartyMember !== null
  const canContinue = hasAnswer && !needsParty

  const onContinue = () => {
    // Party and ninth are independent: each answer only touches its own type,
    // and an unanswered question leaves any saved value alone.
    let next: PoliticalAffiliation[] = affiliations
    if (ninthId) {
      const ninth = POLITICAL_AFFILIATION_OPTIONS.ninth.find(
        n => n.name === COMPASS_ID_TO_NINTH_NAME[ninthId],
      )
      if (ninth) next = upsertPoliticalAffiliation(next, ninth)
    }
    if (isPartyMember === false) {
      next = next.filter(item => item.type !== 'party')
    } else if (isPartyMember === true && partyId) {
      const party = POLITICAL_AFFILIATION_OPTIONS.party.find(
        p => p.id === partyId,
      )
      if (party) next = upsertPoliticalAffiliation(next, party)
    }
    if (next !== affiliations) {
      void setAffiliations(next)
    }

    dispatch({
      type: 'setCompassStepResults',
      ninthId,
      isPartyMember,
      partyId: isPartyMember ? partyId : null,
    })
    dispatch({type: 'next'})
    logEvent('onboarding:compass:nextPressed', {
      selectedNinth: ninthId !== null,
      isPartyMember,
    })
  }

  return (
    <View style={[a.align_start, a.gap_md]} testID="onboardingCompass">
      <OnboardingPosition />
      <OnboardingTitleText>
        <Trans>Where do you stand?</Trans>
      </OnboardingTitleText>
      <OnboardingDescriptionText>
        <Trans>
          Choose the part of the political compass closest to your views. You
          can refine it later from your Base.
        </Trans>
      </OnboardingDescriptionText>

      <View style={[a.w_full, a.align_center, a.mt_sm]}>
        <View
          style={[
            a.w_full,
            a.rounded_md,
            a.overflow_hidden,
            a.border,
            t.atoms.border_contrast_low,
            {maxWidth: gtMobile ? 360 : 320, aspectRatio: 1},
          ]}>
          {COMPASS_GRID_ROWS.map(row => (
            <View key={row.join()} style={[a.flex_row, a.flex_1]}>
              {row.map(positionId => {
                const selected = ninthId === positionId
                const dimmed = ninthId !== null && !selected
                return (
                  <Pressable
                    key={positionId}
                    testID={`onboardingNinth-${positionId}`}
                    accessibilityRole="radio"
                    accessibilityLabel={COMPASS_POSITION_NAMES[positionId]}
                    accessibilityHint={l`Selects this position on the political compass`}
                    accessibilityState={{checked: selected}}
                    onPress={() => setNinthId(positionId)}
                    style={[
                      a.flex_1,
                      a.align_center,
                      a.justify_center,
                      a.p_xs,
                      {
                        backgroundColor: COMPASS_COLORS[positionId],
                        opacity: dimmed ? 0.45 : 1,
                        borderWidth: selected ? 3 : 0.5,
                        borderColor: selected
                          ? COMPASS_LABEL_COLORS[positionId]
                          : 'rgba(0,0,0,0.08)',
                      },
                    ]}>
                    <Text
                      style={[
                        a.text_xs,
                        a.text_center,
                        selected ? a.font_bold : a.font_semi_bold,
                        {color: COMPASS_LABEL_COLORS[positionId]},
                      ]}>
                      {COMPASS_POSITION_NAMES[positionId]}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ))}
        </View>
      </View>

      <View
        style={[
          a.w_full,
          a.rounded_md,
          a.border,
          a.p_lg,
          a.mt_sm,
          t.atoms.bg_contrast_25,
          t.atoms.border_contrast_low,
        ]}>
        <Text style={[a.text_md, a.font_semi_bold, a.leading_snug, a.mb_md]}>
          <Trans>Are you a member of a political party?</Trans>
        </Text>
        <View style={[a.flex_row, a.gap_sm]}>
          <ChoicePill
            label={l({message: 'Yes', context: 'Answer to a yes/no question'})}
            hint={l`Shows the list of parties to choose yours`}
            selected={isPartyMember === true}
            onPress={() => setIsPartyMember(true)}
          />
          <ChoicePill
            label={l({message: 'No', context: 'Answer to a yes/no question'})}
            hint={l`Records that you are not a member of a party`}
            selected={isPartyMember === false}
            onPress={() => {
              setIsPartyMember(false)
              setPartyId(null)
            }}
          />
        </View>

        {isPartyMember === true && (
          <View style={[a.mt_lg, a.gap_sm]}>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>Which party?</Trans>
            </Text>
            <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
              {POLITICAL_AFFILIATION_OPTIONS.party.map(party => {
                const selected = partyId === party.id
                return (
                  <Pressable
                    key={party.id}
                    testID={`onboardingParty-${party.id}`}
                    accessibilityRole="radio"
                    accessibilityLabel={party.name}
                    accessibilityHint={l`Selects this party as yours`}
                    accessibilityState={{checked: selected}}
                    onPress={() => setPartyId(party.id)}
                    style={[
                      a.flex_row,
                      a.align_center,
                      a.gap_xs,
                      a.px_md,
                      a.py_sm,
                      a.rounded_full,
                      a.border,
                      {
                        borderColor: selected
                          ? party.color
                          : t.atoms.border_contrast_low.borderColor,
                        backgroundColor: selected
                          ? party.color + '25'
                          : 'transparent',
                      },
                    ]}>
                    <View
                      style={[
                        a.rounded_full,
                        {width: 10, height: 10, backgroundColor: party.color},
                      ]}
                    />
                    <Text
                      style={[
                        a.text_sm,
                        selected ? a.font_bold : a.font_semi_bold,
                      ]}>
                      {party.name}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )}
      </View>

      <OnboardingControls.Portal>
        <View style={[a.gap_md, gtMobile && a.flex_row]}>
          <Button
            color="secondary"
            size="large"
            label={l`Skip for now`}
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
            label={l`Continue to next step`}
            disabled={!canContinue}
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

function ChoicePill({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string
  hint: string
  selected: boolean
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{checked: selected}}
      onPress={onPress}
      style={[
        a.flex_1,
        a.py_sm,
        a.rounded_full,
        a.align_center,
        a.border,
        selected
          ? {
              backgroundColor: t.palette.primary_500,
              borderColor: t.palette.primary_500,
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
          selected ? {color: t.palette.white} : t.atoms.text,
        ]}>
        {label}
      </Text>
    </Pressable>
  )
}
