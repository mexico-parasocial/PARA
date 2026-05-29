import {useRef, useState} from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {CATEGORIES} from '#/lib/constants/mockData'
import {type NavigationProp} from '#/lib/routes/types'
import {
  useCommunityPoliciesQuery,
  useFeaturedPoliciesQuery,
  usePartyPoliciesQuery,
  useRecommendedPoliciesQuery,
  useStatePoliciesQuery,
} from '#/state/queries/data-tab'
import {useCompassFilter} from '#/state/shell/compass-filter'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {ActiveFiltersStackButton} from '#/components/CompassFilterControls'
import {SearchInput} from '#/components/forms/SearchInput'
import {Verified_Stroke2_Corner2_Rounded as VerifiedIcon} from '#/components/icons/Verified'
import * as Layout from '#/components/Layout'
import {WebScrollControls} from '#/components/WebScrollControls'
import {type PolicyItem} from './types'

const PHASE_META: Record<string, {label: string; color: string}> = {
  draft: {label: 'Borrador', color: '#6B7280'},
  open: {label: 'Abierto', color: '#0EA5E9'},
  deliberating: {label: 'Deliberando', color: '#F59E0B'},
  voting: {label: 'Votación', color: '#22C55E'},
  resolved: {label: 'Resuelto', color: '#8B5CF6'},
}

function PhasePill({phase}: {phase?: string}) {
  const meta = PHASE_META[phase || ''] || PHASE_META.draft
  return (
    <View
      style={{
        backgroundColor: meta.color + '18',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 8,
      }}>
      <Text style={{color: meta.color, fontSize: 10, fontWeight: '800'}}>
        {meta.label}
      </Text>
    </View>
  )
}

function VoteStats({item}: {item: PolicyItem}) {
  return (
    <View style={styles.signalRow}>
      {typeof item.voteCount === 'number' && (
        <PolicySignalPill
          label={`${item.voteCount} ${item.voteCount === 1 ? 'voto' : 'votos'}`}
        />
      )}
      {typeof item.participantCount === 'number' && (
        <PolicySignalPill
          label={`${item.participantCount} ${
            item.participantCount === 1 ? 'voz' : 'voces'
          }`}
        />
      )}
      {typeof item.positionCount === 'number' && (
        <PolicySignalPill
          label={`${item.positionCount} ${
            item.positionCount === 1 ? 'posición' : 'posiciones'
          }`}
        />
      )}
    </View>
  )
}

export type PolicyMatterMode = 'Policies' | 'Matters'

type PolicyMatterDashboardRoute = {
  params?: {mode?: string; filter?: string; category?: string}
}

export function PolicyMatterDashboard({
  route,
  forcedMode,
}: {
  route: PolicyMatterDashboardRoute
  forcedMode?: PolicyMatterMode
}) {
  const t = useTheme()
  useLingui()
  const navigation = useNavigation<NavigationProp>()
  const categoryScrollRef = useRef<ScrollView>(null)

  const routeMode = route.params?.mode as PolicyMatterMode | undefined
  const mode = forcedMode || routeMode
  const filterMode = route.params?.filter as
    | 'Communities'
    | 'Parties'
    | 'Both'
    | undefined

  const onPressItem = (item: PolicyItem) => {
    navigation.navigate('PolicyDetails', {
      item: item as unknown as Record<string, unknown>,
      cabildeoUri: item.cabildeoUri,
    })
  }

  const [activeTab, setActiveTab] = useState<PolicyMatterMode>(
    mode || 'Policies',
  )
  const activeMode = mode || activeTab
  const {activeFilters, activeState} = useCompassFilter()

  const [selectedCategory, setSelectedCategory] = useState(
    route.params?.category || 'All',
  )
  const [isVerifiedOnly, setIsVerifiedOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Common params for all queries
  const queryType: 'Policy' | 'Matter' =
    activeMode === 'Policies' ? 'Policy' : 'Matter'
  const commonParams = {
    category: selectedCategory,
    verified: isVerifiedOnly,
    query: searchQuery,
    type: queryType,
    filters: activeFilters.length > 0 ? activeFilters : undefined,
  }

  // V2: Specialized Feed Queries
  const featuredQuery = useFeaturedPoliciesQuery(commonParams)
  const communityQuery = useCommunityPoliciesQuery(commonParams)
  const partyQuery = usePartyPoliciesQuery(commonParams)
  const recommendedQuery = useRecommendedPoliciesQuery(commonParams)

  const stateQuery = useStatePoliciesQuery({
    ...commonParams,
    state: activeState,
  })

  // Helper to extract items safely
  const getItems = (query: {data?: {pages?: Array<{items?: PolicyItem[]}>}}) =>
    query.data?.pages?.flatMap(p => p.items ?? []) ?? []

  // V2: Directly sourced items
  const featuredItems = getItems(featuredQuery)
  const communityItems = getItems(communityQuery)
  const partyItems = getItems(partyQuery)
  const recommendedItems = getItems(recommendedQuery)
  const stateItems = getItems(stateQuery)

  // Control visible feeds based on filterMode from DataScreen
  const showCommunity = filterMode !== 'Parties'
  const showParty = filterMode !== 'Communities'

  const isLoading =
    featuredQuery.isLoading ||
    communityQuery.isLoading ||
    partyQuery.isLoading ||
    recommendedQuery.isLoading ||
    stateQuery.isLoading

  const hasResults =
    featuredItems.length > 0 ||
    communityItems.length > 0 ||
    partyItems.length > 0 ||
    recommendedItems.length > 0 ||
    stateItems.length > 0

  const title =
    mode === 'Policies'
      ? 'Policies'
      : mode === 'Matters'
        ? 'Matters'
        : 'Policies & Matters'

  return (
    <Layout.Screen testID="policiesDashboard">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>{title}</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          <ActiveFiltersStackButton />
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      {!mode && (
        <View style={[styles.tabBar, t.atoms.border_contrast_low]}>
          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.tabItem,
              activeMode === 'Policies' && styles.tabItemActive,
              activeMode === 'Policies' && {
                borderBottomColor: t.palette.primary_500,
              },
            ]}
            onPress={() => setActiveTab('Policies')}>
            <Text
              style={[
                styles.tabText,
                activeMode === 'Policies'
                  ? [t.atoms.text, styles.tabTextActive]
                  : t.atoms.text_contrast_medium,
              ]}>
              Policies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.tabItem,
              activeMode === 'Matters' && styles.tabItemActive,
              activeMode === 'Matters' && {
                borderBottomColor: t.palette.primary_500,
              },
            ]}
            onPress={() => setActiveTab('Matters')}>
            <Text
              style={[
                styles.tabText,
                activeMode === 'Matters'
                  ? [t.atoms.text, styles.tabTextActive]
                  : t.atoms.text_contrast_medium,
              ]}>
              Matters
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Layout.Center style={{flex: 1}}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}>
          <View style={[styles.filterSection, {marginBottom: 12}]}>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search policies, matters..."
              onClearText={() => setSearchQuery('')}
              style={styles.enhancedSearchBar}
            />
          </View>

          <View style={{position: 'relative'}}>
            <WebScrollControls
              scrollViewRef={categoryScrollRef}
              iconSize={16}
            />
            <ScrollView
              ref={categoryScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setIsVerifiedOnly(!isVerifiedOnly)}
                style={{marginRight: 10, justifyContent: 'center'}}>
                {isVerifiedOnly ? (
                  <View
                    style={[
                      a.rounded_full,
                      {
                        backgroundColor: t.palette.primary_500,
                        width: 38, // Slightly smaller to match pills
                        height: 38,
                        justifyContent: 'center',
                        alignItems: 'center',
                      },
                    ]}>
                    <VerifiedIcon
                      width={20}
                      height={20}
                      style={{color: 'white'}}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      a.rounded_full,
                      t.atoms.bg_contrast_25,
                      {
                        width: 38, // Slightly smaller to match pills
                        height: 38,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: t.atoms.border_contrast_low.borderColor,
                      },
                    ]}>
                    <VerifiedIcon width={20} height={20} style={t.atoms.text} />
                  </View>
                )}
              </TouchableOpacity>
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}>
                    {isSelected ? (
                      <View
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor: t.palette.primary_500,
                          },
                        ]}>
                        <Text
                          style={[styles.categoryPillText, {color: 'white'}]}>
                          {cat}
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.categoryPill,
                          t.atoms.bg_contrast_25,
                          {
                            borderWidth: 1,
                            borderColor:
                              t.atoms.border_contrast_low.borderColor,
                          },
                        ]}>
                        <Text style={[styles.categoryPillText, t.atoms.text]}>
                          {cat}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>

          {/* Featured Feed */}
          {featuredItems.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                {selectedCategory !== 'All'
                  ? `${selectedCategory} Featured`
                  : 'Featured'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}
                contentContainerStyle={styles.featuredList}>
                {featuredItems.map((item: PolicyItem) => (
                  <PolicyCard
                    key={item.id}
                    item={item}
                    onPress={() => onPressItem(item)}
                    featured
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Community Feed */}
          {showCommunity && communityItems.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                {selectedCategory !== 'All'
                  ? `${selectedCategory} Community ${activeMode}`
                  : `Community ${activeMode}`}
              </Text>
              {communityItems.map((item: PolicyItem) => (
                <PolicyCard
                  key={item.id}
                  item={item}
                  onPress={() => onPressItem(item)}
                />
              ))}
            </View>
          )}

          {/* State Feed */}
          {stateItems.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                {activeState !== 'None'
                  ? selectedCategory !== 'All'
                    ? `${selectedCategory} ${activeMode} in ${activeState}`
                    : `${activeMode} in ${activeState}`
                  : selectedCategory !== 'All'
                    ? `${selectedCategory} State ${activeMode}`
                    : `State ${activeMode} Around Mexico`}
              </Text>
              {stateItems.map((item: PolicyItem) => (
                <PolicyCard
                  key={item.id}
                  item={item}
                  onPress={() => onPressItem(item)}
                />
              ))}
            </View>
          )}

          {/* Party Feed */}
          {showParty && partyItems.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                {selectedCategory !== 'All'
                  ? `${selectedCategory} Party ${activeMode}`
                  : `Party ${activeMode}`}
              </Text>
              {partyItems.map((item: PolicyItem) => (
                <PolicyCard
                  key={item.id}
                  item={item}
                  onPress={() => onPressItem(item)}
                />
              ))}
            </View>
          )}

          {recommendedItems.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                <Trans>Recommended {activeMode}</Trans>
              </Text>
              {recommendedItems.map((item: PolicyItem) => (
                <PolicyCard
                  key={item.id}
                  item={item}
                  onPress={() => onPressItem(item)}
                />
              ))}
            </View>
          )}

          {isLoading && (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={t.palette.primary_500} />
            </View>
          )}

          {!isLoading && !hasResults && (
            <View style={styles.emptyState}>
              <Text
                style={[
                  t.atoms.text_contrast_medium,
                  {textAlign: 'center', fontSize: 16},
                ]}>
                No {activeMode.toLowerCase()} found.
              </Text>
            </View>
          )}
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}

function PolicyCard({
  item,
  onPress,
  featured = false,
}: {
  item: PolicyItem
  onPress: () => void
  featured?: boolean
}) {
  const t = useTheme()
  const status = getItemStatus(item)
  const sourceLabel =
    item.party || item.community || item.state || item.promotedBy
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.policyCard,
        featured && styles.featuredCard,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
      ]}>
      <View
        style={[
          styles.policyAccent,
          {backgroundColor: item.color || t.palette.primary_500},
        ]}
      />
      <View style={styles.policyInfo}>
        <View style={styles.policyTitleRow}>
          <Text style={[styles.policyTitle, t.atoms.text]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.verified ? (
            <View
              style={[
                styles.verifiedBadge,
                {backgroundColor: t.palette.positive_500 + '18'},
              ]}>
              <VerifiedIcon size="xs" style={{color: t.palette.positive_500}} />
            </View>
          ) : null}
        </View>
        <Text style={[styles.policyMeta, t.atoms.text_contrast_medium]}>
          {item.category} · {sourceLabel}
        </Text>
        <View style={styles.statusRow}>
          <PhasePill phase={item.phase} />
          <View
            style={[
              styles.sourceBadge,
              {backgroundColor: (item.color || t.palette.primary_500) + '14'},
            ]}>
            <Text
              style={[
                styles.sourceBadgeText,
                {color: item.color || t.palette.primary_500},
              ]}>
              {status}
            </Text>
          </View>
        </View>
        <VoteStats item={item} />
      </View>
      <View style={styles.viewButton}>
        <Text style={{color: t.palette.primary_500, fontWeight: '800'}}>
          <Trans>Details</Trans>
        </Text>
      </View>
    </TouchableOpacity>
  )
}

function PolicySignalPill({label}: {label: string}) {
  const t = useTheme()
  return (
    <View style={[styles.signalPill, {backgroundColor: t.palette.contrast_50}]}>
      <Text style={[styles.signalText, t.atoms.text_contrast_medium]}>
        {label}
      </Text>
    </View>
  )
}

function getItemStatus(item: PolicyItem) {
  if (item.source === 'cabildeo') return 'Live'
  if (item.verified) return 'Verified'
  return item.promotedBy
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  enhancedSearchBar: {
    borderRadius: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 20,
  },
  searchBar: {
    padding: 12,
    borderRadius: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 12,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  policyAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
  },
  policyInfo: {
    flex: 1,
    gap: 5,
  },
  policyTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  policyTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  policyStatBig: {
    fontSize: 24,
    fontWeight: '800',
  },
  policyStat: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  horizontalScroll: {
    marginHorizontal: -16,
    overflow: 'visible',
  },
  featuredList: {
    gap: 12,
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  partyCard: {
    width: 220,
    padding: 20,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 0,
    height: 160,
    justifyContent: 'space-between',
  },
  partyCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 12,
  },
  partyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partyCardStat: {
    fontSize: 12,
    fontWeight: '700',
  },
  trendIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridCard: {
    width: '47%', // Approx half
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0,
  },
  gridCardTitle: {
    fontSize: 16, // slightly bigger
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 20,
  },
  gridCardMatch: {
    fontSize: 18,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    //
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '800',
  },
  categoryScroll: {
    marginBottom: 24,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillText: {
    fontWeight: '600',
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CCCCCC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333333',
  },
  settingsOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  settingsOptionText: {
    fontSize: 16,
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
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  filterButton: {
    width: 33,
    paddingHorizontal: 0,
    paddingVertical: 8,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{translateY: 1}],
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  featuredCard: {
    width: 292,
    minHeight: 154,
    marginBottom: 0,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  gridHeaderGradient: {
    height: 6,
    width: '100%',
  },
  gridContent: {
    padding: 16,
  },
  policyMeta: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  signalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  signalPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  signalText: {
    fontSize: 11,
    fontWeight: '800',
  },
  verifiedBadge: {
    borderRadius: 8,
    padding: 5,
  },
  viewButton: {
    alignSelf: 'center',
    paddingTop: 2,
  },
})
