import {Fragment, type ReactNode, useMemo, useState} from 'react'
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
import {POST_FLAIRS} from '#/lib/tags'
import {
  buildVsEntityOptions,
  buildVsScreenViewModel,
  resolveInitialVsTopic,
  resolveVsEntities,
  setVsEntityInPair,
  swapVsEntities,
  VS_STATUS_FILTERS,
  VS_TIME_FILTERS,
  type VsAxisFilter,
  type VsDebateCard,
  type VsDivergenceRow,
  type VsEntityOption,
  type VsEntitySummary,
  type VsIssue,
  type VsIssueComparison,
  type VsPartyVoteComparison,
  type VsPolicyAxisComparison,
  type VsRaqAxisComparison,
  type VsScreenViewModel,
  type VsStance,
  type VsStatusFilter,
  type VsTimeFilter,
} from '#/lib/vs-screen'
import {STALE} from '#/state/queries'
import {useAgent, useSession} from '#/state/session'
import {Text} from '#/view/com/util/text/Text'
import {SplitViewProvider} from '#/screens/Messages/components/splitView/context'
import {atoms as a, useLayoutBreakpoints, useTheme} from '#/alf'
import {FlairSelectionList} from '#/components/FlairSelectionList'
import {SearchInput} from '#/components/forms/SearchInput'
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

// Communities without RAQ answers come back with an empty/invalid payload
// (e.g. `compass: {}`), which fails response validation. That is "no data",
// not an error worth a toast, so degrade to an empty alignment.
async function fetchCommunityAlignmentSafe(
  agent: ReturnType<typeof useAgent>,
  community: string,
): Promise<CommunityAlignmentResponse> {
  try {
    return await fetchCommunityAlignment(agent, community)
  } catch (err) {
    console.warn(
      `[VSScreen] RAQ alignment unavailable for ${community}; showing no data.`,
      err,
    )
    return {axes: []}
  }
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
  const panelColumns = isWide ? 2 : 1
  const [selectedTopic, setSelectedTopic] = useState(initialTopic)
  const [selectedAxis, setSelectedAxis] = useState<VsAxisFilter>('all')
  const [selectedStatus, setSelectedStatus] = useState<VsStatusFilter>('all')
  const [selectedTime, setSelectedTime] = useState<VsTimeFilter>('all')
  const [pickerSlot, setPickerSlot] = useState<0 | 1 | null>(null)

  const {data: cabildeos = [], isLoading: cabildeosLoading} = useQuery<
    CabildeoReadView[]
  >({
    staleTime: STALE.MINUTES.ONE,
    queryKey: ['vs-screen', 'cabildeos'],
    placeholderData: previous => previous,
    queryFn: async () => {
      try {
        return await fetchCabildeos(agent, {limit: 100})
      } catch (err) {
        console.warn(
          '[VSScreen] Cabildeos unavailable; showing empty comparison state.',
          err,
        )
        return []
      }
    },
  })

  const firstAlignment = useQuery<CommunityAlignmentResponse>({
    staleTime: STALE.MINUTES.FIVE,
    queryKey: ['vs-screen', 'raq-alignment', entities[0]],
    placeholderData: previous => previous,
    queryFn: async () => fetchCommunityAlignmentSafe(agent, entities[0]),
  })
  const secondAlignment = useQuery<CommunityAlignmentResponse>({
    staleTime: STALE.MINUTES.FIVE,
    queryKey: ['vs-screen', 'raq-alignment', entities[1]],
    placeholderData: previous => previous,
    queryFn: async () => fetchCommunityAlignmentSafe(agent, entities[1]),
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

  const updateEntities = (next: [string, string]) => {
    if (next[0] === entities[0] && next[1] === entities[1]) return
    navigation.setParams({entities: next})
  }

  // A specific policy/matter lives inside one field, so drop any field filter
  // that could contradict it.
  const selectTopic = (topic: string) => {
    setSelectedTopic(topic)
    if (topic !== 'all') setSelectedAxis('all')
  }

  const selectEntity = (slot: 0 | 1, entity: string) => {
    updateEntities(setVsEntityInPair({entities, slot, entity}))
    setPickerSlot(null)
  }

  const isLoading = cabildeosLoading
  const raqLoading = firstAlignment.isLoading || secondAlignment.isLoading
  const raqError = firstAlignment.isError || secondAlignment.isError

  const body = isLoading ? (
    <StateBlock
      title="Cargando comparativa"
      description="Estamos reuniendo cabildeos, votos, posiciones y alineacion RAQ para esta vista."
      action={<ActivityIndicator color={t.palette.primary_500} size="small" />}
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
      <Layout.Screen testID="vsScreen" hideBorders noInsetTop>
        <VSWorkspaceLayout
          sidebar={
            <ScrollView
              style={a.flex_1}
              contentContainerStyle={styles.sidebarContent}
              keyboardShouldPersistTaps="handled">
              <View style={styles.sidebarAppBar}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Volver"
                  accessibilityHint="Regresa a la pantalla anterior"
                  onPress={() => navigation.goBack()}
                  style={styles.iconButton}>
                  <ArrowLeftIcon size="md" style={t.atoms.text} />
                </TouchableOpacity>
                <View style={styles.sidebarTitleBlock}>
                  <Text style={[styles.title, t.atoms.text]}>Comparativas</Text>
                  <Text
                    style={[
                      styles.appBarSubtitle,
                      t.atoms.text_contrast_medium,
                    ]}
                    numberOfLines={1}>
                    Politicas, votos comunitarios y RAQ
                  </Text>
                </View>
              </View>
              <VSControls
                viewModel={viewModel}
                selectedAxis={selectedAxis}
                selectedStatus={selectedStatus}
                selectedTime={selectedTime}
                onSelectAxis={value => setSelectedAxis(value as VsAxisFilter)}
                onSelectStatus={value =>
                  setSelectedStatus(value as VsStatusFilter)
                }
                onSelectTime={value => setSelectedTime(value as VsTimeFilter)}
                onSelectTopic={selectTopic}
                onSelectEntity={selectEntity}
                onSwapEntities={() => updateEntities(swapVsEntities(entities))}
                pickerSlot={pickerSlot}
                onPickerSlotChange={setPickerSlot}
                filtersDefaultOpen
              />
            </ScrollView>
          }
          sidebarWidth={sidebarWidth}>
          <ScrollView
            style={[styles.workspaceScroll, t.atoms.bg_contrast_25]}
            contentContainerStyle={styles.workspaceScrollContent}>
            {body}
          </ScrollView>
        </VSWorkspaceLayout>
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen testID="vsScreen">
      <View
        style={[
          styles.headerShell,
          t.atoms.bg,
          {borderBottomColor: t.palette.contrast_100},
        ]}>
        <View style={styles.appBar}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Volver"
            accessibilityHint="Regresa a la pantalla anterior"
            onPress={() => navigation.goBack()}
            style={styles.iconButton}>
            <ArrowLeftIcon size="md" style={t.atoms.text} />
          </TouchableOpacity>
          <View style={styles.appTitleBlock}>
            <Text style={[styles.title, t.atoms.text]}>Comparativas</Text>
          </View>
          <View style={styles.appBarSpacer} />
        </View>
      </View>

      <ScrollView
        style={[styles.scrollView, t.atoms.bg_contrast_25]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Layout.Center style={styles.bodyCenter}>
          <View style={styles.mobileStack}>
            <VSControls
              viewModel={viewModel}
              selectedAxis={selectedAxis}
              selectedStatus={selectedStatus}
              selectedTime={selectedTime}
              onSelectAxis={value => setSelectedAxis(value as VsAxisFilter)}
              onSelectStatus={value =>
                setSelectedStatus(value as VsStatusFilter)
              }
              onSelectTime={value => setSelectedTime(value as VsTimeFilter)}
              onSelectTopic={selectTopic}
              onSelectEntity={selectEntity}
              onSwapEntities={() => updateEntities(swapVsEntities(entities))}
              pickerSlot={pickerSlot}
              onPickerSlotChange={setPickerSlot}
            />
            {body}
          </View>
        </Layout.Center>
      </ScrollView>
    </Layout.Screen>
  )
}

type VSControlsProps = {
  viewModel: VsScreenViewModel
  selectedAxis: string
  selectedStatus: string
  selectedTime: string
  onSelectAxis: (value: string) => void
  onSelectStatus: (value: string) => void
  onSelectTime: (value: string) => void
  onSelectTopic: (value: string) => void
  onSelectEntity: (slot: 0 | 1, entity: string) => void
  onSwapEntities: () => void
  pickerSlot: 0 | 1 | null
  onPickerSlotChange: (slot: 0 | 1 | null) => void
  filtersDefaultOpen?: boolean
}

/** Matchup, inline picker and filters; shared by the phone body and desktop sidebar. */
function VSControls({
  viewModel,
  selectedAxis,
  selectedStatus,
  selectedTime,
  onSelectAxis,
  onSelectStatus,
  onSelectTime,
  onSelectTopic,
  onSelectEntity,
  onSwapEntities,
  pickerSlot,
  onPickerSlotChange,
  filtersDefaultOpen,
}: VSControlsProps) {
  return (
    <>
      <MatchupCard
        entities={viewModel.entities}
        totalRelevant={viewModel.totalRelevant}
        activeSlot={pickerSlot}
        onSelectSlot={slot =>
          onPickerSlotChange(pickerSlot === slot ? null : slot)
        }
        onSwap={onSwapEntities}
      />
      {pickerSlot !== null ? (
        <EntitySearchList
          slot={pickerSlot}
          entities={viewModel.entities}
          onSelectEntity={onSelectEntity}
          onClose={() => onPickerSlotChange(null)}
        />
      ) : null}
      <FilterPanel
        viewModel={viewModel}
        selectedAxis={selectedAxis}
        selectedStatus={selectedStatus}
        selectedTime={selectedTime}
        selectedTopic={viewModel.selectedTopic}
        onSelectAxis={onSelectAxis}
        onSelectStatus={onSelectStatus}
        onSelectTime={onSelectTime}
        onSelectTopic={onSelectTopic}
        defaultOpen={filtersDefaultOpen}
      />
    </>
  )
}

const MATCHUP_AVATAR = 52

/** The A-vs-B header. Tapping a side opens the picker for that slot. */
function MatchupCard({
  entities,
  totalRelevant,
  activeSlot,
  onSelectSlot,
  onSwap,
}: {
  entities: [VsEntitySummary, VsEntitySummary]
  totalRelevant: number
  activeSlot: 0 | 1 | null
  onSelectSlot: (slot: 0 | 1) => void
  onSwap: () => void
}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.matchupCard,
        t.atoms.bg,
        {borderColor: t.palette.contrast_100},
      ]}>
      <View style={styles.matchupRow}>
        {([0, 1] as const).map(slot => {
          const entity = entities[slot]
          const active = activeSlot === slot
          return (
            <Fragment key={slot}>
              {slot === 1 ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Intercambiar A y B"
                  accessibilityHint="Intercambia las dos entidades comparadas"
                  onPress={onSwap}
                  style={[
                    styles.vsBadge,
                    {
                      backgroundColor: t.palette.contrast_25,
                      borderColor: t.palette.contrast_100,
                    },
                  ]}>
                  <Text style={[styles.vsText, t.atoms.text]}>VS</Text>
                  <Text style={[styles.vsMeta, t.atoms.text_contrast_medium]}>
                    ⇄
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Cambiar ${slot === 0 ? 'A' : 'B'}: ${entity.plainName}`}
                accessibilityHint="Abre el selector para elegir otra entidad"
                accessibilityState={{expanded: active}}
                onPress={() => onSelectSlot(slot)}
                style={[
                  styles.matchupSide,
                  {
                    backgroundColor: active
                      ? t.palette.contrast_25
                      : 'transparent',
                    borderColor: active ? entity.color : 'transparent',
                  },
                ]}>
                <View
                  style={[
                    styles.matchupAvatar,
                    {backgroundColor: entity.color},
                  ]}>
                  <Text style={styles.matchupAvatarText}>
                    {entity.initials}
                  </Text>
                </View>
                <Text
                  style={[styles.matchupName, t.atoms.text]}
                  numberOfLines={1}>
                  {entity.plainName}
                </Text>
                <Text
                  style={[styles.matchupSubtitle, t.atoms.text_contrast_medium]}
                  numberOfLines={1}>
                  {entity.subtitle}
                </Text>
                <Text style={[styles.matchupChange, {color: entity.color}]}>
                  {active ? 'Cerrar ▴' : 'Cambiar ▾'}
                </Text>
              </TouchableOpacity>
            </Fragment>
          )
        })}
      </View>
      <Text style={[styles.matchupFoot, t.atoms.text_contrast_medium]}>
        {totalRelevant} {totalRelevant === 1 ? 'debate' : 'debates'} en esta
        comparativa
      </Text>
    </View>
  )
}

/** Inline picker for one slot; replaces the old always-open option list. */
function EntitySearchList({
  slot,
  entities,
  onSelectEntity,
  onClose,
}: {
  slot: 0 | 1
  entities: [VsEntitySummary, VsEntitySummary]
  onSelectEntity: (slot: 0 | 1, entity: string) => void
  onClose: () => void
}) {
  const t = useTheme()
  const options = useMemo(() => buildVsEntityOptions(), [])
  const [query, setQuery] = useState('')
  const normalizedQuery = normalizePickerText(query)
  const matches = useMemo(
    () =>
      normalizedQuery
        ? options.filter(option =>
            normalizePickerText(option.searchText).includes(normalizedQuery),
          )
        : options,
    [normalizedQuery, options],
  )
  const otherId = entities[slot === 0 ? 1 : 0].id
  const currentId = entities[slot].id

  return (
    <View
      style={[
        styles.pickerCard,
        t.atoms.bg,
        {borderColor: t.palette.contrast_100},
      ]}>
      <View style={styles.pickerHeader}>
        <Text style={[styles.pickerTitle, t.atoms.text]}>
          Elegir {slot === 0 ? 'A' : 'B'}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Cerrar selector"
          accessibilityHint="Cierra el selector sin cambiar la entidad"
          onPress={onClose}>
          <Text style={[styles.pickerClose, t.atoms.text_contrast_medium]}>
            Cerrar
          </Text>
        </TouchableOpacity>
      </View>
      <SearchInput
        value={query}
        label="Buscar entidad"
        placeholder="Buscar comunidad o partido"
        onChangeText={setQuery}
        onClearText={() => setQuery('')}
      />
      <ScrollView
        style={styles.pickerScroll}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled">
        <View style={styles.entityOptionList}>
          {matches.length === 0 ? (
            <InlineState label="Sin resultados." />
          ) : (
            matches.map(option => (
              <EntityOptionRow
                key={option.id}
                option={option}
                selected={option.id === currentId}
                disabled={option.id === otherId}
                onPress={() => onSelectEntity(slot, option.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

/** Collapsed by default so the comparison, not the controls, is the page. */
function FilterPanel({
  viewModel,
  selectedAxis,
  selectedStatus,
  selectedTime,
  selectedTopic,
  onSelectAxis,
  onSelectStatus,
  onSelectTime,
  onSelectTopic,
  defaultOpen = false,
}: {
  viewModel: VsScreenViewModel
  selectedAxis: string
  selectedStatus: string
  selectedTime: string
  selectedTopic: string
  onSelectAxis: (value: string) => void
  onSelectStatus: (value: string) => void
  onSelectTime: (value: string) => void
  onSelectTopic: (value: string) => void
  defaultOpen?: boolean
}) {
  const t = useTheme()
  const [open, setOpen] = useState(defaultOpen)
  const activeCount = [
    selectedAxis,
    selectedStatus,
    selectedTime,
    selectedTopic,
  ].filter(value => value !== 'all').length

  return (
    <View
      style={[
        styles.filterCard,
        t.atoms.bg,
        {borderColor: t.palette.contrast_100},
      ]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{expanded: open}}
        onPress={() => setOpen(value => !value)}
        style={styles.filterToggle}>
        <Text style={[styles.filterToggleText, t.atoms.text]}>Filtros</Text>
        {activeCount > 0 ? (
          <View
            style={[
              styles.filterBadge,
              {backgroundColor: t.palette.primary_500},
            ]}>
            <Text style={styles.filterBadgeText}>{activeCount}</Text>
          </View>
        ) : null}
        <View style={a.flex_1} />
        <Text style={[styles.filterToggleText, t.atoms.text_contrast_medium]}>
          {open ? '▴' : '▾'}
        </Text>
      </TouchableOpacity>
      {open ? (
        <View style={styles.filterBody}>
          <FilterRow
            label="Campo"
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
          <IssuePicker
            selectedIssue={viewModel.selectedIssue}
            onSelect={onSelectTopic}
          />
        </View>
      ) : null}
    </View>
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

function EntityOptionRow({
  option,
  selected,
  disabled,
  onPress,
}: {
  option: VsEntityOption
  selected: boolean
  disabled: boolean
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{selected, disabled}}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.entityOption,
        {
          borderColor: selected ? option.color : t.palette.contrast_100,
          opacity: disabled ? 0.45 : 1,
        },
      ]}>
      <View style={[styles.entityOptionDot, {backgroundColor: option.color}]} />
      <View style={styles.entityOptionTextBlock}>
        <Text style={[styles.entityOptionName, t.atoms.text]} numberOfLines={1}>
          {option.plainName}
        </Text>
        <Text
          style={[styles.entityOptionMeta, t.atoms.text_contrast_medium]}
          numberOfLines={1}>
          {option.group} - {option.subtitle}
        </Text>
      </View>
      <Text style={[styles.entityOptionHandle, t.atoms.text_contrast_medium]}>
        {disabled ? 'En uso' : option.name}
      </Text>
    </TouchableOpacity>
  )
}

/**
 * Dropdown of every policy and matter, grouped under the six fields
 * (Servicios públicos, Hacienda, Economía, Asuntos sociales, Asuntos
 * exteriores, Interior). Reuses the composer's `FlairSelectionList`.
 */
function IssuePicker({
  selectedIssue,
  onSelect,
}: {
  selectedIssue: VsIssue | null
  onSelect: (topic: string) => void
}) {
  const t = useTheme()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'policy' | 'matter'>(
    selectedIssue?.kind ?? 'policy',
  )
  const selectedFlairs = useMemo(() => {
    if (!selectedIssue || selectedIssue.kind !== mode) return []
    return Object.values(POST_FLAIRS).filter(
      flair => flair.id === selectedIssue.id,
    )
  }, [mode, selectedIssue])

  return (
    <View style={styles.filterRow}>
      <Text style={[styles.filterLabel, t.atoms.text_contrast_medium]}>
        Politica o asunto
      </Text>
      <View style={styles.issueRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{expanded: open}}
          onPress={() => setOpen(value => !value)}
          style={[
            styles.issueButton,
            {
              backgroundColor: t.palette.contrast_25,
              borderColor: selectedIssue
                ? t.palette.primary_500
                : t.palette.contrast_100,
            },
          ]}>
          <Text
            style={[styles.issueButtonText, t.atoms.text]}
            numberOfLines={1}>
            {selectedIssue
              ? `${selectedIssue.kind === 'policy' ? '||' : '|'} ${selectedIssue.label}`
              : 'Todas las politicas y asuntos'}
          </Text>
          <Text style={[styles.issueButtonText, t.atoms.text_contrast_medium]}>
            {open ? '▴' : '▾'}
          </Text>
        </TouchableOpacity>
        {selectedIssue ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Quitar politica o asunto"
            accessibilityHint="Muestra todas las politicas y asuntos"
            onPress={() => onSelect('all')}
            style={[styles.issueClear, {borderColor: t.palette.contrast_100}]}>
            <Text style={[styles.issueButtonText, t.atoms.text]}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {open ? (
        <View style={[styles.issueList, {borderColor: t.palette.contrast_100}]}>
          <View style={styles.chipRow}>
            {(['policy', 'matter'] as const).map(option => {
              const isActive = mode === option
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{selected: isActive}}
                  key={option}
                  onPress={() => setMode(option)}
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
                    ]}>
                    {option === 'policy' ? '|| Politicas' : '| Asuntos'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <ScrollView
            style={styles.issueScroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled">
            <FlairSelectionList
              key={mode}
              mode={mode}
              selectedFlairs={selectedFlairs}
              setSelectedFlairs={flairs => {
                const flair = flairs[flairs.length - 1]
                if (flair) {
                  onSelect(flair.id)
                  setOpen(false)
                } else {
                  onSelect('all')
                }
              }}
            />
          </ScrollView>
        </View>
      ) : null}
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

function EntityLegend({
  entities,
}: {
  entities: [VsEntitySummary, VsEntitySummary]
}) {
  const t = useTheme()
  return (
    <View style={styles.legend}>
      {entities.map((entity, index) => (
        <View key={entity.id} style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: entity.color}]} />
          <Text
            style={[styles.legendText, t.atoms.text_contrast_medium]}
            numberOfLines={1}>
            {index === 0 ? 'A' : 'B'} · {entity.plainName}
          </Text>
        </View>
      ))}
    </View>
  )
}

/** One bar split proportionally between two values. */
function SplitBar({
  first,
  second,
  firstColor,
  secondColor,
}: {
  first: number
  second: number
  firstColor: string
  secondColor: string
}) {
  const t = useTheme()
  const total = first + second
  if (total <= 0) {
    return (
      <View
        style={[styles.splitBar, {backgroundColor: t.palette.contrast_50}]}
      />
    )
  }
  return (
    <View style={[styles.splitBar, {backgroundColor: t.palette.contrast_50}]}>
      <View style={{flex: first, backgroundColor: firstColor}} />
      <View style={styles.splitGap} />
      <View style={{flex: second, backgroundColor: secondColor}} />
    </View>
  )
}

function HeadToHead({viewModel}: {viewModel: VsScreenViewModel}) {
  const t = useTheme()
  const [first, second] = viewModel.entities
  const rows: Array<{label: string; a: number; b: number; pct?: boolean}> = [
    {label: 'Debates', a: first.debateCount, b: second.debateCount},
    {label: 'Votos', a: first.voteTotal, b: second.voteTotal},
    {
      label: 'Votos directos',
      a: first.directVoteTotal,
      b: second.directVoteTotal,
    },
    {
      label: 'Votos delegados',
      a: first.delegatedVoteTotal,
      b: second.delegatedVoteTotal,
    },
    {label: 'Posiciones', a: first.positionTotal, b: second.positionTotal},
    {
      label: 'Consenso',
      a: Math.round(first.consensusRate * 100),
      b: Math.round(second.consensusRate * 100),
      pct: true,
    },
  ]
  return (
    <View style={styles.h2hList}>
      {rows.map(row => (
        <View key={row.label} style={styles.h2hRow}>
          <View style={styles.h2hValues}>
            <Text
              style={[
                styles.h2hValue,
                t.atoms.text,
                row.a >= row.b && row.a > 0 ? {color: first.color} : null,
              ]}>
              {row.a}
              {row.pct ? '%' : ''}
            </Text>
            <Text style={[styles.h2hLabel, t.atoms.text_contrast_medium]}>
              {row.label}
            </Text>
            <Text
              style={[
                styles.h2hValue,
                t.atoms.text,
                row.b > row.a ? {color: second.color} : null,
              ]}>
              {row.b}
              {row.pct ? '%' : ''}
            </Text>
          </View>
          <SplitBar
            first={row.a}
            second={row.b}
            firstColor={first.color}
            secondColor={second.color}
          />
        </View>
      ))}
      <Text style={[styles.h2hNote, t.atoms.text_contrast_medium]}>
        Los debates conjuntos ({Math.min(first.sharedCount, second.sharedCount)}
        ) tienen una sola votacion y cuentan para ambos lados.
      </Text>
    </View>
  )
}

/** Mirrored bars growing outward from a shared center line. */
function PolicyAxisBars({
  rows,
  entities,
}: {
  rows: VsPolicyAxisComparison[]
  entities: [VsEntitySummary, VsEntitySummary]
}) {
  const t = useTheme()
  return (
    <View style={styles.axisList}>
      <EntityLegend entities={entities} />
      {rows.map(row => {
        const [a, b] = row.entityValues
        const hasData = a > 0 || b > 0
        return (
          <View key={row.key} style={styles.comparisonRow}>
            <View style={styles.comparisonHeader}>
              <Text
                style={[styles.comparisonLabel, t.atoms.text]}
                numberOfLines={1}>
                {row.label}
              </Text>
              <Text
                style={[styles.comparisonMeta, t.atoms.text_contrast_medium]}>
                {hasData
                  ? `${row.sharedDebateCount} compartidos`
                  : 'Sin actividad'}
              </Text>
            </View>
            <View style={styles.butterfly}>
              <Text
                style={[styles.butterflyValue, t.atoms.text_contrast_medium]}>
                {a}
              </Text>
              <View
                style={[
                  styles.butterflyHalf,
                  styles.butterflyHalfLeft,
                  {backgroundColor: t.palette.contrast_50},
                ]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: entities[0].color,
                      width: `${(a / row.maxValue) * 100}%`,
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.butterflyCenter,
                  {backgroundColor: t.palette.contrast_200},
                ]}
              />
              <View
                style={[
                  styles.butterflyHalf,
                  {backgroundColor: t.palette.contrast_50},
                ]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: entities[1].color,
                      width: `${(b / row.maxValue) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.butterflyValue,
                  styles.textRight,
                  t.atoms.text_contrast_medium,
                ]}>
                {b}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

const RAQ_DOT = 18

/**
 * RAQ scores are positions on a spectrum, not magnitudes, so each axis is a
 * track between its two poles with one dot per entity. The gap between the
 * dots is the disagreement.
 */
function RaqAxisMatrix({
  rows,
  entities,
}: {
  rows: VsRaqAxisComparison[]
  entities: [VsEntitySummary, VsEntitySummary]
}) {
  const t = useTheme()
  const hasAnyScore = rows.some(
    row => row.entityScores[0] !== null || row.entityScores[1] !== null,
  )
  if (!hasAnyScore) {
    return (
      <InlineState label="Todavia no hay suficientes respuestas RAQ para comparar estas entidades." />
    )
  }
  return (
    <View style={styles.axisList}>
      <EntityLegend entities={entities} />
      {rows.map(row => {
        const [a, b] = row.entityScores
        const scored = [a, b].filter((v): v is number => v !== null)
        const lo = scored.length ? Math.min(...scored) : 0
        const hi = scored.length ? Math.max(...scored) : 0
        return (
          <View key={row.axisId} style={styles.comparisonRow}>
            <View style={styles.comparisonHeader}>
              <Text
                style={[styles.comparisonLabel, t.atoms.text]}
                numberOfLines={1}>
                {row.title}
              </Text>
              <Text
                style={[styles.comparisonMeta, t.atoms.text_contrast_medium]}>
                {row.delta === null ? 'Sin datos' : `Δ ${row.delta}`}
              </Text>
            </View>
            <View style={styles.spectrum}>
              <View
                style={[
                  styles.spectrumLine,
                  {backgroundColor: t.palette.contrast_100},
                ]}
              />
              {scored.length === 2 && hi > lo ? (
                <View
                  style={[
                    styles.spectrumLine,
                    {
                      backgroundColor: t.palette.contrast_300,
                      left: `${lo}%`,
                      width: `${hi - lo}%`,
                    },
                  ]}
                />
              ) : null}
              {[a, b].map((score, index) =>
                score === null ? null : (
                  <View
                    key={index}
                    style={[
                      styles.spectrumDot,
                      {
                        backgroundColor: entities[index].color,
                        borderColor: t.atoms.bg.backgroundColor,
                        left: `${score}%`,
                        zIndex: index === 0 ? 2 : 1,
                      },
                    ]}
                  />
                ),
              )}
            </View>
            <View style={styles.spectrumPoles}>
              <Text
                style={[styles.spectrumPole, t.atoms.text_contrast_medium]}
                numberOfLines={1}>
                {row.labelLow}
              </Text>
              <Text
                style={[
                  styles.spectrumPole,
                  styles.textRight,
                  t.atoms.text_contrast_medium,
                ]}
                numberOfLines={1}>
                {row.labelHigh}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

/** Stacked a favor / en contra / enmiendas bar; empty track without data. */
function StanceBar({stance}: {stance: VsStance}) {
  const t = useTheme()
  const total = stance.for + stance.against + stance.amendment
  return (
    <View style={[styles.splitBar, {backgroundColor: t.palette.contrast_50}]}>
      {total > 0 ? (
        <>
          <View
            style={{flex: stance.for, backgroundColor: t.palette.positive_500}}
          />
          <View
            style={{
              flex: stance.against,
              backgroundColor: t.palette.negative_500,
            }}
          />
          <View
            style={{
              flex: stance.amendment,
              backgroundColor: t.palette.contrast_300,
            }}
          />
        </>
      ) : null}
    </View>
  )
}

function stanceLabel(stance: VsStance) {
  const total = stance.for + stance.against + stance.amendment
  if (total === 0) return 'Sin posturas'
  return `${stance.for} a favor · ${stance.against} en contra${
    stance.amendment > 0 ? ` · ${stance.amendment} enm.` : ''
  }`
}

function IssueComparisonList({
  rows,
  entities,
}: {
  rows: VsIssueComparison[]
  entities: [VsEntitySummary, VsEntitySummary]
}) {
  const t = useTheme()
  if (rows.length === 0) {
    return (
      <InlineState label="Ningun debate de esta comparativa tiene una politica o asunto etiquetado." />
    )
  }
  return (
    <View style={styles.axisList}>
      <EntityLegend entities={entities} />
      <StanceKey />
      {rows.map(row => {
        const hasOwnStance = row.entityStance.some(
          stance => stance.for + stance.against + stance.amendment > 0,
        )
        const hasJointStance =
          row.jointStance.for +
            row.jointStance.against +
            row.jointStance.amendment >
          0
        const [shareA, shareB] = row.entityForShare
        const gap =
          shareA !== null && shareB !== null
            ? Math.round(Math.abs(shareA - shareB) * 100)
            : null
        return (
          <View key={row.id} style={styles.comparisonRow}>
            <View style={styles.comparisonHeader}>
              <Text
                style={[styles.comparisonLabel, t.atoms.text]}
                numberOfLines={2}>
                {row.kind === 'policy' ? '|| ' : '| '}
                {row.label}
              </Text>
              <Text
                style={[styles.comparisonMeta, t.atoms.text_contrast_medium]}>
                {row.fieldLabel}
              </Text>
            </View>

            {row.totalVotes > 0 ? (
              <>
                <View style={styles.h2hValues}>
                  <Text style={[styles.issueVotes, {color: entities[0].color}]}>
                    {row.entityVotes[0]} votos
                  </Text>
                  <Text style={[styles.issueVotes, {color: entities[1].color}]}>
                    {row.entityVotes[1]} votos
                  </Text>
                </View>
                <SplitBar
                  first={row.entityVotes[0]}
                  second={row.entityVotes[1]}
                  firstColor={entities[0].color}
                  secondColor={entities[1].color}
                />
              </>
            ) : null}

            {hasOwnStance ? (
              <View style={styles.stanceBlock}>
                {([0, 1] as const).map(index => (
                  <View key={index} style={styles.stanceRow}>
                    <View style={styles.stanceHeader}>
                      <View
                        style={[
                          styles.legendDot,
                          {backgroundColor: entities[index].color},
                        ]}
                      />
                      <Text
                        style={[
                          styles.stanceText,
                          t.atoms.text_contrast_medium,
                        ]}
                        numberOfLines={1}>
                        {stanceLabel(row.entityStance[index])}
                      </Text>
                    </View>
                    <StanceBar stance={row.entityStance[index]} />
                  </View>
                ))}
                {gap !== null ? (
                  <Text style={[styles.stanceGap, t.atoms.text]}>
                    Diferencia: {gap} pts en % a favor
                  </Text>
                ) : null}
              </View>
            ) : null}

            {hasJointStance ? (
              <View style={styles.stanceRow}>
                <Text
                  style={[styles.stanceText, t.atoms.text_contrast_medium]}
                  numberOfLines={2}>
                  Debate conjunto ({row.jointDebateCount}, una sola votacion) ·{' '}
                  {stanceLabel(row.jointStance)}
                </Text>
                <StanceBar stance={row.jointStance} />
              </View>
            ) : null}

            {row.totalVotes === 0 && !hasOwnStance && !hasJointStance ? (
              <Text style={[styles.stanceText, t.atoms.text_contrast_medium]}>
                Sin votos ni posturas todavia.
              </Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

function StanceKey() {
  const t = useTheme()
  return (
    <View style={styles.legend}>
      {[
        ['A favor', t.palette.positive_500],
        ['En contra', t.palette.negative_500],
        ['Enmiendas', t.palette.contrast_300],
      ].map(([label, color]) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.legendDot, {backgroundColor: color}]} />
          <Text style={[styles.legendText, t.atoms.text_contrast_medium]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  )
}

function PartyVoteList({
  rows,
  entities,
}: {
  rows: VsPartyVoteComparison[]
  entities: [VsEntitySummary, VsEntitySummary]
}) {
  const t = useTheme()
  if (rows.length === 0) {
    return (
      <InlineState label="El desglose por partido aun no esta disponible para estos dos lados." />
    )
  }
  const pct = (value: number | null) =>
    value === null ? '-' : `${Math.round(value * 100)}%`
  return (
    <View style={styles.axisList}>
      <EntityLegend entities={entities} />
      {rows.map(row => (
        <View key={row.uri} style={styles.comparisonRow}>
          <View style={styles.comparisonHeader}>
            <Text
              style={[styles.comparisonLabel, t.atoms.text]}
              numberOfLines={2}>
              {row.title}
            </Text>
            <Text style={[styles.comparisonMeta, t.atoms.text_contrast_medium]}>
              {row.totals[0]} / {row.totals[1]} votos
            </Text>
          </View>
          {row.options.map(option => (
            <View key={option.label} style={styles.stanceRow}>
              <Text style={[styles.stanceText, t.atoms.text]} numberOfLines={2}>
                {option.label}
              </Text>
              {([0, 1] as const).map(index => (
                <View key={index} style={styles.partyBarRow}>
                  <View
                    style={[
                      styles.barTrack2,
                      {backgroundColor: t.palette.contrast_50},
                    ]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          backgroundColor: entities[index].color,
                          width: `${(option.shares[index] ?? 0) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.partyPct, t.atoms.text_contrast_medium]}>
                    {pct(option.shares[index])}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
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
      {viewModel.totalRelevant === 0 ? (
        <InlineState
          label={`Todavia no hay debates entre ${viewModel.entities[0].plainName} y ${viewModel.entities[1].plainName} para este filtro.`}
        />
      ) : null}
      <View style={styles.panelGrid}>
        <Panel title="Cara a cara" columns={panelColumns}>
          <EntityLegend entities={viewModel.entities} />
          <View style={styles.panelSpacer} />
          <HeadToHead viewModel={viewModel} />
        </Panel>
        <Panel title="Donde mas se separan" columns={panelColumns}>
          <DivergenceList
            rows={viewModel.divergenceRows}
            entities={viewModel.entities}
          />
        </Panel>
        <Panel title="Votos y posiciones por campo" columns={panelColumns}>
          <PolicyAxisBars
            rows={viewModel.policyAxisComparisons}
            entities={viewModel.entities}
          />
        </Panel>
        <Panel title="Posturas por politica y asunto" columns={panelColumns}>
          <IssueComparisonList
            rows={viewModel.issueComparisons}
            entities={viewModel.entities}
          />
        </Panel>
        <Panel title="Votacion por partido" columns={panelColumns}>
          <PartyVoteList
            rows={viewModel.partyVoteComparisons}
            entities={viewModel.entities}
          />
        </Panel>
        <Panel title="Posicion en los 12 ejes RAQ" columns={panelColumns}>
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
      </View>

      {isWide ? <PolicyTable rows={viewModel.tableRows} /> : null}

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
        const leaderEntity =
          (first ?? 0) >= (second ?? 0) ? entities[0] : entities[1]
        const leader = leaderEntity.plainName
        return (
          <View
            key={`${row.kind}-${row.key}`}
            style={[
              styles.divergenceRow,
              {borderColor: t.palette.contrast_100},
            ]}>
            <View
              style={[
                styles.divergenceAccent,
                {backgroundColor: leaderEntity.color},
              ]}
            />
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

function normalizePickerText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  sidebarContent: {
    gap: 12,
    padding: 14,
    paddingBottom: 56,
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
  textRight: {
    textAlign: 'right',
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
  entityOptionList: {
    gap: 6,
  },
  entityOption: {
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  entityOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  entityOptionTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  entityOptionName: {
    fontSize: 13,
    fontWeight: '900',
  },
  entityOptionMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  entityOptionHandle: {
    fontSize: 11,
    fontWeight: '800',
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
  mobileStack: {
    width: '100%',
    gap: 12,
  },
  matchupCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchupSide: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  matchupAvatar: {
    width: MATCHUP_AVATAR,
    height: MATCHUP_AVATAR,
    borderRadius: MATCHUP_AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  matchupAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  matchupName: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    maxWidth: '100%',
  },
  matchupSubtitle: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
    maxWidth: '100%',
  },
  matchupChange: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
  },
  matchupFoot: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  pickerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  pickerClose: {
    fontSize: 12,
    fontWeight: '800',
  },
  pickerScroll: {
    maxHeight: 320,
  },
  filterCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  filterBody: {
    gap: 10,
    paddingBottom: 12,
  },
  panelSpacer: {
    height: 12,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
  },
  splitBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  splitGap: {
    width: 2,
  },
  h2hList: {
    gap: 12,
  },
  h2hRow: {
    gap: 6,
  },
  h2hValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  h2hValue: {
    fontSize: 18,
    fontWeight: '900',
    minWidth: 56,
  },
  h2hLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  butterfly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  butterflyValue: {
    width: 34,
    fontSize: 11,
    fontWeight: '800',
  },
  butterflyHalf: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  butterflyHalfLeft: {
    alignItems: 'flex-end',
  },
  butterflyCenter: {
    width: 2,
    height: 18,
    borderRadius: 1,
  },
  spectrum: {
    height: 24,
    justifyContent: 'center',
    marginHorizontal: RAQ_DOT / 2,
  },
  spectrumLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
  },
  spectrumDot: {
    position: 'absolute',
    width: RAQ_DOT,
    height: RAQ_DOT,
    borderRadius: RAQ_DOT / 2,
    borderWidth: 2,
    marginLeft: -RAQ_DOT / 2,
  },
  spectrumPoles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  spectrumPole: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
  },
  divergenceAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  issueRow: {
    flexDirection: 'row',
    gap: 6,
  },
  issueButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  issueButtonText: {
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  issueClear: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  issueList: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  issueScroll: {
    maxHeight: 380,
  },
  stanceBlock: {
    gap: 6,
  },
  stanceRow: {
    gap: 4,
  },
  stanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stanceText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  stanceGap: {
    fontSize: 12,
    fontWeight: '900',
  },
  partyBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barTrack2: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  partyPct: {
    width: 36,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  h2hNote: {
    fontSize: 11,
    lineHeight: 15,
  },
  issueVotes: {
    fontSize: 12,
    fontWeight: '900',
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
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
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
  barFill: {
    height: '100%',
    borderRadius: 999,
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
