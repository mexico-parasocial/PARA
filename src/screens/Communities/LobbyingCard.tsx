import {Pressable, StyleSheet, View} from 'react-native'

import {type CabildeoView} from '#/lib/cabildeo-client'
import {
  getCabildeoBadge,
  getCabildeoCommunities,
  getCabildeoLeadingOption,
  getCabildeoTotalParticipants,
  getViewerParticipation,
} from '#/lib/cabildeo-display'
import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export const PHASE_META: Record<
  CabildeoView['phase'],
  {label: string; color: string; icon: string}
> = {
  draft: {label: 'Borrador', color: '#6B7280', icon: '📝'},
  open: {label: 'Abierto', color: '#0EA5E9', icon: '📖'},
  deliberating: {label: 'Deliberando', color: '#F59E0B', icon: '🗣️'},
  voting: {label: 'Votación', color: '#22C55E', icon: '🗳️'},
  resolved: {label: 'Resuelto', color: '#8B5CF6', icon: '✅'},
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(Math.round(value))
}

/** The option ahead right now, with its share of the weight cast so far. */
function getLeadingOption(cabildeo: CabildeoView) {
  const leading = getCabildeoLeadingOption(cabildeo)
  if (!leading) return null
  const votes =
    'effectiveVotes' in leading ? leading.effectiveVotes : leading.votes
  const base =
    cabildeo.outcome?.effectiveTotalPower || cabildeo.voteTotals.total
  const label = cabildeo.options[leading.optionIndex]?.label
  if (!label || !votes || !base) return null
  return {label, share: Math.min(1, votes / base)}
}

/**
 * A lobbying (cabildeo) in the list. The card pairs the list design with the
 * figures the debate overview used to show: participation, the option in the
 * lead, the communities involved and the viewer's own part in it.
 */
export function LobbyingCard({
  cabildeo,
  onPress,
  featured = false,
}: {
  cabildeo: CabildeoView
  onPress: () => void
  featured?: boolean
}) {
  const t = useTheme()
  const badge = getCabildeoBadge(cabildeo)
  const phase = PHASE_META[cabildeo.phase] ?? PHASE_META.draft
  const communities = getCabildeoCommunities(cabildeo)
  const leading = getLeadingOption(cabildeo)
  const viewer = getViewerParticipation(cabildeo)
  const isQuadratic = (cabildeo.communities?.length ?? 0) > 0

  const metrics = [
    {label: 'Participantes', value: getCabildeoTotalParticipants(cabildeo)},
    {label: 'Votos', value: cabildeo.voteTotals.total},
    {label: 'Posiciones', value: cabildeo.positionCounts.total},
    {label: 'Cedidos', value: cabildeo.voteTotals.delegated},
  ]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={cabildeo.title}
      accessibilityHint="Abre el cabildeo"
      onPress={onPress}
      style={[
        styles.card,
        featured && styles.featured,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
      ]}>
      <View style={[styles.accent, {backgroundColor: badge.color}]} />
      <View style={styles.body}>
        <View style={styles.badgeRow}>
          <View style={[styles.pill, {backgroundColor: badge.bgColor}]}>
            <Text style={[styles.pillText, {color: badge.color}]}>
              {badge.label}
            </Text>
          </View>
          <View style={[styles.pill, {backgroundColor: phase.color + '20'}]}>
            <Text style={[styles.pillText, {color: phase.color}]}>
              {phase.icon} {phase.label}
            </Text>
          </View>
          {cabildeo.region ? (
            <Text style={[styles.region, t.atoms.text_contrast_medium]}>
              📍 {cabildeo.region}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.title, t.atoms.text]} numberOfLines={2}>
          {cabildeo.title}
        </Text>
        <Text
          style={[styles.description, t.atoms.text_contrast_medium]}
          numberOfLines={featured ? 3 : 2}>
          {cabildeo.description}
        </Text>

        <View style={styles.metricRow}>
          {metrics.map(metric => (
            <View key={metric.label} style={styles.metric}>
              <Text style={[styles.metricValue, t.atoms.text]}>
                {formatCount(metric.value)}
              </Text>
              <Text style={[styles.metricLabel, t.atoms.text_contrast_medium]}>
                {metric.label}
              </Text>
            </View>
          ))}
        </View>

        {leading ? (
          <View style={styles.leading}>
            <View style={styles.leadingHeader}>
              <Text
                style={[styles.leadingLabel, t.atoms.text_contrast_medium]}
                numberOfLines={1}>
                {cabildeo.phase === 'resolved' ? 'Resultado' : 'Opción líder'}
                {' · '}
                <Text style={[styles.leadingName, t.atoms.text]}>
                  {leading.label}
                </Text>
              </Text>
              <Text style={[styles.leadingShare, {color: phase.color}]}>
                {Math.round(leading.share * 100)}%
              </Text>
            </View>
            <View
              style={[styles.track, {backgroundColor: t.palette.contrast_100}]}>
              <View
                style={{
                  width: `${Math.max(leading.share * 100, 6)}%`,
                  height: '100%',
                  backgroundColor: badge.color,
                }}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          {communities.map(name => (
            <View
              key={name}
              style={[
                styles.chip,
                t.atoms.bg_contrast_50,
                t.atoms.border_contrast_low,
              ]}>
              <Text style={[styles.chipText, t.atoms.text]}>{name}</Text>
            </View>
          ))}
          {isQuadratic ? (
            <View
              style={[styles.pill, {backgroundColor: t.palette.yellow + '20'}]}>
              <Text style={[styles.pillText, {color: t.palette.yellow}]}>
                √ Cuadrático
              </Text>
            </View>
          ) : null}
          {cabildeo.geoRestricted && cabildeo.region ? (
            <View
              style={[
                styles.pill,
                {backgroundColor: t.palette.negative_500 + '15'},
              ]}>
              <Text style={[styles.pillText, {color: t.palette.negative_500}]}>
                🔒 Solo {cabildeo.region}
              </Text>
            </View>
          ) : null}
          {viewer ? (
            <View
              style={[styles.pill, {backgroundColor: viewer.accentBackground}]}>
              <Text style={[styles.pillText, {color: viewer.accentColor}]}>
                {viewer.optionLabel
                  ? `${viewer.label}: ${viewer.optionLabel}`
                  : viewer.label}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featured: {width: 320},
  accent: {width: 4},
  body: {flex: 1, padding: 14, gap: 10},
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3},
  pillText: {fontSize: 11, fontWeight: '800'},
  region: {fontSize: 12, fontWeight: '600'},
  title: {fontSize: 17, fontWeight: '800', lineHeight: 22},
  description: {fontSize: 13, lineHeight: 18},
  metricRow: {flexDirection: 'row', gap: 4},
  metric: {flex: 1, alignItems: 'center'},
  metricValue: {fontSize: 16, fontWeight: '900'},
  metricLabel: {fontSize: 10, fontWeight: '700', marginTop: 2},
  leading: {gap: 6},
  leadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  leadingLabel: {flex: 1, fontSize: 12, fontWeight: '600'},
  leadingName: {fontSize: 12, fontWeight: '800'},
  leadingShare: {fontSize: 14, fontWeight: '900'},
  track: {height: 8, borderRadius: 4, overflow: 'hidden'},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {fontSize: 11, fontWeight: '700'},
})
