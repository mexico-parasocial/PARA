import {useCallback, useEffect, useMemo, useState} from 'react'
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useRoute} from '@react-navigation/native'

import {useAnonymousMode} from '#/lib/m8/hooks/useAnonymousMode'
import {useCommunityBoardsQuery} from '#/state/queries/community-boards'
import {
  COMMUNITY_CIVIC_TREE_CARD_TYPES,
  COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES,
  COMMUNITY_CIVIC_TREE_STANCE_FILTERS,
  didContributionBecomeApproved,
  normalizeCommunityCivicTreeGraph,
  useAcceptCommunityCivicTreeSuggestionMutation,
  useCastCommunityCivicTreeVoteMutation,
  useCommunityCivicTreeCardVoteQuery,
  useCommunityCivicTreeGraphQuery,
  useCommunityCivicTreePulseQuery,
  useCommunityCivicTreeSuggestionsQuery,
  useCommunityCivicTreeSummaryQuery,
  useCommunityTreeContributionsQuery,
  useCreateCommunityCivicTreeRelationshipMutation,
  useRejectCommunityCivicTreeSuggestionMutation,
  useVoteCommunityTreeContributionMutation,
} from '#/state/queries/community-civic-tree'
import {useSession} from '#/state/session'
import {useBreakpoints, useTheme} from '#/alf'
import {useDialogControl} from '#/components/Dialog'
import {SortitionConfigDialog} from '#/components/dialogs/SortitionConfigDialog'
import {SearchInput} from '#/components/forms/SearchInput'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {CommunityCivicTreeGraph} from './components/CommunityCivicTreeGraph'
import {CommunityPulseSheet} from './components/CommunityPulseSheet'
import {ContributionReviewDetail} from './components/ContributionReviewDetail'
import {NodeDetailSheet} from './components/NodeDetailSheet'
import {
  type SortitionStatus,
  SortitionStatusCard,
} from './components/SortitionStatusCard'
import {SummaryModal} from './components/SummaryModal'
import {type GraphData} from './deliberation-types'

export function CommunityCivicTreeScreen() {
  const route = useRoute<{
    key: string
    name: 'CommunityCivicTree'
    params:
      | {
          communityUri?: string
          communityName?: string
          pendingContributionId?: string
          highlightCardId?: string
          entryPoint?: 'contribution_submitted' | 'contribution_approved'
        }
      | undefined
  }>()
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const {currentAccount} = useSession()
  const myDid = currentAccount?.did
  const {isEnabled: isAnonymous, profile: anonProfile} = useAnonymousMode()
  const initialUri = route.params?.communityUri
  const initialName = route.params?.communityName
  const pendingContributionId = route.params?.pendingContributionId
  const entryPoint = route.params?.entryPoint
  const initialHighlightCardId = route.params?.highlightCardId

  const {data: boardsData, isLoading: boardsLoading} = useCommunityBoardsQuery()
  const myBoards = useMemo(() => {
    return (
      boardsData?.boards.filter(
        b =>
          b.viewerMembershipState === 'active' ||
          b.viewerMembershipState === 'pending',
      ) ?? []
    )
  }, [boardsData])

  const [selectedCommunityUri, setSelectedCommunityUri] = useState<
    string | undefined
  >(initialUri)
  const [showPicker, setShowPicker] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const [showContributionNotice, setShowContributionNotice] = useState(
    entryPoint === 'contribution_submitted',
  )
  const [sortitionStatus, setSortitionStatus] =
    useState<SortitionStatus>('none')
  const sortitionControl = useDialogControl()
  const [showReviewPanel, setShowReviewPanel] = useState(
    entryPoint === 'contribution_submitted',
  )
  const [selectedContributionId, setSelectedContributionId] = useState<
    string | undefined
  >(pendingContributionId)
  const [showContributionDetail, setShowContributionDetail] = useState(false)
  const [pendingHighlightCardId, setPendingHighlightCardId] = useState<
    string | undefined
  >(initialHighlightCardId)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCardTypes, setActiveCardTypes] = useState<Set<string>>(new Set())
  const [activeRelTypes, setActiveRelTypes] = useState<Set<string>>(new Set())
  const [activeStances, setActiveStances] = useState<Set<string>>(new Set())
  const [showIdeologicalOverlay, setShowIdeologicalOverlay] = useState(false)

  const selectedCommunityFromBoards = useMemo(() => {
    // First try explicit selection
    if (selectedCommunityUri) {
      const selected = myBoards.find(b => b.uri === selectedCommunityUri)
      if (selected) return selected
    }
    // Then try matching by name from URL param (e.g. ?communityName=pan)
    if (initialName) {
      const byName = myBoards.find(
        b =>
          b.name?.toLowerCase() === initialName.toLowerCase() ||
          b.slug?.toLowerCase() === initialName.toLowerCase(),
      )
      if (byName) return byName
      // Name was explicitly provided but no match found — don't fall back
      return undefined
    }
    // Then try initial URI
    if (initialUri) {
      const initial = myBoards.find(b => b.uri === initialUri)
      if (initial) return initial
      // URI was explicitly provided but no match found — don't fall back
      return undefined
    }
    // No explicit selection — auto-select if user has exactly one community
    if (myBoards.length === 1) return myBoards[0]
    // Multiple communities — show picker
    return undefined
  }, [initialName, initialUri, myBoards, selectedCommunityUri])

  // If community not found in user's boards, try searching all public boards
  // by name/slug (allows viewing public communities without membership)
  const needsFallbackLookup = Boolean(
    initialName && !boardsLoading && !selectedCommunityFromBoards,
  )
  const {data: fallbackBoardsData, isLoading: fallbackLoading} =
    useCommunityBoardsQuery(
      {
        query: needsFallbackLookup ? initialName : undefined,
      },
      needsFallbackLookup,
    )
  const fallbackBoard = fallbackBoardsData?.boards?.[0]

  const selectedCommunity = selectedCommunityFromBoards ?? fallbackBoard

  const communityUri = selectedCommunity?.uri

  const {
    data: graphData,
    isLoading: graphLoading,
    isError: isGraphError,
    refetch: refetchGraph,
    isFetching: isGraphFetching,
  } = useCommunityCivicTreeGraphQuery(communityUri)

  const {data: suggestions = []} =
    useCommunityCivicTreeSuggestionsQuery(communityUri)
  const acceptSuggestion = useAcceptCommunityCivicTreeSuggestionMutation()
  const rejectSuggestion = useRejectCommunityCivicTreeSuggestionMutation()
  const voteContribution = useVoteCommunityTreeContributionMutation()
  const {data: pendingContributions = []} = useCommunityTreeContributionsQuery(
    communityUri,
    myDid,
  )
  const {data: summary} = useCommunityCivicTreeSummaryQuery(communityUri)
  const {data: pulse} = useCommunityCivicTreePulseQuery(communityUri, myDid)

  const selectedContribution = useMemo(() => {
    if (selectedContributionId) {
      const found = pendingContributions.find(
        contribution => contribution.id === selectedContributionId,
      )
      if (found) return found
    }
    return gtMobile ? pendingContributions[0] : undefined
  }, [gtMobile, pendingContributions, selectedContributionId])

  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(
    undefined,
  )

  const graphDataForRender: GraphData | null = useMemo(() => {
    if (!graphData) return null
    return normalizeCommunityCivicTreeGraph(graphData)
  }, [graphData])

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !graphData) return null
    const card = graphData.nodes.find(n => n.id === selectedNodeId)
    if (!card) return null
    return {
      id: card.id,
      title: card.title,
      content: card.content,
      card_type: card.card_type,
      author_did: card.author_did,
      source_url: card.source_url,
      influence: card.influence ?? 0,
    }
  }, [selectedNodeId, graphData])

  const castVote = useCastCommunityCivicTreeVoteMutation()
  const createRelationship = useCreateCommunityCivicTreeRelationshipMutation()
  const {data: myVoteData} = useCommunityCivicTreeCardVoteQuery(
    selectedNodeId,
    myDid,
  )
  const myVote = myVoteData?.vote?.influence ?? 0

  useEffect(() => {
    if (!pendingHighlightCardId || !graphData) return
    if (graphData.nodes.some(node => node.id === pendingHighlightCardId)) {
      const timeout = setTimeout(() => {
        setSelectedNodeId(pendingHighlightCardId)
        setPendingHighlightCardId(undefined)
      }, 0)
      return () => clearTimeout(timeout)
    }
  }, [graphData, pendingHighlightCardId])

  const toggleCardType = useCallback((type: string) => {
    setActiveCardTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const toggleRelType = useCallback((type: string) => {
    setActiveRelTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const toggleStance = useCallback((stance: string) => {
    setActiveStances(prev => {
      const next = new Set(prev)
      if (next.has(stance)) {
        next.delete(stance)
      } else {
        next.add(stance)
      }
      return next
    })
  }, [])

  const clearAllFilters = useCallback(() => {
    setSearchQuery('')
    setActiveCardTypes(new Set())
    setActiveRelTypes(new Set())
    setActiveStances(new Set())
  }, [])

  const hasActiveFilters =
    searchQuery.length > 0 ||
    activeCardTypes.size > 0 ||
    activeRelTypes.size > 0 ||
    activeStances.size > 0

  const isLoading = boardsLoading || fallbackLoading || graphLoading

  const onVoteContribution = useCallback(
    (
      contribution: (typeof pendingContributions)[number],
      vote: 'approve' | 'reject',
    ) => {
      if (!myDid || !communityUri) return
      voteContribution.mutate(
        {
          contributionId: contribution.id,
          communityUri,
          voterDid: myDid,
          vote,
        },
        {
          onSuccess: data => {
            if (didContributionBecomeApproved(data.contribution)) {
              setPendingHighlightCardId(data.contribution.approved_card_id!)
              setShowContributionDetail(false)
            }
          },
        },
      )
    },
    [communityUri, myDid, voteContribution],
  )

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton fallback="MyBase" />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Community Civic Tree</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Center style={styles.centerColumn}>
        <View style={styles.columnContent}>
          {communityUri && (
            <View style={styles.topControls}>
              <SortitionStatusCard
                status={sortitionStatus}
                onConfigure={() => sortitionControl.open()}
                canConfigure={true}
              />
              <View style={styles.communityActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Community pulse"
                  accessibilityHint="Opens community discourse analysis"
                  onPress={() => setShowPulse(true)}
                  style={[
                    styles.pulseBtn,
                    {backgroundColor: t.palette.primary_500 + '15'},
                  ]}>
                  <Text
                    style={[
                      styles.topActionText,
                      {color: t.palette.primary_500},
                    ]}>
                    <Trans>Pulse</Trans>
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Summarize community civic tree"
                  accessibilityHint="Opens AI-generated community civic tree summary"
                  onPress={() => setShowSummary(true)}
                  style={[
                    styles.summarizeBtn,
                    {backgroundColor: t.palette.primary_500 + '15'},
                  ]}>
                  <Text
                    style={[
                      styles.topActionText,
                      {color: t.palette.primary_500},
                    ]}>
                    <Trans>Summary</Trans>
                  </Text>
                </TouchableOpacity>
                {suggestions.length > 0 && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`${suggestions.length} relationship suggestions`}
                    accessibilityHint="Opens suggested relationships panel"
                    onPress={() => setShowSuggestions(true)}
                    style={styles.suggestionBadge}>
                    <Text style={styles.suggestionBadgeText}>
                      {suggestions.length}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Select community"
                  accessibilityHint="Opens community picker"
                  onPress={() => setShowPicker(true)}
                  style={[
                    styles.communityButton,
                    {borderColor: t.palette.contrast_100},
                  ]}>
                  <Text
                    style={[
                      styles.communityButtonText,
                      {color: t.palette.primary_500},
                    ]}>
                    {selectedCommunity?.name ?? 'Select Community'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showContributionNotice && (
            <View
              style={[
                styles.notice,
                {
                  backgroundColor: t.palette.primary_500 + '12',
                  borderColor: t.palette.primary_500 + '33',
                },
              ]}>
              <View style={styles.noticeTextWrap}>
                <Text
                  style={[styles.noticeTitle, {color: t.palette.primary_500}]}>
                  <Trans>Your contribution is under community review.</Trans>
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="View pending contributions"
                accessibilityHint="Shows the list of contributions under review"
                onPress={() => setShowReviewPanel(true)}
                style={styles.noticeAction}>
                <Text
                  style={[
                    styles.noticeActionText,
                    {color: t.palette.primary_500},
                  ]}>
                  <Trans>View pending contributions</Trans>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close notice"
                accessibilityHint="Hides this notice"
                onPress={() => setShowContributionNotice(false)}
                style={styles.noticeClose}>
                <Text style={{color: t.palette.primary_500}}>×</Text>
              </TouchableOpacity>
            </View>
          )}

          {showReviewPanel && communityUri && (
            <View
              style={[
                styles.reviewPanel,
                {borderColor: t.palette.contrast_100},
              ]}>
              <View style={styles.reviewHeader}>
                <View>
                  <Text style={[styles.reviewTitle, t.atoms.text]}>
                    <Trans>Contributions under review</Trans>
                  </Text>
                  <Text
                    style={[
                      styles.reviewSubtitle,
                      t.atoms.text_contrast_medium,
                    ]}>
                    <Trans>The community decides what goes on the map.</Trans>
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Close contributions under review"
                  accessibilityHint="Hides the list of pending contributions"
                  onPress={() => setShowReviewPanel(false)}
                  style={styles.reviewClose}>
                  <Text style={t.atoms.text_contrast_medium}>×</Text>
                </TouchableOpacity>
              </View>

              {pendingContributions.length === 0 ? (
                <Text
                  style={[styles.reviewEmpty, t.atoms.text_contrast_medium]}>
                  <Trans>No pending contributions right now.</Trans>
                </Text>
              ) : (
                <View style={[gtMobile && styles.reviewSplit]}>
                  <ScrollView
                    horizontal={!gtMobile}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    style={gtMobile && styles.reviewListColumn}
                    contentContainerStyle={[
                      styles.reviewList,
                      gtMobile && styles.reviewListVertical,
                    ]}>
                    {pendingContributions.map(contribution => {
                      const highlighted =
                        contribution.id === pendingContributionId ||
                        contribution.id === selectedContribution?.id
                      return (
                        <TouchableOpacity
                          key={contribution.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Revisar aporte: ${contribution.title}`}
                          accessibilityHint="Opens the contribution detail before voting"
                          accessibilityState={{
                            selected:
                              contribution.id === selectedContribution?.id,
                          }}
                          onPress={() => {
                            setSelectedContributionId(contribution.id)
                            if (!gtMobile) setShowContributionDetail(true)
                          }}
                          style={[
                            styles.reviewCard,
                            gtMobile && styles.reviewCardWeb,
                            t.atoms.bg_contrast_25,
                            {
                              borderColor: highlighted
                                ? t.palette.primary_500
                                : t.palette.contrast_100,
                            },
                          ]}>
                          <Text
                            style={[styles.reviewCardTitle, t.atoms.text]}
                            numberOfLines={2}>
                            {contribution.title}
                          </Text>
                          <Text
                            style={[
                              styles.reviewCardMeta,
                              t.atoms.text_contrast_medium,
                            ]}
                            numberOfLines={1}>
                            {contribution.source_type} ·{' '}
                            {contribution.author_did === myDid &&
                            isAnonymous &&
                            anonProfile
                              ? `${anonProfile.displayName} · Anonymous`
                              : `${contribution.author_did.slice(0, 24)}...`}
                          </Text>
                          <Text
                            style={[
                              styles.reviewCounts,
                              t.atoms.text_contrast_medium,
                            ]}>
                            <Trans>
                              In favor {contribution.approve_count} / Against{' '}
                              {contribution.reject_count}
                            </Trans>
                          </Text>
                          <Text
                            style={[
                              styles.reviewOpen,
                              {color: t.palette.primary_500},
                            ]}>
                            <Trans>Review and vote</Trans>
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>

                  {gtMobile && selectedContribution ? (
                    <View style={styles.reviewDetailPane}>
                      <ContributionReviewDetail
                        contribution={selectedContribution}
                        onVote={onVoteContribution}
                        isVoting={voteContribution.isPending}
                        onOpenSource={url => {
                          void Linking.openURL(url)
                        }}
                        onClose={() => setSelectedContributionId(undefined)}
                        showClose={false}
                      />
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          )}

          {/* Search & Filters */}
          {graphData && graphData.nodes.length > 0 && (
            <View style={styles.filterBar}>
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrap}>
                  <SearchInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onClearText={() => setSearchQuery('')}
                    label="Search contributions"
                  />
                </View>
                {hasActiveFilters && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Clear all filters"
                    accessibilityHint="Removes search and all active filters"
                    onPress={clearAllFilters}
                    style={styles.clearButton}>
                    <Text style={{color: t.palette.primary_500, fontSize: 13}}>
                      <Trans>Clear</Trans>
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Toggle Ideological Overlay"
                  accessibilityHint="Colors the map based on the political compass"
                  accessibilityState={{selected: showIdeologicalOverlay}}
                  onPress={() => setShowIdeologicalOverlay(prev => !prev)}
                  style={[
                    styles.overlayToggle,
                    {
                      backgroundColor: showIdeologicalOverlay
                        ? t.palette.primary_500 + '20'
                        : t.palette.contrast_100,
                      borderColor: showIdeologicalOverlay
                        ? t.palette.primary_500
                        : 'transparent',
                    },
                  ]}>
                  <Text
                    style={{
                      color: showIdeologicalOverlay
                        ? t.palette.primary_500
                        : t.palette.contrast_700,
                      fontSize: 13,
                      fontWeight: '600',
                    }}>
                    <Trans>Compass Overlay</Trans>
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsContent}>
                {/* Relationship type chips */}
                {COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES.map(rt => {
                  const active = activeRelTypes.has(rt.value)
                  return (
                    <TouchableOpacity
                      key={rt.value}
                      accessibilityRole="button"
                      accessibilityLabel={rt.label}
                      accessibilityHint={`Toggle ${rt.label} filter`}
                      accessibilityState={{selected: active}}
                      onPress={() => toggleRelType(rt.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active
                            ? rt.color + '30'
                            : t.palette.contrast_100,
                          borderColor: active ? rt.color : 'transparent',
                        },
                      ]}>
                      <View
                        style={[styles.chipDot, {backgroundColor: rt.color}]}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: active ? rt.color : t.palette.contrast_700,
                          },
                        ]}>
                        {rt.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}

                {/* Card type chips */}
                {COMMUNITY_CIVIC_TREE_CARD_TYPES.map(ct => {
                  const active = activeCardTypes.has(ct.value)
                  return (
                    <TouchableOpacity
                      key={ct.value}
                      accessibilityRole="button"
                      accessibilityLabel={ct.label}
                      accessibilityHint={`Toggle ${ct.label} filter`}
                      accessibilityState={{selected: active}}
                      onPress={() => toggleCardType(ct.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active
                            ? t.palette.primary_500 + '15'
                            : t.palette.contrast_100,
                          borderColor: active
                            ? t.palette.primary_500
                            : 'transparent',
                        },
                      ]}>
                      <Text style={styles.chipIcon}>{ct.icon}</Text>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: active
                              ? t.palette.primary_500
                              : t.palette.contrast_700,
                          },
                        ]}>
                        {ct.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}

                {/* Stance chips */}
                {COMMUNITY_CIVIC_TREE_STANCE_FILTERS.map(sf => {
                  const active = activeStances.has(sf.value)
                  return (
                    <TouchableOpacity
                      key={sf.value}
                      accessibilityRole="button"
                      accessibilityLabel={sf.label}
                      accessibilityHint={`Toggle ${sf.label} filter`}
                      accessibilityState={{selected: active}}
                      onPress={() => toggleStance(sf.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active
                            ? sf.color + '20'
                            : t.palette.contrast_100,
                          borderColor: active ? sf.color : 'transparent',
                        },
                      ]}>
                      <View
                        style={[styles.chipDot, {backgroundColor: sf.color}]}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: active ? sf.color : t.palette.contrast_700,
                          },
                        ]}>
                        {sf.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}

          {isLoading && !graphData ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={t.palette.primary_500} />
              <Text
                style={[styles.loadingText, {color: t.palette.contrast_500}]}>
                <Trans>Loading community tree...</Trans>
              </Text>
            </View>
          ) : isGraphError ? (
            <View style={styles.centered}>
              <Text
                style={[styles.emptyTitle, {color: t.palette.negative_500}]}>
                <Trans>Error loading map</Trans>
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  {color: t.palette.contrast_500, marginBottom: 16},
                ]}>
                <Trans>Could not connect to server.</Trans>
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => void refetchGraph()}
                style={[
                  styles.noticeAction,
                  {
                    backgroundColor: t.palette.primary_500,
                    borderRadius: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                  },
                ]}>
                <Text style={[styles.noticeActionText, {color: 'white'}]}>
                  <Trans>Retry</Trans>
                </Text>
              </TouchableOpacity>
            </View>
          ) : !communityUri ? (
            <View style={styles.centered}>
              <Text
                style={[styles.emptyTitle, {color: t.palette.contrast_900}]}>
                <Trans>
                  {initialName
                    ? `Community "${initialName}" not found`
                    : 'Select a community'}
                </Trans>
              </Text>
              <Text
                style={[styles.emptySubtitle, {color: t.palette.contrast_500}]}>
                <Trans>
                  {initialName
                    ? 'Verify the name is correct or that you are a community member.'
                    : 'Join a community to see its civic tree.'}
                </Trans>
              </Text>
              {myBoards.length > 0 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setShowPicker(true)}
                  style={[
                    styles.noticeAction,
                    {
                      backgroundColor: t.palette.primary_500,
                      borderRadius: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      marginTop: 12,
                    },
                  ]}>
                  <Text style={[styles.noticeActionText, {color: 'white'}]}>
                    <Trans>Select community</Trans>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : graphData && graphData.nodes.length === 0 ? (
            <View style={styles.centered}>
              <Text
                style={[styles.emptyTitle, {color: t.palette.contrast_900}]}>
                <Trans>No community tree yet</Trans>
              </Text>
              <Text
                style={[styles.emptySubtitle, {color: t.palette.contrast_500}]}>
                <Trans>
                  Community-approved contributions will appear here as
                  connectable nodes.
                </Trans>
              </Text>
            </View>
          ) : graphDataForRender ? (
            <CommunityCivicTreeGraph
              data={graphDataForRender}
              searchQuery={searchQuery}
              activeCardTypes={activeCardTypes}
              activeRelTypes={activeRelTypes}
              activeStances={activeStances}
              showIdeologicalOverlay={showIdeologicalOverlay}
              onNodePress={setSelectedNodeId}
              selectedNodeId={selectedNodeId}
              onRefresh={() => {
                void refetchGraph()
              }}
              isRefreshing={isGraphFetching}
            />
          ) : null}
        </View>
      </Layout.Center>

      <NodeDetailSheet
        node={selectedNode}
        availableNodes={graphDataForRender?.nodes ?? []}
        availableEdges={graphDataForRender?.edges ?? []}
        visible={!!selectedNodeId}
        onClose={() => setSelectedNodeId(undefined)}
        voterDid={myDid}
        userVote={myVote}
        onVote={(cardId, influence) => {
          if (myDid) {
            castVote.mutate({cardId, voterDid: myDid, influence, communityUri})
          }
        }}
        onCreateRelationship={(
          sourceCardId,
          targetCardId,
          relationshipType,
        ) => {
          if (!myDid) return
          if (!communityUri) return
          createRelationship.mutate({
            communityUri,
            sourceCardId,
            targetCardId,
            relationshipType,
            authorDid: myDid,
          })
        }}
        isCreatingRelationship={createRelationship.isPending}
      />

      <CommunityPulseSheet
        pulse={pulse ?? null}
        communityName={selectedCommunity?.name ?? ''}
        visible={showPulse}
        onClose={() => setShowPulse(false)}
        onClaimPress={claimId => {
          setShowPulse(false)
          setSelectedNodeId(claimId)
        }}
      />

      <SummaryModal
        summary={summary ?? null}
        visible={showSummary}
        onClose={() => setShowSummary(false)}
      />

      {!gtMobile && selectedContribution ? (
        <Modal
          visible={showContributionDetail}
          transparent
          animationType="slide"
          onRequestClose={() => setShowContributionDetail(false)}>
          <View style={styles.modalOverlay}>
            <ContributionReviewDetail
              contribution={selectedContribution}
              onVote={onVoteContribution}
              isVoting={voteContribution.isPending}
              onOpenSource={url => {
                void Linking.openURL(url)
              }}
              onClose={() => setShowContributionDetail(false)}
              showClose
            />
          </View>
        </Modal>
      ) : null}

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {backgroundColor: t.palette.contrast_0},
            ]}>
            <Text style={[styles.modalTitle, {color: t.palette.contrast_900}]}>
              <Trans>Select Community</Trans>
            </Text>
            <ScrollView>
              {myBoards.map(board => (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={board.name}
                  accessibilityHint={`Select ${board.name}`}
                  key={board.uri}
                  style={[
                    styles.boardRow,
                    board.uri === communityUri && {
                      backgroundColor: t.palette.primary_500 + '15',
                    },
                  ]}
                  onPress={() => {
                    setSelectedCommunityUri(board.uri)
                    setShowPicker(false)
                  }}>
                  <Text
                    style={[styles.boardName, {color: t.palette.contrast_900}]}>
                    {board.name}
                  </Text>
                  {board.uri === communityUri && (
                    <Text style={{color: t.palette.primary_500}}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityHint="Closes community picker"
              style={[
                styles.closeButton,
                {borderColor: t.palette.contrast_200},
              ]}
              onPress={() => setShowPicker(false)}>
              <Text style={{color: t.palette.primary_500}}>
                <Trans>Cancel</Trans>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Suggestions Modal */}
      <Modal
        visible={showSuggestions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSuggestions(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {backgroundColor: t.palette.contrast_0},
            ]}>
            <Text style={[styles.modalTitle, {color: t.palette.contrast_900}]}>
              <Trans>Suggested Relationships</Trans>
            </Text>
            <Text
              style={[
                {color: t.palette.contrast_500, marginBottom: 12, fontSize: 13},
              ]}>
              <Trans>Based on shared entities detected by NER</Trans>
            </Text>
            <ScrollView>
              {suggestions.map(sugg => {
                const relColor = COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES.find(
                  r => r.value === sugg.relationship_type,
                )?.color
                return (
                  <View
                    key={sugg.id}
                    style={[
                      styles.suggestionRow,
                      {borderColor: t.palette.contrast_200},
                    ]}>
                    <View style={styles.suggestionContent}>
                      <Text
                        style={[
                          styles.suggestionTitle,
                          {color: t.palette.contrast_900},
                        ]}
                        numberOfLines={1}>
                        {sugg.source_title}
                      </Text>
                      <View style={styles.suggestionArrow}>
                        <Text
                          style={[
                            styles.suggestionRel,
                            {color: relColor || t.palette.primary_500},
                          ]}>
                          {COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES.find(
                            r => r.value === sugg.relationship_type,
                          )?.label ?? sugg.relationship_type}{' '}
                          · {Math.round(sugg.confidence * 100)}%
                        </Text>
                        {sugg.reason?.startsWith('[LLM]') && (
                          <View style={styles.aiBadge}>
                            <Text style={styles.aiBadgeText}>AI</Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.suggestionTitle,
                          {color: t.palette.contrast_700},
                        ]}
                        numberOfLines={1}>
                        {sugg.target_title}
                      </Text>
                      <Text
                        style={[
                          styles.suggestionReason,
                          {color: t.palette.contrast_500},
                        ]}>
                        {sugg.reason}
                      </Text>
                    </View>
                    <View style={styles.suggestionActions}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Accept suggestion"
                        accessibilityHint="Creates this relationship in the graph"
                        onPress={() => {
                          if (myDid) {
                            acceptSuggestion.mutate(
                              {id: sugg.id, communityUri, authorDid: myDid},
                              {
                                onSuccess: () => setShowSuggestions(false),
                              },
                            )
                          }
                        }}
                        style={[
                          styles.suggestionBtn,
                          {backgroundColor: t.palette.positive_500 + '20'},
                        ]}>
                        <Text
                          style={{
                            color: t.palette.positive_500,
                            fontSize: 13,
                            fontWeight: '700',
                          }}>
                          ✓
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Reject suggestion"
                        accessibilityHint="Removes this suggestion permanently"
                        onPress={() => {
                          rejectSuggestion.mutate({id: sugg.id, communityUri})
                        }}
                        style={[
                          styles.suggestionBtn,
                          {backgroundColor: t.palette.negative_500 + '20'},
                        ]}>
                        <Text
                          style={{
                            color: t.palette.negative_500,
                            fontSize: 13,
                            fontWeight: '700',
                          }}>
                          ✕
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              })}
            </ScrollView>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close suggestions"
              accessibilityHint="Closes the suggestions panel"
              style={[
                styles.closeButton,
                {borderColor: t.palette.contrast_200},
              ]}
              onPress={() => setShowSuggestions(false)}>
              <Text style={{color: t.palette.primary_500}}>
                <Trans>Close</Trans>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {selectedCommunityUri && (
        <SortitionConfigDialog
          control={sortitionControl}
          communityUri={selectedCommunityUri}
          onConfirm={config => {
            console.log('Iniciando sorteo:', config)
            setSortitionStatus('pending')
            // Simular procesamiento de Drand
            setTimeout(() => {
              setSortitionStatus('active')
            }, 3000)
          }}
        />
      )}
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  centerColumn: {
    flex: 1,
  },
  columnContent: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  topControls: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  communityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
  },
  topActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  notice: {
    marginHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  noticeAction: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  noticeActionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  noticeClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewPanel: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  reviewSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewEmpty: {
    fontSize: 13,
  },
  reviewList: {
    gap: 10,
    paddingRight: 12,
  },
  reviewSplit: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  reviewListColumn: {
    width: 280,
    maxHeight: 360,
  },
  reviewListVertical: {
    flexDirection: 'column',
    paddingRight: 0,
  },
  reviewDetailPane: {
    flex: 1,
    minWidth: 0,
  },
  reviewCard: {
    width: 260,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  reviewCardWeb: {
    width: '100%',
  },
  reviewCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  reviewCardMeta: {
    fontSize: 11,
  },
  reviewCounts: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewOpen: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  reviewVoteBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  reviewVoteText: {
    fontSize: 12,
    fontWeight: '800',
  },
  filterBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  overlayToggle: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipsScroll: {
    maxHeight: 44,
  },
  chipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipIcon: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  communityButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  communityButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  boardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  boardName: {
    fontSize: 15,
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  suggestionBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  suggestionBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  pulseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  summarizeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  suggestionContent: {
    flex: 1,
    gap: 3,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  suggestionRel: {
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionReason: {
    fontSize: 11,
    marginTop: 2,
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 6,
  },
  suggestionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBadge: {
    backgroundColor: '#7c3aed',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  aiBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '800',
  },
})
