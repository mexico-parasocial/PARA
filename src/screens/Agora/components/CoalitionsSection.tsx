import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export interface Coalition {
  id: string
  communities: {name: string; color: string}[]
  sharedProposalCount: number
  trend: 'rising' | 'stable' | 'falling'
  topIssue: string
}

export function CoalitionsSection({coalitions}: {coalitions: Coalition[]}) {
  const t = useTheme()
  if (coalitions.length === 0) return null

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, t.atoms.text]}>
        <Trans>Emergent Coalitions</Trans>
      </Text>
      {coalitions.map(c => (
        <TouchableOpacity
          key={c.id}
          accessibilityRole="button"
          style={[
            styles.coalitionCard,
            t.atoms.bg_contrast_25,
            {borderColor: t.atoms.border_contrast_low.borderColor},
          ]}>
          <View style={styles.communityRow}>
            {c.communities.map((comm, i) => (
              <View
                key={comm.name}
                style={[a.flex_row, a.align_center, a.gap_xs]}>
                {i > 0 && (
                  <Text style={[styles.plus, t.atoms.text_contrast_medium]}>
                    +
                  </Text>
                )}
                <View
                  style={[
                    styles.commPill,
                    {
                      backgroundColor: comm.color + '18',
                      borderColor: comm.color + '40',
                    },
                  ]}>
                  <View
                    style={[styles.commDot, {backgroundColor: comm.color}]}
                  />
                  <Text style={[styles.commText, {color: comm.color}]}>
                    {comm.name}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, t.atoms.text_contrast_medium]}>
              <Trans>{c.sharedProposalCount} shared proposals</Trans>
            </Text>
            <Text style={[styles.metaText, t.atoms.text_contrast_medium]}>
              <Trans>Top issue:</Trans>{' '}
              <Text style={[styles.issueText, t.atoms.text]}>{c.topIssue}</Text>
            </Text>
            <Text
              style={[
                styles.trendText,
                {
                  color:
                    c.trend === 'rising'
                      ? t.palette.positive_500
                      : c.trend === 'falling'
                        ? t.palette.negative_500
                        : t.atoms.text_contrast_medium.color,
                },
              ]}>
              {c.trend === 'rising' ? '↑' : c.trend === 'falling' ? '↓' : '→'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {paddingHorizontal: 16, marginBottom: 16, gap: 10},
  title: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coalitionCard: {borderRadius: 12, borderWidth: 1, padding: 12, gap: 8},
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  plus: {fontSize: 12, fontWeight: '700', marginHorizontal: 2},
  commPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  commDot: {width: 6, height: 6, borderRadius: 3},
  commText: {fontSize: 11, fontWeight: '700'},
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {fontSize: 11, fontWeight: '500'},
  issueText: {fontWeight: '700'},
  trendText: {fontSize: 14, fontWeight: '700'},
})
