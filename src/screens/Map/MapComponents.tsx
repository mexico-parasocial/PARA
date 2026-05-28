import {type ReactNode, useEffect, useMemo, useRef} from 'react'
import {
  ScrollView,
  type StyleProp,
  StyleSheet,
  TextInput,
  type TextStyle,
  TouchableOpacity,
  View,
} from 'react-native'
import Animated, {FadeInDown, SlideInDown} from 'react-native-reanimated'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {
  type ElectoralDistrict,
  getDistrictsByState,
} from '#/lib/constants/electoralDistrictsData'
import {type SearchResult} from '#/lib/constants/mapHelpers'
import {normalizeMexicoStateName} from '#/lib/constants/mexico'
import {MEXICO_CITY_DATA} from '#/lib/constants/mexicoCityData'
import {MOCK_DISTRICT_RAQS, STATE_DEMOGRAPHICS} from '#/lib/constants/mockData'
import {type NavigationProp} from '#/lib/routes/types'
import {useCabildeosQuery} from '#/state/queries/cabildeo'
import {atoms as a, useBreakpoints, useTheme, web} from '#/alf'
import {Check_Stroke2_Corner0_Rounded as Check} from '#/components/icons/Check'
import {CircleX_Stroke2_Corner0_Rounded as CircleX} from '#/components/icons/CircleX'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as MagnifyingGlass} from '#/components/icons/MagnifyingGlass'
import {SquareBehindSquare4_Stroke2_Corner0_Rounded as LayersIcon} from '#/components/icons/SquareBehindSquare4'
import {Text} from '#/components/Typography'

export type MapLayer = 'states' | 'districts' | 'cities' | 'civic'

type SelectedStateOverlayProps = {
  selectedState: {name: string} | null
  visible: boolean
  insets: {bottom: number}
  onClose: () => void
  onShowCities: () => void
  onShowDistricts: () => void
}

type BigCitiesDataOverlayProps = {
  selectedState: {name: string} | null
  showCities: boolean
  selectedCityName: string | null
  onClose: () => void
}

type MapSearchControlsProps = {
  searchExpanded: boolean
  setSearchExpanded: (expanded: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: SearchResult[]
  recentSearchResults: SearchResult[]
  onSelect: (result: SearchResult) => void
}

type DistrictsDataOverlayProps = {
  selectedState: {name: string} | null
  showDistricts: boolean
  selectedDistrictId: number | null
  onSelectDistrict: (districtId: number) => void
  onClose: () => void
  onBackToState: () => void
}

type MapLayersPanelProps = {
  activeLayer: MapLayer
  onSelectLayer: (layer: MapLayer) => void
}

type SearchResultType = SearchResult['type']

const SEARCH_GROUPS: Array<{type: SearchResultType; label: string}> = [
  {type: 'state', label: 'States'},
  {type: 'district', label: 'Districts'},
  {type: 'city', label: 'Cities'},
]

const TOTAL_STATES = 32
const TOTAL_DISTRICTS = 300
const TOTAL_MAJOR_CITIES = Object.values(MEXICO_CITY_DATA).reduce(
  (total, cities) => total + cities.length,
  0,
)

function normalizeSearchLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getCitiesForState(stateName: string) {
  const match = Object.entries(MEXICO_CITY_DATA).find(
    ([candidate]) =>
      normalizeMexicoStateName(candidate) ===
      normalizeMexicoStateName(stateName),
  )
  return match?.[1] || []
}

function getPanelFrame(gtMobile: boolean) {
  if (gtMobile) {
    return {top: 136, bottom: 20, left: 20, width: 360}
  }

  return {left: 12, right: 12, bottom: 12, maxHeight: 430}
}

function SectionHeader({label}: {label: string}) {
  const t = useTheme()
  return (
    <View style={[a.px_md, a.pt_sm, a.pb_xs]}>
      <Text
        style={[
          a.text_2xs,
          a.font_bold,
          {letterSpacing: 1.1},
          t.atoms.text_contrast_medium,
        ]}>
        {label.toUpperCase()}
      </Text>
    </View>
  )
}

function HighlightedSearchText({
  text,
  query,
  style,
}: {
  text: string
  query: string
  style: StyleProp<TextStyle>
}) {
  const normalizedText = normalizeSearchLabel(text)
  const normalizedQuery = normalizeSearchLabel(query.trim())
  const start = normalizedQuery ? normalizedText.indexOf(normalizedQuery) : -1

  if (start < 0) {
    return <Text style={style}>{text}</Text>
  }

  const end = start + normalizedQuery.length

  return (
    <Text style={style}>
      {text.slice(0, start)}
      <Text style={a.font_bold}>{text.slice(start, end)}</Text>
      {text.slice(end)}
    </Text>
  )
}

function SheetHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string
  subtitle: string
  onClose: () => void
}) {
  const t = useTheme()

  return (
    <View style={[a.flex_row, a.justify_between, a.align_center, a.mb_md]}>
      <View style={[a.flex_1, a.pr_md]}>
        <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
          {subtitle.toUpperCase()}
        </Text>
        <Text style={[a.text_2xl, a.font_bold, t.atoms.text, a.mt_2xs]}>
          {title}
        </Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        style={[a.p_xs, a.rounded_full, t.atoms.bg_contrast_25]}
        onPress={onClose}>
        <CircleX fill={t.atoms.text.color} width={20} height={20} />
      </TouchableOpacity>
    </View>
  )
}

function MiniAction({
  label,
  active = false,
  onPress,
}: {
  label: string
  active?: boolean
  onPress: () => void
}) {
  const t = useTheme()

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[
        a.px_sm,
        a.py_xs,
        a.rounded_full,
        a.border,
        active
          ? {borderColor: t.palette.primary_500, backgroundColor: '#ffffff14'}
          : t.atoms.border_contrast_low,
      ]}>
      <Text
        style={[
          a.text_xs,
          a.font_bold,
          active
            ? {color: t.palette.primary_500}
            : t.atoms.text_contrast_medium,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function OverlayFrame({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle: string
  onClose: () => void
  children: ReactNode
}) {
  const {gtMobile} = useBreakpoints()
  const t = useTheme()

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(16)}
      style={[
        a.absolute,
        getPanelFrame(gtMobile),
        a.rounded_xl,
        t.atoms.bg,
        a.border,
        t.atoms.border_contrast_low,
        a.shadow_lg,
        a.overflow_hidden,
        {zIndex: 18},
      ]}>
      {!gtMobile && (
        <View style={[a.pt_sm, a.align_center]}>
          <View
            style={[
              a.rounded_full,
              t.atoms.bg_contrast_200,
              {width: 42, height: 4},
            ]}
          />
        </View>
      )}
      <View style={[a.p_lg, a.pb_md]}>
        <SheetHeader title={title} subtitle={subtitle} onClose={onClose} />
        {children}
      </View>
    </Animated.View>
  )
}

function getPartyColor(party: string) {
  switch (party) {
    case 'Morena':
      return '#8B1538'
    case 'PAN':
      return '#003087'
    case 'PRI':
      return '#00923F'
    case 'MC':
      return '#FF6B00'
    case 'PVEM':
      return '#228B22'
    case 'PT':
      return '#FF0000'
    case 'PRD':
      return '#FFD700'
    default:
      return '#666666'
  }
}

function CityContextCard({
  city,
  stateName,
}: {
  city: {
    name: string
    population: string
    dominantParty: string
    governing_mayor: string
  }
  stateName: string
}) {
  const t = useTheme()
  const navRef = useNavigation<NavigationProp>()
  const {data: allCabildeos = []} = useCabildeosQuery()
  const partyColor = getPartyColor(city.dominantParty)

  const cityCabildeos = allCabildeos.filter(
    c =>
      normalizeMexicoStateName(c.region || '') ===
        normalizeMexicoStateName(stateName),
  )

  return (
    <View
      style={[
        a.mb_md,
        a.p_md,
        a.rounded_lg,
        {backgroundColor: partyColor + '14'},
        a.border,
        {borderColor: partyColor + '32'},
      ]}>
      <Text style={[a.text_xs, a.font_bold, {color: partyColor}]}>
        CIUDAD ACTIVA
      </Text>
      <Text style={[a.text_lg, a.font_bold, t.atoms.text, a.mt_xs]}>
        {city.name}
      </Text>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_2xs]}>
        {stateName} · Mayor: {city.governing_mayor}
      </Text>

      <View style={[a.flex_row, a.gap_sm, a.mt_md]}>
        <View
          style={[
            a.flex_1,
            a.p_sm,
            a.rounded_md,
            t.atoms.bg_contrast_25,
            a.align_center,
          ]}>
          <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
            {city.population}
          </Text>
          <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
            Population
          </Text>
        </View>
        <View
          style={[
            a.flex_1,
            a.p_sm,
            a.rounded_md,
            t.atoms.bg_contrast_25,
            a.align_center,
          ]}>
          <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
            {cityCabildeos.length}
          </Text>
          <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
            Cabildeos
          </Text>
        </View>
        <View
          style={[
            a.flex_1,
            a.p_sm,
            a.rounded_md,
            t.atoms.bg_contrast_25,
            a.align_center,
          ]}>
          <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
            {city.dominantParty}
          </Text>
          <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
            Dominant
          </Text>
        </View>
      </View>

      {cityCabildeos.length > 0 && (
        <View style={[a.mt_md, a.gap_sm]}>
          <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
            RECENT CABILDEOS
          </Text>
          {cityCabildeos.slice(0, 3).map(c => (
            <TouchableOpacity
              key={c.uri}
              accessibilityRole="button"
              onPress={() =>
                navRef.navigate('CabildeoDetail', {cabildeoUri: c.uri})
              }
              style={[
                a.p_sm,
                a.rounded_md,
                t.atoms.bg_contrast_25,
                a.border,
                t.atoms.border_contrast_low,
              ]}>
              <Text
                style={[a.text_sm, a.font_bold, t.atoms.text]}
                numberOfLines={1}>
                {c.title}
              </Text>
              <Text
                style={[a.text_2xs, t.atoms.text_contrast_medium, a.mt_2xs]}>
                {c.phase} · {c.voteTotals.total} votes
              </Text>
            </TouchableOpacity>
          ))}
          {cityCabildeos.length > 3 && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() =>
                navRef.navigate('CabildeoList')
              }>
              <Text
                style={[
                  a.text_xs,
                  a.font_bold,
                  {color: partyColor},
                  a.text_center,
                  a.mt_xs,
                ]}>
                +{cityCabildeos.length - 3} more
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

function DistrictContextCard({district}: {district: ElectoralDistrict}) {
  const t = useTheme()
  const navRef = useNavigation<NavigationProp>()
  const {data: allCabildeos = []} = useCabildeosQuery()
  // Live data may not have districtKeys; fall back to region match
  const districtCabildeos = allCabildeos.filter(
    c =>
      (c as {districtKeys?: string[]}).districtKeys?.includes(
        district.districtKey,
      ) ||
      normalizeMexicoStateName(c.region || '') ===
        normalizeMexicoStateName(district.stateName),
  )
  const districtQuestions = MOCK_DISTRICT_RAQS.filter(item =>
    item.districtKeys.includes(district.districtKey),
  )

  return (
    <View
      style={[
        a.mb_md,
        a.p_md,
        a.rounded_lg,
        {backgroundColor: district.accent + '14'},
        a.border,
        {borderColor: district.accent + '32'},
      ]}>
      <Text style={[a.text_xs, a.font_bold, {color: district.accent}]}>
        DISTRITO ACTIVO
      </Text>
      <Text style={[a.text_lg, a.font_bold, t.atoms.text, a.mt_xs]}>
        Distrito {district.districtNumber}
      </Text>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_2xs]}>
        {district.stateName} · {district.currentDeputy}
      </Text>

      <View style={[a.flex_row, a.gap_sm, a.mt_md]}>
        <View
          style={[
            a.flex_1,
            a.p_sm,
            a.rounded_md,
            t.atoms.bg_contrast_25,
            a.align_center,
          ]}>
          <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
            {district.turnout}%
          </Text>
          <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
            Turnout
          </Text>
        </View>
        <View
          style={[
            a.flex_1,
            a.p_sm,
            a.rounded_md,
            t.atoms.bg_contrast_25,
            a.align_center,
          ]}>
          <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
            {districtCabildeos.length}
          </Text>
          <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
            Cabildeos
          </Text>
        </View>
        <View
          style={[
            a.flex_1,
            a.p_sm,
            a.rounded_md,
            t.atoms.bg_contrast_25,
            a.align_center,
          ]}>
          <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
            {districtQuestions.length}
          </Text>
          <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
            Questions
          </Text>
        </View>
      </View>

      {districtCabildeos.length > 0 && (
        <View style={[a.mt_md, a.gap_sm]}>
          <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
            RECENT CABILDEOS
          </Text>
          {districtCabildeos.slice(0, 3).map(c => (
            <TouchableOpacity
              key={c.uri}
              accessibilityRole="button"
              onPress={() =>
                navRef.navigate('CabildeoDetail', {cabildeoUri: c.uri})
              }
              style={[
                a.p_sm,
                a.rounded_md,
                t.atoms.bg_contrast_25,
                a.border,
                t.atoms.border_contrast_low,
              ]}>
              <Text
                style={[a.text_sm, a.font_bold, t.atoms.text]}
                numberOfLines={1}>
                {c.title}
              </Text>
              <Text
                style={[a.text_2xs, t.atoms.text_contrast_medium, a.mt_2xs]}>
                {c.phase} · {c.voteTotals.total} votes
              </Text>
            </TouchableOpacity>
          ))}
          {districtCabildeos.length > 3 && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() =>
                navRef.navigate('DistrictProfile', {
                  districtId: district.id,
                  initialTab: 'activity',
                })
              }>
              <Text
                style={[
                  a.text_xs,
                  a.font_bold,
                  {color: district.accent},
                  a.text_center,
                  a.mt_xs,
                ]}>
                +{districtCabildeos.length - 3} more
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={[a.flex_row, a.gap_sm, a.mt_md]}>
        <MiniAction
          label="Open profile"
          onPress={() =>
            navRef.navigate('DistrictProfile', {
              districtId: district.id,
              initialTab: 'overview',
            })
          }
        />
        <MiniAction
          label="Open activity"
          onPress={() =>
            navRef.navigate('DistrictProfile', {
              districtId: district.id,
              initialTab: 'activity',
            })
          }
        />
      </View>
    </View>
  )
}

export function SelectedStateOverlay({
  selectedState,
  visible,
  insets,
  onClose,
  onShowCities,
  onShowDistricts,
}: SelectedStateOverlayProps) {
  const {gtMobile} = useBreakpoints()
  const t = useTheme()
  const navRef = useNavigation<NavigationProp>()
  const {data: allCabildeos = []} = useCabildeosQuery()

  if (!selectedState || !visible) return null

  const activeCabildeos = allCabildeos.filter(
    c =>
      normalizeMexicoStateName(c.region || '') ===
        normalizeMexicoStateName(selectedState.name) && c.phase !== 'resolved',
  )
  const districtCount = getDistrictsByState(selectedState.name).length
  const cityCount = getCitiesForState(selectedState.name).length
  const stats =
    STATE_DEMOGRAPHICS[selectedState.name] || STATE_DEMOGRAPHICS['default']

  return (
    <Animated.View
      entering={SlideInDown.springify().damping(15)}
      style={[
        a.absolute,
        gtMobile
          ? {left: 20, bottom: 28, width: 348}
          : {left: 12, right: 12, bottom: 12 + insets.bottom},
        a.p_lg,
        a.rounded_xl,
        t.atoms.bg_contrast_25,
        web({backdropFilter: 'blur(16px)'}),
        a.border,
        t.atoms.border_contrast_low,
        a.shadow_lg,
        {zIndex: 18},
      ]}>
      {!gtMobile && (
        <View style={[a.align_center, a.mb_md]}>
          <View
            style={[
              a.rounded_full,
              t.atoms.bg_contrast_200,
              {width: 42, height: 4},
            ]}
          />
        </View>
      )}

      <View style={[a.flex_row, a.justify_between, a.align_center, a.mb_md]}>
        <View style={[a.flex_1, a.pr_md]}>
          <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
            STATE SUMMARY
          </Text>
          <Text style={[a.text_2xl, a.font_bold, t.atoms.text, a.mt_2xs]}>
            {selectedState.name}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onClose}
          style={[a.p_xs, a.rounded_full, t.atoms.bg_contrast_100]}>
          <CircleX fill={t.atoms.text.color} width={20} height={20} />
        </TouchableOpacity>
      </View>

      <View style={[a.flex_row, a.gap_sm, a.mb_md]}>
        <View style={[a.flex_1, a.p_sm, t.atoms.bg_contrast_100, a.rounded_md]}>
          <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
            Dominant party
          </Text>
          <Text style={[a.text_lg, a.font_bold, t.atoms.text, a.mt_2xs]}>
            {stats.dominantParty}
          </Text>
        </View>
        <View style={[a.flex_1, a.p_sm, t.atoms.bg_contrast_100, a.rounded_md]}>
          <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
            Leading community
          </Text>
          <Text style={[a.text_lg, a.font_bold, t.atoms.text, a.mt_2xs]}>
            {stats.leadingCommunity}
          </Text>
        </View>
      </View>

      <View style={[a.flex_row, a.gap_sm, a.mb_md]}>
        <View
          style={[
            a.flex_1,
            a.p_sm,
            a.rounded_md,
            t.atoms.bg_contrast_25,
            a.align_center,
          ]}>
          <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
            {stats.approval}
          </Text>
          <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
            Approval
          </Text>
        </View>
        <View
          style={[
            a.flex_1,
            a.p_sm,
            a.rounded_md,
            t.atoms.bg_contrast_25,
            a.align_center,
          ]}>
          <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
            {stats.active}
          </Text>
          <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>Active</Text>
        </View>
      </View>

      <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
        <MiniAction
          label={`Explore ${districtCount} districts`}
          onPress={onShowDistricts}
        />
        <MiniAction
          label={cityCount > 0 ? `Browse ${cityCount} cities` : 'Major cities'}
          onPress={onShowCities}
        />
        {activeCabildeos.length > 0 && (
          <MiniAction
            label={`${activeCabildeos.length} active lobbying`}
            onPress={() => navRef.navigate('CabildeoList')}
          />
        )}
      </View>
    </Animated.View>
  )
}

export function BigCitiesDataOverlay({
  selectedState,
  showCities,
  selectedCityName,
  onClose,
}: BigCitiesDataOverlayProps) {
  const t = useTheme()

  if (!selectedState || !showCities) return null

  const cityData = getCitiesForState(selectedState.name)
  const selectedCity =
    selectedCityName
      ? cityData.find(c => c.name === selectedCityName) || null
      : null

  return (
    <OverlayFrame
      title={selectedState.name}
      subtitle="Major Cities"
      onClose={onClose}>
      {selectedCity ? (
        <CityContextCard city={selectedCity} stateName={selectedState.name} />
      ) : (
        <>
          <View
            style={[
              a.mb_md,
              a.p_md,
              a.rounded_lg,
              t.atoms.bg_contrast_25,
              a.border,
              t.atoms.border_contrast_low,
            ]}>
            <Text
              style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
              URBAN SNAPSHOT
            </Text>
            <Text style={[a.text_lg, a.font_bold, t.atoms.text, a.mt_xs]}>
              {cityData.length} mapped major cit
              {cityData.length === 1 ? 'y' : 'ies'}
            </Text>
          </View>

          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mb_md]}>
            City-level political context for the current state. The map stays
            state-based for now while civic data drills into urban centers here.
          </Text>
        </>
      )}

      <ScrollView contentContainerStyle={[a.gap_md, a.pb_lg]}>
        {cityData.length > 0 ? (
          cityData.map(
            (
              city: {
                name: string
                dominantParty: string
                population: string
                governing_mayor: string
              },
              index: number,
            ) => (
              <View
                key={`${city.name}-${index}`}
                style={[
                  a.p_md,
                  t.atoms.bg_contrast_25,
                  a.rounded_lg,
                  a.border,
                  t.atoms.border_contrast_low,
                ]}>
                <View
                  style={[
                    a.flex_row,
                    a.justify_between,
                    a.align_baseline,
                    a.mb_xs,
                  ]}>
                  <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
                    {city.name}
                  </Text>
                  <View
                    style={[
                      a.px_sm,
                      a.py_xs,
                      a.rounded_full,
                      t.atoms.bg_contrast_100,
                    ]}>
                    <Text style={[a.text_xs, a.font_bold, t.atoms.text]}>
                      {city.dominantParty}
                    </Text>
                  </View>
                </View>
                <Text style={[a.text_sm, t.atoms.text_contrast_high]}>
                  Population:{' '}
                  <Text style={[a.font_bold]}>{city.population}</Text>
                </Text>
                <Text
                  style={[
                    a.text_sm,
                    t.atoms.text_contrast_medium,
                    a.mt_xs,
                  ]}>
                  Mayor: {city.governing_mayor}
                </Text>
              </View>
            ),
          )
        ) : (
          <View style={[a.p_xl, a.align_center]}>
            <Text style={[t.atoms.text_contrast_medium]}>
              <Trans>No city data available for this state.</Trans>
            </Text>
          </View>
        )}
      </ScrollView>
    </OverlayFrame>
  )
}

export function MapSearchControls({
  searchExpanded,
  setSearchExpanded,
  searchQuery,
  setSearchQuery,
  searchResults,
  recentSearchResults,
  onSelect,
}: MapSearchControlsProps) {
  const {gtMobile} = useBreakpoints()
  const t = useTheme()
  const {_} = useLingui()
  const hasSearchQuery = searchQuery.trim().length > 0

  const groupedResults = SEARCH_GROUPS.map(group => ({
    ...group,
    items: searchResults.filter(result => result.type === group.type),
  })).filter(group => group.items.length > 0)

  const hasRecentResults =
    searchExpanded && !hasSearchQuery && recentSearchResults.length > 0
  const showEmptyState =
    searchExpanded && hasSearchQuery && groupedResults.length === 0

  return (
    <View
      style={[
        mapStyles.searchContainer,
        {left: gtMobile ? 20 : 66, top: 20, width: gtMobile ? 320 : 220},
        a.z_30,
      ]}>
      {searchExpanded ? (
        <Animated.View
          entering={FadeInDown.springify().damping(15)}
          style={[
            mapStyles.searchInputWrap,
            t.atoms.bg_contrast_25,
            web({backdropFilter: 'blur(12px)'}),
            a.border,
            t.atoms.border_contrast_low,
            a.shadow_lg,
          ]}>
          <TextInput
            accessibilityRole="search"
            autoFocus
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={_(msg`Search states, districts or cities`)}
            placeholderTextColor={t.atoms.text_contrast_medium.color}
            style={[mapStyles.searchInput, t.atoms.text]}
            returnKeyType="search"
          />
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setSearchExpanded(false)
              setSearchQuery('')
            }}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <CircleX
              fill={t.atoms.text_contrast_medium.color}
              width={20}
              height={20}
            />
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.springify().damping(15)}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setSearchExpanded(true)}
            style={[
              mapStyles.searchIcon,
              t.atoms.bg_contrast_25,
              web({backdropFilter: 'blur(10px)'}),
              a.border,
              t.atoms.border_contrast_low,
              a.shadow_md,
            ]}>
            <MagnifyingGlass fill={t.atoms.text.color} width={22} height={22} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {searchExpanded && (groupedResults.length > 0 || hasRecentResults) && (
        <Animated.View
          entering={FadeInDown.springify().damping(15)}
          style={[
            mapStyles.searchResults,
            t.atoms.bg_contrast_100,
            web({backdropFilter: 'blur(16px)'}),
            a.border,
            t.atoms.border_contrast_low,
            a.shadow_lg,
            {maxHeight: 300},
          ]}>
          <ScrollView>
            {hasRecentResults && (
              <View>
                <SectionHeader label="Recent" />
                {recentSearchResults.map((result, index) => (
                  <SearchResultRow
                    key={`recent-${result.type}-${result.name}-${index}`}
                    result={result}
                    query={searchQuery}
                    onSelect={onSelect}
                  />
                ))}
              </View>
            )}

            {groupedResults.map(group => (
              <View key={group.type}>
                <SectionHeader label={group.label} />
                {group.items.map((result, index) => (
                  <SearchResultRow
                    key={`${result.type}-${result.name}-${result.subtitle}-${index}`}
                    result={result}
                    query={searchQuery}
                    onSelect={onSelect}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {showEmptyState && (
        <Animated.View
          entering={FadeInDown.springify().damping(15)}
          style={[
            mapStyles.searchResults,
            t.atoms.bg_contrast_100,
            web({backdropFilter: 'blur(16px)'}),
            a.border,
            t.atoms.border_contrast_low,
            a.shadow_lg,
          ]}>
          <View style={[a.p_md]}>
            <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
              No matches found
            </Text>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs]}>
              Try a state name, a district number like “Distrito 7”, or a major
              city.
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  )
}

function SearchResultRow({
  result,
  query,
  onSelect,
}: {
  result: SearchResult
  query: string
  onSelect: (result: SearchResult) => void
}) {
  const t = useTheme()
  const {data: allCabildeos = []} = useCabildeosQuery()
  const badgeColor =
    result.type === 'state'
      ? t.palette.primary_500
      : result.type === 'district'
        ? '#D97706'
        : t.atoms.text_contrast_medium.color

  const cabCount = allCabildeos.filter(c => {
    if (!c.region) return false
    const normRegion = normalizeMexicoStateName(c.region)
    if (result.type === 'state') {
      return normRegion === normalizeMexicoStateName(result.name)
    }
    if (result.type === 'city') {
      return (
        normRegion === normalizeMexicoStateName(result.subtitle || '') &&
        c.city === result.name
      )
    }
    return normRegion === normalizeMexicoStateName(result.subtitle || '')
  }).length

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${result.name}${
        result.subtitle ? `, ${result.subtitle}` : ''
      }`}
      accessibilityHint="Moves the map to this result."
      style={[
        mapStyles.searchResultItem,
        {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: t.atoms.border_contrast_low.borderColor,
        },
      ]}
      onPress={() => onSelect(result)}>
      <View style={[a.flex_1, a.pr_sm]}>
        <HighlightedSearchText
          text={result.name}
          query={query}
          style={[a.text_md, t.atoms.text]}
        />
          <View style={[a.flex_row, a.align_center, a.gap_xs, a.mt_xs]}>
          {!!result.subtitle && (
            <HighlightedSearchText
              text={result.subtitle}
              query={query}
              style={[a.text_xs, t.atoms.text_contrast_medium]}
            />
          )}
          {cabCount > 0 && (
            <Text style={[a.text_xs, {color: badgeColor}]}>
              · {cabCount} cabil{cabCount === 1 ? 'deo' : 'deos'}
            </Text>
          )}
        </View>
      </View>
      <View
        style={[
          mapStyles.typeBadge,
          {
            backgroundColor:
              result.type === 'city'
                ? t.palette.contrast_100
                : badgeColor + '20',
          },
        ]}>
        <Text style={[a.text_xs, a.font_bold, {color: badgeColor}]}>
          {result.type === 'state'
            ? 'State'
            : result.type === 'district'
              ? 'District'
              : 'City'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

export function DistrictsDataOverlay({
  selectedState,
  showDistricts,
  selectedDistrictId,
  onSelectDistrict,
  onClose,
  onBackToState,
}: DistrictsDataOverlayProps) {
  const t = useTheme()
  const navRef = useNavigation<NavigationProp>()
  const {data: allCabildeos = []} = useCabildeosQuery()
  const scrollRef = useRef<ScrollView>(null)
  const districts = useMemo(
    () =>
      selectedState
        ? [...getDistrictsByState(selectedState.name)].sort(
            (a, b) => a.districtNumber - b.districtNumber,
          )
        : [],
    [selectedState],
  )
  const selectedDistrict =
    districts.find(district => district.id === selectedDistrictId) || null

  useEffect(() => {
    if (!selectedState || !showDistricts || !selectedDistrictId) return

    const index = districts.findIndex(
      district => district.id === selectedDistrictId,
    )
    if (index < 0) return

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(index - 1, 0) * 154,
        animated: true,
      })
    })
  }, [districts, selectedDistrictId, selectedState, showDistricts])

  if (!selectedState || !showDistricts) return null

  return (
    <OverlayFrame
      title={selectedState.name}
      subtitle="Federal District Browser"
      onClose={onClose}>
      <View
        style={[
          a.mb_md,
          a.p_md,
          a.rounded_lg,
          t.atoms.bg_contrast_25,
          a.border,
          t.atoms.border_contrast_low,
        ]}>
        <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
          STATE COVERAGE
        </Text>
        <Text style={[a.text_lg, a.font_bold, t.atoms.text, a.mt_xs]}>
          {districts.length} federal districts
        </Text>
      </View>

      {selectedDistrict ? (
        <DistrictContextCard district={selectedDistrict} />
      ) : (
        <View
          style={[
            a.mb_md,
            a.p_md,
            a.rounded_lg,
            t.atoms.bg_contrast_25,
            a.border,
            t.atoms.border_contrast_low,
          ]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            Search or tap a district row to inspect civic context. The map still
            highlights the state only until real district boundaries exist.
          </Text>
        </View>
      )}

      <View style={[a.flex_row, a.gap_sm, a.mb_md, a.flex_wrap]}>
        <MiniAction
          label="Back to state"
          active={!selectedDistrict}
          onPress={onBackToState}
        />
        {selectedDistrict && (
          <MiniAction
            label="Open civic activity"
            onPress={() =>
              navRef.navigate('DistrictProfile', {
                districtId: selectedDistrict.id,
                initialTab: 'activity',
              })
            }
          />
        )}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={[a.gap_md, a.pb_lg]}>
        {districts.length > 0 ? (
          districts.map(district => {
            const isSelected = selectedDistrictId === district.id
            const districtCabildeos = allCabildeos.filter(
              c =>
                (c as {districtKeys?: string[]}).districtKeys?.includes(
                  district.districtKey,
                ) ||
                normalizeMexicoStateName(c.region || '') ===
                  normalizeMexicoStateName(district.stateName),
            )
            const districtQuestions = MOCK_DISTRICT_RAQS.filter(item =>
              item.districtKeys.includes(district.districtKey),
            )

            return (
              <View
                key={district.id}
                style={[
                  a.p_md,
                  a.rounded_lg,
                  a.border,
                  isSelected
                    ? {
                        backgroundColor: district.accent + '18',
                        borderColor: district.accent + '40',
                      }
                    : [t.atoms.bg_contrast_25, t.atoms.border_contrast_low],
                ]}>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => onSelectDistrict(district.id)}
                  style={[a.mb_sm]}>
                  <View
                    style={[
                      a.flex_row,
                      a.justify_between,
                      a.align_baseline,
                      a.mb_xs,
                    ]}>
                    <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
                      Distrito {district.districtNumber}
                    </Text>
                    <View
                      style={[
                        a.px_sm,
                        a.py_xs,
                        a.rounded_full,
                        {backgroundColor: district.accent + '20'},
                      ]}>
                      <Text
                        style={[
                          a.text_xs,
                          a.font_bold,
                          {color: district.accent},
                        ]}>
                        {district.dominantParty}
                      </Text>
                    </View>
                  </View>
                  <Text style={[a.text_sm, t.atoms.text_contrast_high]}>
                    Turnout{' '}
                    <Text style={[a.font_bold]}>{district.turnout}%</Text>
                    {' · '}
                    Registered{' '}
                    <Text style={[a.font_bold]}>
                      {district.registeredVoters.toLocaleString()}
                    </Text>
                  </Text>
                  <Text
                    style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_xs]}
                    numberOfLines={1}>
                    Deputy: {district.currentDeputy} ({district.deputyParty})
                  </Text>
                  <Text
                    style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_sm]}>
                    {districtCabildeos.length} cabildeo
                    {districtCabildeos.length === 1 ? '' : 's'} ·{' '}
                    {districtQuestions.length} open question
                    {districtQuestions.length === 1 ? '' : 's'}
                  </Text>
                </TouchableOpacity>

                <View style={[a.flex_row, a.gap_sm, a.flex_wrap]}>
                  <MiniAction
                    label="Profile"
                    active={isSelected}
                    onPress={() =>
                      navRef.navigate('DistrictProfile', {
                        districtId: district.id,
                        initialTab: 'overview',
                      })
                    }
                  />
                  <MiniAction
                    label="Activity"
                    onPress={() =>
                      navRef.navigate('DistrictProfile', {
                        districtId: district.id,
                        initialTab: 'activity',
                      })
                    }
                  />
                  <MiniAction label="Back to state" onPress={onBackToState} />
                </View>
              </View>
            )
          })
        ) : (
          <View style={[a.p_xl, a.align_center]}>
            <Text style={[t.atoms.text_contrast_medium]}>
              <Trans>No district data available for this state.</Trans>
            </Text>
          </View>
        )}
      </ScrollView>
    </OverlayFrame>
  )
}

export function MapLayersPanel({
  activeLayer,
  onSelectLayer,
}: MapLayersPanelProps) {
  const {gtMobile} = useBreakpoints()
  const t = useTheme()

  const layers: Array<{id: MapLayer; label: string; count?: number}> = [
    {id: 'states', label: 'States', count: TOTAL_STATES},
    {id: 'districts', label: 'Districts', count: TOTAL_DISTRICTS},
    {id: 'cities', label: 'Cities', count: TOTAL_MAJOR_CITIES},
    {id: 'civic', label: 'Civic', count: undefined},
  ]

  return (
    <View
      style={[
        a.absolute,
        {top: gtMobile ? 78 : 74, left: gtMobile ? 20 : 66},
        a.p_xs,
        a.rounded_xl,
        t.atoms.bg_contrast_25,
        web({backdropFilter: 'blur(10px)'}),
        a.border,
        t.atoms.border_contrast_low,
        a.shadow_lg,
        {width: gtMobile ? 176 : 164, zIndex: 20},
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_xs, a.mb_xs, a.px_xs]}>
        <LayersIcon fill={t.palette.primary_500} width={16} height={16} />
        <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
          <Trans>VIEW</Trans>
        </Text>
      </View>

      <View style={[a.gap_xs]}>
        {layers.map(layer => (
          <TouchableOpacity
            key={layer.id}
            accessibilityRole="tab"
            onPress={() => onSelectLayer(layer.id)}
            style={[
              a.flex_row,
              a.align_center,
              a.gap_xs,
              a.p_xs,
              a.rounded_md,
              activeLayer === layer.id
                ? [
                    t.atoms.bg_contrast_200,
                    a.border,
                    {borderColor: t.palette.primary_500},
                  ]
                : [a.border, {borderColor: 'transparent'}],
            ]}>
            <Text
              style={[
                a.text_xs,
                activeLayer === layer.id
                  ? [a.font_bold, t.atoms.text]
                  : t.atoms.text_contrast_medium,
              ]}>
              {layer.label}
            </Text>
            <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
              {layer.count}
            </Text>
            {activeLayer === layer.id && (
              <View style={[a.ml_auto]}>
                <Check fill={t.palette.primary_500} width={12} height={12} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const mapStyles = StyleSheet.create({
  searchContainer: {
    position: 'absolute',
    zIndex: 30,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
    marginRight: 8,
  },
  searchIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResults: {
    marginTop: 6,
    borderRadius: 14,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
})
