import {useState} from 'react'
import {ScrollView, TextInput, TouchableOpacity, View} from 'react-native'

import {type SearchResult} from '#/lib/constants/mapHelpers'
import {MEXICO_CITY_DATA} from '#/lib/constants/mexicoCityData'
import {IS_WEB} from '#/platform/detection'
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
import {CivicHeatToggle} from './CivicHeatToggle'
import {MapDiscourseLensContent} from './MapDiscourseLensContent'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MapLayer = 'states' | 'districts' | 'cities' | 'civic'

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
  civicHeatOn,
  onToggleCivicHeat,
  civicPointCount,
}: {
  activeLayer: MapLayer
  onSelectLayer: (layer: MapLayer) => void
  civicHeatOn: boolean
  onToggleCivicHeat: () => void
  civicPointCount: number
}) {
  const t = useTheme()

  const layers: Array<{
    id: MapLayer
    label: string
    description: string
    count?: number
  }> = [
    {
      id: 'states',
      label: 'States',
      description: 'National overview',
      count: TOTAL_STATES,
    },
    {
      id: 'districts',
      label: 'Districts',
      description: 'Federal electoral districts',
      count: TOTAL_DISTRICTS,
    },
    {
      id: 'cities',
      label: 'Cities',
      description: 'Major urban centers',
      count: TOTAL_MAJOR_CITIES,
    },
  ]

  return (
    <View style={[a.px_md, a.py_md, a.border_t, t.atoms.border_contrast_low]}>
      <View style={[a.flex_row, a.align_center, a.gap_sm, a.mb_sm]}>
        <View
          style={[
            a.align_center,
            a.justify_center,
            a.rounded_md,
            {
              width: 30,
              height: 30,
              backgroundColor: t.palette.primary_500 + '18',
            },
          ]}>
          <LayersIcon fill={t.palette.primary_500} width={17} height={17} />
        </View>
        <View style={[a.flex_1]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>Map view</Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            Choose the geography shown on the map
          </Text>
        </View>
      </View>

      <View style={[a.gap_sm]}>
        {layers.map(layer => {
          const selected = activeLayer === layer.id

          return (
            <TouchableOpacity
              key={layer.id}
              accessibilityRole="tab"
              accessibilityState={{selected}}
              onPress={() => onSelectLayer(layer.id)}
              style={[
                a.flex_row,
                a.align_center,
                a.gap_sm,
                a.px_md,
                a.py_sm,
                a.rounded_lg,
                a.border,
                {minHeight: 58},
                selected
                  ? {
                      borderColor: t.palette.primary_500,
                      backgroundColor: t.palette.primary_500 + '14',
                    }
                  : [t.atoms.bg_contrast_25, t.atoms.border_contrast_low],
                web({cursor: 'pointer'}),
                web({
                  transition:
                    'background-color 0.1s ease, border-color 0.1s ease',
                }),
                !selected &&
                  web({
                    ':hover': {backgroundColor: t.palette.contrast_100 + '40'},
                  }),
              ]}>
              <View style={[a.flex_1, {minWidth: 0}]}>
                <Text
                  style={[
                    a.text_md,
                    selected
                      ? [a.font_bold, t.atoms.text]
                      : t.atoms.text_contrast_high,
                  ]}>
                  {layer.label}
                </Text>
                <Text
                  style={[a.text_xs, t.atoms.text_contrast_medium]}
                  numberOfLines={1}>
                  {layer.description}
                </Text>
              </View>

              {typeof layer.count === 'number' && (
                <View
                  style={[
                    a.px_sm,
                    a.py_xs,
                    a.rounded_full,
                    selected
                      ? {backgroundColor: t.palette.primary_500 + '20'}
                      : t.atoms.bg_contrast_100,
                  ]}>
                  <Text
                    style={[
                      a.text_xs,
                      a.font_bold,
                      selected
                        ? {color: t.palette.primary_500}
                        : t.atoms.text_contrast_medium,
                    ]}>
                    {layer.count}
                  </Text>
                </View>
              )}

              <View
                style={[
                  a.align_center,
                  a.justify_center,
                  a.rounded_full,
                  {
                    width: 24,
                    height: 24,
                    backgroundColor: selected
                      ? t.palette.primary_500 + '20'
                      : 'transparent',
                  },
                ]}>
                {selected && (
                  <Check fill={t.palette.primary_500} width={14} height={14} />
                )}
              </View>
            </TouchableOpacity>
          )
        })}

        <CivicHeatToggle
          on={civicHeatOn}
          onToggle={onToggleCivicHeat}
          pointCount={civicPointCount}
        />
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
  const lensColor = active || pickerExpanded ? '#FF5A36' : t.palette.primary_500

  return (
    <View style={[a.px_md, a.py_md, a.border_t, t.atoms.border_contrast_low]}>
      <View style={[a.flex_row, a.align_center, a.gap_sm, a.mb_sm]}>
        <View
          style={[
            a.align_center,
            a.justify_center,
            a.rounded_md,
            {width: 30, height: 30, backgroundColor: lensColor + '18'},
          ]}>
          <FilterIcon fill={lensColor} width={17} height={17} />
        </View>
        <View style={[a.flex_1]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>Civic lens</Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            Tint states by matter or policy activity
          </Text>
        </View>
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
                a.py_sm,
                a.rounded_lg,
                a.border,
                selected
                  ? {
                      borderColor: lensColor,
                      backgroundColor: lensColor + '18',
                    }
                  : t.atoms.border_contrast_low,
              ]}>
              <Text
                style={[
                  a.text_md,
                  selected
                    ? [a.font_bold, {color: lensColor}]
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
            a.p_md,
            a.rounded_lg,
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
            a.p_md,
            a.rounded_lg,
            t.atoms.bg_contrast_25,
            a.border,
            t.atoms.border_contrast_low,
          ]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
            All civic activity
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_2xs]}>
            Pick a lens to highlight states with matching conversations.
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
          a.gap_sm,
          a.p_md,
          a.rounded_lg,
          a.border,
          a.overflow_hidden,
          active || pickerExpanded
            ? {borderColor: '#FF5A36'}
            : t.atoms.border_contrast_low,
          active || pickerExpanded
            ? {backgroundColor: '#FF5A3614'}
            : t.atoms.bg_contrast_100,
          {minHeight: 64},
        ]}>
        <View
          style={[
            a.align_center,
            a.justify_center,
            a.rounded_md,
            {
              width: 36,
              height: 36,
              backgroundColor:
                active || pickerExpanded ? '#FF5A3620' : t.palette.contrast_100,
            },
          ]}>
          <FilterIcon
            fill={
              active || pickerExpanded
                ? '#FF5A36'
                : t.atoms.text_contrast_medium.color
            }
            width={17}
            height={17}
          />
        </View>
        <View style={[a.flex_1, {minWidth: 0}]}>
          <Text
            style={[
              a.text_md,
              a.font_bold,
              active || pickerExpanded ? {color: '#FF5A36'} : t.atoms.text,
            ]}>
            {active ? 'Change lens' : 'Choose lens'}
          </Text>
          <Text
            style={[a.text_xs, t.atoms.text_contrast_medium]}
            numberOfLines={1}>
            {active
              ? `${discourseType}: ${selectedDiscourseItem}`
              : 'Matter and policy heatmaps'}
          </Text>
        </View>
        {IS_WEB && (
          <View
            style={[
              a.align_center,
              a.justify_center,
              a.rounded_full,
              {
                width: 28,
                height: 28,
                backgroundColor:
                  active || pickerExpanded ? '#FF5A3620' : 'transparent',
              },
            ]}>
            {pickerExpanded ? (
              <ChevronUp
                width={16}
                height={16}
                fill={
                  active || pickerExpanded
                    ? '#FF5A36'
                    : t.atoms.text_contrast_medium.color
                }
              />
            ) : (
              <ChevronDown
                width={16}
                height={16}
                fill={
                  active || pickerExpanded
                    ? '#FF5A36'
                    : t.atoms.text_contrast_medium.color
                }
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
            a.overflow_hidden,
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
