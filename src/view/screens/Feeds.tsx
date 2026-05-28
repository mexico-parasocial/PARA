 
import {useCallback, useMemo, useRef, useState} from 'react'
import {ActivityIndicator, Pressable, StyleSheet, View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'
import {AtUri} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useFocusEffect, useNavigation} from '@react-navigation/native'
import {useQuery} from '@tanstack/react-query'
import debounce from 'lodash.debounce'

import {BSKY_FEED_OWNER_DIDS} from '#/lib/constants'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {usePalette} from '#/lib/hooks/usePalette'
import {useWebMediaQueries} from '#/lib/hooks/useWebMediaQueries'
import {PARTY_FEED_PROFILES, type PartyFeedProfile} from '#/lib/party-feeds'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
  type NavigationProp,
} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {s} from '#/lib/styles'
import {
  type SavedFeedItem,
  useGetPopularFeedsQuery,
  useSavedFeeds,
  useSearchPopularFeedsMutation,
} from '#/state/queries/feed'
import {useFollowedElementsQuery} from '#/state/queries/followed-elements'
import {
  useAddSavedFeedsMutation,
  usePreferencesQuery,
  useRemoveFeedMutation,
} from '#/state/queries/preferences'
import {useAgent, useSession} from '#/state/session'
import {useSetMinimalShellMode} from '#/state/shell'
import {
  FOLLOWED_ITEM_CATEGORIES,
  type FollowedItem,
  type FollowedItemType,
} from '#/state/topics/topicTypes'
import {ErrorMessage} from '#/view/com/util/error/ErrorMessage'
import {FAB} from '#/view/com/util/fab/FAB'
import {List, type ListMethods} from '#/view/com/util/List'
import {FeedFeedLoadingPlaceholder} from '#/view/com/util/LoadingPlaceholder'
import {Text} from '#/view/com/util/text/Text'
import {NoFollowingFeed} from '#/screens/Feeds/NoFollowingFeed'
import {NoSavedFeedsOfAnyType} from '#/screens/Feeds/NoSavedFeedsOfAnyType'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as FeedCard from '#/components/FeedCard'
import {SearchInput} from '#/components/forms/SearchInput'
import {IconCircle} from '#/components/IconCircle'
import {ChainLink_Stroke2_Corner0_Rounded as ChainLinkIcon} from '#/components/icons/ChainLink'
import {ChevronRight_Stroke2_Corner0_Rounded as ChevronRight} from '#/components/icons/Chevron'
import {EditBig_Stroke2_Corner2_Rounded as EditBigIcon} from '#/components/icons/EditBig'
import {FilterTimeline_Stroke2_Corner0_Rounded as FilterTimeline} from '#/components/icons/FilterTimeline'
import {Hashtag_Stroke2_Corner0_Rounded as HashtagIcon} from '#/components/icons/Hashtag'
import {ListMagnifyingGlass_Stroke2_Corner0_Rounded} from '#/components/icons/ListMagnifyingGlass'
import {ListSparkle_Stroke2_Corner0_Rounded} from '#/components/icons/ListSparkle'
import {Pin_Stroke2_Corner0_Rounded as PinIcon} from '#/components/icons/Pin'
import {SettingsGear2_Stroke2_Corner0_Rounded as Gear} from '#/components/icons/SettingsGear2'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import * as Layout from '#/components/Layout'
import {Link} from '#/components/Link'
import * as ListCard from '#/components/ListCard'
import * as Toast from '#/components/Toast'
import {IS_NATIVE, IS_WEB} from '#/env'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'Feeds'>

const PARTY_FEED_NAMES = new Set([
  'Morena',
  'PAN',
  'PRI',
  'PVEM',
  'PT',
  'MC',
  'PRD',
  'Independientes',
])

const BLOCKED_FEED_DISPLAY_NAMES = new Set([
  'Cronología PARA',
  'Debates y propuestas',
  "What's Hot",
  'Latest',
  "What's Hot (Classic)",
  'The Vids',
  'Videos',
])

function isUnofficialFeed(feed: AppBskyFeedDefs.GeneratorView): boolean {
  try {
    const uri = new AtUri(feed.uri)
    return BSKY_FEED_OWNER_DIDS.includes(uri.host)
  } catch {
    return false
  }
}

/**
 * Dedicated query for party feeds.
 * Unlike useGetPopularFeedsQuery, this does NOT filter out saved feeds,
 * so the Party Feeds section always has feed objects for its pin buttons.
 */
function usePartyFeedsQuery() {
  const agent = useAgent()
  return useQuery({
    queryKey: ['partyFeeds'],
    queryFn: async () => {
      const res = await agent.app.bsky.unspecced.getPopularFeedGenerators({
        limit: 100,
      })
      return res.data.feeds.filter(feed =>
        PARTY_FEED_NAMES.has(feed.displayName),
      )
    },
    staleTime: 60_000,
  })
}

type FlatlistSlice =
  | {
      type: 'error'
      key: string
      error: string
    }
  | {
      type: 'savedFeedsHeader'
      key: string
    }
  | {
      type: 'savedFeedPlaceholder'
      key: string
    }
  | {
      type: 'savedFeedNoResults'
      key: string
    }
  | {
      type: 'savedFeed'
      key: string
      savedFeed: SavedFeedItem
    }
  | {
      type: 'savedFeedsLoadMore'
      key: string
    }
  | {
      type: 'popularFeedsHeader'
      key: string
    }
  | {
      type: 'partyFeedsSection'
      key: string
      partyFeeds?: AppBskyFeedDefs.GeneratorView[]
    }
  | {
      type: 'followedElements'
      key: string
    }
  | {
      type: 'popularFeedsLoading'
      key: string
    }
  | {
      type: 'popularFeedsNoResults'
      key: string
    }
  | {
      type: 'popularFeed'
      key: string
      feedUri: string
      feed: AppBskyFeedDefs.GeneratorView
    }
  | {
      type: 'popularFeedsLoadingMore'
      key: string
    }
  | {
      type: 'noFollowingFeed'
      key: string
    }

export function FeedsScreen(_props: Props) {
  const pal = usePalette('default')
  const t = useTheme()
  const {openComposer} = useOpenComposer()
  const {isMobile} = useWebMediaQueries()
  const [query, setQuery] = useState('')
  const [isPTR, setIsPTR] = useState(false)
  const {
    data: savedFeeds,
    isPlaceholderData: isSavedFeedsPlaceholder,
    error: savedFeedsError,
    refetch: refetchSavedFeeds,
  } = useSavedFeeds()
  const {
    data: popularFeeds,
    isFetching: isPopularFeedsFetching,
    error: popularFeedsError,
    refetch: refetchPopularFeeds,
    fetchNextPage: fetchNextPopularFeedsPage,
    isFetchingNextPage: isPopularFeedsFetchingNextPage,
    hasNextPage: hasNextPopularFeedsPage,
  } = useGetPopularFeedsQuery({limit: 50})
  const {data: partyFeedsData} = usePartyFeedsQuery()
  const {_} = useLingui()
  const setMinimalShellMode = useSetMinimalShellMode()
  const {
    data: searchResults,
    mutate: search,
    reset: resetSearch,
    isPending: isSearchPending,
    error: searchError,
  } = useSearchPopularFeedsMutation()
  const {hasSession} = useSession()
  const listRef = useRef<ListMethods>(null)

  /**
   * A search query is present. We may not have search results yet.
   */
  const isUserSearching = query.length > 1
  const debouncedSearch = useMemo(
    () => debounce(q => search(q), 500), // debounce for 500ms
    [search],
  )
  const onPressCompose = useCallback(() => {
    openComposer({})
  }, [openComposer])
  const onChangeQuery = useCallback(
    (text: string) => {
      setQuery(text)
      if (text.length > 1) {
        debouncedSearch(text)
      } else {
        refetchPopularFeeds()
        resetSearch()
      }
    },
    [setQuery, refetchPopularFeeds, debouncedSearch, resetSearch],
  )
  const onPressCancelSearch = useCallback(() => {
    setQuery('')
    refetchPopularFeeds()
    resetSearch()
  }, [refetchPopularFeeds, setQuery, resetSearch])
  const onSubmitQuery = useCallback(() => {
    debouncedSearch(query)
  }, [query, debouncedSearch])
  const onPullToRefresh = useCallback(async () => {
    setIsPTR(true)
    await Promise.all([
      refetchSavedFeeds().catch(_e => undefined),
      refetchPopularFeeds().catch(_e => undefined),
    ])
    setIsPTR(false)
  }, [setIsPTR, refetchSavedFeeds, refetchPopularFeeds])
  const onEndReached = useCallback(() => {
    if (
      isPopularFeedsFetching ||
      isUserSearching ||
      !hasNextPopularFeedsPage ||
      popularFeedsError
    )
      return
    fetchNextPopularFeedsPage()
  }, [
    isPopularFeedsFetching,
    isUserSearching,
    popularFeedsError,
    hasNextPopularFeedsPage,
    fetchNextPopularFeedsPage,
  ])

  useFocusEffect(
    useCallback(() => {
      setMinimalShellMode(false)
    }, [setMinimalShellMode]),
  )

  const items = useMemo(() => {
    let slices: FlatlistSlice[] = []
    const hasActualSavedCount =
      !isSavedFeedsPlaceholder ||
      (isSavedFeedsPlaceholder && (savedFeeds?.count || 0) > 0)
    const canShowDiscoverSection =
      !hasSession || (hasSession && hasActualSavedCount)

    if (hasSession) {
      slices.push({
        key: 'savedFeedsHeader',
        type: 'savedFeedsHeader',
      })

      if (savedFeedsError) {
        slices.push({
          key: 'savedFeedsError',
          type: 'error',
          error: cleanError(savedFeedsError.toString()),
        })
      } else {
        if (isSavedFeedsPlaceholder && !savedFeeds?.feeds.length) {
          /*
           * Initial render in placeholder state is 0 on a cold page load,
           * because preferences haven't loaded yet.
           *
           * In practice, `savedFeeds` is always defined, but we check for TS
           * and for safety.
           *
           * In both cases, we show 4 as the the loading state.
           */
          const min = 8
          const count = savedFeeds
            ? savedFeeds.count === 0
              ? min
              : savedFeeds.count
            : min
          Array(count)
            .fill(0)
            .forEach((_, i) => {
              slices.push({
                key: 'savedFeedPlaceholder' + i,
                type: 'savedFeedPlaceholder',
              })
            })
        } else {
          if (savedFeeds?.feeds?.length) {
            const noFollowingFeed = savedFeeds.feeds.every(
              f => f.type !== 'timeline',
            )

            slices = slices.concat(
              savedFeeds.feeds
                .filter(feed => {
                  return feed.config.pinned
                })
                .map(feed => ({
                  key: `savedFeed:${feed.view?.uri}:${feed.config.id}`,
                  type: 'savedFeed',
                  savedFeed: feed,
                })),
            )

            slices = slices.concat(
              savedFeeds.feeds
                .filter(feed => {
                  return !feed.config.pinned
                })
                .map(feed => ({
                  key: `savedFeed:${feed.view?.uri}:${feed.config.id}`,
                  type: 'savedFeed',
                  savedFeed: feed,
                })),
            )

            if (noFollowingFeed) {
              slices.push({
                key: 'noFollowingFeed',
                type: 'noFollowingFeed',
              })
            }
          } else {
            slices.push({
              key: 'savedFeedNoResults',
              type: 'savedFeedNoResults',
            })
          }
        }
      }

      slices.push({
        key: 'followedElements',
        type: 'followedElements',
      })
    }

    // Use dedicated party feeds query so pin buttons stay visible
    // even after a feed has been saved (the popular query filters saved feeds).
    const partyFeedsForSection = !isUserSearching ? (partyFeedsData ?? []) : []

    if (!isUserSearching) {
      slices.push({
        key: 'partyFeedsSection',
        type: 'partyFeedsSection',
        partyFeeds: partyFeedsForSection,
      })
    }

    if (!hasSession || (hasSession && canShowDiscoverSection)) {
      slices.push({
        key: 'popularFeedsHeader',
        type: 'popularFeedsHeader',
      })

      if (popularFeedsError || searchError) {
        slices.push({
          key: 'popularFeedsError',
          type: 'error',
          error: cleanError(
            popularFeedsError?.toString() ?? searchError?.toString() ?? '',
          ),
        })
      } else {
        if (isUserSearching) {
          if (isSearchPending || !searchResults) {
            slices.push({
              key: 'popularFeedsLoading',
              type: 'popularFeedsLoading',
            })
          } else {
            if (!searchResults || searchResults?.length === 0) {
              slices.push({
                key: 'popularFeedsNoResults',
                type: 'popularFeedsNoResults',
              })
            } else {
              slices = slices.concat(
                searchResults
                  .filter(feed => !PARTY_FEED_NAMES.has(feed.displayName))
                  .filter(
                    feed =>
                      !BLOCKED_FEED_DISPLAY_NAMES.has(feed.displayName) &&
                      !isUnofficialFeed(feed),
                  )
                  .map(feed => ({
                    key: `popularFeed:${feed.uri}`,
                    type: 'popularFeed',
                    feedUri: feed.uri,
                    feed,
                  })),
              )
            }
          }
        } else {
          if (isPopularFeedsFetching && !popularFeeds?.pages) {
            slices.push({
              key: 'popularFeedsLoading',
              type: 'popularFeedsLoading',
            })
          } else {
            if (!popularFeeds?.pages?.length) {
              slices.push({
                key: 'popularFeedsNoResults',
                type: 'popularFeedsNoResults',
              })
            } else {
              for (const page of popularFeeds.pages || []) {
                slices = slices.concat(
                  page.feeds
                    .filter(feed => !PARTY_FEED_NAMES.has(feed.displayName))
                    .filter(
                      feed =>
                        !BLOCKED_FEED_DISPLAY_NAMES.has(feed.displayName) &&
                        !isUnofficialFeed(feed),
                    )
                    .map(feed => ({
                      key: `popularFeed:${feed.uri}`,
                      type: 'popularFeed',
                      feedUri: feed.uri,
                      feed,
                    })),
                )
              }

              if (isPopularFeedsFetchingNextPage) {
                slices.push({
                  key: 'popularFeedsLoadingMore',
                  type: 'popularFeedsLoadingMore',
                })
              }
            }
          }
        }
      }
    }

    return slices
  }, [
    hasSession,
    savedFeeds,
    isSavedFeedsPlaceholder,
    savedFeedsError,
    popularFeeds,
    isPopularFeedsFetching,
    popularFeedsError,
    isPopularFeedsFetchingNextPage,
    searchResults,
    isSearchPending,
    searchError,
    isUserSearching,
    partyFeedsData,
  ])

  const searchBarIndex = items.findIndex(
    item => item.type === 'popularFeedsHeader',
  )

  const onChangeSearchFocus = useCallback(
    (focus: boolean) => {
      if (focus && searchBarIndex > -1) {
        if (IS_NATIVE) {
          // scrollToIndex scrolls the exact right amount, so use if available
          listRef.current?.scrollToIndex({
            index: searchBarIndex,
            animated: true,
          })
        } else {
          // web implementation only supports scrollToOffset
          // thus, we calculate the offset based on the index
          // pixel values are estimates, I wasn't able to get it pixel perfect :(
          const headerHeight = isMobile ? 43 : 53
          const feedItemHeight = isMobile ? 49 : 58
          listRef.current?.scrollToOffset({
            offset: searchBarIndex * feedItemHeight - headerHeight,
            animated: true,
          })
        }
      }
    },
    [searchBarIndex, isMobile],
  )

  const renderItem = useCallback(
    ({item}: {item: FlatlistSlice}) => {
      if (item.type === 'error') {
        return <ErrorMessage message={item.error} />
      } else if (item.type === 'popularFeedsLoadingMore') {
        return (
          <View style={s.p10}>
            <ActivityIndicator size="large" />
          </View>
        )
      } else if (item.type === 'savedFeedsHeader') {
        return <FeedsSavedHeader />
      } else if (item.type === 'savedFeedNoResults') {
        return (
          <View
            style={[
              pal.border,
              {
                borderBottomWidth: 1,
              },
            ]}>
            <NoSavedFeedsOfAnyType />
          </View>
        )
      } else if (item.type === 'savedFeedPlaceholder') {
        return <SavedFeedPlaceholder />
      } else if (item.type === 'savedFeed') {
        return <FeedOrFollowing savedFeed={item.savedFeed} />
      } else if (item.type === 'popularFeedsHeader') {
        return (
          <>
            <FeedsAboutHeader />
            <View style={{paddingHorizontal: 12, paddingBottom: 4}}>
              <SearchInput
                placeholder={_(msg`Search feeds`)}
                value={query}
                onChangeText={onChangeQuery}
                onClearText={onPressCancelSearch}
                onSubmitEditing={onSubmitQuery}
                onFocus={() => onChangeSearchFocus(true)}
                onBlur={() => onChangeSearchFocus(false)}
              />
            </View>
          </>
        )
      } else if (item.type === 'partyFeedsSection') {
        return <PartyFeedsSection partyFeeds={item.partyFeeds} />
      } else if (item.type === 'followedElements') {
        return <FollowedElementsSection />
      } else if (item.type === 'popularFeedsLoading') {
        return <FeedFeedLoadingPlaceholder />
      } else if (item.type === 'popularFeed') {
        return (
          <View style={styles.feedCardShell}>
            <View
              style={[
                styles.discoverFeedCard,
                t.atoms.bg,
                t.atoms.border_contrast_low,
              ]}>
              <FeedCard.Default view={item.feed} />
            </View>
          </View>
        )
      } else if (item.type === 'popularFeedsNoResults') {
        return (
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: '150%',
            }}>
            <Text type="lg" style={pal.textLight}>
              <Trans>No results found for "{query}"</Trans>
            </Text>
          </View>
        )
      } else if (item.type === 'noFollowingFeed') {
        return (
          <View
            style={[
              pal.border,
              {
                borderBottomWidth: 1,
              },
            ]}>
            <NoFollowingFeed />
          </View>
        )
      }
      return null
    },
    [
      _,
      pal.border,
      pal.textLight,
      query,
      t.atoms.bg,
      t.atoms.border_contrast_low,
      onChangeQuery,
      onPressCancelSearch,
      onSubmitQuery,
      onChangeSearchFocus,
    ],
  )

  return (
    <Layout.Screen testID="FeedsScreen">
      <Layout.Center>
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Feeds</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
          <Layout.Header.Slot>
            <Link
              testID="editFeedsBtn"
              to="/settings/saved-feeds"
              label={_(msg`Edit My Feeds`)}
              size="small"
              variant="ghost"
              color="secondary"
              shape="round"
              style={[a.justify_center, {right: -3}]}>
              <ButtonIcon icon={Gear} size="lg" />
            </Link>
          </Layout.Header.Slot>
        </Layout.Header.Outer>

        <List
          ref={listRef}
          data={items}
          keyExtractor={item => (item as FlatlistSlice).key}
          contentContainerStyle={styles.contentContainer}
          renderItem={({item}) => renderItem({item: item as FlatlistSlice})}
          refreshing={isPTR}
          onRefresh={isUserSearching ? undefined : onPullToRefresh}
          initialNumToRender={10}
          onEndReached={onEndReached}
          desktopFixedHeight
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          sideBorders={false}
        />
      </Layout.Center>

      {hasSession && (
        <FAB
          testID="composeFAB"
          onPress={onPressCompose}
          icon={<EditBigIcon size="lg" fill={t.palette.white} />}
          accessibilityRole="button"
          accessibilityLabel={_(msg`New post`)}
          accessibilityHint=""
        />
      )}
    </Layout.Screen>
  )
}

function FeedOrFollowing({savedFeed}: {savedFeed: SavedFeedItem}) {
  return savedFeed.type === 'timeline' ? (
    <FollowingFeed />
  ) : (
    <SavedFeed savedFeed={savedFeed} />
  )
}

function FollowingFeed() {
  const t = useTheme()
  const {_} = useLingui()
  return (
    <View
      style={[
        a.flex_1,
        a.px_lg,
        a.py_md,
        a.border_b,
        t.atoms.border_contrast_low,
      ]}>
      <FeedCard.Header>
        <View
          style={[
            a.align_center,
            a.justify_center,
            {
              width: 28,
              height: 28,
              borderRadius: 3,
              backgroundColor: t.palette.primary_500,
            },
          ]}>
          <FilterTimeline
            style={[
              {
                width: 18,
                height: 18,
              },
            ]}
            fill={t.palette.white}
          />
        </View>
        <FeedCard.TitleAndByline
          title={_(msg({message: 'Following', context: 'feed-name'}))}
        />
      </FeedCard.Header>
    </View>
  )
}

function SavedFeed({
  savedFeed,
}: {
  savedFeed: SavedFeedItem & {type: 'feed' | 'list'}
}) {
  const t = useTheme()

  const commonStyle = [
    a.w_full,
    a.flex_1,
    a.px_lg,
    a.py_md,
    a.border_b,
    t.atoms.border_contrast_low,
  ]

  return savedFeed.type === 'feed' ? (
    <FeedCard.Link
      testID={`saved-feed-${savedFeed.view.displayName}`}
      {...savedFeed}>
      {({hovered, pressed}) => (
        <View
          style={[commonStyle, (hovered || pressed) && t.atoms.bg_contrast_25]}>
          <FeedCard.Header>
            <FeedCard.Avatar src={savedFeed.view.avatar} size={28} />
            <FeedCard.TitleAndByline title={savedFeed.view.displayName} />

            <ChevronRight size="sm" fill={t.atoms.text_contrast_low.color} />
          </FeedCard.Header>
        </View>
      )}
    </FeedCard.Link>
  ) : (
    <ListCard.Link testID={`saved-feed-${savedFeed.view.name}`} {...savedFeed}>
      {({hovered, pressed}) => (
        <View
          style={[commonStyle, (hovered || pressed) && t.atoms.bg_contrast_25]}>
          <ListCard.Header>
            <ListCard.Avatar src={savedFeed.view.avatar} size={28} />
            <ListCard.TitleAndByline title={savedFeed.view.name} />

            <ChevronRight size="sm" fill={t.atoms.text_contrast_low.color} />
          </ListCard.Header>
        </View>
      )}
    </ListCard.Link>
  )
}

function SavedFeedPlaceholder() {
  const t = useTheme()
  return (
    <View
      style={[
        a.flex_1,
        a.px_lg,
        a.py_md,
        a.border_b,
        t.atoms.border_contrast_low,
      ]}>
      <FeedCard.Header>
        <FeedCard.AvatarPlaceholder size={28} />
        <FeedCard.TitleAndBylinePlaceholder />
      </FeedCard.Header>
    </View>
  )
}

const FOLLOWED_ELEMENT_ICONS = {
  hashtag: HashtagIcon,
  policy: TreeIcon,
  matter: TreeIcon,
  post: ChainLinkIcon,
  thread: ChainLinkIcon,
} satisfies Record<FollowedItemType, typeof HashtagIcon>

function getFollowedElementTypeLabel(type: FollowedItemType) {
  switch (type) {
    case 'hashtag':
      return 'Hashtag'
    case 'policy':
      return 'Policy'
    case 'matter':
      return 'Matter'
    case 'post':
      return 'Post'
    case 'thread':
      return 'Thread'
  }
}

function FollowedElementsSection() {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const {data: items = [], isLoading} = useFollowedElementsQuery()
  const visibleItems = items.slice(0, 3)
  const hasMore = items.length > visibleItems.length

  const openManage = useCallback(() => {
    navigation.navigate('FollowedElementsSettings')
  }, [navigation])

  const openSelected = useCallback(
    (item: FollowedItem) => {
      navigation.navigate('FollowedElementsSettings', {selectedId: item.id})
    },
    [navigation],
  )

  return (
    <View
      style={[
        styles.followedElementsSection,
        a.border_b,
        t.atoms.border_contrast_low,
      ]}>
      <View style={styles.followedElementsHeader}>
        <View style={styles.followedElementsTitleRow}>
          <Text style={[styles.followedElementsTitle, t.atoms.text]}>
            <Trans>Followed Elements</Trans>
          </Text>
          <View
            style={[
              styles.followedElementsCountBadge,
              {backgroundColor: `${t.palette.primary_500}15`},
            ]}>
            <Text
              style={[
                styles.followedElementsCount,
                {color: t.palette.primary_500},
              ]}>
              {items.length}
            </Text>
          </View>
        </View>
        <Text style={[styles.followedElementsLead, t.atoms.text_contrast_high]}>
          <Trans>
            Topics, civic trees, and bridges you follow now live with your
            feeds.
          </Trans>
        </Text>
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.followedElementsLoading}>
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <View
          style={[
            styles.followedElementsEmpty,
            t.atoms.bg,
            t.atoms.border_contrast_low,
          ]}>
          <Text style={[styles.followedElementTitle, t.atoms.text]}>
            <Trans>No followed elements yet</Trans>
          </Text>
          <Button
            label="Manage followed elements"
            size="small"
            color="primary"
            variant="solid"
            onPress={openManage}>
            <ButtonText>
              <Trans>Manage followed elements</Trans>
            </ButtonText>
          </Button>
        </View>
      ) : (
        <View style={styles.followedElementsGrid}>
          {visibleItems.map(item => (
            <FollowedElementCard
              key={item.id}
              item={item}
              onPress={() => openSelected(item)}
            />
          ))}
        </View>
      )}

      {items.length > 0 && (
        <Pressable
          onPress={openManage}
          style={styles.followedElementsManageLink}
          accessibilityLabel="Manage followed elements"
          accessibilityHint="Opens settings to manage followed elements">
          <Text
            style={[
              styles.followedElementsManageText,
              {color: t.palette.primary_500},
            ]}>
            {hasMore ? (
              <Trans>View all</Trans>
            ) : (
              <Trans>Manage followed elements</Trans>
            )}
          </Text>
          <ChevronRight size="sm" fill={t.palette.primary_500} />
        </Pressable>
      )}
    </View>
  )
}

function FollowedElementCard({
  item,
  onPress,
}: {
  item: FollowedItem
  onPress: () => void
}) {
  const t = useTheme()
  const meta = FOLLOWED_ITEM_CATEGORIES[item.type]
  const Icon = FOLLOWED_ELEMENT_ICONS[item.type]
  const color = item.color || meta.color

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.displayName} followed element settings`}
      accessibilityHint="Opens settings to manage this followed element"
      onPress={onPress}
      style={({pressed, hovered}) => [
        styles.followedElementCard,
        t.atoms.bg,
        t.atoms.border_contrast_low,
        {
          borderLeftColor: color,
          opacity: pressed ? 0.82 : 1,
          backgroundColor: hovered ? `${color}0F` : undefined,
        },
      ]}>
      <View style={[styles.followedElementIcon, {backgroundColor: color}]}>
        <Icon size="md" fill="#fff" />
      </View>
      <View style={styles.followedElementBody}>
        <View style={styles.followedElementTopline}>
          <Text style={[styles.followedElementLabel, {color}]}>
            {getFollowedElementTypeLabel(item.type)}
          </Text>
          <Text
            style={[
              styles.followedElementSignal,
              t.atoms.text_contrast_medium,
            ]}>
            {item.notificationsEnabled ? (
              <Trans>Notifications on</Trans>
            ) : (
              <Trans>Notifications off</Trans>
            )}
          </Text>
        </View>
        <Text
          style={[styles.followedElementTitle, t.atoms.text]}
          numberOfLines={1}>
          {item.displayName}
        </Text>
        <Text
          style={[styles.followedElementDesc, t.atoms.text_contrast_high]}
          numberOfLines={1}>
          {item.community || item.identifier}
        </Text>
      </View>
      <ChevronRight size="sm" fill={t.atoms.text_contrast_low.color} />
    </Pressable>
  )
}

function getFeedRkey(uri: string): string | null {
  const parts = uri.split('/')
  return parts[parts.length - 1] || null
}

function PartyFeedsSection({
  partyFeeds,
}: {
  partyFeeds?: AppBskyFeedDefs.GeneratorView[]
}) {
  const t = useTheme()

  const feedByRkey = useMemo(() => {
    const map = new Map<string, AppBskyFeedDefs.GeneratorView>()
    partyFeeds?.forEach(feed => {
      const rkey = getFeedRkey(feed.uri)
      if (rkey) map.set(rkey, feed)
    })
    return map
  }, [partyFeeds])

  return (
    <View
      style={[partyStyles.section, a.border_b, t.atoms.border_contrast_low]}>
      <View style={partyStyles.sectionHeader}>
        <View style={partyStyles.headerTopline}>
          <Text style={[partyStyles.eyebrow, {color: t.palette.primary_500}]}>
            Live Feeds
          </Text>
          <View
            style={[
              partyStyles.headerRule,
              {backgroundColor: t.palette.primary_500},
            ]}
          />
        </View>
        <View style={partyStyles.titleRow}>
          <Text style={[partyStyles.heading, t.atoms.text]}>
            <Trans>Party Feeds</Trans>
          </Text>
          <Text style={[partyStyles.countPill, t.atoms.text_contrast_medium]}>
            {PARTY_FEED_PROFILES.length}
          </Text>
        </View>
        <Text style={[partyStyles.lead, t.atoms.text_contrast_high]}>
          <Trans>
            Follow each political current as its own timeline, from party
            machines to the new Migala mycelium.
          </Trans>
        </Text>
      </View>

      <View style={partyStyles.grid}>
        {PARTY_FEED_PROFILES.map(party => (
          <PartyCard
            key={party.id}
            party={party}
            feed={feedByRkey.get(`para-${party.id}`)}
          />
        ))}
      </View>
    </View>
  )
}

function PartyCard({
  party,
  feed,
}: {
  party: PartyFeedProfile
  feed?: AppBskyFeedDefs.GeneratorView
}) {
  const t = useTheme()
  const canonicalTint = `${party.color}14`
  const canonicalSoft = `${party.color}24`

  return (
    <View style={partyStyles.cardWrapper}>
      <Link
        testID={`party-feed-${party.id}`}
        to={{screen: 'PartyFeed', params: {partyId: party.id}}}
        label={`${party.name} feed`}
        style={partyStyles.cardLink}>
        {({hovered, pressed}) => (
          <View
            style={[
              partyStyles.card,
              t.atoms.bg,
              {
                borderColor: hovered || pressed ? party.color : canonicalSoft,
                backgroundColor: hovered || pressed ? canonicalTint : undefined,
              },
            ]}>
            <View style={partyStyles.cardChrome}>
              <View
                style={[
                  partyStyles.cardRail,
                  {
                    backgroundColor: party.color,
                  },
                ]}
              />
              <View style={partyStyles.cardActions}>
                <View
                  style={[
                    partyStyles.logoRing,
                    {backgroundColor: party.color},
                  ]}>
                  <Text style={partyStyles.logoText} numberOfLines={1}>
                    {party.logo}
                  </Text>
                </View>
              </View>
            </View>

            <View style={partyStyles.cardBody}>
              <View style={partyStyles.cardTitleRow}>
                <Text
                  style={[partyStyles.cardName, t.atoms.text]}
                  numberOfLines={1}>
                  {party.name}
                </Text>
                <ChevronRight
                  size="sm"
                  fill={
                    hovered || pressed
                      ? party.color
                      : t.atoms.text_contrast_low.color
                  }
                />
              </View>
              <Text style={[partyStyles.cardFilter, {color: party.color}]}>
                {party.filter}
              </Text>
              <Text
                style={[partyStyles.cardDesc, t.atoms.text_contrast_medium]}
                numberOfLines={3}>
                {party.description}
              </Text>
            </View>
          </View>
        )}
      </Link>
      {feed && (
        <View style={partyStyles.pinButtonAbsolute}>
          <PartyFeedPinButton feed={feed} partyColor={party.color} />
        </View>
      )}
    </View>
  )
}

function PartyFeedPinButton({
  feed,
  partyColor,
}: {
  feed: AppBskyFeedDefs.GeneratorView
  partyColor: string
}) {
  const {_} = useLingui()
  const {data: preferences} = usePreferencesQuery()
  const {mutateAsync: addSavedFeeds, isPending: isAddPending} =
    useAddSavedFeedsMutation()
  const {mutateAsync: removeFeed, isPending: isRemovePending} =
    useRemoveFeedMutation()

  const savedFeedConfig = useMemo(() => {
    return preferences?.savedFeeds?.find(f => f.value === feed.uri)
  }, [preferences?.savedFeeds, feed.uri])

  const isPending = isAddPending || isRemovePending

  const toggleSave = useCallback(
    async (e: {preventDefault: () => void; stopPropagation: () => void}) => {
      e.preventDefault()
      e.stopPropagation()
      try {
        if (savedFeedConfig) {
          await removeFeed(savedFeedConfig)
        } else {
          await addSavedFeeds([
            {
              type: 'feed',
              value: feed.uri,
              pinned: false,
            },
          ])
        }
        Toast.show(_(msg`Feeds updated!`), {type: 'success'})
      } catch (err: unknown) {
        Toast.show(_(msg`Failed to update feeds`), {type: 'error'})
      }
    },
    [_, feed.uri, savedFeedConfig, addSavedFeeds, removeFeed],
  )

  return (
    <Button
      disabled={isPending}
      label={savedFeedConfig ? _(msg`Unpin feed`) : _(msg`Pin feed`)}
      size="tiny"
      variant="solid"
      color={savedFeedConfig ? 'secondary' : 'primary'}
      shape="square"
      style={[partyStyles.pinButton, {backgroundColor: partyColor}]}
      onPress={toggleSave}>
      <ButtonIcon size="sm" icon={PinIcon} />
    </Button>
  )
}

function FeedsSavedHeader() {
  const t = useTheme()

  return (
    <View
      style={
        IS_WEB
          ? [
              a.flex_row,
              a.px_md,
              a.py_lg,
              a.gap_md,
              a.border_b,
              t.atoms.border_contrast_low,
            ]
          : [
              {flexDirection: 'row-reverse'},
              a.p_lg,
              a.gap_md,
              a.border_b,
              t.atoms.border_contrast_low,
            ]
      }>
      <IconCircle icon={ListSparkle_Stroke2_Corner0_Rounded} size="lg" />
      <View style={[a.flex_1, a.gap_xs]}>
        <Text style={[a.flex_1, a.text_2xl, a.font_bold, t.atoms.text]}>
          <Trans>My Feeds</Trans>
        </Text>
        <Text style={[t.atoms.text_contrast_high]}>
          <Trans>All the feeds you've saved, right in one place.</Trans>
        </Text>
      </View>
    </View>
  )
}

function FeedsAboutHeader() {
  const t = useTheme()

  return (
    <View
      style={
        IS_WEB
          ? [a.flex_row, a.px_md, a.pt_lg, a.pb_lg, a.gap_md]
          : [{flexDirection: 'row-reverse'}, a.p_lg, a.gap_md]
      }>
      <IconCircle
        icon={ListMagnifyingGlass_Stroke2_Corner0_Rounded}
        size="lg"
      />
      <View style={[a.flex_1, a.gap_sm]}>
        <Text style={[a.flex_1, a.text_2xl, a.font_bold, t.atoms.text]}>
          <Trans>Discover New Feeds</Trans>
        </Text>
        <Text style={[t.atoms.text_contrast_high]}>
          <Trans>
            Choose your own timeline! Feeds built by the community help you find
            content you love.
          </Trans>
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: 100,
  },
  feedCardShell: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  discoverFeedCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  savedFeed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  savedFeedMobile: {
    paddingVertical: 10,
  },
  offlineSlug: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  headerBtnGroup: {
    flexDirection: 'row',
    gap: 15,
    alignItems: 'center',
  },
  followedElementsSection: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 22,
  },
  followedElementsHeader: {
    gap: 8,
    marginBottom: 14,
  },
  followedElementsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  followedElementsTitle: {
    flex: 1,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
  },
  followedElementsCountBadge: {
    minWidth: 32,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  followedElementsCount: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
  },
  followedElementsLead: {
    fontSize: 14,
    lineHeight: 21,
  },
  followedElementsGrid: {
    gap: 10,
  },
  followedElementsLoading: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followedElementsEmpty: {
    minHeight: 104,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 14,
  },
  followedElementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
  },
  followedElementIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followedElementBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  followedElementTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  followedElementLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  followedElementSignal: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  followedElementTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  followedElementDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  followedElementChevron: {
    marginLeft: 4,
  },
  followedElementsManageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 4,
  },
  followedElementsManageText: {
    fontSize: 14,
    fontWeight: '600',
  },
})

const partyStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 22,
  },
  sectionHeader: {
    gap: 8,
    marginBottom: 18,
  },
  headerTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  heading: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 31,
  },
  countPill: {
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: 'rgba(127,127,127,0.12)',
  },
  lead: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cardWrapper: {
    position: 'relative',
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 148,
  },
  cardLink: {
    width: '100%',
  },
  card: {
    width: '100%',
    minHeight: 174,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
  },
  cardChrome: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinButtonAbsolute: {
    position: 'absolute',
    top: 12,
    right: 62,
    zIndex: 10,
  },
  cardRail: {
    width: 34,
    height: 6,
    borderRadius: 999,
  },
  logoRing: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  cardBody: {
    gap: 7,
  },
  cardTitleRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 20,
  },
  cardFilter: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
})
