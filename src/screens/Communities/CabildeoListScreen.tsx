import {useMemo, useState} from 'react'
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useNavigation, useRoute} from '@react-navigation/native'

import {type CabildeoPhase} from '#/lib/api/para-lexicons'
import {
  countCabildeosByPhase,
  filterCabildeos,
  toCabildeoRouteParams,
} from '#/lib/cabildeo-client'
import {type NavigationProp} from '#/lib/routes/types'
import {useCabildeosQuery} from '#/state/queries/cabildeo'
import {useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import {ListMaybePlaceholder} from '#/components/Lists'
import {Text} from '#/components/Typography'

function getPhaseConfig(
  t: ReturnType<typeof useTheme>,
): Record<CabildeoPhase, {label: string; color: string; icon: string}> {
  return {
    draft: {label: 'Borrador', color: t.palette.contrast_400, icon: '📝'},
    open: {label: 'Abierto', color: t.palette.primary_500, icon: '📖'},
    deliberating: {label: 'Deliberando', color: t.palette.yellow, icon: '🗣️'},
    voting: {label: 'Votación', color: t.palette.positive_500, icon: '🗳️'},
    resolved: {label: 'Resuelto', color: t.palette.primary_500, icon: '✅'},
  }
}

export function CabildeoListScreen() {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<{
    key: string
    name: 'CabildeoList'
    params?: {communityId?: string; communityName?: string}
  }>()
  const contextCommunity = route.params?.communityName
  const [activeFilter, setActiveFilter] = useState<CabildeoPhase | 'all'>('all')
  const {
    data: cabildeos = [],
    isFetched,
    isFetching,
    isLoading,
    isError,
    refetch,
  } = useCabildeosQuery()

  const filtered = useMemo(() => {
    return filterCabildeos(cabildeos, {
      communityName: contextCommunity,
      phase: activeFilter,
    })
  }, [activeFilter, cabildeos, contextCommunity])

  const communityScopedStats = useMemo(
    () => ({
      voting: countCabildeosByPhase(cabildeos, contextCommunity, 'voting'),
      deliberating: countCabildeosByPhase(
        cabildeos,
        contextCommunity,
        'deliberating',
      ),
      resolved: countCabildeosByPhase(cabildeos, contextCommunity, 'resolved'),
    }),
    [cabildeos, contextCommunity],
  )

  const filters: Array<{key: CabildeoPhase | 'all'; label: string}> = [
    {key: 'all', label: 'Todos'},
    {key: 'voting', label: '🗳️ Votación'},
    {key: 'deliberating', label: '🗣️ Deliberando'},
    {key: 'resolved', label: '✅ Resueltos'},
  ]

  return (
    <Layout.Screen testID="cabildeoListScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Lobbying</Trans>
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>
            {contextCommunity
              ? `Deliberación cívica en ${contextCommunity}`
              : 'Deliberación Cívica'}
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={refetch}
            tintColor={t.palette.primary_500}
          />
        }>
        <Layout.Center style={styles.center}>
          {contextCommunity ? (
            <View
              style={[
                styles.contextCard,
                t.atoms.bg_contrast_25,
                {borderColor: t.palette.primary_200},
              ]}>
              <Text
                style={[styles.contextEyebrow, {color: t.palette.primary_500}]}>
                Comunidad activa
              </Text>
              <Text style={[styles.contextTitle, t.atoms.text]}>
                {contextCommunity}
              </Text>
              <Text
                style={[styles.contextSubtitle, t.atoms.text_contrast_medium]}>
                Esta vista solo muestra cabildeos relacionados con esta
                comunidad o partido.
              </Text>
            </View>
          ) : null}

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}>
            {filters.map(f => (
              <TouchableOpacity
                accessibilityRole="button"
                key={f.key}
                onPress={() => setActiveFilter(f.key)}
                style={[
                  styles.filterPill,
                  activeFilter === f.key
                    ? {backgroundColor: t.palette.primary_500}
                    : t.atoms.bg_contrast_25,
                ]}>
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === f.key
                      ? {color: '#FFFFFF'}
                      : t.atoms.text_contrast_medium,
                  ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Stats Bar */}
          <View style={[styles.statsBar, t.atoms.bg_contrast_25]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, t.atoms.text]}>
                {communityScopedStats.voting}
              </Text>
              <Text style={[styles.statLabel, t.atoms.text_contrast_medium]}>
                En votación
              </Text>
            </View>
            <View
              style={[
                styles.statDivider,
                {backgroundColor: t.palette.contrast_100},
              ]}
            />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, t.atoms.text]}>
                {communityScopedStats.deliberating}
              </Text>
              <Text style={[styles.statLabel, t.atoms.text_contrast_medium]}>
                Deliberando
              </Text>
            </View>
            <View
              style={[
                styles.statDivider,
                {backgroundColor: t.palette.contrast_100},
              ]}
            />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, t.atoms.text]}>
                {communityScopedStats.resolved}
              </Text>
              <Text style={[styles.statLabel, t.atoms.text_contrast_medium]}>
                Resueltos
              </Text>
            </View>
          </View>

          {/* Cabildeo Cards */}
          <View style={styles.cardList}>
            {!filtered.length ? (
              <ListMaybePlaceholder
                isLoading={isLoading || !isFetched}
                isError={isError}
                onRetry={refetch}
                emptyType="results"
                emptyMessage="No hay cabildeos disponibles para este filtro todavía."
              />
            ) : (
              filtered.map(cabildeo => {
                const phase = getPhaseConfig(t)[cabildeo.phase]
                const isMultiCommunity =
                  cabildeo.communities && cabildeo.communities.length > 0

                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={cabildeo.uri}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate(
                        'CabildeoDetail',
                        toCabildeoRouteParams(cabildeo),
                      )
                    }
                    style={[
                      styles.card,
                      t.atoms.bg_contrast_25,
                      {borderLeftColor: phase.color, borderLeftWidth: 4},
                    ]}>
                    {/* Phase Badge + Region */}
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.phaseBadge,
                          {backgroundColor: phase.color + '20'},
                        ]}>
                        <Text
                          style={[styles.phaseBadgeText, {color: phase.color}]}>
                          {phase.icon} {phase.label}
                        </Text>
                      </View>
                      {cabildeo.region && (
                        <Text
                          style={[
                            styles.regionTag,
                            t.atoms.text_contrast_medium,
                          ]}>
                          📍 {cabildeo.region}
                        </Text>
                      )}
                    </View>

                    {/* Title */}
                    <Text
                      style={[styles.cardTitle, t.atoms.text]}
                      numberOfLines={2}>
                      {cabildeo.title}
                    </Text>

                    {/* Description */}
                    <Text
                      style={[styles.cardDesc, t.atoms.text_contrast_medium]}
                      numberOfLines={2}>
                      {cabildeo.description}
                    </Text>

                    {/* Impact Metrics */}
                    <View style={styles.impactRow}>
                      <View style={styles.impactItem}>
                        <Text style={[styles.impactValue, t.atoms.text]}>
                          {cabildeo.voteTotals.total}
                        </Text>
                        <Text
                          style={[
                            styles.impactLabel,
                            t.atoms.text_contrast_medium,
                          ]}>
                          {cabildeo.voteTotals.total === 1 ? 'voto' : 'votos'}
                        </Text>
                      </View>
                      <View style={styles.impactDivider} />
                      <View style={styles.impactItem}>
                        <Text style={[styles.impactValue, t.atoms.text]}>
                          {cabildeo.positionCounts.total}
                        </Text>
                        <Text
                          style={[
                            styles.impactLabel,
                            t.atoms.text_contrast_medium,
                          ]}>
                          {cabildeo.positionCounts.total === 1
                            ? 'posición'
                            : 'posiciones'}
                        </Text>
                      </View>
                      <View style={styles.impactDivider} />
                      <View style={styles.impactItem}>
                        <Text style={[styles.impactValue, t.atoms.text]}>
                          {cabildeo.options.length}
                        </Text>
                        <Text
                          style={[
                            styles.impactLabel,
                            t.atoms.text_contrast_medium,
                          ]}>
                          {cabildeo.options.length === 1
                            ? 'opción'
                            : 'opciones'}
                        </Text>
                      </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.cardFooter}>
                      <Text
                        style={[
                          styles.communityTag,
                          {color: t.palette.primary_500},
                        ]}>
                        {cabildeo.community}
                      </Text>
                      {isMultiCommunity && (
                        <View
                          style={[
                            styles.quadraticBadge,
                            {backgroundColor: t.palette.yellow + '20'},
                          ]}>
                          <Text
                            style={[
                              styles.quadraticText,
                              {color: t.palette.yellow},
                            ]}>
                            √ Cuadrático
                          </Text>
                        </View>
                      )}
                      {cabildeo.geoRestricted && (
                        <View
                          style={[
                            styles.quadraticBadge,
                            {backgroundColor: t.palette.negative_500 + '15'},
                          ]}>
                          <Text
                            style={[
                              styles.quadraticText,
                              {color: t.palette.negative_500},
                            ]}>
                            🔒 Solo {cabildeo.region}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.optionCount,
                          t.atoms.text_contrast_medium,
                        ]}>
                        {cabildeo.options.length} opciones
                      </Text>
                    </View>

                    {/* Resolved outcome preview */}
                    {cabildeo.outcome && (
                      <View
                        style={[
                          styles.outcomePreview,
                          {borderTopColor: t.palette.contrast_100},
                        ]}>
                        <Text
                          style={[
                            styles.outcomeLabel,
                            t.atoms.text_contrast_medium,
                          ]}>
                          Resultado:
                        </Text>
                        <Text
                          style={[styles.outcomeWinner, {color: phase.color}]}>
                          {
                            cabildeo.options[cabildeo.outcome.winningOption]
                              ?.label
                          }
                        </Text>
                        <Text
                          style={[
                            styles.outcomeParticipants,
                            t.atoms.text_contrast_medium,
                          ]}>
                          · {cabildeo.outcome.totalParticipants} participantes
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })
            )}
          </View>
        </Layout.Center>
      </ScrollView>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingBottom: 80},
  center: {paddingHorizontal: 16, paddingTop: 8},
  contextCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  contextEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  contextTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  contextSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: {fontSize: 13, fontWeight: '700'},
  statsBar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  statItem: {flex: 1, alignItems: 'center'},
  statValue: {fontSize: 24, fontWeight: '900'},
  statLabel: {fontSize: 11, fontWeight: '600', marginTop: 2},
  statDivider: {width: 1, height: 32},
  cardList: {gap: 14},
  card: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  phaseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  phaseBadgeText: {fontSize: 12, fontWeight: '800'},
  regionTag: {fontSize: 12, fontWeight: '600'},
  cardTitle: {fontSize: 16, fontWeight: '800', lineHeight: 22, marginBottom: 6},
  cardDesc: {fontSize: 13, lineHeight: 18, marginBottom: 10},
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  impactItem: {flex: 1, alignItems: 'center'},
  impactValue: {fontSize: 16, fontWeight: '900'},
  impactLabel: {fontSize: 10, fontWeight: '700', marginTop: 2},
  impactDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  communityTag: {fontSize: 12, fontWeight: '800'},
  quadraticBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  quadraticText: {fontSize: 10, fontWeight: '800'},
  optionCount: {fontSize: 12, fontWeight: '600'},
  outcomePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    flexWrap: 'wrap',
  },
  outcomeLabel: {fontSize: 12, fontWeight: '600'},
  outcomeWinner: {fontSize: 12, fontWeight: '900'},
  outcomeParticipants: {fontSize: 11},
})
