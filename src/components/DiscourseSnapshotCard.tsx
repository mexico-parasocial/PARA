import {StyleSheet, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {type CompassPositionId} from '#/lib/compass/compassColors'
import {useTheme} from '#/alf'
import {IdeologicalDiversityMap} from './IdeologicalDiversityMap'
import {Text} from './Typography'

interface Props {
  status: string
  keyTakeaways: string[]
  consensusLevel: number
  totalVoices: number
  compassDistribution: {
    position: CompassPositionId
    density: number
  }[]
}

export function DiscourseSnapshotCard({
  status,
  keyTakeaways,
  consensusLevel,
  totalVoices,
  compassDistribution,
}: Props) {
  const t = useTheme()

  return (
    <View style={[styles.card, t.atoms.bg_contrast_25]}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, t.atoms.text]}>
            <Trans>Snapshot de Discurso</Trans>
          </Text>
          <View style={[styles.statusBadge, {backgroundColor: t.palette.primary_500 + '20'}]}>
            <Text style={[styles.statusText, {color: t.palette.primary_500}]}>
              {status}
            </Text>
          </View>
        </View>
        <View style={styles.stats}>
          <Text style={[styles.statValue, t.atoms.text]}>{totalVoices}</Text>
          <Text style={[styles.statLabel, t.atoms.text_contrast_medium]}>Voces</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Left: Takeaways */}
        <View style={styles.takeaways}>
          <Text style={[styles.sectionTitle, t.atoms.text_contrast_medium]}>
            <Trans>PUNTOS CLAVE</Trans>
          </Text>
          {keyTakeaways.map((item, i) => (
            <View key={i} style={styles.takeawayItem}>
              <View style={[styles.bullet, {backgroundColor: t.palette.primary_500}]} />
              <Text style={[styles.takeawayText, t.atoms.text]}>{item}</Text>
            </View>
          ))}

          <View style={styles.consensusMeter}>
            <Text style={[styles.consensusLabel, t.atoms.text_contrast_medium]}>
              Nivel de Consenso
            </Text>
            <View style={[styles.meterBg, t.atoms.bg_contrast_50]}>
              <View 
                style={[
                  styles.meterFill, 
                  {
                    width: `${consensusLevel}%`,
                    backgroundColor: consensusLevel > 70 ? '#34C759' : '#FF9500'
                  }
                ]} 
              />
            </View>
            <Text style={[styles.consensusValue, t.atoms.text]}>{consensusLevel}%</Text>
          </View>
        </View>

        {/* Right: Diversity Map */}
        <View style={styles.mapContainer}>
          <Text style={[styles.sectionTitle, t.atoms.text_contrast_medium, {textAlign: 'center'}]}>
            <Trans>DIVERSIDAD</Trans>
          </Text>
          <IdeologicalDiversityMap distribution={compassDistribution} size={140} />
          <Text style={styles.mapHint}>Origen del consenso</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  stats: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    flexDirection: 'row',
    gap: 16,
  },
  takeaways: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  takeawayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  takeawayText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  consensusMeter: {
    marginTop: 12,
  },
  consensusLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  meterBg: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  consensusValue: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'right',
  },
  mapContainer: {
    alignItems: 'center',
  },
  mapHint: {
    fontSize: 9,
    fontStyle: 'italic',
    marginTop: 6,
    opacity: 0.6,
  },
})
