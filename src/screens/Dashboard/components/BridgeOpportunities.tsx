import {StyleSheet, View} from 'react-native'

import {type BridgeOpportunity} from '#/lib/api/para-lexicons'
import {
  COMPASS_COLORS,
  COMPASS_LABEL_COLORS,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

interface Props {
  opportunities: BridgeOpportunity[]
}

export function BridgeOpportunities({opportunities}: Props) {
  const t = useTheme()

  if (opportunities.length === 0) {
    return (
      <Text style={[styles.empty, t.atoms.text_contrast_medium]}>
        No bridge opportunities detected yet. As more positions engage across
        topics, suggestions will appear here.
      </Text>
    )
  }

  return (
    <View style={styles.container}>
      {opportunities.map((opp, i) => (
        <View
          key={i}
          style={[styles.card, t.atoms.bg_contrast_25, {borderLeftColor: t.palette.primary_500}]}>
          {/* Compass position badges */}
          <View style={styles.badgeRow}>
            {opp.positionsInvolved.map(pos => {
              const position = pos as CompassPositionId
              return (
                <View
                  key={pos}
                  style={[
                    styles.badge,
                    {backgroundColor: COMPASS_COLORS[position]},
                  ]}>
                  <Text
                    style={[
                      styles.badgeText,
                      {color: COMPASS_LABEL_COLORS[position]},
                    ]}>
                    {pos.replace('-', ' ')}
                  </Text>
                </View>
              )
            })}
          </View>

          {/* Description */}
          <Text style={[styles.description, t.atoms.text]}>
            {opp.description}
          </Text>

          {/* Topic overlap pills */}
          <View style={styles.pillRow}>
            {opp.topicOverlap.map(topic => (
              <View
                key={topic}
                style={[
                  styles.pill,
                  {backgroundColor: t.palette.primary_500 + '12'},
                ]}>
                <Text
                  style={[
                    styles.pillText,
                    {color: t.palette.primary_500},
                  ]}>
                  {topic}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  empty: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
})
