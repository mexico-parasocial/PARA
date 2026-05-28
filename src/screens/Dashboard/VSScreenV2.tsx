import {type ReactNode, useMemo, useState} from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import {
  type RouteProp,
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native'
import {useQuery} from '@tanstack/react-query'

import {type CabildeoReadView, fetchCabildeos} from '#/lib/api/cabildeo'
import {type ParaRaqAxisResult} from '#/lib/api/para-lexicons'
import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {fetchCommunityAlignment} from '#/lib/services/raq'
import {
  buildVsScreenViewModel,
  resolveInitialVsTopic,
  resolveVsEntities,
  VS_STATUS_FILTERS,
  VS_TIME_FILTERS,
  type VsAxisFilter,
  type VsDebateCard,
  type VsDivergenceRow,
  type VsEntitySummary,
  type VsPolicyAxisComparison,
  type VsRaqAxisComparison,
  type VsScreenViewModel,
  type VsStatusFilter,
  type VsTimeFilter,
} from '#/lib/vs-screen'
import {STALE} from '#/state/queries'
import {useAgent, useSession} from '#/state/session'
import {Text} from '#/view/com/util/text/Text'
import {SplitViewProvider} from '#/screens/Messages/components/splitView/context'
import {atoms as a, useLayoutBreakpoints, useTheme} from '#/alf'
import {ArrowLeft_Stroke2_Corner0_Rounded as ArrowLeftIcon} from '#/components/icons/Arrow'
import * as Layout from '#/components/Layout'
import {LockScroll} from '#/components/LockScroll'

type VsRoute = RouteProp<CommonNavigatorParams, 'VSScreenV2'>

const SIDEBAR_WIDTH = 380
const SIDEBAR_COMPACT_WIDTH = 328
const DESKTOP_LEFT_RAIL_WIDTH = 86

type CommunityAlignmentResponse = {
  axes?: ParaRaqAxisResult[]
}

export function VSScreen() {
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<VsRoute>()
  const entities = useMemo(
    () => resolveVsEntities(route.params?.entities),
    [route.params?.entities],
  )
  const initialTopic = resolveInitialVsTopic(route.params?.matter)
  const screenKey = `${entities[0]}::${entities[1]}::${initialTopic}`

  return (
    <VSScreenContent
      key={screenKey}
      navigation={navigation}
      entities={entities}
      initialTopic={initialTopic}
    />
  )
}

function VSScreenContent({
  navigation,
  entities,
  initialTopic,
}: {
  navigation: NavigationProp
  entities: [string, string]
  initialTopic: string
}) {
  const agent = useAgent()
  const t = useTheme()
  const {width} = useWindowDimensions()
  const {rightNavVisible, centerColumnOffset} = useLayoutBreakpoints()
  const {hasSession} = useSession()
  const isDesktopWorkspace = rightNavVisible
  const sidebarWidth = centerColumnOffset
    ? SIDEBAR_COMPACT_WIDTH
    : SIDEBAR_WIDTH
  const mainContentWidth = isDesktopWorkspace
    ? width - sidebarWidth - (hasSession ? DESKTOP_LEFT_RAIL_WIDTH : 0)
    : width
  const isWide = mainContentWidth >= 980
  const isTablet = mainContentWidth >= 760
  const panelColumns = isWide ? 2 : 1
  const [selectedTopic, setSelectedTopic] = useState(initialTopic)
  const [selectedAxis, setSelectedAxis] = useState<VsAxisFilter>('all')
  const [selectedStatus, setSelectedStatus] = useState<VsStatusFilter>('all')
  const [selectedTime, setSelectedTime] = useState<VsTimeFilter>('all')

  const {
    data: cabildeos = [],
    isLoading: cabildeosLoading,
    isError: cabildeosError,
    refetch: refetchCabildeos,
  } = useQuery<CabildeoReadView[]>({
    staleTime: STALE.MINUTES.ONE,
    queryKey: ['vs-screen', 'cabildeos'],
    placeholderData: previous => previous,
    queryFn: async () => fetchCabildeos(agent, {limit: 100}),
  })

  const firstAlignment = useQuery<CommunityAlignmentResponse>({
    staleTime: STALE.MINUTES.FIVE,
    queryKey: ['vs-screen', 'raq-alignment', entities[0]],
    placeholderData: previous => previous,
    queryFn: async () => fetchCommunityAlignment(agent, entities[0]),
  })
  const secondAlignment = useQuery<CommunityAlignmentResponse>({
    staleTime: STALE.MINUTES.FIVE,
    queryKey: ['vs-screen', 'raq-alignment', entities[1]],
    placeholderData: previous => previous,
    queryFn: async () => fetchCommunityAlignment(agent, entities[1]),
  })

  const viewModel = useMemo(
    () =>
      buildVsScreenViewModel({
        cabildeos,
        entities,
        selectedTopic,
        selectedAxis,
        selectedStatus,
        selectedTime,
        raqAlignments: [firstAlignment.data?.axes, secondAlignment.data?.axes],
      }),
    [
      cabildeos,
      entities,
      firstAlignment.data?.axes,
      secondAlignment.data?.axes,
      selectedAxis,
      selectedStatus,
      selectedTime,
      selectedTopic,
    ],
  )

  const isLoading = cabildeosLoading
  const isError = cabildeosError
  const raqLoading = firstAlignment.isLoading || secondAlignment.isLoading
  const raqError = firstAlignment.isError || secondAlignment.isError

  const controls = (
    <VSControlPanel
      navigation={navigation}
      viewModel={viewModel}
      compact={!isTablet}
      selectedAxis={selectedAxis}
      selectedStatus={selectedStatus}
      selectedTime={selectedTime}
      selectedTopic={selectedTopic}
      onSelectAxis={value => setSelectedAxis(value as VsAxisFilter)}
      onSelectStatus={value => setSelectedStatus(value as VsStatusFilter)}
      onSelectTime={value => setSelectedTime(value as VsTimeFilter)}
      onSelectTopic={setSelectedTopic}
    />
  )

  const body = isLoading ? (
    <StateBlock
      title="Cargando comparativa"
      description="Estamos reuniendo cabildeos, votos, posiciones y alineacion RAQ para esta vista."
      action={<ActivityIndicator color={t.palette.primary_500} size="small" />}
    />
  ) : isError ? (
    <StateBlock
      title="No pudimos cargar la comparativa"
      description="Intenta de nuevo en unos segundos. La fuente de cabildeos no respondio a tiempo."
      action={
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            void refetchCabildeos()
          }}
          style={[
            styles.retryButton,
            {backgroundColor: t.palette.primary_500},
          ]}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      }
    />
  ) : (
    <Dashboard
      viewModel={viewModel}
      panelColumns={panelColumns}
      isWide={isWide}
      raqLoading={raqLoading}
      raqError={raqError}
    />
  )

  if (isDesktopWorkspace) {
    return (
      <Layout.Screen testID="vsScreenV2" hideBorders noInsetTop>
        <VSWorkspaceLayout
          sidebar={
            <VSControlPanel
              navigation={navigation}
              viewModel={viewModel}
              compact
              workspace
              showEntityHeader={false}
              selectedAxis={selectedAxis}
              selectedStatus={selectedStatus}
              selectedTime={selectedTime}
              selectedTopic={selectedTopic}
              onSelectAxis={value => setSelectedAxis(value as VsAxisFilter)}
              onSelectStatus={value =>
                setSelectedStatus(value as VsStatusFilter)
              }
              onSelectTime={value => setSelectedTime(value as VsTimeFilter)}
              onSelectTopic={setSelectedTopic}
            />
          }
          sidebarWidth={sidebarWidth}>
          <ScrollView
            style={[styles.workspaceScroll, t.atoms.bg_contrast_25]}
            contentContainerStyle={styles.workspaceScrollContent}>
            <VSPartyInfoPanel viewModel={viewModel} compact={!isWide} />
            {body}
          </ScrollView>
        </VSWorkspaceLayout>
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen testID="vsScreenV2">
      <View
        style={[
          styles.headerShell,
          t.atoms.bg,
          {borderBottomColor: t.palette.contrast_100},
        ]}>
        <View style={styles.appBar}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={styles.iconButton}>
            <ArrowLeftIcon size="md" style={t.atoms.text} />
          </TouchableOpacity>
          <View style={styles.appTitleBlock}>
            <Text style={[styles.title, t.atoms.text]}>Comparativas</Text>
            <Text
              style={[styles.appBarSubtitle, t.atoms.text_contrast_medium]}
              numberOfLines={1}>
              Politicas, votos comunitarios y RAQ por ejes
            </Text>
          </View>
          <View style={styles.appBarSpacer} />
        </View>

        <Layout.Center style={styles.headerCenter}>{controls}</Layout.Center>
      </View>

      <ScrollView
        style={[styles.scrollView, t.atoms.bg_contrast_25]}
        contentContainerStyle={styles.scrollContent}>
        <Layout.Center style={styles.bodyCenter}>{body}</Layout.Center>
      </ScrollView>
    </Layout.Screen>
  )
}

function VSWorkspaceLayout({
  sidebar,
  sidebarWidth,
  children,
}: {
  sidebar: ReactNode
  sidebarWidth: number
  children: ReactNode
}) {
  const t = useTheme()
  const isFocused = useIsFocused()
  const {hasSession} = useSession()
  const leftOffset = hasSession ? DESKTOP_LEFT_RAIL_WIDTH : 0

  return (
    <View
      style={[
        a.fixed,
        a.flex_row,
        a.overflow_hidden,
        t.atoms.bg,
        {
          top: 0,
          bottom: 0,
          left: leftOffset,
          right: 0,
          zIndex: 1,
        },
      ]}>
      {isFocused && <LockScroll />}
      <SplitViewProvider side="left">
        <View
          style={[
            a.flex_shrink_0,
            a.flex_col,
            a.overflow_hidden,
            t.atoms.bg,
            a.border_l,
            a.border_r,
            t.atoms.border_contrast_low,
            {width: sidebarWidth},
          ]}>
          {sidebar}
        </View>
      </SplitViewProvider>
      <SplitViewProvider side="right">
        <View style={[a.flex_1, a.overflow_hidden]}>{children}</View>
      </SplitViewProvider>
    </View>
  )
}

function VSControlPanel({
  navigation,
  viewModel,
  compact,
  workspace = false,
  showEntityHeader = true,
  selectedAxis,
  selectedStatus,
  selectedTime,
  selectedTopic,
  onSelectAxis,
  onSelectStatus,
  onSelectTime,
  onSelectTopic,
}: {
  navigation: NavigationProp
  viewModel: VsScreenViewModel
  compact: boolean
  workspace?: boolean
  showEntityHeader?: boolean
  selectedAxis: string
  selectedStatus: string
  selectedTime: string
  selectedTopic: string
  onSelectAxis: (value: string) => void
  onSelectStatus: (value: string) => void
  onSelectTime: (value: string) => void
  onSelectTopic: (value: string) => void
}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.toolbar,
        workspace && styles.workspaceToolbar,
        !workspace && !compact && styles.toolbarWide,
        {borderColor: t.palette.contrast_100},
      ]}>
      <View style={styles.sidebarAppBar}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.iconButton}>
          <ArrowLeftIcon size="md" style={t.atoms.text} />
        </TouchableOpacity>
        <View style={styles.sidebarTitleBlock}>
          <Text style={[styles.title, t.atoms.text]}>Comparativas</Text>
          <Text
            style={[styles.appBarSubtitle, t.atoms.text_contrast_medium]}
            numberOfLines={1}>
            Politicas, votos comunitarios y RAQ
          </Text>
        </View>
      </View>
      {showEntityHeader && (
        <EntityCompareHeader
          entities={viewModel.entities}
          compact={compact}
          workspace={workspace}
          totalRelevant={viewModel.totalRelevant}
        />
      )}
      <View
        style={[
          styles.filterCluster,
          workspace && styles.filterClusterSidebar,
        ]}>
        <FilterRow
          label="Eje"
          options={viewModel.policyAxes}
          value={selectedAxis}
          onChange={onSelectAxis}
        />
        <FilterRow
          label="Estado"
          options={VS_STATUS_FILTERS}
          value={selectedStatus}
          onChange={onSelectStatus}
        />
        <FilterRow
          label="Tiempo"
          options={VS_TIME_FILTERS}
          value={selectedTime}
          onChange={onSelectTime}
        />
        <FilterRow
          label="Tema"
          options={viewModel.topics}
          value={selectedTopic}
          onChange={onSelectTopic}
        />
      </View>
    </View>
  )
}

function VSPartyInfoPanel({
  viewModel,
  compact,
}: {
  viewModel: VsScreenViewModel
  compact: boolean
}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.partyInfoPanel,
        t.atoms.bg,
        {borderColor: t.palette.contrast_100},
      ]}>
      <EntityCompareHeader
        entities={viewModel.entities}
        compact={compact}
        totalRelevant={viewModel.totalRelevant}
      />
    </View>
  )
}

function Dashboard({
  viewModel,
  panelColumns,
  isWide,
  raqLoading,
  raqError,
}: {
  viewModel: VsScreenViewModel
  panelColumns: number
  isWide: boolean
  raqLoading: boolean
  raqError: boolean
}) {
  return (
    <View style={styles.dashboard}>
      <StatsStrip viewModel={viewModel} />
      {viewModel.totalRelevant === 0 ? (
        <StateBlock
          title="Aun no hay comparaciones para este filtro"
          description={`Todavia no encontramos suficiente actividad entre ${viewModel.entities[0].name} y ${viewModel.entities[1].name}.`}
        />
      ) : null}
      <View style={styles.panelGrid}>
        <Panel title="Resumen por comunidad" columns={panelColumns}>
          <View style={[styles.entityPanelGrid, isWide && a.flex_row]}>
            <EntityPanel entity={viewModel.entities[0]} />
            <EntityPanel entity={viewModel.entities[1]} />
          </View>
        </Panel>
        <Panel title="6 ejes de politica" columns={panelColumns}>
          <PolicyAxisBars
            rows={viewModel.policyAxisComparisons}
            entities={viewModel.entities}
          />
        </Panel>
        <Panel title="12 ejes RAQ" columns={panelColumns}>
          {raqLoading ? (
            <InlineState label="Cargando alineacion RAQ..." />
          ) : raqError ? (
            <InlineState label="La alineacion RAQ no esta disponible." />
          ) : (
            <RaqAxisMatrix
              rows={viewModel.raqAxisComparisons}
              entities={viewModel.entities}
            />
          )}
        </Panel>
        <Panel title="Donde divergen" columns={panelColumns}>
          <DivergenceList
            rows={viewModel.divergenceRows}
            entities={viewModel.entities}
          />
        </Panel>
      </View>

      <PolicyTable rows={viewModel.tableRows} />

      <View style={[styles.panelGrid, styles.bottomPanelGrid]}>
        <Panel title="Recientes" columns={panelColumns}>
          <DebateList
            cards={viewModel.recent}
            emptyTitle="Sin debates recientes en este filtro."
          />
        </Panel>
        <Panel title="Populares" columns={panelColumns}>
          <DebateList
            cards={viewModel.popular}
            emptyTitle="Sin actividad suficiente para destacar popularidad."
          />
        </Panel>
      </View>
    </View>
  )
}

function EntityCompareHeader({
  entities,
  compact,
  workspace = false,
  totalRelevant,
}: {
  entities: [VsEntitySummary, VsEntitySummary]
  compact: boolean
  workspace?: boolean
  totalRelevant: number
}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.compareHeader,
        compact && styles.compareHeaderCompact,
        workspace && styles.compareHeaderSidebar,
      ]}>
      <EntityIdentity entity={entities[0]} align="left" />
      <View
        style={[
          styles.vsBadge,
          {
            backgroundColor: t.palette.contrast_25,
            borderColor: t.palette.contrast_100,
          },
        ]}>
        <Text style={[styles.vsText, t.atoms.text]}>VS</Text>
        <Text style={[styles.vsMeta, t.atoms.text_contrast_medium]}>
          {totalRelevant} debates
        </Text>
      </View>
      <EntityIdentity entity={entities[1]} align="right" />
    </View>
  )
}

function EntityIdentity({
  entity,
  align,
}: {
  entity: VsEntitySummary
  align: 'left' | 'right'
}) {
  const t = useTheme()
  return (
    <View style={[styles.entityIdentity, align === 'right' && styles.alignEnd]}>
      <View style={[styles.avatar, {backgroundColor: entity.color}]}>
        <Text style={styles.avatarText}>{entity.initials}</Text>
      </View>
      <Text
        style={[
          styles.entityName,
          t.atoms.text,
          align === 'right' && styles.textRight,
        ]}
        numberOfLines={1}>
        {entity.name}
      </Text>
      <Text
        style={[
          styles.entitySubtitle,
          t.atoms.text_contrast_medium,
          align === 'right' && styles.textRight,
        ]}
        numberOfLines={1}>
        {entity.subtitle}
      </Text>
    </View>
  )
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ReadonlyArray<{readonly key: string; readonly label: string}>
  value: string
  onChange: (value: string) => void
}) {
  const t = useTheme()
  return (
    <View style={styles.filterRow}>
      <Text style={[styles.filterLabel, t.atoms.text_contrast_medium]}>
        {label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {options.map(option => {
            const isActive = value === option.key
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{selected: isActive}}
                key={`${label}-${option.key}`}
                onPress={() => onChange(option.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? t.palette.primary_500
                      : t.palette.contrast_25,
                    borderColor: isActive
                      ? t.palette.primary_500
                      : t.palette.contrast_100,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    isActive ? {color: t.palette.white} : t.atoms.text,
                  ]}
                  numberOfLines={1}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

function StatsStrip({viewModel}: {viewModel: VsScreenViewModel}) {
  return (
    <View style={styles.statsStrip}>
      <StatPill label="Debates" value={String(viewModel.totalRelevant)} />
      <StatPill label="Votos" value={String(viewModel.totalVotes)} />
      <StatPill label="Posiciones" value={String(viewModel.totalPositions)} />
      <StatPill
        label="Compartidos"
        value={String(
          Math.min(
            viewModel.entities[0].sharedCount,
            viewModel.entities[1].sharedCount,
          ),
        )}
      />
    </View>
  )
}

function StatPill({label, value}: {label: string; value: string}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.statPill,
        {
          backgroundColor: t.palette.contrast_25,
          borderColor: t.palette.contrast_100,
        },
      ]}>
      <Text style={[styles.statValue, t.atoms.text]}>{value}</Text>
      <Text style={[styles.statLabel, t.atoms.text_contrast_medium]}>
        {label}
      </Text>
    </View>
  )
}

function Panel({
  title,
  children,
  columns,
}: {
  title: string
  children: ReactNode
  columns: number
}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.panel,
        {
          borderColor: t.palette.contrast_100,
          backgroundColor: t.atoms.bg.backgroundColor,
          width: columns === 2 ? '49%' : '100%',
        },
      ]}>
      <Text style={[styles.panelTitle, t.atoms.text]}>{title}</Text>
      {children}
    </View>
  )
}

function EntityPanel({entity}: {entity: VsEntitySummary}) {
  return (
    <View style={styles.entityPanel}>
      <View style={styles.entityPanelHeader}>
        <EntityIdentity entity={entity} align="left" />
      </View>
      <TextMetricGrid
        items={[
          ['Debates', entity.debateCount],
          ['Activos', entity.activeCount],
          ['Resueltos', entity.resolvedCount],
          ['Votos', entity.voteTotal],
          ['Directos', entity.directVoteTotal],
          ['Delegados', entity.delegatedVoteTotal],
          ['Posiciones', entity.positionTotal],
          ['Consenso', `${Math.round(entity.consensusRate * 100)}%`],
        ]}
      />
      <Meter
        label="Participacion relativa"
        value={entity.participationShare}
        valueLabel={`${Math.round(entity.participationShare * 100)}%`}
        color={entity.color}
      />
    </View>
  )
}

function TextMetricGrid({items}: {items: Array<[string, string | number]>}) {
  const t = useTheme()
  return (
    <View style={styles.metricGrid}>
      {items.map(([label, value]) => (
        <View key={label} style={styles.metricItem}>
          <Text style={[styles.metricValue, t.atoms.text]}>
            {String(value)}
          </Text>
          <Text style={[styles.metricLabel, t.atoms.text_contrast_medium]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function PolicyAxisBars({
  rows,
  entities,
}: {
  rows: VsPolicyAxisComparison[]
  entities: [VsEntitySummary, VsEntitySummary]
}) {
  return (
    <View style={styles.axisList}>
      {rows.map(row => (
        <ComparisonBarRow
          key={row.key}
          label={row.label}
          firstColor={entities[0].color}
          secondColor={entities[1].color}
          firstValue={row.entityValues[0]}
          secondValue={row.entityValues[1]}
          maxValue={row.maxValue}
          meta={`${row.sharedDebateCount} compartidos`}
        />
      ))}
    </View>
  )
}

function RaqAxisMatrix({
  rows,
  entities,
}: {
  rows: VsRaqAxisComparison[]
  entities: [VsEntitySummary, VsEntitySummary]
}) {
  return (
    <View style={styles.axisList}>
      {rows.map(row => (
        <ComparisonBarRow
          key={row.axisId}
          label={row.title}
          firstColor={entities[0].color}
          secondColor={entities[1].color}
          firstValue={row.entityScores[0]}
          secondValue={row.entityScores[1]}
          maxValue={100}
          meta={`${row.labelLow} / ${row.labelHigh}`}
        />
      ))}
    </View>
  )
}

function ComparisonBarRow({
  label,
  firstColor,
  secondColor,
  firstValue,
  secondValue,
  maxValue,
  meta,
}: {
  label: string
  firstColor: string
  secondColor: string
  firstValue: number | null
  secondValue: number | null
  maxValue: number
  meta: string
}) {
  const t = useTheme()
  const firstWidth = firstValue === null ? 0 : (firstValue / maxValue) * 100
  const secondWidth = secondValue === null ? 0 : (secondValue / maxValue) * 100
  return (
    <View style={styles.comparisonRow}>
      <View style={styles.comparisonHeader}>
        <Text style={[styles.comparisonLabel, t.atoms.text]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.comparisonMeta, t.atoms.text_contrast_medium]}>
          {meta}
        </Text>
      </View>
      <View style={styles.dualBars}>
        <View
          style={[styles.barTrack, {backgroundColor: t.palette.contrast_50}]}>
          <View
            style={[
              styles.barFill,
              {backgroundColor: firstColor, width: `${firstWidth}%`},
            ]}
          />
        </View>
        <View
          style={[styles.barTrack, {backgroundColor: t.palette.contrast_50}]}>
          <View
            style={[
              styles.barFill,
              {backgroundColor: secondColor, width: `${secondWidth}%`},
            ]}
          />
        </View>
      </View>
      <View style={styles.valuePair}>
        <Text style={[styles.valueText, t.atoms.text_contrast_medium]}>
          {firstValue === null ? 'Sin datos' : firstValue}
        </Text>
        <Text style={[styles.valueText, t.atoms.text_contrast_medium]}>
          {secondValue === null ? 'Sin datos' : secondValue}
        </Text>
      </View>
    </View>
  )
}

function DivergenceList({
  rows,
  entities,
}: {
  rows: VsDivergenceRow[]
  entities: [VsEntitySummary, VsEntitySummary]
}) {
  const t = useTheme()
  if (rows.length === 0) {
    return <InlineState label="No hay divergencias medibles todavia." />
  }
  return (
    <View style={styles.divergenceList}>
      {rows.map(row => {
        const first = row.entityValues[0]
        const second = row.entityValues[1]
        const leader =
          (first ?? 0) >= (second ?? 0)
            ? entities[0].plainName
            : entities[1].plainName
        return (
          <View
            key={`${row.kind}-${row.key}`}
            style={[
              styles.divergenceRow,
              {borderColor: t.palette.contrast_100},
            ]}>
            <View style={styles.divergenceMain}>
              <Text style={[styles.divergenceTitle, t.atoms.text]}>
                {row.label}
              </Text>
              <Text
                style={[styles.divergenceMeta, t.atoms.text_contrast_medium]}>
                {row.kind === 'policy' ? 'Politica' : 'RAQ'} - lidera {leader}
              </Text>
            </View>
            <Text style={[styles.divergenceDelta, t.atoms.text]}>
              {Math.round(row.delta)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function PolicyTable({rows}: {rows: VsDebateCard[]}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.tablePanel,
        {
          backgroundColor: t.atoms.bg.backgroundColor,
          borderColor: t.palette.contrast_100,
        },
      ]}>
      <Text style={[styles.panelTitle, t.atoms.text]}>Tabla de votos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <TableCellText width={300}>Politica</TableCellText>
            <TableCellText width={130}>Eje</TableCellText>
            <TableCellText width={95}>Estado</TableCellText>
            <TableCellText width={90}>Votos</TableCellText>
            <TableCellText width={90}>Pos.</TableCellText>
            <TableCellText width={110}>Delegados</TableCellText>
            <TableCellText width={110}>Consenso</TableCellText>
          </View>
          {rows.length === 0 ? (
            <View style={styles.tableEmpty}>
              <Text style={[styles.tableText, t.atoms.text_contrast_medium]}>
                No hay politicas para este filtro.
              </Text>
            </View>
          ) : (
            rows.map(row => (
              <View
                key={row.uri}
                style={[
                  styles.tableRow,
                  {borderTopColor: t.palette.contrast_100},
                ]}>
                <TableCellText width={300}>{row.title}</TableCellText>
                <TableCellText width={130}>{row.policyAxisLabel}</TableCellText>
                <TableCellText width={95}>{row.phaseLabel}</TableCellText>
                <TableCellText width={90}>{row.totalVotes}</TableCellText>
                <TableCellText width={90}>{row.totalPositions}</TableCellText>
                <TableCellText width={110}>{row.delegatedVotes}</TableCellText>
                <TableCellText width={110}>{row.consensusLabel}</TableCellText>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function TableCellText({
  children,
  width,
}: {
  children: ReactNode
  width: number
}) {
  const t = useTheme()
  return (
    <Text
      style={[styles.tableCell, styles.tableText, t.atoms.text, {width}]}
      numberOfLines={2}>
      {children}
    </Text>
  )
}

function DebateList({
  cards,
  emptyTitle,
}: {
  cards: VsDebateCard[]
  emptyTitle: string
}) {
  if (cards.length === 0) {
    return <InlineState label={emptyTitle} />
  }
  return (
    <View style={styles.debateList}>
      {cards.map(card => (
        <DebateCard key={card.uri} card={card} />
      ))}
    </View>
  )
}

function DebateCard({card}: {card: VsDebateCard}) {
  const t = useTheme()

  return (
    <View style={[styles.debateCard, {borderColor: t.palette.contrast_100}]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardCommunity}>
          <View
            style={[styles.smallDot, {backgroundColor: card.communityColor}]}
          />
          <Text style={[styles.cardCommunityText, t.atoms.text]}>
            {card.community}
          </Text>
        </View>
        <View
          style={[
            styles.phasePill,
            {
              backgroundColor: t.palette.contrast_25,
              borderColor: t.palette.contrast_100,
            },
          ]}>
          <Text style={[styles.phasePillText, t.atoms.text_contrast_medium]}>
            {card.phaseLabel}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardTitle, t.atoms.text]} numberOfLines={2}>
        {card.title}
      </Text>
      <Text
        style={[styles.cardBody, t.atoms.text_contrast_medium]}
        numberOfLines={3}>
        {card.description}
      </Text>

      <TextMetricGrid
        items={[
          ['Votos', card.totalVotes],
          ['Posiciones', card.totalPositions],
          ['Consenso', card.consensusLabel],
          ['Eje', card.policyAxisLabel],
        ]}
      />

      <Meter
        label={`Lider: ${card.leadingLabel}`}
        value={card.consensusRate}
        valueLabel={card.leadingMetricLabel}
        color={card.communityColor}
      />
    </View>
  )
}

function Meter({
  label,
  value,
  valueLabel,
  color,
}: {
  label: string
  value: number
  valueLabel: string
  color: string
}) {
  const t = useTheme()
  const clamped = Math.max(0, Math.min(1, value))

  return (
    <View style={styles.meterBlock}>
      <View style={styles.meterHeader}>
        <Text style={[styles.meterLabel, t.atoms.text_contrast_medium]}>
          {label}
        </Text>
        <Text style={[styles.meterValueLabel, t.atoms.text]}>{valueLabel}</Text>
      </View>
      <View
        style={[styles.meterTrack, {backgroundColor: t.palette.contrast_50}]}>
        <View
          style={[
            styles.meterFill,
            {
              width: `${clamped * 100}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  )
}

function InlineState({label}: {label: string}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.inlineState,
        {
          backgroundColor: t.palette.contrast_25,
          borderColor: t.palette.contrast_100,
        },
      ]}>
      <Text style={[styles.inlineStateText, t.atoms.text_contrast_medium]}>
        {label}
      </Text>
    </View>
  )
}

function StateBlock({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.stateBlock,
        t.atoms.bg,
        {borderColor: t.palette.contrast_100},
      ]}>
      <Text style={[styles.stateTitle, t.atoms.text]}>{title}</Text>
      <Text style={[styles.stateDescription, t.atoms.text_contrast_medium]}>
        {description}
      </Text>
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  headerShell: {
    borderBottomWidth: 1,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  iconButton: {
    minHeight: 36,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitleBlock: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  appBarSpacer: {
    width: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  appBarSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerCenter: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  toolbar: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    width: '100%',
  },
  workspaceToolbar: {
    borderWidth: 0,
    borderRadius: 0,
    flex: 1,
    gap: 18,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  toolbarWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 18,
  },
  sidebarAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sidebarTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  compareHeaderCompact: {
    marginBottom: 12,
  },
  compareHeaderSidebar: {
    flex: 0,
    marginTop: 16,
  },
  entityIdentity: {
    flex: 1,
    minWidth: 0,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  textRight: {
    textAlign: 'right',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  entityName: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  entitySubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  vsBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 18,
    fontWeight: '900',
  },
  vsMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  filterCluster: {
    flex: 1.35,
    gap: 8,
    minWidth: 0,
  },
  filterClusterSidebar: {
    flex: 0,
  },
  partyInfoPanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  filterRow: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    maxWidth: 180,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 56,
  },
  workspaceScroll: {
    flex: 1,
  },
  workspaceScrollContent: {
    padding: 16,
    paddingBottom: 56,
  },
  bodyCenter: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dashboard: {
    width: '100%',
    gap: 14,
  },
  statsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 120,
  },
  statValue: {
    fontSize: 19,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  panelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  bottomPanelGrid: {
    marginTop: 2,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    minHeight: 220,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  entityPanelGrid: {
    gap: 12,
  },
  entityPanel: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  entityPanelHeader: {
    marginBottom: 2,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  metricItem: {
    width: '50%',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  axisList: {
    gap: 10,
  },
  comparisonRow: {
    gap: 6,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  comparisonLabel: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  comparisonMeta: {
    fontSize: 11,
    fontWeight: '700',
  },
  dualBars: {
    gap: 4,
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
  valuePair: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  valueText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divergenceList: {
    gap: 8,
  },
  divergenceRow: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divergenceMain: {
    flex: 1,
    minWidth: 0,
  },
  divergenceTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  divergenceMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  divergenceDelta: {
    fontSize: 18,
    fontWeight: '900',
  },
  tablePanel: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  table: {
    minWidth: 925,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  tableHeader: {
    borderTopWidth: 0,
  },
  tableCell: {
    paddingVertical: 9,
    paddingRight: 14,
  },
  tableText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tableEmpty: {
    paddingVertical: 18,
  },
  debateList: {
    gap: 10,
  },
  debateCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  cardCommunity: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  smallDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  cardCommunityText: {
    fontSize: 12,
    fontWeight: '800',
  },
  phasePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  phasePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  meterBlock: {
    marginTop: 8,
  },
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  meterLabel: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  meterValueLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  meterTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 999,
  },
  inlineState: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  inlineStateText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  stateBlock: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  stateDescription: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 560,
  },
  stateAction: {
    marginTop: 16,
  },
  retryButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
})
