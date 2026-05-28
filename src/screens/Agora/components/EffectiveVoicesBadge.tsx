import {useState} from 'react'
import {Pressable, StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function EffectiveVoicesBadge({
  rawVotes,
  effectiveVoices,
}: {
  rawVotes: number
  effectiveVoices: number
}) {
  const t = useTheme()
  const {_} = useLingui()
  const [showTip, setShowTip] = useState(false)
  const ratio =
    rawVotes > 0 ? Math.round((effectiveVoices / rawVotes) * 100) : 0

  return (
    <Pressable accessibilityRole="button" onPress={() => setShowTip(!showTip)} style={styles.wrap}>
      <View style={[a.flex_row, a.align_center, a.gap_xs]}>
        <View
          style={[
            styles.badge,
            {backgroundColor: t.palette.primary_500 + '15'},
          ]}>
          <Text style={[styles.badgeValue, {color: t.palette.primary_500}]}>
            {Math.round(effectiveVoices)}
          </Text>
        </View>
        <View>
          <Text style={[styles.badgeLabel, {color: t.palette.primary_500}]}>
            <Trans>Effective voices</Trans>
          </Text>
          <Text style={[styles.badgeSub, t.atoms.text_contrast_medium]}>
            {rawVotes} {_(msg`raw votes`)} · {ratio}%
          </Text>
        </View>
      </View>
      {showTip && (
        <View style={[styles.tipBox, t.atoms.bg_contrast_25]}>
          <Text style={[styles.tipText, t.atoms.text]}>
            <Trans>
              Correlated voters (same community, similar history) are
              discounted. Effective voices = how many independent opinions are
              really here.
            </Trans>
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {gap: 4},
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  badgeValue: {fontSize: 16, fontWeight: '800'},
  badgeLabel: {fontSize: 11, fontWeight: '700'},
  badgeSub: {fontSize: 10, fontWeight: '500'},
  tipBox: {borderRadius: 8, padding: 10},
  tipText: {fontSize: 12, lineHeight: 17},
})
