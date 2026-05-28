import {useMemo, useState} from 'react'
import {ScrollView, TextInput, TouchableOpacity, View} from 'react-native'
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
import {IS_WEB} from '#/platform/detection'
import {useCabildeosQuery} from '#/state/queries/cabildeo'
import {atoms as a, useTheme, web} from '#/alf'
import {Check_Stroke2_Corner0_Rounded as Check} from '#/components/icons/Check'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronDown,
  ChevronTop_Stroke2_Corner0_Rounded as ChevronUp,
} from '#/components/icons/Chevron'
import {CircleX_Stroke2_Corner0_Rounded as CircleX} from '#/components/icons/CircleX'
import {Filter_Stroke2_Corner0_Rounded as FilterIcon} from '#/components/icons/Filter'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as MagnifyingGlass} from '#/components/icons/MagnifyingGlass'
import {SquareBehindSquare4_Stroke2_Corner0_Rounded as LayersIcon} from '#/components/icons/SquareBehindSquare4'
import {Text} from '#/components/Typography'
import {MapSidebarPanel} from './MapDesktopLayout'
import {MapDiscourseLensContent} from './MapDiscourseLensContent'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MapLayer = 'states' | 'districts' | 'cities' | 'civic'

// ---------------------------------------------------------------------------
// Shared mini action
// ---------------------------------------------------------------------------

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
        web({cursor: 'pointer'}),
        web({transition: 'background-color 0.1s ease'}),
        !active && web({':hover': {backgroundColor: t.palette.contrast_100 + '30'}}),
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

// ---------------------------------------------------------------------------
// Sidebar-native Search (no absolute positioning)
// ---------------------------------------------------------------------------

export function MapSidebarSearch({
  searchQuery,
  setSearchQuery,
  searchResults,
  recentSearchResults,
  onSelect,
}: {
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchResults: SearchResult[]
  recentSearchResults: SearchResult[]
  onSelect: (result: SearchResult) => void
}) {
  const t = useTheme()
  const [expanded, setExpanded] = useState(false)
  const hasQuery = searchQuery.trim().length > 0

  const groups = [
    {type: 'state' as const, label: 'States'},
    {type: 'district' as const, label: 'Districts'},
    {type: 'city' as const, label: 'Cities'},
  ]
    .map(g => ({...g, items: searchResults.filter(r => r.type === g.type)}))
    .filter(g => g.items.length > 0)

  return (
    <View style={[a.gap_sm]}>
      <View
        style={[
          a.flex_row,
          a.align_center,
          a.px_md,
          a.py_sm,
          a.rounded_lg,
          t.atoms.bg_contrast_50,
          a.border,
          t.atoms.border_contrast_low,
        ]}>
        <MagnifyingGlass
          fill={t.atoms.text_contrast_medium.color}
          width={18}
          height={18}
        />
        <TextInput
          accessibilityRole="search"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setExpanded(true)}
          placeholder="Search states, districts or cities"
          placeholderTextColor={t.atoms.text_contrast_medium.color}
          style={[
            a.flex_1,
            a.ml_sm,
            a.text_md,
            t.atoms.text,
            {paddingVertical: 4},
          ]}
          returnKeyType="search"
        />
        {hasQuery && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              setSearchQuery('')
              setExpanded(false)
            }}>
            <CircleX
              fill={t.atoms.text_contrast_medium.color}
              width={18}
              height={18}
            />
          </TouchableOpacity>
        )}
      </View>

      {expanded && (groups.length > 0 || recentSearchResults.length > 0) && (
        <View
          style={[
            a.rounded_xl,
            t.atoms.bg_contrast_100,
            web({backdropFilter: 'blur(16px)'}),
            a.border,
            t.atoms.border_contrast_low,
            a.overflow_hidden,
            {maxHeight: 280},
          ]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {!hasQuery && recentSearchResults.length > 0 && (
              <View>
                <SectionHeader label="Recent" />
                {recentSearchResults.map((result, i) => (
                  <SearchResultRow
                    key={`recent-${i}`}
                    result={result}
                    query={searchQuery}
                    onSelect={r => {
                      onSelect(r)
                      setExpanded(false)
                    }}
                  />
                ))}
              </View>
            )}
            {groups.map(g => (
              <View key={g.type}>
                <SectionHeader label={g.label} />
                {g.items.map((result, i) => (
                  <SearchResultRow
                    key={`${g.type}-${i}`}
                    result={result}
                    query={searchQuery}
                    onSelect={r => {
                      onSelect(r)
                      setExpanded(false)
                    }}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {expanded && hasQuery && groups.length === 0 && (
        <View
          style={[
            a.p_md,
            a.rounded_xl,
            t.atoms.bg_contrast_100,
            a.border,
            t.atoms.border_contrast_low,
          ]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
            No matches found
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_xs]}>
            Try a state name, a district number like "Distrito 7", or a major
            city.
          </Text>
        </View>
      )}
    </View>
  )
}

function SearchResultRow({
  result,
  query: _query,
  onSelect,
}: {
  result: SearchResult
  query: string
  onSelect: (result: SearchResult) => void
}) {
  const t = useTheme()
  const badgeColor =
    result.type === 'state'
      ? t.palette.primary_500
      : result.type === 'district'
        ? '#D97706'
        : t.atoms.text_contrast_medium.color

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={() => onSelect(result)}
      style={[
        a.flex_row,
        a.align_center,
        a.p_md,
        {
          borderBottomWidth: 1,
          borderBottomColor: t.atoms.border_contrast_low.borderColor,
        },
        web({cursor: 'pointer'}),
        web({transition: 'background-color 0.1s ease'}),
        web({':hover': {backgroundColor: t.palette.contrast_100 + '30'}}),
      ]}>
      <View style={[a.flex_1, a.pr_sm]}>
        <Text style={[a.text_md, t.atoms.text]}>{result.name}</Text>
        {!!result.subtitle && (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {result.subtitle}
          </Text>
        )}
      </View>
      <View
        style={[
          a.px_sm,
          a.py_xs,
          a.rounded_md,
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

// ---------------------------------------------------------------------------
// Sidebar-native Layers (no absolute positioning)
// ---------------------------------------------------------------------------

const TOTAL_STATES = 32
const TOTAL_DISTRICTS = 300
const TOTAL_MAJOR_CITIES = Object.values(MEXICO_CITY_DATA).reduce(
  (total, cities) => total + cities.length,
  0,
)

export function MapSidebarLayers({
  activeLayer,
  onSelectLayer,
}: {
  activeLayer: MapLayer
  onSelectLayer: (layer: MapLayer) => void
}) {
  const t = useTheme()

  const layers: Array<{id: MapLayer; label: string; count: number}> = [
    {id: 'states', label: 'States', count: TOTAL_STATES},
    {id: 'districts', label: 'Districts', count: TOTAL_DISTRICTS},
    {id: 'cities', label: 'Cities', count: TOTAL_MAJOR_CITIES},
    {id: 'civic', label: 'Civic', count: 0},
  ]

  return (
    <View style={[a.px_md, a.py_sm, a.border_t, t.atoms.border_contrast_low]}>
      <View style={[a.flex_row, a.align_center, a.gap_xs, a.mb_xs]}>
        <LayersIcon fill={t.palette.primary_500} width={16} height={16} />
        <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
          VIEW
        </Text>
      </View>

      <View style={[a.gap_2xs]}>
        {layers.map(layer => (
          <TouchableOpacity
            key={layer.id}
            accessibilityRole="tab"
            onPress={() => onSelectLayer(layer.id)}
            style={[
              a.flex_row,
              a.align_center,
              a.gap_xs,
              a.px_sm,
              a.py_xs,
              a.rounded_md,
              {minHeight: 30},
              activeLayer === layer.id
                ? {backgroundColor: t.palette.primary_500 + '18'}
                : undefined,
              web({cursor: 'pointer'}),
              web({transition: 'background-color 0.1s ease'}),
              web({':hover': {backgroundColor: t.palette.contrast_100 + '40'}}),
            ]}>
            <Text
              style={[
                a.text_xs,
                a.flex_1,
                activeLayer === layer.id
                  ? [a.font_bold, t.atoms.text]
                  : t.atoms.text_contrast_medium,
              ]}>
              {layer.label}
            </Text>
            <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
              {layer.count || ''}
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

// ---------------------------------------------------------------------------
// Sidebar-native Zone Filters
// ---------------------------------------------------------------------------

export function MapSidebarZoneFilters({
  discourseType,
  selectedDiscourseItem,
  onSelectDiscourseType,
  onSelectDiscourseItem,
  onClear,
  onOpenPicker,
}: {
  discourseType: 'Matter' | 'Policy'
  selectedDiscourseItem: string
  onSelectDiscourseType: (type: 'Matter' | 'Policy') => void
  onSelectDiscourseItem: (item: string, type: 'Matter' | 'Policy') => void
  onClear: () => void
  onOpenPicker: () => void
}) {
  const t = useTheme()
  const [pickerExpanded, setPickerExpanded] = useState(false)
  const active =
    selectedDiscourseItem.length > 0 && selectedDiscourseItem !== 'Any'

  return (
    <View style={[a.px_md, a.py_sm, a.border_t, t.atoms.border_contrast_low]}>
      <View style={[a.flex_row, a.align_center, a.gap_xs, a.mb_sm]}>
        <FilterIcon
          fill={active ? '#FF5A36' : t.palette.primary_500}
          width={16}
          height={16}
        />
        <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
          ZONE FILTERS
        </Text>
        {active && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onClear}
            style={[a.ml_auto, a.px_sm, a.py_xs, a.rounded_full]}>
            <Text style={[a.text_xs, a.font_bold, {color: '#FF5A36'}]}>
              Clear
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[a.flex_row, a.gap_sm, a.mb_md]}>
        {(['Matter', 'Policy'] as const).map(type => {
          const selected = discourseType === type
          return (
            <TouchableOpacity
              key={type}
              accessibilityRole="tab"
              onPress={() => onSelectDiscourseType(type)}
              style={[
                a.flex_1,
                a.align_center,
                a.py_xs,
                a.rounded_md,
                a.border,
                selected
                  ? {
                      borderColor: t.palette.primary_500,
                      backgroundColor: t.palette.primary_500 + '18',
                    }
                  : t.atoms.border_contrast_low,
              ]}>
              <Text
                style={[
                  a.text_sm,
                  selected
                    ? [a.font_bold, {color: t.palette.primary_500}]
                    : t.atoms.text_contrast_medium,
                ]}>
                {type}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {active && (
        <View
          style={[
            a.mb_md,
            a.p_sm,
            a.rounded_md,
            {backgroundColor: '#FF5A3618'},
            a.border,
            {borderColor: '#FF5A3636'},
          ]}>
          <Text style={[a.text_2xs, a.font_bold, {color: '#FF5A36'}]}>
            ACTIVE HEATMAP
          </Text>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mt_2xs]}>
            {selectedDiscourseItem}
          </Text>
        </View>
      )}

      {!active && (
        <View
          style={[
            a.mb_md,
            a.p_sm,
            a.rounded_md,
            t.atoms.bg_contrast_25,
            a.border,
            t.atoms.border_contrast_low,
          ]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            No heatmap lens selected.
          </Text>
        </View>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => {
          if (IS_WEB) {
            setPickerExpanded(v => !v)
          } else {
            onOpenPicker()
          }
        }}
        style={[
          a.flex_row,
          a.align_center,
          a.justify_center,
          a.gap_xs,
          a.py_xs,
          a.rounded_md,
          a.border,
          active || pickerExpanded
            ? {borderColor: '#FF5A36'}
            : t.atoms.border_contrast_low,
          active || pickerExpanded
            ? {backgroundColor: '#FF5A3614'}
            : t.atoms.bg_contrast_100,
        ]}>
        <FilterIcon
          fill={
            active || pickerExpanded
              ? '#FF5A36'
              : t.atoms.text_contrast_medium.color
          }
          width={14}
          height={14}
        />
        <Text
          style={[
            a.text_sm,
            a.font_bold,
            active || pickerExpanded ? {color: '#FF5A36'} : t.atoms.text,
          ]}>
          {active ? 'Change lens' : 'Choose lens'}
        </Text>
        {IS_WEB && (
          <View style={[a.ml_auto]}>
            {pickerExpanded ? (
              <ChevronUp
                width={14}
                height={14}
                fill={active || pickerExpanded ? '#FF5A36' : t.atoms.text_contrast_medium.color}
              />
            ) : (
              <ChevronDown
                width={14}
                height={14}
                fill={active || pickerExpanded ? '#FF5A36' : t.atoms.text_contrast_medium.color}
              />
            )}
          </View>
        )}
      </TouchableOpacity>

      {IS_WEB && pickerExpanded && (
        <View
          style={[
            a.mt_md,
            a.p_md,
            a.rounded_lg,
            t.atoms.bg,
            a.border,
            t.atoms.border_contrast_low,
            web({transition: 'opacity 0.15s ease-out'}),
            web({
              boxShadow:
                '0 4px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
            }),
            web({maxHeight: '60vh', display: 'flex', flexDirection: 'column'}),
          ]}>
          <MapDiscourseLensContent
            discourseType={discourseType}
            onChangeDiscourseType={onSelectDiscourseType}
            selectedDiscourseItem={selectedDiscourseItem}
            onSelectDiscourseItem={(item, type) => {
              onSelectDiscourseItem(item, type)
              setPickerExpanded(false)
            }}
            onClear={() => {
              onClear()
              setPickerExpanded(false)
            }}
          />
        </View>
      )}
    </View>
  )
}

// ---------------------------------------------------------------------------
// State Summary Panel
// ---------------------------------------------------------------------------

export function StateSummarySidebar({
  selectedState,
  onShowCities,
  onShowDistricts,
  onClear,
}: {
  selectedState: {name: string}
  onShowCities: () => void
  onShowDistricts: () => void
  onClear: () => void
}) {
  const t = useTheme()
  const navRef = useNavigation<NavigationProp>()
  const {data: allCabildeos = []} = useCabildeosQuery()

  const activeCabildeos = allCabildeos.filter(
    c =>
      normalizeMexicoStateName(c.region || '') ===
        normalizeMexicoStateName(selectedState.name) && c.phase !== 'resolved',
  )
  const districtCount = getDistrictsByState(selectedState.name).length
  const cityCount =
    Object.entries(MEXICO_CITY_DATA).find(
      ([candidate]) =>
        normalizeMexicoStateName(candidate) ===
        normalizeMexicoStateName(selectedState.name),
    )?.[1].length || 0
  const stats =
    STATE_DEMOGRAPHICS[selectedState.name] || STATE_DEMOGRAPHICS['default']

  return (
    <MapSidebarPanel>
      <View style={[a.flex_row, a.justify_between, a.align_center]}>
        <View style={[a.flex_1]}>
          <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
            STATE SUMMARY
          </Text>
          <Text style={[a.text_2xl, a.font_bold, t.atoms.text, a.mt_2xs]}>
            {selectedState.name}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onClear}
          style={[a.p_xs, a.rounded_full, t.atoms.bg_contrast_100]}>
          <Text style={[a.text_md, a.font_bold, t.atoms.text_contrast_medium]}>
            ✕
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[a.flex_row, a.gap_sm]}>
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

      <View style={[a.flex_row, a.gap_sm]}>
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
    </MapSidebarPanel>
  )
}

// ---------------------------------------------------------------------------
// Districts Browser Panel
// ---------------------------------------------------------------------------

export function DistrictsSidebar({
  selectedState,
  selectedDistrictId,
  onSelectDistrict,
  onBackToState,
}: {
  selectedState: {name: string}
  selectedDistrictId: number | null
  onSelectDistrict: (districtId: number) => void
  onBackToState: () => void
}) {
  const t = useTheme()
  const navRef = useNavigation<NavigationProp>()
  const {data: allCabildeos = []} = useCabildeosQuery()

  const districts = useMemo(
    () =>
      [...getDistrictsByState(selectedState.name)].sort(
        (a, b) => a.districtNumber - b.districtNumber,
      ),
    [selectedState.name],
  )

  const selectedDistrict =
    districts.find(d => d.id === selectedDistrictId) || null

  return (
    <MapSidebarPanel>
      <View style={[a.flex_row, a.justify_between, a.align_center]}>
        <View style={[a.flex_1]}>
          <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
            FEDERAL DISTRICTS
          </Text>
          <Text style={[a.text_2xl, a.font_bold, t.atoms.text, a.mt_2xs]}>
            {selectedState.name}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onBackToState}
          style={[a.p_xs, a.rounded_full, t.atoms.bg_contrast_100]}>
          <Text style={[a.text_md, a.font_bold, t.atoms.text_contrast_medium]}>
            ←
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
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

      {selectedDistrict && <DistrictContextCard district={selectedDistrict} />}

      <ScrollView
        style={[a.flex_1]}
        contentContainerStyle={[a.gap_md, a.pb_lg]}
        showsVerticalScrollIndicator={false}>
        {districts.map(district => {
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
            <TouchableOpacity
              key={district.id}
              accessibilityRole="button"
              onPress={() => onSelectDistrict(district.id)}
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
                web({cursor: 'pointer'}),
                web({transition: 'transform 0.1s ease, box-shadow 0.1s ease'}),
                !isSelected && web({':hover': {transform: 'translateY(-1px)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'}}),
              ]}>
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
                    style={[a.text_xs, a.font_bold, {color: district.accent}]}>
                    {district.dominantParty}
                  </Text>
                </View>
              </View>
              <Text style={[a.text_sm, t.atoms.text_contrast_high]}>
                Turnout <Text style={[a.font_bold]}>{district.turnout}%</Text>
                {' · '}Registered{' '}
                <Text style={[a.font_bold]}>
                  {district.registeredVoters.toLocaleString()}
                </Text>
              </Text>
              <Text
                style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_xs]}
                numberOfLines={1}>
                Deputy: {district.currentDeputy} ({district.deputyParty})
              </Text>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_sm]}>
                {districtCabildeos.length} cabildeo
                {districtCabildeos.length === 1 ? '' : 's'} ·{' '}
                {districtQuestions.length} open question
                {districtQuestions.length === 1 ? '' : 's'}
              </Text>

              <View style={[a.flex_row, a.gap_sm, a.flex_wrap, a.mt_md]}>
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
              </View>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </MapSidebarPanel>
  )
}

function DistrictContextCard({district}: {district: ElectoralDistrict}) {
  const t = useTheme()
  const navRef = useNavigation<NavigationProp>()
  const {data: allCabildeos = []} = useCabildeosQuery()
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
            {districtCabildeos.length + districtQuestions.length}
          </Text>
          <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
            Civic items
          </Text>
        </View>
      </View>

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

// ---------------------------------------------------------------------------
// Cities Panel
// ---------------------------------------------------------------------------

export function CitiesSidebar({
  selectedState,
  onBackToState,
}: {
  selectedState: {name: string}
  onBackToState: () => void
}) {
  const t = useTheme()

  const cityData =
    Object.entries(MEXICO_CITY_DATA).find(
      ([candidate]) =>
        normalizeMexicoStateName(candidate) ===
        normalizeMexicoStateName(selectedState.name),
    )?.[1] || []

  return (
    <MapSidebarPanel>
      <View style={[a.flex_row, a.justify_between, a.align_center]}>
        <View style={[a.flex_1]}>
          <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
            MAJOR CITIES
          </Text>
          <Text style={[a.text_2xl, a.font_bold, t.atoms.text, a.mt_2xs]}>
            {selectedState.name}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onBackToState}
          style={[a.p_xs, a.rounded_full, t.atoms.bg_contrast_100]}>
          <Text style={[a.text_md, a.font_bold, t.atoms.text_contrast_medium]}>
            ←
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          a.p_md,
          a.rounded_lg,
          t.atoms.bg_contrast_25,
          a.border,
          t.atoms.border_contrast_low,
        ]}>
        <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
          URBAN SNAPSHOT
        </Text>
        <Text style={[a.text_lg, a.font_bold, t.atoms.text, a.mt_xs]}>
          {cityData.length} mapped major cit
          {cityData.length === 1 ? 'y' : 'ies'}
        </Text>
      </View>

      <ScrollView
        style={[a.flex_1]}
        contentContainerStyle={[a.gap_md, a.pb_lg]}
        showsVerticalScrollIndicator={false}>
        {cityData.length > 0 ? (
          cityData.map((city, index) => (
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
                Population: <Text style={[a.font_bold]}>{city.population}</Text>
              </Text>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_xs]}>
                Mayor: {city.governing_mayor}
              </Text>
            </View>
          ))
        ) : (
          <View style={[a.p_xl, a.align_center]}>
            <Text style={[t.atoms.text_contrast_medium]}>
              No city data available for this state.
            </Text>
          </View>
        )}
      </ScrollView>
    </MapSidebarPanel>
  )
}
