import {useRef, useState} from 'react'
import {
  Modal,
  ScrollView,
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {MEXICAN_STATES} from '#/lib/constants/mexico'
import {type NavigationProp} from '#/lib/routes/types'
import {useCompassFilter} from '#/state/shell/compass-filter'
import {Text} from '#/view/com/util/text/Text'
import {BlockDrawerGesture} from '#/view/shell/BlockDrawerGesture'
import {atoms as a, useTheme} from '#/alf'
import {CommunityCard} from '#/components/CommunityCard'
import * as Toggle from '#/components/forms/Toggle'
import {Compass_Stroke2_Corner0_Rounded as CompassIcon} from '#/components/icons/Compass'
import {WebScrollControls} from '#/components/WebScrollControls'
import {WheelPicker} from '#/components/WheelPicker'
import {IS_WEB} from '#/env'

// 9ths Communities
const ninthCommunities = [
  {name: 'Auth Left', color: '#F93A3A'},
  {name: 'Lib Left', color: '#34C759'},
  {name: 'Center Left', color: '#5AC8FA'},
  {name: 'Auth Econocenter', color: '#FF3B30'},
  {name: 'Center Econocenter', color: '#FFCC00'},
  {name: 'Lib Econocenter', color: '#30B0C7'},
  {name: 'Center Right', color: '#007AFF'},
  {name: 'Lib Right', color: '#AF52DE'},
  {name: 'Auth Right', color: '#5856D6'},
]

// Official Parties
const officialParties = [
  {name: 'Morena', fullName: 'Morena', color: '#610200'},
  {name: 'PAN', fullName: 'PAN', color: '#004990'},
  {name: 'PRI', fullName: 'PRI', color: '#CE1126'},
  {name: 'PVEM', fullName: 'PVEM', color: '#50B747'},
  {name: 'PT', fullName: 'PT', color: '#D92027'},
  {name: 'MC', fullName: 'Movimiento Ciudadano', color: '#FF8300'},
  {name: 'Migala', fullName: 'Migala', color: '#6B21A8'},
]

const allCommunities = [...ninthCommunities, ...officialParties]
const filterColorByName = new Map(
  allCommunities.map(item => [item.name, item.color]),
)
const fallbackFilterColors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE']
const FILTER_STACK_MAX = 3
const STACK_DOT_SIZE = 24
const STACK_DOT_INNER_SIZE = 18
const STACK_DOT_OVERLAP = 9
const STACK_MORE_WIDTH = 20

function getFilterColor(name: string, index: number) {
  if (MEXICAN_STATES.includes(name)) return '#007AFF'
  return (
    filterColorByName.get(name) ||
    fallbackFilterColors[index % fallbackFilterColors.length]
  )
}

export function ActiveFiltersStackButton() {
  const {_} = useLingui()
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const {activeFilters, removeActiveFilter} = useCompassFilter()
  const [showFilters, setShowFilters] = useState(false)
  const visibleFilters = activeFilters.slice(0, FILTER_STACK_MAX)
  const remainingFilters = Math.max(
    activeFilters.length - visibleFilters.length,
    0,
  )

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={_(msg`Open active filters`)}
        accessibilityHint={_(
          msg`Shows active filters and lets you remove them`,
        )}
        style={styles.activeFiltersButton}
        onPress={() => setShowFilters(true)}>
        {activeFilters.length === 0 ? (
          <CompassIcon size="lg" style={t.atoms.text} />
        ) : (
          <View
            style={[
              styles.filterStackWrap,
              {
                width:
                  STACK_DOT_SIZE +
                  (visibleFilters.length - 1) *
                    (STACK_DOT_SIZE - STACK_DOT_OVERLAP) +
                  (remainingFilters > 0 ? STACK_MORE_WIDTH : 0),
              },
            ]}>
            {visibleFilters.map((filter, index) => (
              <View
                key={filter}
                style={[
                  styles.filterStackDot,
                  {
                    marginLeft: index === 0 ? 0 : -STACK_DOT_OVERLAP,
                    zIndex: visibleFilters.length - index,
                    borderColor: t.atoms.bg.backgroundColor,
                  },
                ]}>
                <View
                  style={[
                    styles.filterStackDotInner,
                    {backgroundColor: getFilterColor(filter, index)},
                  ]}
                />
              </View>
            ))}
            {remainingFilters > 0 && (
              <View
                style={[
                  styles.filterStackMore,
                  {
                    marginLeft: -STACK_DOT_OVERLAP,
                    borderColor: t.atoms.bg.backgroundColor,
                    backgroundColor: t.palette.contrast_200,
                  },
                ]}>
                <Text style={styles.filterStackMoreText}>
                  +{remainingFilters}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={showFilters}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.activeFiltersModalContent, t.atoms.bg]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, t.atoms.text]}>
              <Trans>Active filters</Trans>
            </Text>
            <Text
              style={[
                styles.activeFiltersSubtitle,
                t.atoms.text_contrast_medium,
              ]}>
              <Trans>
                Remove filters here. To add or change filters, go back to Base.
              </Trans>
            </Text>

            <View style={styles.activeFiltersList}>
              {activeFilters.length === 0 ? (
                <Text
                  style={[
                    styles.activeFiltersEmpty,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>No active filters</Trans>
                </Text>
              ) : (
                activeFilters.map((filter, index) => (
                  <View
                    key={filter}
                    style={[
                      styles.activeFilterRow,
                      {borderColor: t.palette.contrast_100},
                    ]}>
                    <View style={styles.activeFilterLabelWrap}>
                      <View
                        style={[
                          styles.activeFilterDot,
                          {backgroundColor: getFilterColor(filter, index)},
                        ]}
                      />
                      <Text style={[styles.activeFilterLabel, t.atoms.text]}>
                        {filter}
                      </Text>
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={_(msg`Remove filter`)}
                      accessibilityHint={_(
                        msg`Removes this filter from active filters`,
                      )}
                      onPress={() => removeActiveFilter(filter)}
                      style={styles.removeFilterButton}>
                      <Text
                        style={[
                          styles.removeFilterText,
                          t.atoms.text_contrast_medium,
                        ]}>
                        ×
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.navigateBaseButton,
                {borderColor: t.palette.contrast_200},
              ]}
              onPress={() => {
                setShowFilters(false)
                navigation.navigate('Data')
              }}>
              <Text style={[styles.navigateBaseButtonText, t.atoms.text]}>
                <Trans>Go to Data to edit filters</Trans>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.closeButton,
                {backgroundColor: t.palette.primary_500},
              ]}
              onPress={() => setShowFilters(false)}>
              <Text style={styles.closeButtonText}>
                <Trans>Done</Trans>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

export function CompassSettingsButton() {
  const t = useTheme()
  const {
    viewMode,
    setViewMode,
    selectedState,
    setSelectedState,
    selectedFilters,
    toggleFilter,
    showCommunities,
    setShowCommunities,
  } = useCompassFilter()
  const [showSettings, setShowSettings] = useState(false)

  const mexicanStates = ['None', ...MEXICAN_STATES]

  const selectedStateFilters = selectedFilters.filter(f =>
    mexicanStates.includes(f),
  )

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="View settings"
        accessibilityHint="Opens filter and sort options"
        style={styles.filterButton}
        onPress={() => setShowSettings(true)}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
        <CompassIcon size="lg" style={t.atoms.text} />
      </TouchableOpacity>

      <Modal
        visible={showSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, t.atoms.bg]}>
            <View style={styles.modalHandle} />

            <Text style={[styles.modalTitle, t.atoms.text]}>View settings</Text>

            <View style={styles.settingsSection}>
              <Text
                style={[
                  styles.settingsSectionTitle,
                  t.atoms.text,
                  {marginTop: 16},
                ]}>
                Show communities
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                style={styles.settingsOption}
                onPress={() => setViewMode('View official parties')}>
                <Text style={[styles.settingsOptionText, t.atoms.text]}>
                  View official parties
                </Text>
                <View
                  style={[
                    styles.radioButton,
                    viewMode === 'View official parties' &&
                      styles.radioButtonSelected,
                  ]}>
                  {viewMode === 'View official parties' && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                style={styles.settingsOption}
                onPress={() => setViewMode("View by 9th's")}>
                <Text style={[styles.settingsOptionText, t.atoms.text]}>
                  View by 9th's
                </Text>
                <View
                  style={[
                    styles.radioButton,
                    viewMode === "View by 9th's" && styles.radioButtonSelected,
                  ]}>
                  {viewMode === "View by 9th's" && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <View
                style={[
                  {marginBottom: 12}, // Kept marginBottom for spacing
                ]}>
                <Text
                  style={[
                    styles.settingsSectionTitle,
                    t.atoms.text,
                    {marginBottom: 0},
                  ]}>
                  View by state
                </Text>
              </View>

              <WheelPicker
                items={mexicanStates}
                selectedValue={selectedState}
                onValueChange={value => setSelectedState(value)}
                theme={t}
                visibleRowCount={3}
              />

              {selectedStateFilters.length > 0 && (
                <View style={{marginTop: 10}}>
                  {selectedStateFilters.map(state => (
                    <View
                      key={state}
                      style={[
                        a.flex_row,
                        a.justify_between,
                        a.align_center,
                        {
                          paddingVertical: 8,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderColor: t.palette.contrast_200,
                        },
                      ]}>
                      <Text style={[t.atoms.text, {fontSize: 16}]}>
                        {state}
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => toggleFilter(state)}
                        style={{padding: 4}}>
                        <Text style={{color: '#8E8E93', fontWeight: 'bold'}}>
                          X
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View
                style={[
                  a.align_center,
                  {marginTop: selectedStateFilters.length > 0 ? 10 : 6},
                ]}>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => {
                    if (
                      selectedState !== 'None' &&
                      !selectedFilters.includes(selectedState)
                    ) {
                      if (selectedStateFilters.length < 2) {
                        toggleFilter(selectedState)
                      }
                    }
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: t.palette.primary_500,
                    opacity: selectedStateFilters.length >= 2 ? 0.5 : 1,
                  }}
                  disabled={selectedStateFilters.length >= 2}>
                  <Text style={{color: 'white', fontWeight: 'bold'}}>
                    Add view
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderColor: t.palette.contrast_100,
                }}>
                <Toggle.Group
                  label="Communities visibility"
                  type="checkbox"
                  values={!showCommunities ? ['hide_communities'] : []}
                  onChange={values =>
                    setShowCommunities(!values.includes('hide_communities'))
                  }>
                  <Toggle.Item
                    name="hide_communities"
                    label="Hide communities cards"
                    style={styles.settingsOption}>
                    <Text style={[styles.settingsOptionText, t.atoms.text]}>
                      Hide communities cards
                    </Text>
                    <Toggle.Switch />
                  </Toggle.Item>
                </Toggle.Group>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.closeButton,
                {backgroundColor: t.palette.primary_500},
              ]}
              onPress={() => setShowSettings(false)}>
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

export function CommunityFilterList({
  hasPendingChanges,
  applyFilters,
  filterCount,
  hideBorder,
  style,
}: {
  hasPendingChanges?: boolean
  applyFilters?: () => void
  filterCount?: number
  hideBorder?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const {viewMode, selectedFilters, toggleFilter, showCommunities} =
    useCompassFilter()
  const scrollViewRef = useRef<ScrollView>(null)
  const {_} = useLingui()

  if (!showCommunities) return null

  const mexicanStates = MEXICAN_STATES

  return (
    <View
      style={[
        styles.communitySection,
        !hideBorder && t.atoms.border_contrast_low,
        style,
      ]}>
      <View style={{position: 'relative'}}>
        {/* Apply Button - Web: Top Right over Chevrons */}
        {IS_WEB && hasPendingChanges && applyFilters && (
          <TouchableOpacity
            style={[
              styles.applyButtonSmall,
              {backgroundColor: t.palette.primary_500},
            ]}
            onPress={applyFilters}
            accessibilityRole="button"
            accessibilityLabel={_(msg`Apply filters`)}
            accessibilityHint={_(
              msg`Applies the selected filters to the view`,
            )}>
            <Text style={[styles.applyButtonTextSmall, {color: '#FFFFFF'}]}>
              <Trans>Apply ({filterCount})</Trans>
            </Text>
          </TouchableOpacity>
        )}

        <WebScrollControls scrollViewRef={scrollViewRef} />
        <BlockDrawerGesture>
          <ScrollView
            ref={scrollViewRef}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.communityCardsContainer}>
            {selectedFilters.map(filterName => {
              let community = allCommunities.find(c => c.name === filterName)
              if (!community) {
                if (mexicanStates.includes(filterName)) {
                  community = {name: filterName, color: '#007AFF'}
                } else {
                  return null
                }
              }
              return (
                <CommunityCard
                  key={community.name}
                  name={community.name}
                  color={community.color}
                  isPinned={true}
                  onToggle={() => toggleFilter(community.name)}
                  onProfile={() =>
                    navigation.navigate('CommunityProfile', {
                      communityId: community.name,
                      communityName: community.name,
                    })
                  }
                />
              )
            })}

            {viewMode === "View by 9th's"
              ? ninthCommunities
                  .filter(c => !selectedFilters.includes(c.name))
                  .map(community => (
                    <CommunityCard
                      key={community.name}
                      name={community.name}
                      color={community.color}
                      isPinned={false}
                      onToggle={() => toggleFilter(community.name)}
                      onProfile={() =>
                        navigation.navigate('CommunityProfile', {
                          communityId: community.name,
                          communityName: community.name,
                        })
                      }
                    />
                  ))
              : officialParties
                  .filter(p => !selectedFilters.includes(p.name))
                  .map(party => (
                    <CommunityCard
                      key={party.name}
                      name={party.name}
                      color={party.color}
                      isPinned={false}
                      onToggle={() => toggleFilter(party.name)}
                      onProfile={() =>
                        navigation.navigate('CommunityProfile', {
                          communityId: party.name,
                          communityName: party.name,
                        })
                      }
                    />
                  ))}
          </ScrollView>
        </BlockDrawerGesture>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  activeFiltersButton: {
    width: 40,
    paddingHorizontal: 0,
    paddingVertical: 8,
    marginRight: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterStackWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterStackDot: {
    width: STACK_DOT_SIZE,
    height: STACK_DOT_SIZE,
    borderRadius: STACK_DOT_SIZE / 2,
    borderWidth: 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterStackDotInner: {
    width: STACK_DOT_INNER_SIZE,
    height: STACK_DOT_INNER_SIZE,
    borderRadius: STACK_DOT_INNER_SIZE / 2,
  },
  filterStackMore: {
    minWidth: STACK_MORE_WIDTH,
    height: STACK_DOT_SIZE,
    borderRadius: STACK_DOT_SIZE / 2,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterStackMoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f2430',
  },
  filterButton: {
    width: 44,
    paddingHorizontal: 0,
    paddingVertical: 8,
    marginRight: -14, // Symmetric with myBaseButton's marginLeft
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    ...(IS_WEB
      ? {
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }
      : {
          justifyContent: 'flex-end',
        }),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '90%',
    ...(IS_WEB && {
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
      borderRadius: 20,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    }),
  },

  activeFiltersModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
    maxHeight: '70%',
    ...(IS_WEB && {
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
      borderRadius: 20,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    }),
  },

  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CCCCCC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12, // Reduced from 20
  },
  modalTitle: {
    fontSize: 18, // Reduced from 20
    fontWeight: '600',
    marginBottom: 12, // Reduced from 20
    textAlign: 'center',
  },
  settingsSection: {
    marginBottom: 16, // Reduced from 24
  },
  activeFiltersSubtitle: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  activeFiltersList: {
    marginBottom: 14,
  },
  activeFiltersEmpty: {
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 20,
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  activeFilterLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    flexShrink: 1,
  },
  activeFilterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  activeFilterLabel: {
    fontSize: 15,
  },
  removeFilterButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeFilterText: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '500',
  },
  navigateBaseButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 10,
  },
  navigateBaseButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsSectionTitle: {
    fontSize: 14, // Reduced from 16
    fontWeight: '600',
    marginBottom: 8, // Reduced from 12
    color: '#333333',
  },
  settingsOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8, // Reduced from 12
    paddingHorizontal: 4,
  },
  settingsOptionText: {
    fontSize: 15, // Reduced from 16
    color: '#333333',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#474652',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#474652',
  },
  closeButton: {
    marginTop: 12, // Reduced from 20
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  communitySection: {
    paddingBottom: 8,
    paddingTop: 12,
    borderBottomWidth: 1,
  },
  communityCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  applyButtonSmall: {
    position: 'absolute',
    top: -8,
    right: 3,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  applyButtonFloating: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  applyButtonTextSmall: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  applyButtonTextFloating: {
    fontSize: 16,
    fontWeight: 'bold',
  },
})
