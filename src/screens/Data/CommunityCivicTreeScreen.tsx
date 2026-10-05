import {useCallback, useEffect, useMemo, useState} from 'react'
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'
import {useRoute} from '@react-navigation/native'

import {COMPASS_POSITION_NAMES} from '#/lib/compass/compassColors'
import {useAnonymousMode} from '#/lib/im8/hooks/useAnonymousMode'
import {usePartyLobbyingBriefingPacksQuery} from '#/state/queries/briefing-packs'
import {
  useCommunityBoardQuery,
  useCommunityBoardsQuery,
  useCommunityTreeDirectoryQuery,
} from '#/state/queries/community-boards'
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
  useCommunityCivicTreeSuggestionsQuery,
  useCommunityCivicTreeSummaryQuery,
  useCommunityTreeContributionsQuery,
  useCreateCommunityCivicTreeRelationshipMutation,
  useRejectCommunityCivicTreeSuggestionMutation,
  useVoteCommunityTreeContributionMutation,
} from '#/state/queries/community-civic-tree'
import {useSession} from '#/state/session'
import {useExpandCivicTreeWorkspace} from '#/state/shell/civic-tree-workspace'
import {atoms as a, useBreakpoints, useLayoutBreakpoints, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {useDialogControl} from '#/components/Dialog'
import {SortitionConfigDialog} from '#/components/dialogs/SortitionConfigDialog'
import {SearchInput} from '#/components/forms/SearchInput'
import {Library_Stroke2_Corner0_Rounded as BookIcon} from '#/components/icons/Library'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {IS_WEB} from '#/env'
import {CivicTreeFab} from '#/features/civicTree/components/CivicTreeFab'
import {CivicTreeHeader} from '#/features/civicTree/components/CivicTreeHeader'
import {
  type CivicTreeViewMode,
  CivicTreeViewSwitch,
} from '#/features/civicTree/components/CivicTreeViewSwitch'
import {type GraphData} from '#/features/civicTree/types'
import {
  collapseCommunityTreeTwins,
  findCommunityTreeTwinGroup,
  resolveCommunityTreeUri,
} from '#/features/communityCivicTree/communitySelection'
import {AddBookDialog} from '#/features/communityCivicTree/components/AddBookDialog'
import {
  CivicTreeFilterMenu,
  CivicTreeFilterRow,
} from '#/features/communityCivicTree/components/CivicTreeFilterMenu'
import {CommunityCivicTreeCards} from '#/features/communityCivicTree/components/CommunityCivicTreeCards'
import {CommunityCivicTreeCollections} from '#/features/communityCivicTree/components/CommunityCivicTreeCollections'
import {CommunityCivicTreeMap} from '#/features/communityCivicTree/components/CommunityCivicTreeMap'
import {CommunityCivicTreeOutline} from '#/features/communityCivicTree/components/CommunityCivicTreeOutline'
import {CommunityHelpWanted} from '#/features/communityCivicTree/components/CommunityHelpWanted'
import {CommunityTopicRail} from '#/features/communityCivicTree/components/CommunityTopicRail'
import {CommunityTreeSelector} from '#/features/communityCivicTree/components/CommunityTreeSelector'
import {filterCommunityWorkspace} from '#/features/communityCivicTree/workspace'
import {ContributionReviewDetail} from './components/ContributionReviewDetail'
import {NodeDetailSheet} from './components/NodeDetailSheet'
import {
  type SortitionStatus,
  SortitionStatusCard,
} from './components/SortitionStatusCard'
import {SummaryModal} from './components/SummaryModal'

export function CommunityCivicTreeScreen() {
  const {t: l} = useLingui()
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
  const {width: windowWidth, height: windowHeight} = useWindowDimensions()
  const {centerColumnOffset} = useLayoutBreakpoints()
  const [viewMode, setViewMode] = useState<CivicTreeViewMode>('map')
  const [treeLayout, setTreeLayout] = useState<'cards' | 'outline'>('cards')
  const [showGovernance, setShowGovernance] = useState(false)
  const expanded =
    IS_WEB && gtMobile && (viewMode === 'map' || viewMode === 'graph')
  useExpandCivicTreeWorkspace(expanded)
  const workspaceLeft =
    windowWidth / 2 -
    300 +
    (centerColumnOffset ? Layout.CENTER_COLUMN_OFFSET : 0)
  const {currentAccount} = useSession()
  const myDid = currentAccount?.did
  const {isEnabled: isAnonymous, profile: anonProfile} = useAnonymousMode()
  const initialUri = route.params?.communityUri
  const initialName = route.params?.communityName
  const pendingContributionId = route.params?.pendingContributionId
  const entryPoint = route.params?.entryPoint
  const initialHighlightCardId = route.params?.highlightCardId

  const directory = useCommunityTreeDirectoryQuery()
  const boards = useMemo(
    () => directory.data?.pages.flatMap(page => page.boards) ?? [],
    [directory.data],
  )
  const entryKey = JSON.stringify([route.key, initialUri, initialName])
  const [selection, setSelection] = useState<{
    entryKey: string
    uri?: string
    name?: string
  }>({entryKey, uri: initialUri, name: initialName})
  const selectedCommunityUri = resolveCommunityTreeUri({
    entryKey,
    selection,
    initialUri,
  })
  const selectionName =
    selection.entryKey === entryKey ? selection.name : initialName
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showContributionNotice, setShowContributionNotice] = useState(
    entryPoint === 'contribution_submitted',
  )
  const [sortitionStatus, setSortitionStatus] =
    useState<SortitionStatus>('none')
  const sortitionControl = useDialogControl()
  const addBookControl = useDialogControl()
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

  /*
   * The force graph shows how cards connect; the outline shows what is being
   * argued. Both read the same filtered data, so switching never changes what
   * is on screen - only how it is arranged.
   */
  const [showIdeologicalOverlay, setShowIdeologicalOverlay] = useState(false)

  // Resolve the exact profile URI even when it is not in the directory or
  // the viewer has never joined. Search results are matched, never guessed.
  const {data: selectedBoardData} = useCommunityBoardQuery({
    uri: selectedCommunityUri,
  })
  const needsNameLookup = !selectedCommunityUri && !!selectionName
  const {data: nameBoardsData, isLoading: nameLoading} =
    useCommunityBoardsQuery({limit: 100, query: selectionName}, needsNameLookup)
  const selectedCommunity = selectedCommunityUri
    ? selectedBoardData?.board?.uri === selectedCommunityUri
      ? selectedBoardData.board
      : boards.find(board => board.uri === selectedCommunityUri)
    : selectionName
      ? collapseCommunityTreeTwins(
          findCommunityTreeTwinGroup(
            nameBoardsData?.boards ?? boards,
            selectionName,
          ),
        )[0]
      : boards.filter(board => board.viewerMembershipState === 'active')
            .length === 1
        ? boards.find(board => board.viewerMembershipState === 'active')
        : undefined
  const communityUri = selectedCommunityUri ?? selectedCommunity?.uri
  const availableBoards = useMemo(
    () => (selectedCommunity ? [...boards, selectedCommunity] : boards),
    [boards, selectedCommunity],
  )
  const selectCommunity = useCallback(
    (uri?: string, name?: string) => {
      setSelection({entryKey, uri, name})
      setSelectedNodeId(undefined)
      setSelectedContributionId(undefined)
      setPendingHighlightCardId(undefined)
      setShowContributionDetail(false)
      setShowContributionNotice(false)
      setShowReviewPanel(false)
      setShowSummary(false)
      setShowSuggestions(false)
      setShowGovernance(false)
      setSortitionStatus('none')
      setSearchQuery('')
      setActiveCardTypes(new Set())
      setActiveRelTypes(new Set())
      setActiveStances(new Set())
    },
    [entryKey],
  )

  const {
    data: graphData,
    isLoading: graphLoading,
    isError: isGraphError,
    refetch: refetchGraph,
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
  const {data: briefingPacks = []} = usePartyLobbyingBriefingPacksQuery({
    communityUri,
    status: 'published',
  })

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

  useEffect(() => {
    setSelectedNodeId(undefined)
    setSelectedContributionId(pendingContributionId)
    setPendingHighlightCardId(initialHighlightCardId)
    setShowContributionNotice(entryPoint === 'contribution_submitted')
    setShowReviewPanel(entryPoint === 'contribution_submitted')
    setShowContributionDetail(false)
    setShowSummary(false)
    setShowSuggestions(false)
    setSortitionStatus('none')
    setSearchQuery('')
    setActiveCardTypes(new Set())
    setActiveRelTypes(new Set())
    setActiveStances(new Set())
  }, [entryKey, pendingContributionId, initialHighlightCardId, entryPoint])

  const graphDataForRender: GraphData | null = useMemo(() => {
    if (!graphData) return null
    return normalizeCommunityCivicTreeGraph(graphData)
  }, [graphData])
  const filteredWorkspace = useMemo(
    () =>
      graphDataForRender
        ? filterCommunityWorkspace(
            graphDataForRender,
            searchQuery,
            activeCardTypes,
            activeRelTypes,
            activeStances,
          )
        : null,
    [
      graphDataForRender,
      searchQuery,
      activeCardTypes,
      activeRelTypes,
      activeStances,
    ],
  )

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
      metadata: card.metadata,
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

  const resetVote = castVote.reset
  const resetRelationship = createRelationship.reset
  useEffect(() => {
    resetVote()
    resetRelationship()
  }, [selectedNodeId, resetVote, resetRelationship])

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

  const isLoading =
    graphLoading ||
    (!communityUri && (directory.isLoading || (needsNameLookup && nameLoading)))

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
    <Layout.Screen
      hideBorders={expanded}
      style={
        IS_WEB && viewMode === 'graph'
          ? {
              height: windowHeight,
              minHeight: 0,
              paddingBottom: gtMobile ? 0 : 60,
            }
          : undefined
      }>
      <Layout.Center
        style={[
          styles.centerColumn,
          expanded && {
            maxWidth: windowWidth,
            width: windowWidth - workspaceLeft - 24,
            marginLeft: workspaceLeft,
            marginRight: 24,
            transform: [],
          },
        ]}>
        <CivicTreeHeader
          titleText={<Trans>Community Civic Tree</Trans>}
          backFallback="MyBase"
        />
        <View style={styles.columnContent}>
          <View
            style={[
              a.p_md,
              a.border_b,
              a.flex_row,
              a.flex_wrap,
              a.align_center,
              a.justify_between,
              a.gap_sm,
              t.atoms.border_contrast_low,
            ]}>
            <CommunityTreeSelector
              boards={availableBoards}
              selectedCommunity={selectedCommunity}
              selectedUri={communityUri}
              selectedName={selectionName}
              onSelect={selectCommunity}
              onSelectNinth={ninth =>
                selectCommunity(undefined, COMPASS_POSITION_NAMES[ninth])
              }
              isLoading={directory.isFetching}
              isError={directory.isError}
              onRetry={() => void directory.refetch()}
              hasNextPage={directory.hasNextPage}
              onLoadMore={() => void directory.fetchNextPage()}
              collapseTwins
              showTreeVersions
            />
          </View>
          <View style={[a.p_md, a.border_b, t.atoms.border_contrast_low]}>
            <CivicTreeViewSwitch value={viewMode} onChange={setViewMode} />
          </View>
          {communityUri && (
            <View style={styles.topControls}>
              {showGovernance ? (
                <SortitionStatusCard
                  status={sortitionStatus}
                  onConfigure={() => sortitionControl.open()}
                  canConfigure={true}
                />
              ) : null}
              <View style={styles.communityActions}>
                <Button
                  label={l`Governance`}
                  size="small"
                  variant="ghost"
                  color="secondary"
                  accessibilityState={{expanded: showGovernance}}
                  onPress={() => setShowGovernance(previous => !previous)}>
                  <ButtonText>
                    <Trans>Governance</Trans>
                  </ButtonText>
                </Button>
                {viewMode === 'graph' ? (
                  <View style={[a.flex_row, a.gap_xs]}>
                    {(['cards', 'outline'] as const).map(layout => (
                      <Button
                        key={layout}
                        label={
                          layout === 'cards' ? l`Cards` : l`Argument outline`
                        }
                        size="tiny"
                        variant={treeLayout === layout ? 'solid' : 'ghost'}
                        color={treeLayout === layout ? 'primary' : 'secondary'}
                        accessibilityState={{selected: treeLayout === layout}}
                        onPress={() => setTreeLayout(layout)}>
                        <ButtonText>
                          {layout === 'cards' ? (
                            <Trans>Cards</Trans>
                          ) : (
                            <Trans>Argument outline</Trans>
                          )}
                        </ButtonText>
                      </Button>
                    ))}
                  </View>
                ) : null}
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
              </View>
            </View>
          )}

          {communityUri && briefingPacks.length > 0 ? (
            <View
              style={[
                styles.briefingRail,
                t.atoms.bg_contrast_25,
                {borderColor: t.palette.contrast_100},
              ]}>
              <Text style={[styles.briefingRailTitle, t.atoms.text]}>
                <Trans>Party Lobbying Briefing Packs</Trans>
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.briefingRailItems}>
                {briefingPacks.map(pack => (
                  <TouchableOpacity
                    key={pack.uri}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${pack.title}`}
                    accessibilityHint="Opens this party lobbying briefing pack"
                    onPress={() => {
                      if (pack.obsidianExportUri) {
                        void Linking.openURL(pack.obsidianExportUri)
                      }
                    }}
                    style={[
                      styles.briefingCard,
                      {borderColor: t.palette.contrast_100},
                    ]}>
                    <Text style={[styles.briefingParty, t.atoms.text]}>
                      {pack.party}
                    </Text>
                    <Text
                      style={[
                        styles.briefingTitle,
                        t.atoms.text_contrast_medium,
                      ]}
                      numberOfLines={2}>
                      {pack.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

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

          {/*
           * Topics first: what the community is working on together, ranked by
           * how many members have joined each one rather than by activity.
           */}
          {viewMode === 'graph' &&
          treeLayout !== 'cards' &&
          graphData &&
          graphData.nodes.length > 0 ? (
            <>
              <CommunityTopicRail
                data={graphData}
                onTopicPress={setSelectedNodeId}
              />
              <CommunityHelpWanted
                data={graphData}
                onNodePress={setSelectedNodeId}
              />
            </>
          ) : null}

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
                {viewMode === 'map' ? (
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
                ) : null}
              </View>

              <CivicTreeFilterRow
                onClear={clearAllFilters}
                showClear={hasActiveFilters}>
                <CivicTreeFilterMenu
                  allLabel={l`All links`}
                  groupLabel={l`Link type`}
                  options={COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES}
                  selected={activeRelTypes}
                  onChange={setActiveRelTypes}
                />
                <CivicTreeFilterMenu
                  allLabel={l`All types`}
                  groupLabel={l`Card type`}
                  options={COMMUNITY_CIVIC_TREE_CARD_TYPES}
                  selected={activeCardTypes}
                  onChange={setActiveCardTypes}
                />
                <CivicTreeFilterMenu
                  allLabel={l`All stances`}
                  groupLabel={l`Stance`}
                  options={COMMUNITY_CIVIC_TREE_STANCE_FILTERS}
                  selected={activeStances}
                  onChange={setActiveStances}
                />
              </CivicTreeFilterRow>
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
                  {selectionName
                    ? `No community tree found for "${selectionName}"`
                    : 'Select a community'}
                </Trans>
              </Text>
              <Text
                style={[styles.emptySubtitle, {color: t.palette.contrast_500}]}>
                <Trans>
                  {selectionName
                    ? 'Choose an available community above or verify the community name.'
                    : 'Choose a community above to explore its civic tree.'}
                </Trans>
              </Text>
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
          ) : filteredWorkspace &&
            filteredWorkspace.nodes.length === 0 &&
            viewMode === 'graph' ? (
            <View
              style={[
                a.flex_1,
                a.p_xl,
                a.align_center,
                a.justify_center,
                a.gap_md,
              ]}>
              <Text style={t.atoms.text_contrast_medium}>
                <Trans>No cards match these filters.</Trans>
              </Text>
              <Button
                label={l`Clear filters`}
                variant="outline"
                color="secondary"
                size="small"
                onPress={clearAllFilters}>
                <ButtonText>
                  <Trans>Clear filters</Trans>
                </ButtonText>
              </Button>
            </View>
          ) : filteredWorkspace && viewMode === 'map' ? (
            <CommunityCivicTreeMap
              key={communityUri}
              data={filteredWorkspace}
              context={graphDataForRender ?? undefined}
              onNodePress={setSelectedNodeId}
              selectedNodeId={selectedNodeId}
              showIdeologicalOverlay={showIdeologicalOverlay}
            />
          ) : filteredWorkspace && viewMode === 'list' ? (
            <CommunityCivicTreeCollections
              key={communityUri}
              data={filteredWorkspace}
              context={graphDataForRender ?? undefined}
              onNodePress={setSelectedNodeId}
            />
          ) : filteredWorkspace &&
            viewMode === 'graph' &&
            treeLayout === 'cards' ? (
            <CommunityCivicTreeCards
              key={communityUri}
              data={filteredWorkspace}
              context={graphDataForRender ?? filteredWorkspace}
              onOpenDetails={setSelectedNodeId}
            />
          ) : filteredWorkspace && treeLayout === 'outline' ? (
            <CommunityCivicTreeOutline
              data={filteredWorkspace}
              searchQuery=""
              activeCardTypes={new Set()}
              activeStances={new Set()}
              onNodePress={setSelectedNodeId}
              selectedNodeId={selectedNodeId}
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
        onSelectNode={setSelectedNodeId}
        isVoting={castVote.isPending}
        voteError={castVote.error?.message}
        relationshipError={createRelationship.error?.message}
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
      {myDid ? (
        <>
          <AddBookDialog
            control={addBookControl}
            defaultCommunityUris={communityUri ? [communityUri] : undefined}
          />
          <CivicTreeFab
            actions={[
              {
                key: 'book',
                label: l`Add book`,
                hint: l`Suggests a book for a community; its members review it first`,
                icon: BookIcon,
                onPress: () => addBookControl.open(),
              },
            ]}
          />
        </>
      ) : null}
      {communityUri && (
        <SortitionConfigDialog
          control={sortitionControl}
          communityUri={communityUri}
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
  briefingRail: {
    marginHorizontal: 12,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  briefingRailTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  briefingRailItems: {
    gap: 8,
  },
  briefingCard: {
    width: 190,
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  briefingParty: {
    fontSize: 12,
    fontWeight: '800',
  },
  briefingTitle: {
    fontSize: 12,
    lineHeight: 16,
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
  overlayToggle: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
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
