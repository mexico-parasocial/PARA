import {StyleSheet, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function DelegationFlowMini({
  directVotes,
  delegatedVotes,
  concentrationRisk,
}: {
  directVotes: number
  delegatedVotes: number
  concentrationRisk: 'low' | 'medium' | 'high'
}) {
  const t = useTheme()
  const total = directVotes + delegatedVotes
  const directPct = total > 0 ? (directVotes / total) * 100 : 0

  const riskColor =
    concentrationRisk === 'high'
      ? t.palette.negative_500
      : concentrationRisk === 'medium'
        ? '#F59E0B'
        : t.palette.positive_500

  return (
    <View style={styles.wrap}>
      <View style={[a.flex_row, a.align_center, a.gap_sm]}>
        {/* Mini flow bar */}
        <View style={[styles.flowBar, t.atoms.bg_contrast_100]}>
          <View
            style={[
              styles.flowDirect,
              {
                width: `${directPct}%`,
                backgroundColor: t.palette.positive_500,
              },
            ]}
          />
          <View
            style={[
              styles.flowDelegated,
              {
                width: `${100 - directPct}%`,
                backgroundColor: t.palette.primary_500,
              },
            ]}
          />
        </View>
        <View style={styles.flowLabels}>
          <Text style={[styles.flowLabel, {color: t.palette.positive_500}]}>
            <Trans>{directVotes} direct</Trans>
          </Text>
          <Text style={[styles.flowLabel, {color: t.palette.primary_500}]}>
            <Trans>{delegatedVotes} delegated</Trans>
          </Text>
        </View>
        <View style={[styles.riskDot, {backgroundColor: riskColor}]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {gap: 4},
  flowBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  flowDirect: {height: '100%'},
  flowDelegated: {height: '100%'},
  flowLabels: {flexDirection: 'row', gap: 6},
  flowLabel: {fontSize: 9, fontWeight: '700'},
  riskDot: {width: 8, height: 8, borderRadius: 4},
})
