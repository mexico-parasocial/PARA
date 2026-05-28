import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type StyleProp,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {
  COMPASS_COLORS,
  COMPASS_CROSS_GRADIENTS,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {useDebouncedValue} from '#/lib/hooks/useDebouncedValue'
import {PARTY_FEED_PROFILES} from '#/lib/party-feeds'
import {type NavigationProp} from '#/lib/routes/types'
import {POST_FLAIRS, type PostFlair} from '#/lib/tags'
import {
  clearRecentCommunities,
  type RecentCommunityView,
  useRecentCommunities,
} from '#/state/persisted/recent-communities'
import {
  type CommunityBoardView,
  useCommunityBoardsQuery,
} from '#/state/queries/community-boards'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {FlairSelectionList} from '#/components/FlairSelectionList'
import {IconCircle} from '#/components/IconCircle'
import {Filter_Stroke2_Corner0_Rounded as FilterIcon} from '#/components/icons/Filter'
import {ListMagnifyingGlass_Stroke2_Corner0_Rounded as ListMagnifyingGlass} from '#/components/icons/ListMagnifyingGlass'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/MagnifyingGlass'
import * as Layout from '#/components/Layout'
import {WebScrollControls} from '#/components/WebScrollControls'
import {useAnalytics} from '#/analytics'
import {IS_WEB} from '#/env'

type ThemeShape = ReturnType<typeof useTheme>

type SelectedParticipationFilter = {
  kind: 'matter' | 'policy'
  flairId: string
  label: string
}

const STATES = [
  'Cualquiera',
  'Aguascalientes',
  'Baja California',
  'CDMX',
  'Chiapas',
  'Chihuahua',
  'Jalisco',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'Yucatán',
]

const FEATURED_STATE_NAMES = ['CDMX', 'Jalisco', 'Nuevo León']

export function CommunitiesScreen() {
  const t = useTheme()
  const analytics = useAnalytics()
  const navigation = useNavigation<NavigationProp>()
  const trackedCreatorEntryMetric = useRef(false)

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'Participation' | 'State'>(
    'Participation',
  )
  const [participationType, setParticipationType] = useState<
    'Matter' | 'Policy'
  >('Matter')
  const [selectedParticipationFilter, setSelectedParticipationFilter] =
    useState<SelectedParticipationFilter | null>(null)
  const [selectedStateItem, setSelectedStateItem] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300)
  const {data: liveBoardsData, isLoading: isLiveBoardsLoading} =
    useCommunityBoardsQuery({
      limit: 12,
      query: debouncedSearchQuery || undefined,
    })
  const {
    data: participationMatchesData,
    isLoading: isParticipationMatchesLoading,
    isError: isParticipationMatchesError,
  } = useCommunityBoardsQuery({
    limit: 6,
    participationKind: selectedParticipationFilter?.kind,
    flairId: selectedParticipationFilter?.flairId,
    sort: 'activity',
  })
  const {
    data: stateMatchesData,
    isLoading: isStateMatchesLoading,
    isError: isStateMatchesError,
  } = useCommunityBoardsQuery({
    limit: 6,
    quadrant: selectedStateItem || undefined,
    sort: 'activity',
  })

  const politicalScrollRef = useRef<ScrollView>(null)

  const matterFlairs = useMemo(
    () =>
      Object.values(POST_FLAIRS)
        .filter(flair => flair.id.startsWith('matter_'))
        .slice(0, 8),
    [],
  )
  const policyFlairs = useMemo(
    () =>
      Object.values(POST_FLAIRS)
        .filter(flair => flair.id.startsWith('policy_'))
        .slice(0, 8),
    [],
  )
  const canCreateCommunity = liveBoardsData?.canCreateCommunity ?? true
  const liveBoards = liveBoardsData?.boards ?? []
  const participationMatches = participationMatchesData?.boards ?? []
  const stateMatches = stateMatchesData?.boards ?? []
  const recentCommunities = useRecentCommunities()
  const recentLiveBoards = recentCommunities.slice(0, 3)

  const politicalBoards = useMemo(() => {
    return liveBoards.filter(board => board.quadrant === 'political')
  }, [liveBoards])

  const chunkedPoliticalBoards = useMemo(() => {
    const chunks = []
    for (let i = 0; i < politicalBoards.length; i += 2) {
      chunks.push(politicalBoards.slice(i, i + 2))
    }
    return chunks
  }, [politicalBoards])

  useEffect(() => {
    if (trackedCreatorEntryMetric.current || !liveBoardsData) return
    trackedCreatorEntryMetric.current = true

    if (liveBoardsData.canCreateCommunity) {
      analytics.metric('community:create:ctaShown', {})
    } else {
      analytics.metric('community:create:eligibilityDenied', {})
    }
  }, [analytics, liveBoardsData])

  const navigateToLiveCommunityProfile = useCallback(
    (board: CommunityBoardView) => {
      navigation.navigate('CommunityProfile', {
        communityId: board.communityId,
        communityName: board.name,
      })
    },
    [navigation],
  )

  const navigateToCreateCommunity = useCallback(() => {
    analytics.metric('community:create:ctaClicked', {})
    navigation.navigate('CreateCommunity')
  }, [analytics, navigation])

  const openParticipationModal = () => {
    setModalType('Participation')
    setShowModal(true)
  }

  const openStateModal = () => {
    setModalType('State')
    setShowModal(true)
  }

  const onSelectPickerItem = (value: string) => {
    setSelectedStateItem(value === 'Cualquiera' ? '' : value)
  }

  const handleDone = () => {
    setShowModal(false)
  }

  const isStateModal = modalType === 'State'

  return (
    <Layout.Screen testID="communitiesScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton fallback="Base" />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Communities</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Center style={styles.screenCenter}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          <View style={[styles.contentShell, IS_WEB && styles.contentShellWeb]}>
            {/* Search */}
            <View style={styles.section}>
              <View
                style={[
                  styles.searchInputWrapper,
                  {backgroundColor: t.palette.contrast_25},
                ]}>
                <SearchIcon
                  size="sm"
                  fill={t.palette.contrast_300}
                  style={{marginRight: 8}}
                />
                <TextInput
                  placeholder="Search communities"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={[styles.searchInput, t.atoms.text]}
                  placeholderTextColor={t.palette.contrast_500}
                  keyboardAppearance={t.name === 'light' ? 'light' : 'dark'}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                  autoCorrect={false}
                  autoCapitalize="none"
                  accessibilityLabel="Search communities"
                  accessibilityHint="Searches the community directory"
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionHeading,
                    t.atoms.text,
                    {marginBottom: 0},
                  ]}>
                  <Trans>Recent communities</Trans>
                </Text>
                {recentCommunities.length > 0 && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => clearRecentCommunities()}
                    style={[
                      styles.clearButton,
                      {backgroundColor: t.palette.primary_500},
                    ]}>
                    <Text
                      style={[
                        styles.clearButtonText,
                        {color: '#fff'},
                      ]}>
                      <Trans>Clear</Trans>
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.resumeGrid, IS_WEB && styles.resumeGridWeb]}>
                {recentLiveBoards.length > 0 ? (
                  recentLiveBoards.map(board => (
                    <LiveCommunityCard
                      key={board.uri}
                      board={board}
                      theme={t}
                      onPress={() => navigateToLiveCommunityProfile(board)}
                    />
                  ))
                ) : (
                  <EmptyLiveDirectoryCard
                    theme={t}
                    title="No recent communities yet"
                    body="Communities you open will appear here."
                  />
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionHeading, t.atoms.text]}>
                <Trans>Browse communities</Trans>
              </Text>

              <View style={styles.directoryStack}>
                <DirectoryModule title="Parties" description="" theme={t}>
                  {politicalBoards.length === 0 ? (
                    <EmptyLiveDirectoryCard
                      theme={t}
                      title="No party communities yet"
                      body="Published party communities will appear here once they exist."
                    />
                  ) : (
                    <View style={{position: 'relative'}}>
                      <WebScrollControls scrollViewRef={politicalScrollRef} />
                      <ScrollView
                        ref={politicalScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.cardsScroll}
                        contentContainerStyle={styles.directoryRail}>
                        {chunkedPoliticalBoards.map((pair, index) => (
                          <View key={`pair-${index}`} style={{gap: 12}}>
                            {pair.map(board => (
                              <LiveCommunityCard
                                key={board.uri}
                                board={board}
                                theme={t}
                                style={{width: 260}}
                                onPress={() =>
                                  navigateToLiveCommunityProfile(board)
                                }
                              />
                            ))}
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </DirectoryModule>
              </View>
            </View>

            <View style={styles.section}>
              <View
                style={[
                  styles.creatorEntryCard,
                  {
                    backgroundColor: canCreateCommunity
                      ? t.palette.primary_500
                      : t.palette.contrast_25,
                  },
                ]}>
                <View style={styles.creatorEntryCopy}>
                  <Text
                    style={[
                      styles.creatorEntryTitle,
                      {color: canCreateCommunity ? '#fff' : t.atoms.text.color},
                    ]}>
                    {isLiveBoardsLoading
                      ? 'Preparing community creation'
                      : canCreateCommunity
                        ? 'Create a community'
                        : 'Community creation unavailable'}
                  </Text>
                  <Text
                    style={[
                      styles.creatorEntryBody,
                      canCreateCommunity
                        ? styles.creatorEntryBodyOnPrimary
                        : t.atoms.text_contrast_medium,
                    ]}>
                    {isLiveBoardsLoading
                      ? 'Loading community creation capabilities.'
                      : canCreateCommunity
                        ? 'Open the setup flow to draft a community, seed governance, and start tracking the 9-member founding quorum.'
                        : 'Community creation is currently disabled for this account.'}
                  </Text>
                </View>
                {canCreateCommunity ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={navigateToCreateCommunity}
                    style={[
                      styles.creatorEntryButton,
                      {
                        backgroundColor: canCreateCommunity
                          ? '#fff'
                          : t.palette.contrast_100,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.creatorEntryButtonText,
                        {
                          color: canCreateCommunity
                            ? t.palette.primary_600
                            : t.atoms.text.color,
                        },
                      ]}>
                      Create community
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionHeading, t.atoms.text]}>
                <Trans>Explore by participation or geography</Trans>
              </Text>

              <View style={styles.refineLayout}>
                <RefinementPanel
                  title="Find by participation"
                  description="Browse matter and policy themes, then refine once matching is ready."
                  icon={ListMagnifyingGlass}
                  onPress={openParticipationModal}
                  theme={t}>
                  {selectedParticipationFilter ? (
                    <FilteredBoardsCard
                      theme={t}
                      pillLabel={`${participationType}: ${selectedParticipationFilter.label}`}
                      title={`Community matches for ${selectedParticipationFilter.label}`}
                      emptyMessage="No matching communities are available yet for this participation filter."
                      boards={participationMatches}
                      isLoading={isParticipationMatchesLoading}
                      isError={isParticipationMatchesError}
                      ctaLabel="Choose another filter"
                      onPress={openParticipationModal}
                      onPressBoard={navigateToLiveCommunityProfile}
                    />
                  ) : (
                    <View style={styles.discoveryPanelBody}>
                      <View>
                        <Text style={[styles.miniRailTitle, t.atoms.text]}>
                          <Trans>Trending Matters</Trans>
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.topicRail}>
                          {matterFlairs.map(flair => (
                            <TopicDiscoveryCard
                              key={flair.id}
                              label={flair.tag}
                              helper={flair.label}
                              accent={flair.color}
                              theme={t}
                              onPress={() => {
                                setParticipationType('Matter')
                                setSelectedParticipationFilter(
                                  buildParticipationFilter(flair),
                                )
                              }}
                            />
                          ))}
                        </ScrollView>
                      </View>

                      <View>
                        <Text style={[styles.miniRailTitle, t.atoms.text]}>
                          <Trans>Popular Policies</Trans>
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.topicRail}>
                          {policyFlairs.map(flair => (
                            <TopicDiscoveryCard
                              key={flair.id}
                              label={flair.tag}
                              helper={flair.label}
                              accent={flair.color}
                              theme={t}
                              onPress={() => {
                                setParticipationType('Policy')
                                setSelectedParticipationFilter(
                                  buildParticipationFilter(flair),
                                )
                              }}
                            />
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  )}
                </RefinementPanel>

                <RefinementPanel
                  title="Find by state"
                  description="Use geographic discovery once you know the territory you want to explore."
                  icon={FilterIcon}
                  onPress={openStateModal}
                  theme={t}>
                  {selectedStateItem ? (
                    <FilteredBoardsCard
                      theme={t}
                      pillLabel={selectedStateItem}
                      title={`Community matches for ${selectedStateItem}`}
                      emptyMessage="No matching communities are available yet for this state."
                      boards={stateMatches}
                      isLoading={isStateMatchesLoading}
                      isError={isStateMatchesError}
                      ctaLabel="Choose another state"
                      onPress={openStateModal}
                      onPressBoard={navigateToLiveCommunityProfile}
                    />
                  ) : (
                    <View style={styles.discoveryPanelBody}>
                      <Text style={[styles.miniRailTitle, t.atoms.text]}>
                        <Trans>Featured States</Trans>
                      </Text>
                      <View
                        style={[
                          styles.featuredStates,
                          IS_WEB && styles.featuredStatesWeb,
                        ]}>
                        {FEATURED_STATE_NAMES.map(state => (
                          <FeaturedStateCard
                            key={state}
                            state={state}
                            theme={t}
                            onPress={() => setSelectedStateItem(state)}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </RefinementPanel>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.86}
              onPress={() => navigation.navigate('CabildeoList')}
              style={[
                styles.cabildeoCard,
                {
                  backgroundColor: t.palette.primary_500 + '0E',
                  borderColor: t.palette.primary_500 + '24',
                },
              ]}>
              <View style={styles.cabildeoMeta}>
                <Text
                  style={[
                    styles.cabildeoEyebrow,
                    {color: t.palette.primary_500},
                  ]}>
                  <Trans>Action lane</Trans>
                </Text>
                <Text style={[styles.cabildeoTitle, t.atoms.text]}>
                  <Trans>Lobbying</Trans>
                </Text>
              </View>

              <View
                style={[
                  styles.cabildeoPill,
                  {backgroundColor: t.palette.primary_500},
                ]}>
                <Text style={styles.cabildeoPillText}>
                  <Trans>Open Lobbying</Trans>
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Layout.Center>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}>
        <View
          style={[
            styles.modalOverlay,
            IS_WEB && isStateModal && styles.modalOverlayWeb,
          ]}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => setShowModal(false)}
          />
          <View
            style={[
              styles.modalContent,
              t.atoms.bg,
              modalType === 'Participation'
                ? {height: '80%', padding: 0}
                : styles.stateModalContent,
              IS_WEB && isStateModal && styles.stateModalContentWeb,
            ]}>
            {modalType === 'Participation' ? (
              <View style={{flex: 1, padding: 16}}>
                <View
                  style={[
                    styles.modalHandle,
                    {
                      alignSelf: 'center',
                      marginBottom: 10,
                      backgroundColor: t.palette.contrast_300,
                    },
                  ]}
                />

                <FlairSelectionList
                  selectedFlairs={
                    selectedParticipationFilter
                      ? Object.values(POST_FLAIRS).filter(
                          flair =>
                            flair.id === selectedParticipationFilter.flairId,
                        )
                      : []
                  }
                  setSelectedFlairs={(flairs: PostFlair[]) => {
                    if (flairs.length > 0) {
                      const flair = flairs[0]
                      setParticipationType(
                        flair.id.startsWith('policy_') ? 'Policy' : 'Matter',
                      )
                      setSelectedParticipationFilter(
                        buildParticipationFilter(flair),
                      )
                    } else {
                      setSelectedParticipationFilter(null)
                    }
                    setShowModal(false)
                  }}
                  mode={participationType.toLowerCase() as 'matter' | 'policy'}
                  onClose={() => setShowModal(false)}
                />
              </View>
            ) : (
              <>
                <View
                  style={[
                    styles.modalHandle,
                    {backgroundColor: t.palette.contrast_300},
                  ]}
                />
                <Text style={[styles.modalSubtitle, t.atoms.text]}>
                  <Trans>Select a state</Trans>
                </Text>

                <WheelPicker
                  items={STATES}
                  selectedValue={selectedStateItem || STATES[0]}
                  onValueChange={onSelectPickerItem}
                  theme={t}
                />

                <TouchableOpacity
                  accessibilityRole="button"
                  style={[
                    styles.closeButton,
                    {backgroundColor: t.palette.primary_500},
                  ]}
                  onPress={handleDone}>
                  <Text style={styles.closeButtonText}>
                    <Trans>Done</Trans>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Layout.Screen>
  )
}

function buildParticipationFilter(
  flair: PostFlair,
): SelectedParticipationFilter {
  return {
    kind: flair.id.startsWith('policy_') ? 'policy' : 'matter',
    flairId: flair.id,
    label: flair.label,
  }
}

function getCommunityColor(quadrant: string): string | null {
  const normalized = quadrant.toLowerCase().replace(/\s+/g, '-')
  if (normalized in COMPASS_COLORS) {
    return COMPASS_COLORS[normalized as CompassPositionId]
  }
  return null
}

function getCommunityGradient(quadrant: string) {
  const normalized = quadrant.toLowerCase().replace(/\s+/g, '-')
  return COMPASS_CROSS_GRADIENTS[normalized as CompassPositionId] ?? null
}

function isPartyCommunity(board: RecentCommunityView) {
  if (board.quadrant.toLowerCase() === 'political') return true

  const boardKeys = [board.name, board.slug, board.communityId]
    .map(value => value?.trim().replace(/^p\//i, '').toLowerCase())
    .filter(Boolean)

  return PARTY_FEED_PROFILES.some(profile => {
    const partyKeys = [profile.name, profile.shortName, profile.filter]
      .map(value => value.trim().replace(/^p\//i, '').toLowerCase())
      .filter(Boolean)

    return partyKeys.some(key => boardKeys.includes(key))
  })
}

function LiveCommunityCard({
  board,
  theme,
  style,
  onPress,
}: {
  board: RecentCommunityView
  theme: ThemeShape
  style?: StyleProp<ViewStyle>
  onPress: () => void
}) {
  const color = getCommunityColor(board.quadrant)
  const gradient = getCommunityGradient(board.quadrant)
  const isPolitical = isPartyCommunity(board)

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.liveBoardCard,
        {
          backgroundColor: theme.palette.contrast_25,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 1},
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 2,
          borderLeftWidth: 3,
          borderLeftColor: color || theme.palette.contrast_100,
        },
        style,
      ]}>
      <View style={styles.liveBoardHeader}>
        {gradient ? (
          <LinearGradient
            colors={
              gradient.colors as unknown as readonly [
                string,
                string,
                ...string[],
              ]
            }
            start={gradient.start}
            end={gradient.end}
            style={[styles.liveBoardAvatar, {overflow: 'hidden'}]}>
            <Text style={[styles.liveBoardAvatarText, {color: '#fff'}]}>
              {board.name.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.liveBoardAvatar,
              {
                backgroundColor: color
                  ? `${color}20`
                  : theme.palette.primary_100,
              },
            ]}>
            <Text
              style={[
                styles.liveBoardAvatarText,
                {
                  color: color || theme.palette.primary_600,
                },
              ]}>
              {board.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.liveBoardMeta}>
          <Text style={[styles.liveBoardTitle, theme.atoms.text]}>
            {board.name}
          </Text>
          {!isPolitical && board.quadrant ? (
            <Text
              style={[
                styles.liveBoardSubtitle,
                {color: color || theme.atoms.text_contrast_medium.color},
              ]}>
              {board.quadrant.replace(/-/g, ' ')}
            </Text>
          ) : null}
        </View>
      </View>
      <Text numberOfLines={3} style={[styles.liveBoardBody, theme.atoms.text]}>
        {board.description ||
          (board.isLocalRecent
            ? 'Recently viewed community'
            : 'Community governance')}
      </Text>
      {board.isLocalRecent ? null : (
        <Text
          style={[styles.liveBoardFooter, theme.atoms.text_contrast_medium]}>
          {board.memberCount} members •{' '}
          {board.governanceSummary?.moderatorCount ?? 0} moderators
        </Text>
      )}
    </TouchableOpacity>
  )
}

function EmptyLiveDirectoryCard({
  theme,
  title,
  body,
}: {
  theme: ThemeShape
  title: string
  body: string
}) {
  return (
    <View
      style={[
        styles.liveBoardCard,
        {
          backgroundColor: theme.palette.contrast_25,
          borderColor: theme.palette.contrast_100,
        },
      ]}>
      <Text style={[styles.liveBoardTitle, theme.atoms.text]}>{title}</Text>
      <Text style={[styles.liveBoardBody, theme.atoms.text_contrast_medium]}>
        {body}
      </Text>
    </View>
  )
}

function DirectoryModule({
  title,
  description,
  theme,
  children,
}: {
  title: string
  description: string
  theme: ThemeShape
  children: React.ReactNode
}) {
  return (
    <View
      style={[
        styles.directoryModule,
        {
          backgroundColor: theme.palette.contrast_25 + '18',
          borderColor: theme.palette.contrast_100,
        },
      ]}>
      <Text style={[styles.moduleTitle, theme.atoms.text]}>{title}</Text>
      <Text
        style={[styles.moduleDescription, theme.atoms.text_contrast_medium]}>
        {description}
      </Text>
      {children}
    </View>
  )
}

function RefinementPanel({
  title,
  description,
  icon,
  onPress,
  theme,
  children,
}: {
  title: string
  description: string
  icon: ComponentProps<typeof IconCircle>['icon']
  onPress: () => void
  theme: ThemeShape
  children: React.ReactNode
}) {
  return (
    <View
      style={[
        styles.refinementPanel,
        {
          backgroundColor: theme.palette.contrast_25 + '18',
          borderColor: theme.palette.contrast_100,
        },
      ]}>
      <View style={styles.refinementHeader}>
        <View style={styles.refinementHeaderCopy}>
          <Text style={[styles.moduleTitle, theme.atoms.text]}>{title}</Text>
          <Text
            style={[
              styles.moduleDescription,
              theme.atoms.text_contrast_medium,
            ]}>
            {description}
          </Text>
        </View>

        <TouchableOpacity accessibilityRole="button" onPress={onPress}>
          <IconCircle
            icon={icon}
            size="lg"
            style={{
              backgroundColor: theme.palette.primary_500 + '14',
            }}
          />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  )
}

function TopicDiscoveryCard({
  label,
  helper,
  accent,
  theme,
  onPress,
}: {
  label: string
  helper: string
  accent: string
  theme: ThemeShape
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.82}
      style={[
        styles.topicCard,
        {
          backgroundColor: accent + '12',
          borderColor: accent + '28',
        },
      ]}
      onPress={onPress}>
      <Text style={[styles.topicLabel, theme.atoms.text]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.topicHelper, {color: accent}]} numberOfLines={2}>
        {helper}
      </Text>
    </TouchableOpacity>
  )
}

function hashStringToIndex(str: string, max: number): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % max
}

function FeaturedStateCard({
  state,
  theme,
  onPress,
}: {
  state: string
  theme: ThemeShape
  onPress: () => void
}) {
  const compassKeys = Object.keys(COMPASS_COLORS) as CompassPositionId[]
  const color =
    COMPASS_COLORS[compassKeys[hashStringToIndex(state, compassKeys.length)]]

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.82}
      style={[
        styles.stateCard,
        {
          backgroundColor: `${color}10`,
          borderColor: `${color}30`,
        },
      ]}
      onPress={onPress}>
      <Text style={[styles.stateCardTitle, theme.atoms.text]}>{state}</Text>
      <Text style={[styles.stateCardBody, {color}]}>
        <Trans>Explore territorial context</Trans>
      </Text>
    </TouchableOpacity>
  )
}

function FilteredBoardsCard({
  theme,
  pillLabel,
  title,
  emptyMessage,
  boards,
  isLoading,
  isError,
  ctaLabel,
  onPress,
  onPressBoard,
}: {
  theme: ThemeShape
  pillLabel: string
  title: string
  emptyMessage: string
  boards: CommunityBoardView[]
  isLoading: boolean
  isError: boolean
  ctaLabel: string
  onPress: () => void
  onPressBoard: (board: CommunityBoardView) => void
}) {
  return (
    <View
      style={[
        styles.comingSoonCard,
        {
          backgroundColor: theme.palette.contrast_25 + '20',
          borderColor: theme.palette.contrast_100,
        },
      ]}>
      <View
        style={[
          styles.comingSoonPill,
          {backgroundColor: theme.palette.primary_500 + '18'},
        ]}>
        <Text
          style={[
            styles.comingSoonPillText,
            {color: theme.palette.primary_500},
          ]}>
          {pillLabel}
        </Text>
      </View>
      <Text style={[styles.comingSoonTitle, theme.atoms.text]}>{title}</Text>
      <Text style={[styles.comingSoonBody, theme.atoms.text_contrast_medium]}>
        {isLoading
          ? 'Loading community matches...'
          : isError
            ? 'Community matching is temporarily unavailable.'
            : boards.length === 0
              ? emptyMessage
              : `${boards.length} live ${
                  boards.length === 1 ? 'community' : 'communities'
                } found.`}
      </Text>
      {boards.length > 0 ? (
        <View style={styles.filteredBoardsList}>
          {boards.map(board => (
            <LiveCommunityCard
              key={board.uri || board.communityId}
              board={board}
              theme={theme}
              onPress={() => onPressBoard(board)}
            />
          ))}
        </View>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        style={[
          styles.comingSoonButton,
          {
            backgroundColor: theme.palette.contrast_50,
            borderColor: theme.palette.contrast_100,
          },
        ]}
        onPress={onPress}>
        <Text style={[styles.comingSoonButtonText, theme.atoms.text]}>
          {ctaLabel}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const ITEM_HEIGHT = 44
const VISIBLE_ITEMS = 3

function WheelPicker({
  items,
  selectedValue,
  onValueChange,
  theme,
}: {
  items: string[]
  selectedValue: string
  onValueChange: (value: string) => void
  theme: ThemeShape
}) {
  const scrollViewRef = useRef<ScrollView>(null)
  const initialIndex = items.findIndex(item => item === selectedValue)
  const [selectedIndex, setSelectedIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0,
  )
  const isProgrammaticScroll = useRef(false)

  const getOffsetForIndex = useCallback(
    (index: number) => (index + 1) * ITEM_HEIGHT,
    [],
  )
  const getIndexFromOffset = useCallback(
    (offset: number) => Math.round(offset / ITEM_HEIGHT) - 1,
    [],
  )

  useEffect(() => {
    const index = items.findIndex(item => item === selectedValue)
    const targetIndex = index >= 0 ? index : 0
    requestAnimationFrame(() => {
      setSelectedIndex(targetIndex)
      scrollViewRef.current?.scrollTo({
        y: getOffsetForIndex(targetIndex),
        animated: false,
      })
    })
  }, [getOffsetForIndex, items, selectedValue])

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y
    const index = getIndexFromOffset(y)
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1))

    if (clampedIndex !== selectedIndex) {
      setSelectedIndex(clampedIndex)
      onValueChange(items[clampedIndex])
    }
  }

  const settleToIndex = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1))
      const targetY = getOffsetForIndex(clampedIndex)

      scrollViewRef.current?.scrollTo({
        y: targetY,
        animated: true,
      })
      isProgrammaticScroll.current = true

      if (clampedIndex !== selectedIndex) {
        setSelectedIndex(clampedIndex)
        onValueChange(items[clampedIndex])
      }
    },
    [getOffsetForIndex, items, onValueChange, selectedIndex],
  )

  const handleScrollEndDrag = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const y = event.nativeEvent.contentOffset.y
    const index = getIndexFromOffset(y)
    settleToIndex(index)
  }

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false
      return
    }

    const y = event.nativeEvent.contentOffset.y
    const index = getIndexFromOffset(y)
    settleToIndex(index)
  }

  return (
    <View style={styles.wheelPickerContainer}>
      <View
        style={[styles.wheelPickerSelection, theme.atoms.border_contrast_low]}
      />
      <WebScrollControls
        scrollViewRef={scrollViewRef}
        direction="vertical"
        scrollAmount={ITEM_HEIGHT}
        iconSize={20}
        style={{right: 10}}
      />
      <ScrollView
        ref={scrollViewRef}
        style={styles.wheelPickerScroll}
        contentContainerStyle={styles.wheelPickerContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate={0.92}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={8}>
        <View style={{height: ITEM_HEIGHT}} />
        {items.map((item, index) => (
          <View
            key={item}
            style={[styles.wheelPickerItem, {height: ITEM_HEIGHT}]}>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.wheelPickerItemTouchable}
              onPress={() => settleToIndex(index)}>
              <Text
                style={[
                  styles.wheelPickerItemText,
                  theme.atoms.text,
                  index === selectedIndex && styles.wheelPickerItemTextSelected,
                ]}>
                {item}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={{height: ITEM_HEIGHT}} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screenCenter: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  contentShell: {
    width: '100%',
    alignSelf: 'center',
  },
  contentShellWeb: {
    maxWidth: 1100,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.9,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  sectionLead: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 720,
    marginBottom: 18,
  },
  resumeGrid: {
    gap: 12,
  },
  resumeGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  creatorEntryCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 16,
  },
  creatorEntryCopy: {
    gap: 8,
  },
  creatorEntryTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  creatorEntryBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  creatorEntryBodyOnPrimary: {
    color: 'rgba(255,255,255,0.88)',
  },
  creatorEntryButton: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  creatorEntryButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  liveBoardCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  liveBoardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveBoardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBoardAvatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  liveBoardMeta: {
    flex: 1,
    gap: 2,
  },
  liveBoardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  liveBoardSubtitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  liveBoardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  liveBoardFooter: {
    fontSize: 13,
    lineHeight: 18,
  },
  resumeCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  resumeCardWeb: {
    width: '31.9%',
  },
  resumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resumeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  resumeMeta: {
    flex: 1,
  },
  resumeTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  resumeSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  resumeDismiss: {
    padding: 6,
  },
  resumeDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  resumeFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  resumeMembers: {
    fontSize: 12,
  },
  metaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  directoryStack: {
    gap: 16,
  },
  directoryModule: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  moduleTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  moduleDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardsScroll: {
    marginBottom: 0,
  },
  directoryRail: {
    gap: 12,
    paddingRight: 16,
  },
  civicCard: {
    width: 286,
    minHeight: 214,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  civicTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 4,
  },
  civicSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  civicDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  civicFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  civicMembers: {
    fontSize: 12,
    fontWeight: '600',
  },
  politicalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  politicalCard: {
    width: 250,
    minHeight: 186,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  politicalCardWeb: {
    flexBasis: '31%',
    minWidth: 240,
    flexGrow: 1,
  },
  politicalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  politicalAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  politicalAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  politicalMeta: {
    flex: 1,
  },
  politicalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  politicalSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 8,
  },
  politicalDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  politicalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  politicalHandle: {
    fontSize: 12,
    fontWeight: '700',
  },
  politicalMembers: {
    fontSize: 12,
  },
  cabildeoCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  cabildeoMeta: {
    flex: 1,
  },
  cabildeoEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  cabildeoTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  cabildeoBody: {
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 620,
  },
  cabildeoPill: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  cabildeoPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  refineLayout: {
    gap: 24,
  },
  refinementPanel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
  },
  refinementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  refinementHeaderCopy: {
    flex: 1,
  },
  discoveryPanelBody: {
    gap: 16,
  },
  miniRailTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  topicRail: {
    gap: 10,
    paddingRight: 8,
  },
  topicCard: {
    width: 180,
    minHeight: 116,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  topicLabel: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  topicHelper: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  featuredStates: {
    gap: 10,
  },
  featuredStatesWeb: {
    flexDirection: 'row',
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    minHeight: 104,
    justifyContent: 'space-between',
    flex: 1,
  },
  stateCardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  stateCardBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  comingSoonCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  comingSoonCardCompact: {
    maxWidth: '100%',
    minHeight: 272,
  },
  comingSoonPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  comingSoonPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  comingSoonBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 420,
  },
  filteredBoardsList: {
    gap: 10,
    width: '100%',
  },
  comingSoonButton: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  comingSoonButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayWeb: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  stateModalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  stateModalContentWeb: {
    width: '100%',
    maxWidth: 420,
    maxHeight: 360,
    alignSelf: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
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
  wheelPickerContainer: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    position: 'relative',
    marginTop: 12,
    marginBottom: 12,
  },
  wheelPickerSelection: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 1,
    pointerEvents: 'none',
  },
  wheelPickerScroll: {
    flex: 1,
  },
  wheelPickerContent: {
    paddingVertical: ITEM_HEIGHT,
  },
  wheelPickerItem: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  wheelPickerItemTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelPickerItemText: {
    fontSize: 16,
    fontWeight: '400',
    opacity: 0.5,
  },
  wheelPickerItemTextSelected: {
    fontWeight: '600',
    opacity: 1,
  },
})
