import {StyleSheet, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export interface GroupAgreement {
  groupId: string
  agreePct: number
  color: string
}

export function BridgingInsight({
  statement,
  groupAgreements,
}: {
  statement: string
  groupAgreements: GroupAgreement[]
}) {
  const t = useTheme()
  const bridgingScore = Math.min(...groupAgreements.map(g => g.agreePct))

  return (
    <View style={[styles.wrap, t.atoms.bg_contrast_25]}>
      <View style={styles.header}>
        <Text style={[styles.bridgingLabel, {color: t.palette.positive_500}]}>
          <Trans>Bridging Insight</Trans>
        </Text>
        <Text style={[styles.bridgingScore, {color: t.palette.positive_500}]}>
          {bridgingScore}%
        </Text>
      </View>
      <Text style={[styles.statement, t.atoms.text]} numberOfLines={2}>
        {statement}
      </Text>
      <View style={styles.groups}>
        {groupAgreements.map(g => (
          <View key={g.groupId} style={styles.groupRow}>
            <View style={[styles.groupDot, {backgroundColor: g.color}]} />
            <Text style={[styles.groupName, t.atoms.text_contrast_medium]}>
              {g.groupId}
            </Text>
            <View style={[styles.groupBar, t.atoms.bg_contrast_100]}>
              <View
                style={[
                  styles.groupFill,
                  {
                    width: `${g.agreePct}%`,
                    backgroundColor: g.color,
                  },
                ]}
              />
            </View>
            <Text style={[styles.groupPct, t.atoms.text]}>{g.agreePct}%</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {borderRadius: 10, padding: 12, gap: 8},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bridgingLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bridgingScore: {fontSize: 12, fontWeight: '800'},
  statement: {fontSize: 13, lineHeight: 18, fontWeight: '500'},
  groups: {gap: 6},
  groupRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  groupDot: {width: 6, height: 6, borderRadius: 3},
  groupName: {fontSize: 10, fontWeight: '600', width: 80},
  groupBar: {flex: 1, height: 3, borderRadius: 1.5, overflow: 'hidden'},
  groupFill: {height: '100%', borderRadius: 1.5},
  groupPct: {fontSize: 10, fontWeight: '700', width: 28, textAlign: 'right'},
})
