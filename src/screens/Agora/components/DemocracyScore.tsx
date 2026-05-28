import {StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function DemocracyScore({
  participation,
  delegationHealth,
  deliberationQuality,
  crossCommunityReach,
}: {
  participation: number // 0-100
  delegationHealth: number // 0-100
  deliberationQuality: number // 0-100
  crossCommunityReach: number // 0-100
}) {
  const {_} = useLingui()
  const score = Math.round(
    (participation +
      delegationHealth +
      deliberationQuality +
      crossCommunityReach) /
      4,
  )

  const color = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, {borderColor: color + '30'}]}>
        <View
          style={[
            styles.ringFill,
            {
              borderColor: color,
              borderTopColor: color,
              borderRightColor: score > 25 ? color : 'transparent',
              borderBottomColor: score > 50 ? color : 'transparent',
              borderLeftColor: score > 75 ? color : 'transparent',
            },
          ]}
        />
        <Text style={[styles.scoreValue, {color}]}>{score}</Text>
      </View>
      <View style={styles.breakdown}>
        <Metric
          label={_(msg`Participation`)}
          value={participation}
          color={color}
        />
        <Metric label={_(msg`Delegation`)} value={delegationHealth} />
        <Metric label={_(msg`Deliberation`)} value={deliberationQuality} />
        <Metric label={_(msg`Reach`)} value={crossCommunityReach} />
      </View>
    </View>
  )
}

function Metric({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: string
}) {
  const t = useTheme()
  return (
    <View style={styles.metricRow}>
      <Text style={[styles.metricLabel, t.atoms.text_contrast_medium]}>
        {label}
      </Text>
      <View style={[styles.metricBar, t.atoms.bg_contrast_100]}>
        <View
          style={[
            styles.metricFill,
            {
              width: `${value}%`,
              backgroundColor: color ?? t.palette.primary_500,
            },
          ]}
        />
      </View>
      <Text style={[styles.metricValue, t.atoms.text]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {flexDirection: 'row', alignItems: 'center', gap: 12},
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 3,
    transform: [{rotate: '-45deg'}],
  },
  scoreValue: {fontSize: 14, fontWeight: '800'},
  breakdown: {flex: 1, gap: 5},
  metricRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  metricLabel: {fontSize: 9, fontWeight: '600', width: 65, textAlign: 'right'},
  metricBar: {flex: 1, height: 3, borderRadius: 1.5, overflow: 'hidden'},
  metricFill: {height: '100%', borderRadius: 1.5},
  metricValue: {fontSize: 9, fontWeight: '700', width: 20, textAlign: 'right'},
})
