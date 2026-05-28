import {useMemo, useState} from 'react'
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {useQuery} from '@tanstack/react-query'

import {DiscourseAPI} from '#/lib/api/discourse'
import {getCabildeoUri} from '#/lib/cabildeo-client'
import {
  COMPASS_COLORS,
  COMPASS_LABEL_COLORS,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {
  DISCOURSE_FLUX_TAGS,
  MOCK_CABILDEOS,
  MOCK_DISCOURSE_TOPOLOGY,
} from '#/lib/constants/mockData'
import {type NavigationProp} from '#/lib/routes/types'
import {useAgent} from '#/state/session'
import {useBaseFilter} from '#/state/shell/base-filter'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {ActiveFiltersStackButton} from '#/components/BaseFilterControls'
import {Atom_Stroke2_Corner0_Rounded as AtomIcon} from '#/components/icons/Atom'
import {ChainLink_Stroke2_Corner0_Rounded as ChainLinkIcon} from '#/components/icons/ChainLink'
import {Sparkle_Stroke2_Corner0_Rounded as SparkleIcon} from '#/components/icons/Sparkle'
import {Trending2_Stroke2_Corner2_Rounded as TrendingIcon} from '#/components/icons/Trending'
import * as Layout from '#/components/Layout'
import {IS_WEB} from '#/env'
import {ArgumentStructureChart} from './components/ArgumentStructureChart'
import {BridgeOpportunities} from './components/BridgeOpportunities'
import {ContestedAxesChart} from './components/ContestedAxesChart'
import {PositioningHeatmap} from './components/PositioningHeatmap'

// ─── Helper Components ───────────────────────────────────────────────────────

const MetricCard = ({
  label,
  value,
  subLabel,
  description,
  icon: Icon,
}: {
  label: string
  value: string
  subLabel?: string
  description?: string
  icon?: React.ComponentType<{size?: string; style?: unknown}>
}) => {
  const t = useTheme()
  return (
    <View style={[styles.metricCard, t.atoms.bg_contrast_25]}>
      <View style={styles.metricHeader}>
        <Text style={[styles.metricLabel, t.atoms.text_contrast_medium]}>
          {label}
        </Text>
        {Icon && <Icon size="sm" style={t.atoms.text_contrast_medium} />}
      </View>
      <Text style={[styles.metricValue, t.atoms.text]}>{value}</Text>
      {subLabel && (
        <Text style={[styles.metricSub, t.atoms.text_contrast_medium]}>
          {subLabel}
        </Text>
      )}
      {description && (
        <Text style={[styles.metricDesc, t.atoms.text_contrast_medium]}>
          {description}
        </Text>
      )}
    </View>
  )
}

const SectionHeader = ({
  title,
  icon: Icon,
}: {
  title: string
  icon?: React.ComponentType<{size?: string; style?: unknown}>
}) => {
  const t = useTheme()
  return (
    <View style={styles.sectionHeaderRow}>
      {Icon && <Icon size="sm" style={{color: t.palette.primary_500}} />}
      <Text style={[styles.sectionHeader, t.atoms.text]}>{title}</Text>
    </View>
  )
}

const ActiveCabildeosSection = () => {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()

  const activeCabildeos = useMemo(() => {
    return MOCK_CABILDEOS.filter(
      cab => cab.phase === 'deliberating' || cab.phase === 'voting',
    ).slice(0, 3)
  }, [])

  if (activeCabildeos.length === 0) return null

  return (
    <View style={[styles.card, t.atoms.bg_contrast_25]}>
      <SectionHeader
        title="Propuestas en Discusión"
        icon={AtomIcon}
      />
      <Text style={[styles.cardDesc, t.atoms.text_contrast_medium]}>
        Temas cívicos que están generando más actividad en este momento.
      </Text>
      <View style={{gap: 12, marginTop: 12}}>
        {activeCabildeos.map((cab, index) => {
          const originalIndex = MOCK_CABILDEOS.indexOf(cab)
          const cabildeoUri = getCabildeoUri(cab, originalIndex)
          const isDeliberating = cab.phase === 'deliberating'

          return (
            <TouchableOpacity
              accessibilityRole="button"
              key={index}
              onPress={() =>
                navigation.navigate('CabildeoDetail', {cabildeoUri})
              }
              style={[styles.cabCard, {backgroundColor: t.palette.contrast_50}]}>
              <Text style={[styles.cabPhase, {color: t.palette.primary_500}]}>
                {isDeliberating ? '🗣️ Deliberación' : '🗳️ Votación'}
              </Text>
              <Text style={[styles.cabTitle, t.atoms.text]} numberOfLines={2}>
                {cab.title}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function DiscourseAnalysisScreen() {
  useLingui()
  const t = useTheme()
  const agent = useAgent()
  const {activeFilters} = useBaseFilter()
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d')

  const discourseApi = useMemo(() => new DiscourseAPI(agent), [agent])
  const community = activeFilters[0]

  const {data: snapshot} = useQuery({
    queryKey: ['discourse-snapshot', community, timeframe],
    queryFn: () => discourseApi.getSnapshot({community, timeframe}),
  })

  const {data: topics} = useQuery({
    queryKey: ['discourse-topics', community, timeframe],
    queryFn: () => discourseApi.getTopics({community, timeframe}),
  })

  const {data: topology} = useQuery({
    queryKey: ['discourse-topology', community, timeframe],
    queryFn: () => discourseApi.getTopology({community, timeframe}),
  })

  const topo = topology ?? MOCK_DISCOURSE_TOPOLOGY
  const latestSnapshot = snapshot?.[0]

  // Compute overall status from topology
  const overallStatus = useMemo(() => {
    const {ideologicalSpread, crossCompassEngagement, proposalVelocity} = topo
    const activeProposals =
      proposalVelocity.deliberating + proposalVelocity.voting

    if (crossCompassEngagement > 50 && ideologicalSpread > 50) {
      return {
        label: 'Deliberación Activa',
        desc: 'Múltiples posiciones ideológicas están debatiendo entre sí. Buen momento para proponer puentes.',
        color: t.palette.positive_500,
      }
    }
    if (ideologicalSpread > 70 && crossCompassEngagement < 30) {
      return {
        label: 'Fragmentado',
        desc: 'La comunidad es ideológicamente diversa pero los grupos no se hablan entre sí.',
        color: '#FF9500',
      }
    }
    if (ideologicalSpread < 30) {
      return {
        label: 'Monocultural',
        desc: 'Poca diversidad ideológica en el discurso actual. Riesgo de eco-cámara.',
        color: '#FF3B30',
      }
    }
    if (activeProposals >= 5) {
      return {
        label: 'Alta Velocidad',
        desc: 'Muchas propuestas en movimiento. El debate está vivo y productivo.',
        color: t.palette.primary_500,
      }
    }
    return {
      label: 'Estable',
      desc: 'Discurso activo con participación moderada y diversidad saludable.',
      color: t.palette.primary_500,
    }
  }, [topo, t])

  // Convert positionDensity to array for topic tagging
  const topPositions = useMemo(() => {
    return Object.entries(topo.positionDensity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pos]) => pos as CompassPositionId)
  }, [topo.positionDensity])

  return (
    <Layout.Screen testID="discourseAnalysisScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Análisis de Discurso</Trans>
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>
            Topología del Debate Público
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          <ActiveFiltersStackButton />
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        <Layout.Center style={styles.centerContainer}>
          {/* Timeframe Selector */}
          <View style={styles.timeframeRow}>
            {(['24h', '7d', '30d'] as const).map(tf => (
              <TouchableOpacity
                accessibilityRole="button"
                key={tf}
                style={[
                  styles.tfPill,
                  timeframe === tf
                    ? {backgroundColor: t.palette.primary_500}
                    : t.atoms.bg_contrast_25,
                ]}
                onPress={() => setTimeframe(tf)}>
                <Text
                  style={[
                    styles.tfText,
                    timeframe === tf
                      ? {color: '#fff'}
                      : t.atoms.text_contrast_medium,
                  ]}>
                  {tf.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Estado del Discurso Hero */}
          <View
            style={[
              styles.heroCard,
              t.atoms.bg_contrast_25,
              {borderLeftColor: overallStatus.color},
            ]}>
            <View style={styles.heroHeader}>
              <TrendingIcon
                size="lg"
                style={{color: overallStatus.color}}
              />
              <View style={styles.heroBadge}>
                <Text style={[styles.heroStatus, {color: overallStatus.color}]}>
                  {overallStatus.label}
                </Text>
              </View>
            </View>
            <Text style={[styles.heroDesc, t.atoms.text_contrast_medium]}>
              {overallStatus.desc}
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, t.atoms.text]}>
                  {latestSnapshot?.uniqueAuthors ?? 124}
                </Text>
                <Text
                  style={[styles.heroStatLabel, t.atoms.text_contrast_medium]}>
                  Voces
                </Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, t.atoms.text]}>
                  {topo.proposalVelocity.deliberating +
                    topo.proposalVelocity.voting}
                </Text>
                <Text
                  style={[styles.heroStatLabel, t.atoms.text_contrast_medium]}>
                  Activas
                </Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatValue, t.atoms.text]}>
                  {topo.crossCompassEngagement}%
                </Text>
                <Text
                  style={[styles.heroStatLabel, t.atoms.text_contrast_medium]}>
                  Cross-Ideología
                </Text>
              </View>
            </View>
          </View>

          {/* Mapa de Posicionamiento */}
          <View style={[styles.card, t.atoms.bg_contrast_25]}>
            <SectionHeader
              title="Mapa de Posicionamiento"
              icon={TrendingIcon}
            />
            <Text style={[styles.cardDesc, t.atoms.text_contrast_medium]}>
              Densidad de participación por posición en la brújula política. El
              centro de gravedad ideológico marca dónde se concentra el
              discurso.
            </Text>
            <PositioningHeatmap
              positionDensity={topo.positionDensity}
              ideologicalSpread={topo.ideologicalSpread}
              crossCompassEngagement={topo.crossCompassEngagement}
            />
          </View>

          {/* Métricas Estructurales */}
          <SectionHeader title="Métricas Estructurales" />
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Conectividad"
              value={`${topo.crossCompassEngagement}%`}
              subLabel={
                topo.crossCompassEngagement > 40
                  ? 'Interacción sana'
                  : 'Aislamiento detectado'
              }
              description="Porcentaje de interacciones que cruzan cuadrantes ideológicos."
              icon={ChainLinkIcon}
            />
            <MetricCard
              label="Propuestas Activas"
              value={String(
                topo.proposalVelocity.deliberating +
                  topo.proposalVelocity.voting,
              )}
              subLabel={`${topo.proposalVelocity.proposed} nuevas · ${topo.proposalVelocity.resolved} resueltas`}
              description="Velocidad de propuestas moviéndose por las fases de gobernanza."
              icon={TrendingIcon}
            />
            <MetricCard
              label="Voces Únicas"
              value={String(latestSnapshot?.uniqueAuthors ?? 124)}
              subLabel="Últimas 7 días"
              description="Número de autores distintos participando en el discurso."
              icon={AtomIcon}
            />
            <MetricCard
              label="Dispersión"
              value={`${topo.ideologicalSpread}%`}
              subLabel={
                topo.ideologicalSpread > 60
                  ? 'Alta diversidad'
                  : topo.ideologicalSpread > 30
                    ? 'Diversidad moderada'
                    : 'Monocultural'
              }
              description="Qué tan disperso está el discurso a través de la brújula política."
              icon={SparkleIcon}
            />
          </View>

          {/* Active Cabildeos */}
          <ActiveCabildeosSection />

          {/* Ejes en Debate */}
          <View style={[styles.card, t.atoms.bg_contrast_25]}>
            <SectionHeader title="Ejes en Debate" icon={TrendingIcon} />
            <Text style={[styles.cardDesc, t.atoms.text_contrast_medium]}>
              Los ejes RAQ donde el discurso muestra mayor desacuerdo
              inter-ideológico. Un score de 50% indica equilibrio; desviaciones
              muestran consenso o polarización.
            </Text>
            <ContestedAxesChart axes={topo.contestedAxes} />
          </View>

          {/* Estructura Argumentativa */}
          <View style={[styles.card, t.atoms.bg_contrast_25]}>
            <SectionHeader title="Estructura Argumentativa" icon={AtomIcon} />
            <Text style={[styles.cardDesc, t.atoms.text_contrast_medium]}>
              Balance de tipos de aportes en el mapa de deliberación. Un
              ecosistema sano tiene abundante evidencia y preguntas, no solo
              afirmaciones.
            </Text>
            <ArgumentStructureChart balance={topo.argumentBalance} />
          </View>

          {/* Temas Principales con Posición */}
          <View style={[styles.card, t.atoms.bg_contrast_25]}>
            <SectionHeader title="Temas con Posición" icon={SparkleIcon} />
            <Text style={[styles.cardDesc, t.atoms.text_contrast_medium]}>
              Clusters temáticos detectados en el discurso, etiquetados con la
              posición de brújula que más los debate.
            </Text>
            <View style={{gap: 12, marginTop: 12}}>
              {topics?.map((topic, i) => {
                let parsedKeywords: string[] = []
                try {
                  parsedKeywords = JSON.parse(topic.keywords)
                } catch (e) {
                  parsedKeywords = topic.keywords
                    .split(',')
                    .map(k => k.trim())
                }
                const dominantPosition = topPositions[i % topPositions.length]
                return (
                  <View key={i} style={styles.topicRow}>
                    <View
                      style={[
                        styles.topicDot,
                        {backgroundColor: COMPASS_COLORS[dominantPosition]},
                      ]}
                    />
                    <View style={{flex: 1}}>
                      <Text style={[styles.topicLabel, t.atoms.text]}>
                        {topic.clusterLabel}{' '}
                        <Text
                          style={[
                            styles.topicPosition,
                            {color: COMPASS_LABEL_COLORS[dominantPosition]},
                          ]}>
                          ({dominantPosition.replace('-', ' ')})
                        </Text>
                      </Text>
                      <View style={styles.topicPills}>
                        {parsedKeywords.map((kw: string) => (
                          <View
                            key={kw}
                            style={[
                              styles.topicPill,
                              {backgroundColor: t.palette.primary_500 + '10'},
                            ]}>
                            <Text
                              style={[
                                styles.topicPillText,
                                {color: t.palette.primary_500},
                              ]}>
                              {kw}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )
              })}
              {(!topics || topics.length === 0) && (
                <Text style={[t.atoms.text_contrast_medium, {fontSize: 12}]}>
                  No hay temas detectados aún para este periodo.
                </Text>
              )}
            </View>
          </View>

          {/* Oportunidades de Puente */}
          <View style={[styles.card, t.atoms.bg_contrast_25]}>
            <SectionHeader title="Oportunidades de Puente" icon={ChainLinkIcon} />
            <Text style={[styles.cardDesc, t.atoms.text_contrast_medium]}>
              Puntos donde diferentes posiciones ideológicas podrían encontrar
              terreno común, basado en solapamiento de temas y ausencia de
              conexiones en el grafo de deliberación.
            </Text>
            <BridgeOpportunities opportunities={topo.bridgeOpportunities} />
          </View>

          {/* Tendencias Emergentes */}
          <View style={[styles.card, t.atoms.bg_contrast_25]}>
            <SectionHeader title="Tendencias Emergentes" icon={SparkleIcon} />
            <View style={styles.fluxTags}>
              {DISCOURSE_FLUX_TAGS.map((tag, i) => (
                <View
                  key={i}
                  style={[
                    styles.fluxTag,
                    {borderColor: t.palette.primary_500 + '40'},
                  ]}>
                  <Text
                    style={[
                      styles.fluxTagText,
                      {color: t.palette.primary_500},
                    ]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, t.atoms.text_contrast_medium]}>
              Topología calculada en tiempo real desde el grafo de deliberación.
              Última actualización hace 4m.
            </Text>
          </View>
        </Layout.Center>
      </ScrollView>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  centerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  timeframeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tfPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tfText: {
    fontSize: 12,
    fontWeight: '800',
  },
  heroCard: {
    padding: 20,
    borderRadius: 20,
    borderLeftWidth: 4,
    marginBottom: 20,
    gap: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  heroStatus: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 4,
  },
  heroStat: {
    gap: 2,
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    minWidth: 140,
    flex: 1,
    padding: 14,
    borderRadius: 16,
    gap: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: IS_WEB ? 'monospace' : undefined,
  },
  metricSub: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricDesc: {
    fontSize: 10,
    lineHeight: 13,
    marginTop: 4,
    opacity: 0.8,
  },
  cabCard: {
    padding: 14,
    borderRadius: 14,
    gap: 6,
  },
  cabPhase: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cabTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  topicDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  topicLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  topicPosition: {
    fontSize: 11,
    fontWeight: '700',
  },
  topicPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  topicPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topicPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fluxTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  fluxTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  fluxTagText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: IS_WEB ? 'monospace' : undefined,
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})
