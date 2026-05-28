import {StyleSheet, View} from 'react-native'

import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

interface Props {
  balance: {
    claims: number
    evidence: number
    questions: number
    rebuttals: number
  }
}

const CATEGORIES = [
  {key: 'claims' as const, label: 'Claims', color: '#34C759'},
  {key: 'evidence' as const, label: 'Evidence', color: '#007AFF'},
  {key: 'questions' as const, label: 'Questions', color: '#FF9500'},
  {key: 'rebuttals' as const, label: 'Rebuttals', color: '#FF3B30'},
]

export function ArgumentStructureChart({balance}: Props) {
  const t = useTheme()
  const total = balance.claims + balance.evidence + balance.questions + balance.rebuttals

  return (
    <View style={styles.container}>
      {/* Horizontal stacked bar */}
      <View style={[styles.barTrack, t.atoms.bg_contrast_25]}>
        {CATEGORIES.map(cat => {
          const value = balance[cat.key]
          const pct = total > 0 ? (value / total) * 100 : 0
          return (
            <View
              key={cat.key}
              style={[
                styles.barSegment,
                {width: `${pct}%`, backgroundColor: cat.color},
              ]}>
              {pct > 12 && (
                <Text style={styles.segmentText}>{Math.round(pct)}%</Text>
              )}
            </View>
          )
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {CATEGORIES.map(cat => (
          <View key={cat.key} style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: cat.color}]} />
            <Text style={[styles.legendLabel, t.atoms.text_contrast_medium]}>
              {cat.label}
            </Text>
            <Text style={[styles.legendValue, t.atoms.text]}>
              {balance[cat.key]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  barTrack: {
    height: 28,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  barSegment: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '900',
  },
})
