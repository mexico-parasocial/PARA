import {StyleSheet, View} from 'react-native'

import {useTheme} from '#/alf'
import {IdeologicalDiversityMap} from '#/components/IdeologicalDiversityMap'
import {Text} from '#/components/Typography'

interface Props {
  positionDensity: Record<string, number>
  ideologicalSpread: number
  crossCompassEngagement: number
}

export function PositioningHeatmap({
  positionDensity,
  ideologicalSpread,
  crossCompassEngagement,
}: Props) {
  const t = useTheme()

  const distribution = Object.entries(positionDensity).map(
    ([position, density]) => ({
      position: position as
        | 'auth-left'
        | 'auth-center'
        | 'auth-right'
        | 'center-left'
        | 'center'
        | 'center-right'
        | 'lib-left'
        | 'lib-center'
        | 'lib-right',
      density,
    }),
  )

  return (
    <View style={styles.container}>
      <View style={styles.mapRow}>
        <IdeologicalDiversityMap distribution={distribution} size={160} />
        <View style={styles.statsColumn}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, t.atoms.text]}>
              {ideologicalSpread}%
            </Text>
            <Text style={[styles.statLabel, t.atoms.text_contrast_medium]}>
              Spread
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, t.atoms.text]}>
              {crossCompassEngagement}%
            </Text>
            <Text style={[styles.statLabel, t.atoms.text_contrast_medium]}>
              Cross-Ideology
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  mapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statsColumn: {
    flex: 1,
    gap: 12,
  },
  statBox: {
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
})
