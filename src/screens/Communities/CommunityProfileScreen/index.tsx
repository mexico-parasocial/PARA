import {useCallback, useEffect, useMemo, useState} from 'react'
import {RefreshControl, ScrollView, TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useNavigation, useRoute} from '@react-navigation/native'

import {
  type CommunityGovernanceOfficialRepresentative,
  type CommunityGovernancePerson,
} from '#/lib/api/para-lexicons'
import {getCommunityInsignia} from '#/lib/civic-insignias'
import {type CommunityGovernanceView} from '#/lib/community-governance'
import {usePalette} from '#/lib/hooks/usePalette'
import {COMMUNITY_AGENT_PROFILE} from '#/lib/mock-data/community-agent'
import {getPartyFeedProfile, PARTY_FEED_PROFILES} from '#/lib/party-feeds'
import {getPostBadges, type PostBadgeRecord} from '#/lib/post-flairs'
import {type NavigationProp} from '#/lib/routes/types'
import {
  formatCommunityName,
  formatGeographicGroupName,
  isGeographicGroupCommunity,
} from '#/lib/strings/community-names'
import {
  createLocalRecentCommunity,
  useAddRecentCommunity,
} from '#/state/persisted/recent-communities'
import {
  type CommunityBoardView,
  useAcceptDraftInviteMutation,
  useCommunityBoardQuery,
  useCommunityBoardsQuery,
  useJoinCommunityMutation,
  useLeaveCommunityMutation,
} from '#/state/queries/community-boards'
import {useCommunityGovernanceQuery} from '#/state/queries/community-governance'
import {useCommunityPostsQuery} from '#/state/queries/community-posts'
import {useUnreadCountQuery} from '#/state/queries/matrix'
import {useAgent} from '#/state/session'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import {CommunityAbout} from './CommunityAbout'
import {CommunityFeed} from './CommunityFeed'
import {CommunityHero} from './CommunityHero'
import {RepresentativeCard} from './RepresentativeCard'
import {styles} from './styles'

type CommunityProfileParams = {
  communityId?: string
  _communityId?: string
  communityName?: string
}

const EMPTY_GOVERNANCE: CommunityGovernanceView = {
  source: 'network',
  community: '',
  communityId: undefined,
  slug: '',
  createdAt: '',
  updatedAt: '',
  moderators: [],
  officials: [],
  deputies: [],
  metadata: undefined,
  editHistory: [],
}

type CommunityLookup = {
  searchQuery: string
  candidates: string[]
}

function buildCommunityLookup(
  communityId?: string,
  communityName?: string,
): CommunityLookup {
  const candidates = [
    communityId,
    communityName,
    stripCommunityPrefix(communityId),
    stripCommunityPrefix(communityName),
  ]
    .map(normalizeCommunityLookupValue)
    .filter((value): value is string => Boolean(value))

  return {
    searchQuery: candidates[0] ?? '',
    candidates: Array.from(new Set(candidates)),
  }
}

function findCommunityBoardByLookup(
  boards: CommunityBoardView[],
  lookup: CommunityLookup,
) {
  return boards.find(board => {
    const boardCandidates = [
      board.communityId,
      board.slug,
      board.name,
      stripCommunityPrefix(board.communityId),
      stripCommunityPrefix(board.slug),
      stripCommunityPrefix(board.name),
    ]
      .map(normalizeCommunityLookupValue)
      .filter((value): value is string => Boolean(value))

    return boardCandidates.some(candidate =>
      lookup.candidates.includes(candidate),
    )
  })
}

function stripCommunityPrefix(value?: string) {
  return value?.replace(/^[pg]\//i, '')
}

function normalizeCommunityLookupValue(value?: string) {
  return value
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
}

export function CommunityProfileScreen() {
  const pal = usePalette('default')
  const t = useTheme()
  const agent = useAgent()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<{
    key: string
    name: 'CommunityProfile'
    path?: string
    params: CommunityProfileParams
  }>()

  const communityId =
    route.params?.communityId || route.params?._communityId || '1'
  const {communityName = 'Community'} = route.params || {}
  const {data: fetchedBoard} = useCommunityBoardQuery({communityId})
  const detailBoard = fetchedBoard?.board
  const communityLookup = useMemo(
    () => buildCommunityLookup(communityId, communityName),
    [communityId, communityName],
  )
  const {data: fallbackBoardsData} = useCommunityBoardsQuery(
    {limit: 100, query: communityLookup.searchQuery},
    Boolean(!detailBoard?.uri && communityLookup.searchQuery),
  )
  const fallbackBoard = useMemo(
    () =>
      findCommunityBoardByLookup(
        fallbackBoardsData?.boards ?? [],
        communityLookup,
      ),
    [fallbackBoardsData?.boards, communityLookup],
  )
  const board = detailBoard?.uri ? detailBoard : fallbackBoard
  const addRecentCommunity = useAddRecentCommunity()

  useEffect(() => {
    const localRecent = createLocalRecentCommunity({
      communityId,
      communityName: route.params?.communityName,
      communityPath: route.path,
    })
    if (localRecent) {
      addRecentCommunity(localRecent)
    }
  }, [communityId, route.params?.communityName, route.path, addRecentCommunity])

  useEffect(() => {
    if (board) {
      addRecentCommunity(board)
    }
  }, [board, addRecentCommunity])

  const formattedCommunity = useMemo(
    () => formatCommunityName(board?.name || communityName),
    [board?.name, communityName],
  )
  const {
    data: fetchedGovernance,
    isLoading: isGovernanceLoading,
    isError: isGovernanceError,
    refetch: refetchGovernance,
  } = useCommunityGovernanceQuery({
    communityName,
    communityId,
  })
  const governance = fetchedGovernance || EMPTY_GOVERNANCE
  const governanceCommunity = fetchedGovernance?.community
  const resolvedCommunityName =
    governanceCommunity || board?.name || communityName
  const canonicalCommunityPostsKey =
    board?.communityId || board?.slug || fetchedGovernance?.slug
  const communityPostsKey = canonicalCommunityPostsKey || resolvedCommunityName
  const isGeographicGroup = isGeographicGroupCommunity({
    communityId,
    communityName: resolvedCommunityName,
    slug: fetchedGovernance?.slug,
  })
  const formattedDisplayNameParts = isGeographicGroup
    ? formatGeographicGroupName(resolvedCommunityName)
    : governanceCommunity
      ? formatCommunityName(governanceCommunity)
      : board?.name
        ? formatCommunityName(board.name)
        : formattedCommunity
  const displayCommunityName = formattedDisplayNameParts.displayName
  const plainCommunityName = formattedDisplayNameParts.plainName

  // ---------------------------------------------------------------------------
  // Resolve party profile for branded content (subtitle, avatar, gradient)
  // ---------------------------------------------------------------------------
  const partyProfile = useMemo(() => {
    const slug = resolvedCommunityName.toLowerCase().trim()
    // Direct lookup by party id
    const direct = getPartyFeedProfile(slug)
    if (direct) return direct
    // Try to find a party whose name appears in the community name
    for (const profile of PARTY_FEED_PROFILES) {
      if (
        slug.includes(profile.name.toLowerCase()) ||
        slug.includes(profile.id.toLowerCase())
      ) {
        return profile
      }
    }
    return null
  }, [resolvedCommunityName])

  const featuredRepresentative = useMemo(() => {
    return (governance.officials[0] ||
      governance.deputies[0]?.activeHolder ||
      null) as
      | CommunityGovernanceOfficialRepresentative
      | CommunityGovernancePerson
      | null
  }, [governance.deputies, governance.officials])
  const agentDisplayName =
    featuredRepresentative?.displayName ||
    featuredRepresentative?.handle ||
    featuredRepresentative?.did ||
    COMMUNITY_AGENT_PROFILE.displayName
  const agentRoleLabel = 'AI Agent'
  const agentGovernanceRole =
    (featuredRepresentative as CommunityGovernanceOfficialRepresentative)
      ?.office || (governance.deputies[0] ? governance.deputies[0].role : '')
  const agentMandate =
    (featuredRepresentative as CommunityGovernanceOfficialRepresentative)
      ?.mandate ||
    (governance.deputies[0] ? governance.deputies[0].description : '') ||
    COMMUNITY_AGENT_PROFILE.bio
  const agentActorId =
    featuredRepresentative?.did ||
    featuredRepresentative?.handle ||
    COMMUNITY_AGENT_PROFILE.id
  const isDraft = board?.status === 'draft'

  const {
    data,
    isFetched,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch: refetchPosts,
    fetchNextPage,
    hasNextPage,
  } = useCommunityPostsQuery({
    community: communityPostsKey,
    enabled: !isDraft,
  })

  const posts = useMemo(() => {
    return (
      data?.pages
        .flatMap(page => page.posts)
        .filter(post => {
          // Filter out posts from users with unresolved/invalid handles in production
          if (__DEV__ && post.author.handle === 'handle.invalid') {
            console.warn(
              '[CommunityProfileScreen] Allowing handle.invalid in __DEV__',
              post.author.did,
            )
            return true
          }
          return post.author.handle !== 'handle.invalid'
        }) || []
    )
  }, [data])

  const quorumCount = board?.memberCount ?? 0
  const membersToUnlock = Math.max(0, 9 - quorumCount)
  const [activeTab, setActiveTab] = useState<'Feed' | 'about'>(
    isDraft ? 'about' : 'Feed',
  )
  const displayedTab = isDraft ? 'about' : activeTab
  const [joinOverride, setJoinOverride] = useState<boolean | null>(null)
  const [isPTR, setIsPTR] = useState(false)
  const isJoined = joinOverride ?? board?.viewerMembershipState === 'active'
  const {data: unreadData} = useUnreadCountQuery(agent.session?.did)
  const unreadCount = unreadData?.unread ?? 0
  const acceptInviteMutation = useAcceptDraftInviteMutation()
  const joinMutation = useJoinCommunityMutation()
  const leaveMutation = useLeaveCommunityMutation()
  const isJoinPending = joinMutation.isPending || leaveMutation.isPending
  const joinLeaveError = joinMutation.error || leaveMutation.error

  const onPressJoin = async () => {
    if (!board?.uri) return
    const currentlyJoined =
      joinOverride ?? board?.viewerMembershipState === 'active'
    try {
      if (currentlyJoined) {
        await leaveMutation.mutateAsync({communityUri: board.uri})
        setJoinOverride(false)
      } else {
        await joinMutation.mutateAsync({communityUri: board.uri})
        setJoinOverride(true)
      }
    } catch {
      // Error handled by mutation state
    }
  }

  const onPressAcceptFounderInvite = async () => {
    if (!board?.uri) return
    try {
      await acceptInviteMutation.mutateAsync({communityUri: board.uri})
      setJoinOverride(true)
    } catch {}
  }

  const onRefresh = useCallback(async () => {
    setIsPTR(true)
    await Promise.all([refetchPosts(), refetchGovernance()])
    setIsPTR(false)
  }, [refetchPosts, refetchGovernance])

  const communityStats = useMemo(() => {
    let policyPosts = 0
    let matterPosts = 0
    let raqPosts = 0
    const visiblePosters = new Set<string>()

    for (const post of posts) {
      visiblePosters.add(post.author.did)
      const badges = getPostBadges(post.record as PostBadgeRecord)
      if (
        badges.some(
          badge =>
            badge.key === 'postType:raq' ||
            badge.key === 'postType:open_question',
        )
      ) {
        raqPosts += 1
      }
      if (badges.some(badge => badge.kind === 'policy')) {
        policyPosts += 1
      }
      if (badges.some(badge => badge.kind === 'matter')) {
        matterPosts += 1
      }
    }

    return {
      policyPosts,
      matterPosts,
      raqPosts,
      visiblePosters: visiblePosters.size,
    }
  }, [posts])

  const createdAt =
    board?.createdAt || fetchedGovernance?.createdAt || governance.createdAt

  // Derive community brand color from insignia system
  const insigniaColors = getCommunityInsignia(resolvedCommunityName)
  const brandColor = insigniaColors[0] || '#6366f1'

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------
  const onPressDocuments = () => {
    navigation.navigate('Documents', {})
  }

  const onPressPolicies = () => {
    navigation.navigate('PoliciesDashboard', {mode: 'Policies'})
  }

  const onPressMatters = () => {
    navigation.navigate('PoliciesDashboard', {mode: 'Matters'})
  }

  const onPressRAQ = () => {
    navigation.navigate('CommunityRAQ', {
      communityId,
      communityName,
    })
  }

  const onPressVoters = () => {
    navigation.navigate('CommunityVoters', {
      communityId,
      communityName,
    })
  }

  const onPressCabildeo = () => {
    navigation.navigate('CabildeoList', {
      communityId,
      communityName,
    })
  }

  const onPressRoles = () => {
    navigation.navigate('CommunityRoles', {
      communityId,
      communityName,
    })
  }

  const onPressChat = () => {
    if (!agentActorId) return
    navigation.navigate('AgentChat', {agentId: agentActorId})
  }

  const onPressCommunityChat = () => {
    if (!board?.uri) return
    navigation.navigate('CommunityChat', {
      communityUri: board.uri,
      communityName: board?.name || communityName,
    })
  }

  const onPressAgentProfile = () => {
    if (!agentActorId) return
    navigation.navigate('CommunityAgentProfile', {
      agentId: agentActorId,
      communityName: board?.name || communityName,
    })
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Community</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isPTR} onRefresh={onRefresh} />
        }>
        <Layout.Center>
          {/* Hero Banner Section */}
          <CommunityHero
            displayCommunityName={displayCommunityName}
            plainCommunityName={plainCommunityName}
            brandColor={brandColor}
            partyProfile={partyProfile}
            boardDescription={board?.description}
            memberCount={board?.memberCount ?? 0}
            postsCount={posts.length}
            communityStats={communityStats}
            isJoined={isJoined}
            isDraft={isDraft}
            isJoinPending={isJoinPending}
            joinLeaveError={joinLeaveError}
            onPressJoin={onPressJoin}
            onPressDocuments={onPressDocuments}
            onPressRAQ={onPressRAQ}
            onPressRoles={onPressRoles}
            onPressVoters={onPressVoters}
            onPressCommunityChat={onPressCommunityChat}
            unreadCount={unreadCount}
            governance={governance}
            pal={pal}
          />

          {/* Representative Card */}
          <RepresentativeCard
            featuredRepresentative={featuredRepresentative}
            agentDisplayName={agentDisplayName}
            agentRoleLabel={agentRoleLabel}
            agentGovernanceRole={agentGovernanceRole}
            agentMandate={agentMandate}
            agentActorId={agentActorId}
            isGeographicGroup={isGeographicGroup}
            onPressAgentProfile={onPressAgentProfile}
            onPressChat={onPressChat}
            pal={pal}
          />

          {/* Draft Banner */}
          {isDraft ? (
            <View
              style={[
                styles.draftBanner,
                {
                  backgroundColor: t.palette.primary_25,
                  borderColor: t.palette.primary_200,
                },
              ]}>
              <Text
                style={[
                  styles.draftBannerTitle,
                  {color: t.palette.primary_700},
                ]}>
                🚧 Draft Community
              </Text>
              <Text
                style={[
                  styles.draftBannerBody,
                  {color: t.palette.primary_600},
                ]}>
                This community needs {membersToUnlock} more founding members to
                become active. Until the quorum is reached, posts and governance
                actions stay locked while members can still review policies,
                matters, RAQ, and community information.
              </Text>
            </View>
          ) : null}

          {/* Chamber Assignment (bicameral only) */}
          {board?.chamberMode === 'bicameral' && isJoined && (
            <View
              style={[
                styles.chamberBanner,
                {
                  backgroundColor:
                    t.scheme === 'dark'
                      ? 'rgba(99,102,241,0.15)'
                      : 'rgba(99,102,241,0.08)',
                  borderColor:
                    t.scheme === 'dark'
                      ? 'rgba(99,102,241,0.3)'
                      : 'rgba(99,102,241,0.2)',
                },
              ]}>
              <Text
                style={[
                  styles.chamberBannerTitle,
                  {color: t.scheme === 'dark' ? '#a5b4fc' : '#4338ca'},
                ]}>
                🏛️ Deliberación Bi-cameral
              </Text>
              <Text
                style={[
                  styles.chamberBannerBody,
                  {color: t.scheme === 'dark' ? '#c7d2fe' : '#6366f1'},
                ]}>
                {board?.viewerRoles?.includes('observer')
                  ? 'Eres observador del Consejo. Tienes acceso de lectura a ambas cámaras.'
                  : `Tu asignación: Cámara ${board?.chamberMode === 'bicameral' ? '(sorteo)' : ''}`}
              </Text>
            </View>
          )}

          {/* Navigation Tabs */}
          <View
            style={[
              styles.tabsContainer,
              {
                backgroundColor:
                  t.scheme === 'dark'
                    ? 'rgba(255,255,255,0.03)'
                    : t.palette.primary_25,
              },
            ]}>
            <View
              style={[
                styles.tabsInner,
                {
                  backgroundColor:
                    t.scheme === 'dark'
                      ? 'rgba(255,255,255,0.06)'
                      : t.palette.primary_50,
                  borderRadius: 12,
                },
              ]}>
              {!isDraft ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[
                    styles.pillTab,
                    displayedTab === 'Feed' && [
                      styles.pillTabActive,
                      {backgroundColor: t.palette.primary_500},
                    ],
                  ]}
                  onPress={() => setActiveTab('Feed')}>
                  <Text
                    style={[
                      styles.pillTabText,
                      {
                        color:
                          displayedTab === 'Feed'
                            ? '#fff'
                            : t.palette.contrast_400,
                      },
                    ]}>
                    <Trans>Posts</Trans>
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.pillTab,
                  displayedTab === 'about' && [
                    styles.pillTabActive,
                    {backgroundColor: t.palette.primary_500},
                  ],
                ]}
                onPress={() => setActiveTab('about')}>
                <Text
                  style={[
                    styles.pillTabText,
                    {
                      color:
                        displayedTab === 'about'
                          ? '#fff'
                          : t.palette.contrast_400,
                    },
                  ]}>
                  <Trans>About</Trans>
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content Area */}
          <View style={styles.contentArea}>
            {!isDraft && displayedTab === 'Feed' && (
              <CommunityFeed
                posts={posts}
                isLoading={isLoading}
                isFetched={isFetched}
                isError={isError}
                error={error}
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                refetchPosts={refetchPosts}
                fetchNextPage={fetchNextPage}
                pal={pal}
              />
            )}

            {displayedTab === 'about' && (
              <CommunityAbout
                board={board}
                governance={governance}
                fetchedGovernance={fetchedGovernance || undefined}
                isGovernanceLoading={isGovernanceLoading}
                isGovernanceError={isGovernanceError}
                refetchGovernance={refetchGovernance}
                isDraft={isDraft}
                isJoined={isJoined}
                quorumCount={quorumCount}
                plainCommunityName={plainCommunityName}
                resolvedCommunityName={resolvedCommunityName}
                createdAt={createdAt}
                acceptInviteMutation={acceptInviteMutation}
                onPressAcceptFounderInvite={onPressAcceptFounderInvite}
                onPressPolicies={onPressPolicies}
                onPressMatters={onPressMatters}
                onPressRAQ={onPressRAQ}
                onPressCabildeo={onPressCabildeo}
                onPressVoters={onPressVoters}
                onPressRoles={onPressRoles}
                onPressDocuments={onPressDocuments}
                pal={pal}
              />
            )}
          </View>
        </Layout.Center>
      </ScrollView>
    </Layout.Screen>
  )
}
