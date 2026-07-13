import {StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {EyeSlash_Stroke2_Corner0_Rounded as EyeSlash} from '#/components/icons/EyeSlash'
import {Person_Stroke2_Corner0_Rounded as Person} from '#/components/icons/Person'
import {RaisingHand4Finger_Stroke2_Corner0_Rounded as RaisingHand} from '#/components/icons/RaisingHand'
import {VerifiedCheck} from '#/components/icons/VerifiedCheck'
import {Text} from '#/components/Typography'
import {type IdentityContext} from '../types'

export function IdentityHeroCard({
  context,
  votingPower,
}: {
  context: IdentityContext
  votingPower: {hasVote: boolean; detail: string}
}) {
  const t = useTheme()
  const {_} = useLingui()

  const ContextIcon =
    context.id === 'public'
      ? Person
      : context.id === 'isolated'
        ? EyeSlash
        : RaisingHand

  return (
    <View
      style={[
        styles.card,
        t.atoms.bg_contrast_25,
        {borderColor: t.atoms.border_contrast_low.borderColor},
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_md]}>
        <UserAvatar
          type="user"
          size={64}
          avatar={undefined}
          moderation={undefined}
        />
        <View style={[a.flex_1, a.gap_xs]}>
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <ContextIcon
              size="sm"
              fill={t.palette.primary_500}
              style={{color: t.palette.primary_500}}
            />
            <Text style={[styles.eyebrow, {color: t.palette.primary_500}]}>
              {context.label}
            </Text>
          </View>
          <Text style={[styles.name, t.atoms.text]}>
            {context.displayName || context.handle}
          </Text>
          <Text style={[styles.handle, t.atoms.text_contrast_medium]}>
            {context.handle}
          </Text>
        </View>
      </View>

      <View style={[styles.pillRow, a.flex_row, a.gap_sm]}>
        <View
          style={[
            styles.pill,
            {backgroundColor: t.palette.primary_500 + '18'},
          ]}>
          <Text style={[styles.pillText, {color: t.palette.primary_500}]}>
            {context.isActive ? _(msg`Active`) : _(msg`Inactive`)}
          </Text>
        </View>
        {votingPower.hasVote && (
          <View
            style={[
              styles.pill,
              {backgroundColor: t.palette.positive_500 + '18'},
            ]}>
            <VerifiedCheck
              size={12}
              fill={t.palette.positive_500}
              style={{color: t.palette.positive_500, marginRight: 4}}
            />
            <Text style={[styles.pillText, {color: t.palette.positive_500}]}>
              <Trans>1 vote</Trans>
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.body, t.atoms.text_contrast_medium]}>
        {context.description}
      </Text>

      <Text style={[styles.voteDetail, t.atoms.text_contrast_low]}>
        {votingPower.detail}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
  },
  handle: {
    fontSize: 14,
  },
  pillRow: {
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  voteDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
})
