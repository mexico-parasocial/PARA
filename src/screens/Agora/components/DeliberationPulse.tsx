import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export interface PulseStatement {
  uri: string
  proposalTitle: string
  body: string
  bridgingScore: number
  groupAgreements: {groupId: string; agreePct: number; color: string}[]
}

export function DeliberationPulse({
  statements,
}: {
  statements: PulseStatement[]
}) {
  const t = useTheme()
  if (statements.length === 0) return null

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.title, t.atoms.text]}>
          <Trans>Deliberation Pulse</Trans>
        </Text>
        <Text style={[styles.subtitle, t.atoms.text_contrast_medium]}>
          <Trans>Statements bridging the widest gaps</Trans>
        </Text>
      </View>
      {statements.map(s => (
        <TouchableOpacity
          key={s.uri}
          accessibilityRole="button"
          style={[
            styles.statementCard,
            t.atoms.bg_contrast_25,
            {borderColor: t.atoms.border_contrast_low.borderColor},
          ]}>
          <View style={styles.proposalLabel}>
            <Text style={[styles.proposalText, t.atoms.text_contrast_medium]}>
              {s.proposalTitle}
            </Text>
            <View
              style={[
                styles.badge,
                {backgroundColor: t.palette.positive_500 + '15'},
              ]}>
              <Text style={[styles.badgeText, {color: t.palette.positive_500}]}>
                {s.bridgingScore}%
              </Text>
            </View>
          </View>
          <Text style={[styles.body, t.atoms.text]} numberOfLines={2}>
            {s.body}
          </Text>
          <View style={styles.groups}>
            {s.groupAgreements.map(g => (
              <View key={g.groupId} style={styles.groupRow}>
                <View style={[styles.groupDot, {backgroundColor: g.color}]} />
                <View style={[styles.groupBar, t.atoms.bg_contrast_100]}>
                  <View
                    style={[
                      styles.groupFill,
                      {width: `${g.agreePct}%`, backgroundColor: g.color},
                    ]}
                  />
                </View>
                <Text style={[styles.groupPct, t.atoms.text]}>
                  {g.agreePct}%
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {paddingHorizontal: 16, marginBottom: 16, gap: 10},
  header: {gap: 2},
  title: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {fontSize: 12, fontWeight: '500'},
  statementCard: {borderRadius: 12, borderWidth: 1, padding: 12, gap: 8},
  proposalLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proposalText: {fontSize: 11, fontWeight: '600', flex: 1},
  badge: {borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2},
  badgeText: {fontSize: 10, fontWeight: '800'},
  body: {fontSize: 13, lineHeight: 18, fontWeight: '500'},
  groups: {gap: 5},
  groupRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  groupDot: {width: 6, height: 6, borderRadius: 3},
  groupBar: {flex: 1, height: 3, borderRadius: 1.5, overflow: 'hidden'},
  groupFill: {height: '100%', borderRadius: 1.5},
  groupPct: {fontSize: 10, fontWeight: '700', width: 28, textAlign: 'right'},
})
