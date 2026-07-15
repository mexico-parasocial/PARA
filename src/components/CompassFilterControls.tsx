import {useRef} from 'react'
import {
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
import {Button, ButtonText} from '#/components/Button'
import {CommunityCard} from '#/components/CommunityCard'
import * as Dialog from '#/components/Dialog'
import * as Toggle from '#/components/forms/Toggle'
import {Compass_Stroke2_Corner0_Rounded as CompassIcon} from '#/components/icons/Compass'
import {Text as NewText} from '#/components/Typography'
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
  const control = Dialog.useDialogControl()
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
        onPress={() => control.open()}>
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

      <Dialog.Outer control={control}>
        <Dialog.Handle />
        <Dialog.ScrollableInner
          label={_(msg`Active filters`)}
          style={IS_WEB ? [{maxWidth: 600, width: '100%'}] : undefined}>
          <View style={a.gap_md}>
            <NewText style={[a.text_xl, a.font_bold, t.atoms.text]}>
              <Trans>Active filters</Trans>
            </NewText>
            <NewText
              style={[a.text_sm, t.atoms.text_contrast_medium, a.text_center]}>
              <Trans>
                Remove filters here. To add or change filters, go back to Base.
              </Trans>
            </NewText>

            <View style={styles.activeFiltersList}>
              {activeFilters.length === 0 ? (
                <NewText
                  style={[
                    styles.activeFiltersEmpty,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>No active filters</Trans>
                </NewText>
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
                      <NewText style={[styles.activeFilterLabel, t.atoms.text]}>
                        {filter}
                      </NewText>
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={_(msg`Remove filter`)}
                      accessibilityHint={_(
                        msg`Removes this filter from active filters`,
                      )}
                      onPress={() => removeActiveFilter(filter)}
                      style={styles.removeFilterButton}>
                      <NewText
                        style={[
                          styles.removeFilterText,
                          t.atoms.text_contrast_medium,
                        ]}>
                        ×
                      </NewText>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <Button
              variant="outline"
              color="secondary"
              size="large"
              label={_(msg`Go to Data to edit filters`)}
              onPress={() => {
                control.close(() => navigation.navigate('Data'))
              }}>
              <ButtonText>
                <Trans>Go to Data to edit filters</Trans>
              </ButtonText>
            </Button>

            <Button
              variant="solid"
              color="primary"
              size="large"
              label={_(msg`Done`)}
              onPress={() => control.close()}>
              <ButtonText>
                <Trans>Done</Trans>
              </ButtonText>
            </Button>
          </View>
        </Dialog.ScrollableInner>
      </Dialog.Outer>
    </>
  )
}

export function CompassSettingsButton() {
  const {_} = useLingui()
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
  const control = Dialog.useDialogControl()

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
        onPress={() => control.open()}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
        <CompassIcon size="lg" style={t.atoms.text} />
      </TouchableOpacity>

      <Dialog.Outer control={control}>
        <Dialog.Handle />
        <Dialog.ScrollableInner
          label={_(msg`View settings`)}
          style={IS_WEB ? [{maxWidth: 600, width: '100%'}] : undefined}>
          <View style={a.gap_md}>
            <NewText style={[a.text_xl, a.font_bold, t.atoms.text]}>
              View settings
            </NewText>

            {/* View Mode */}
            <View style={styles.settingsSection}>
              <NewText
                style={[
                  styles.settingsSectionTitle,
                  t.atoms.text,
                  {marginTop: 16},
                ]}>
                Show communities
              </NewText>

              <TouchableOpacity
                accessibilityRole="button"
                style={styles.settingsOption}
                onPress={() => setViewMode('View official parties')}>
                <NewText style={[styles.settingsOptionText, t.atoms.text]}>
                  View official parties
                </NewText>
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
                <NewText style={[styles.settingsOptionText, t.atoms.text]}>
                  View by 9th's
                </NewText>
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

            {/* State picker */}
            <View style={styles.settingsSection}>
              <View style={[{marginBottom: 12}]}>
                <NewText
                  style={[
                    styles.settingsSectionTitle,
                    t.atoms.text,
                    {marginBottom: 0},
                  ]}>
                  View by state
                </NewText>
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
                      <NewText style={[t.atoms.text, {fontSize: 16}]}>
                        {state}
                      </NewText>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => toggleFilter(state)}
                        style={{padding: 4}}>
                        <NewText style={{color: '#8E8E93', fontWeight: 'bold'}}>
                          X
                        </NewText>
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
                  <NewText style={{color: 'white', fontWeight: 'bold'}}>
                    Add view
                  </NewText>
                </TouchableOpacity>
              </View>

              {/* Hide communities toggle */}
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
                    <NewText style={[styles.settingsOptionText, t.atoms.text]}>
                      Hide communities cards
                    </NewText>
                    <Toggle.Switch />
                  </Toggle.Item>
                </Toggle.Group>
              </View>
            </View>

            <Button
              variant="solid"
              color="primary"
              size="large"
              label={_(msg`Done`)}
              onPress={() => control.close()}>
              <ButtonText>Done</ButtonText>
            </Button>
          </View>
        </Dialog.ScrollableInner>
      </Dialog.Outer>
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
    marginRight: -14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFiltersList: {
    marginBottom: 4,
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
  settingsSection: {
    marginBottom: 8,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  settingsOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  settingsOptionText: {
    fontSize: 15,
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
