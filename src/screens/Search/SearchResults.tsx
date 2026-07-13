import {memo, useCallback, useMemo, useState} from 'react'
import {ActivityIndicator, View} from 'react-native'
import {type AppBskyFeedDefs} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {urls} from '#/lib/constants'
import {usePostViewTracking} from '#/lib/hooks/usePostViewTracking'
import {useCallOnce} from '#/lib/once'
import {cleanError} from '#/lib/strings/errors'
import {augmentSearchQuery} from '#/lib/strings/helpers'
import {useActorSearch} from '#/state/queries/actor-search'
import {usePopularFeedsSearch} from '#/state/queries/feed'
import {
  hasParaSearchFilters,
  type ParaSearchPostsFilters,
  useParaSearchPostsQuery,
  useSearchPostsQuery,
} from '#/state/queries/search-posts'
import {useSearchPostsV2Query} from '#/state/queries/search-posts-v2'
import {useSession} from '#/state/session'
import {useLoggedOutViewControls} from '#/state/shell/logged-out'
import {useCloseAllActiveElements} from '#/state/util'
import {Pager} from '#/view/com/pager/Pager'
import {TabBar} from '#/view/com/pager/TabBar'
import {Post} from '#/view/com/post/Post'
import {ProfileCardWithFollowBtn} from '#/view/com/profile/ProfileCard'
import {List} from '#/view/com/util/List'
import {DetectedLanguagesAdmonition} from '#/screens/Search/components/DetectedLanguagesAdmonition'
import {
  getActiveParaFilterNames,
  hasPostOnlyFilters,
  type SearchFilters,
  searchFiltersToParaFilters,
} from '#/screens/Search/searchParams'
import {atoms as a, useTheme, web} from '#/alf'
import * as FeedCard from '#/components/FeedCard'
import * as Layout from '#/components/Layout'
import {InlineLinkText} from '#/components/Link'
import {ListFooter} from '#/components/Lists'
import {SearchError} from '#/components/SearchError'
import {Text} from '#/components/Typography'
import {type Metrics, useAnalytics} from '#/analytics'
import type * as bsky from '#/types/bsky'
import {ParaSearchFiltersBar} from './ParaSearchFiltersBar'

let SearchResults = ({
  query,
  queryWithParams,
  filters,
  hasFilters,
  activeTab,
  onPageSelected,
  headerHeight,
  initialPage: _initialPage = 0,
  paraFilters: _paraFiltersProp,
  onChangeFilters,
}: {
  query: string
  queryWithParams: string
  filters?: SearchFilters
  hasFilters?: boolean
  activeTab: number
  onPageSelected: (page: number) => void
  headerHeight: number
  initialPage?: number
  paraFilters?: ParaSearchPostsFilters
  onChangeFilters?: (filters: SearchFilters) => void
}): React.ReactNode => {
  const {_} = useLingui()
  const ax = useAnalytics()
  const paraFilters = useMemo(
    () => searchFiltersToParaFilters(filters ?? {}),
    [filters],
  )

  const onChangeParaFilters = useCallback(
    (next: SearchFilters) => {
      if (!onChangeFilters) return
      const isClearAll = Object.keys(next).length === 0
      if (isClearAll) {
        onChangeFilters({
          ...filters,
          tag: undefined,
          politicalCompassPositions: undefined,
          communityUris: undefined,
          cabildeoUris: undefined,
          postType: undefined,
          flairs: undefined,
          party: undefined,
          verifiedPublicFigure: undefined,
          state: undefined,
          districtKey: undefined,
          cabildeoPhase: undefined,
        })
        return
      }

      const merged = {...filters, ...next}
      const previousNames = new Set(getActiveParaFilterNames(filters ?? {}))
      for (const name of getActiveParaFilterNames(merged)) {
        if (!previousNames.has(name)) {
          ax.metric('search:paraFilter:applied', {filter: name})
        }
      }
      onChangeFilters(merged)
    },
    [filters, onChangeFilters, ax],
  )

  /*
   * People/Feeds visibility keys off post-only filters: a `lang` filter applies
   * to people and feeds too, so it must not hide those tabs (which would also
   * regress the non-v2 legacy language dropdown). Other filters are post-only.
   * PARA-specific filters (community, compass, cabildeo, area) are also
   * post-only, so they hide People/Feeds as well.
   */
  const hasPostFilters =
    hasPostOnlyFilters(filters ?? {}) || hasParaSearchFilters(paraFilters)
  const activePage = hasPostFilters && activeTab > 1 ? 0 : activeTab
  const tabShape = hasPostFilters ? 'filtered' : 'plain'

  const sections = useMemo(() => {
    if (!query && !hasFilters && !hasParaSearchFilters(paraFilters)) return []
    /*
     * People and Feeds tabs only make sense without post-restricting filters -
     * those filters don't apply to actors or feeds.
     */
    const noFilters = !hasPostFilters
    return [
      {
        title: _(msg`Top`),
        component: (
          <SearchScreenPostResults
            hasFilters={Boolean(hasFilters || hasParaSearchFilters(paraFilters))}
            query={query}
            queryWithParams={queryWithParams}
            filters={filters}
            sort="top"
            active={activePage === 0}
            paraFilters={paraFilters}
            onChangeFilters={onChangeFilters}
          />
        ),
      },
      {
        title: _(msg`Latest`),
        component: (
          <SearchScreenPostResults
            hasFilters={Boolean(hasFilters || hasParaSearchFilters(paraFilters))}
            query={query}
            queryWithParams={queryWithParams}
            filters={filters}
            sort="latest"
            active={activePage === 1}
            paraFilters={paraFilters}
            onChangeFilters={onChangeFilters}
          />
        ),
      },
      noFilters && {
        title: _(msg`People`),
        component: (
          <SearchScreenUserResults query={query} active={activePage === 2} />
        ),
      },
      noFilters && {
        title: _(msg`Feeds`),
        component: (
          <SearchScreenFeedsResults query={query} active={activePage === 3} />
        ),
      },
    ].filter(Boolean) as {
      title: string
      component: React.ReactNode
    }[]
  }, [
    _,
    query,
    queryWithParams,
    filters,
    hasFilters,
    paraFilters,
    hasPostFilters,
    activePage,
    onChangeFilters,
  ])

  // There may be fewer tabs after changing the search options.
  const selectedPage = activePage > sections.length - 1 ? 0 : activePage

  return (
    <View style={[a.flex_1]}>
      <ParaSearchFiltersBar
        filters={filters ?? {}}
        onChange={onChangeParaFilters}
      />
      <Pager
        key={tabShape}
        onPageSelected={onPageSelected}
        renderTabBar={props => (
          <Layout.Center style={[a.z_10, web([a.sticky, {top: headerHeight}])]}>
            <TabBar items={sections.map(section => section.title)} {...props} />
          </Layout.Center>
        )}
        initialPage={selectedPage}>
        {sections.map((section, i) => (
          <View key={i}>{section.component}</View>
        ))}
      </Pager>
    </View>
  )
}
SearchResults = memo(SearchResults)
export {SearchResults}

function Loader() {
  return (
    <Layout.Content>
      <View style={[a.py_xl]}>
        <ActivityIndicator />
      </View>
    </Layout.Content>
  )
}

function EmptyState({
  messageText,
  error,
  children,
}: {
  messageText: React.ReactNode
  error?: string
  children?: React.ReactNode
}) {
  const t = useTheme()

  return (
    <Layout.Content>
      <View style={[a.p_xl]}>
        <View style={[t.atoms.bg_contrast_25, a.rounded_sm, a.p_lg]}>
          <Text style={[a.text_md]}>{messageText}</Text>

          {error && (
            <>
              <View
                style={[
                  {
                    marginVertical: 12,
                    height: 1,
                    width: '100%',
                    backgroundColor: t.atoms.text.color,
                    opacity: 0.2,
                  },
                ]}
              />

              <Text style={[t.atoms.text_contrast_medium]}>
                <Trans>Error: {error}</Trans>
              </Text>
            </>
          )}

          {children}
        </View>
      </View>
    </Layout.Content>
  )
}

function NoResultsText({
  hasFilters = false,
  query,
}: {
  hasFilters?: boolean
  query: string
}) {
  const t = useTheme()
  const {_} = useLingui()

  return (
    <>
      <Text style={[a.text_lg, t.atoms.text_contrast_high]}>
        {hasFilters ? (
          query ? (
            <Trans>
              No results found for "
              <Text style={[a.text_lg, a.font_medium]}>{query}</Text>" with
              advanced search filters applied.
            </Trans>
          ) : (
            <Trans>
              No results found for your query with advanced search filters
              applied.
            </Trans>
          )
        ) : (
          <Trans>
            No results found for "
            <Text style={[a.text_lg, a.font_medium]}>{query}</Text>".
          </Trans>
        )}
      </Text>
      {'\n\n'}
      <Text
        style={[
          a.mt_lg,
          a.text_md,
          a.leading_snug,
          t.atoms.text_contrast_high,
        ]}>
        {hasFilters ? (
          <Trans>Try a different search term or remove some filters.</Trans>
        ) : (
          <Trans>Try a different search term.</Trans>
        )}
      </Text>
      {'\n\n'}
      <Text
        style={[
          a.mt_lg,
          a.text_md,
          a.leading_snug,
          t.atoms.text_contrast_high,
        ]}>
        <Trans context="english-only-resource">
          Learn more about{' '}
          <InlineLinkText
            label={_(
              msg({
                message: 'Read about how to use search filters',
                context: 'english-only-resource',
              }),
            )}
            to={urls.website.blog.searchTipsAndTricks}
            style={[a.text_md, a.leading_snug]}>
            how to use search filters
          </InlineLinkText>
          .
        </Trans>
      </Text>
    </>
  )
}

type SearchResultSlice =
  | {
      type: 'post'
      key: string
      post: AppBskyFeedDefs.PostView
    }
  | {
      type: 'loadingMore'
      key: string
    }

let SearchScreenPostResults = ({
  hasFilters = false,
  query,
  queryWithParams,
  filters,
  sort,
  active,
  paraFilters,
  onChangeFilters,
}: {
  hasFilters?: boolean
  query: string
  queryWithParams: string
  filters?: SearchFilters
  sort?: 'top' | 'latest'
  active: boolean
  paraFilters?: ParaSearchPostsFilters
  onChangeFilters?: (filters: SearchFilters) => void
}): React.ReactNode => {
  const ax = useAnalytics()
  const {_} = useLingui()
  const {currentAccount, hasSession} = useSession()
  const [isPTR, setIsPTR] = useState(false)
  const trackPostView = usePostViewTracking('SearchResults')

  const searchV2Enabled = ax.features.enabled(ax.features.SearchV2Enable)

  const augmentedV2Query = useMemo(() => {
    return augmentSearchQuery(query || '', {did: currentAccount?.did})
  }, [query, currentAccount])
  const augmentedV1Query = useMemo(() => {
    return augmentSearchQuery(queryWithParams || '', {did: currentAccount?.did})
  }, [queryWithParams, currentAccount])

  const useParaQuery = !!paraFilters && hasParaSearchFilters(paraFilters)

  /*
   * Both hooks are called to keep hook order stable; `enabled` ensures only the
   * gated one actually fetches. V2 sends structured `filters` as separate
   * params, V1 keeps the existing single-`q` behavior. PARA filters always route
   * to the PARA search endpoint.
   */
  const v1 = useSearchPostsQuery({
    query: augmentedV1Query,
    sort,
    enabled: active && !searchV2Enabled && !useParaQuery,
  })
  const v2 = useSearchPostsV2Query({
    query: augmentedV2Query,
    filters,
    sort,
    enabled: active && searchV2Enabled && !useParaQuery,
  })

  const paraQuery = useParaSearchPostsQuery({
    query: augmentedV2Query,
    sort,
    enabled: active && useParaQuery,
    communityUris: paraFilters?.communityUris,
    cabildeoUris: paraFilters?.cabildeoUris,
    politicalCompassPositions: paraFilters?.politicalCompassPositions,
    postType: paraFilters?.postType,
    flairs: paraFilters?.flairs,
    party: paraFilters?.party,
    verifiedPublicFigure: paraFilters?.verifiedPublicFigure,
    state: paraFilters?.state,
    districtKey: paraFilters?.districtKey,
    cabildeoPhase: paraFilters?.cabildeoPhase,
  })

  const {
    isFetched,
    data: results,
    isFetching,
    error,
    refetch,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useParaQuery ? paraQuery : searchV2Enabled ? v2 : v1

  const detectedQueryLanguages = searchV2Enabled
    ? v2.data?.pages[0]?.detectedQueryLanguages
    : undefined

  const t = useTheme()
  const onPullToRefresh = useCallback(async () => {
    setIsPTR(true)
    await refetch()
    setIsPTR(false)
  }, [setIsPTR, refetch])
  const onEndReached = useCallback(() => {
    if (isFetching || !hasNextPage || error) return
    fetchNextPage()
  }, [isFetching, error, hasNextPage, fetchNextPage])

  const posts = useMemo(() => {
    return results?.pages.flatMap(page => page.posts) || []
  }, [results])
  const items = useMemo(() => {
    let temp: SearchResultSlice[] = []

    const seenUris = new Set()
    for (const post of posts) {
      if (seenUris.has(post.uri)) {
        continue
      }
      temp.push({
        type: 'post',
        key: post.uri,
        post,
      })
      seenUris.add(post.uri)
    }

    if (isFetchingNextPage) {
      temp.push({
        type: 'loadingMore',
        key: 'loadingMore',
      })
    }

    return temp
  }, [posts, isFetchingNextPage])

  const closeAllActiveElements = useCloseAllActiveElements()
  const {requestSwitchToAccount} = useLoggedOutViewControls()

  const fireTracking = useCallOnce(() => {
    if (sort) {
      ax.metric('search:results:loaded', {
        tab: sort,
        initialCount: items.length,
      })
    }
  })
  if (isFetched && sort) {
    fireTracking()
  }

  const showSignIn = () => {
    closeAllActiveElements()
    requestSwitchToAccount({requestedAccount: 'none'})
  }

  const showCreateAccount = () => {
    closeAllActiveElements()
    requestSwitchToAccount({requestedAccount: 'new'})
  }

  if (!hasSession) {
    return (
      <SearchError
        title={_(msg`Search is currently unavailable when logged out`)}>
        <Text style={[a.text_md, a.text_center, a.leading_snug]}>
          <Trans>
            <InlineLinkText
              label={_(msg`Sign in`)}
              to={'#'}
              onPress={showSignIn}>
              Sign in
            </InlineLinkText>
            <Text style={t.atoms.text_contrast_medium}> or </Text>
            <InlineLinkText
              label={_(msg`Create an account`)}
              to={'#'}
              onPress={showCreateAccount}>
              create an account
            </InlineLinkText>
            <Text> </Text>
            <Text style={t.atoms.text_contrast_medium}>
              to search for news, sports, politics, and everything else
              happening on PARA.
            </Text>
          </Trans>
        </Text>
      </SearchError>
    )
  }

  return error ? (
    <EmptyState
      messageText={_(
        msg`We're sorry, but your search could not be completed. Please try again in a few minutes.`,
      )}
      error={cleanError(error)}
    />
  ) : (
    <>
      {isFetched ? (
        <>
          {posts.length ? (
            <List
              data={items}
              ListHeaderComponent={
                detectedQueryLanguages && filters && onChangeFilters ? (
                  <View style={[a.px_lg, a.pt_lg]}>
                    <DetectedLanguagesAdmonition
                      detectedQueryLanguages={detectedQueryLanguages}
                      filters={filters}
                      onChangeFilters={onChangeFilters}
                    />
                  </View>
                ) : null
              }
              renderItem={({item, index}) => {
                if (item.type === 'post') {
                  return (
                    <SearchPost from={sort} position={index} post={item.post} />
                  )
                } else {
                  return null
                }
              }}
              keyExtractor={item => item.key}
              refreshing={isPTR}
              onRefresh={onPullToRefresh}
              onEndReached={onEndReached}
              onItemSeen={item => {
                if (item.type === 'post') {
                  trackPostView(item.post)
                }
              }}
              desktopFixedHeight
              ListFooterComponent={
                <ListFooter
                  isFetchingNextPage={isFetchingNextPage}
                  hasNextPage={hasNextPage}
                />
              }
            />
          ) : (
            <EmptyState
              messageText={<NoResultsText hasFilters={hasFilters} query={query} />}
            />
          )}
        </>
      ) : (
        <Loader />
      )}
    </>
  )
}
SearchScreenPostResults = memo(SearchScreenPostResults)

function SearchPost({
  from,
  position,
  post,
}: {
  from: Metrics['search:result:press']['tab']
  position: Metrics['search:result:press']['position']
  post: AppBskyFeedDefs.PostView
}) {
  const ax = useAnalytics()

  const onBeforePress = useCallback(() => {
    ax.metric('search:result:press', {
      tab: from,
      resultType: 'post',
      position,
      uri: post.uri,
    })
  }, [ax, from, position, post.uri])

  return <Post post={post} onBeforePress={onBeforePress} />
}

let SearchScreenUserResults = ({
  query,
  active,
}: {
  query: string
  active: boolean
}): React.ReactNode => {
  const ax = useAnalytics()
  const {_} = useLingui()
  const {hasSession} = useSession()
  const [isPTR, setIsPTR] = useState(false)

  const {
    isFetched,
    data: results,
    isFetching,
    error,
    refetch,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useActorSearch({
    query,
    enabled: active,
  })

  const onPullToRefresh = useCallback(async () => {
    setIsPTR(true)
    await refetch()
    setIsPTR(false)
  }, [setIsPTR, refetch])
  const onEndReached = useCallback(() => {
    if (!hasSession) return
    if (isFetching || !hasNextPage || error) return
    fetchNextPage()
  }, [isFetching, error, hasNextPage, fetchNextPage, hasSession])

  const profiles = useMemo(() => {
    return results?.pages.flatMap(page => page.actors) || []
  }, [results])

  const fireTracking = useCallOnce(() => {
    ax.metric('search:results:loaded', {
      tab: 'people',
      initialCount: profiles.length,
    })
  })
  if (isFetched) {
    fireTracking()
  }

  if (error) {
    return (
      <EmptyState
        messageText={_(
          msg`We're sorry, but your search could not be completed. Please try again in a few minutes.`,
        )}
        error={error.toString()}
      />
    )
  }

  return isFetched && profiles ? (
    <>
      {profiles.length ? (
        <List
          data={profiles}
          renderItem={({item, index}) => (
            <SearchScreenProfileButton position={index} profile={item} />
          )}
          keyExtractor={item => item.did}
          refreshing={isPTR}
          onRefresh={onPullToRefresh}
          onEndReached={onEndReached}
          desktopFixedHeight
          ListFooterComponent={
            <ListFooter
              hasNextPage={hasNextPage && hasSession}
              isFetchingNextPage={isFetchingNextPage}
            />
          }
        />
      ) : (
        <EmptyState messageText={<NoResultsText query={query} />} />
      )}
    </>
  ) : (
    <Loader />
  )
}
SearchScreenUserResults = memo(SearchScreenUserResults)

function SearchScreenProfileButton({
  position,
  profile,
}: {
  position: number
  profile: bsky.profile.AnyProfileView
}) {
  const ax = useAnalytics()

  const handlePress = useCallback(() => {
    ax.metric('search:result:press', {
      tab: 'people',
      resultType: 'profile',
      position,
      uri: profile.did,
    })
  }, [ax, position, profile.did])

  return <ProfileCardWithFollowBtn profile={profile} onPress={handlePress} />
}

let SearchScreenFeedsResults = ({
  query,
  active,
}: {
  query: string
  active: boolean
}): React.ReactNode => {
  const ax = useAnalytics()
  const t = useTheme()

  const {data: results, isFetched} = usePopularFeedsSearch({
    query,
    enabled: active,
  })

  const fireTracking = useCallOnce(() => {
    ax.metric('search:results:loaded', {
      tab: 'feeds',
      initialCount: results?.length ?? 0,
    })
  })
  if (isFetched) {
    fireTracking()
  }

  return isFetched && results ? (
    <>
      {results.length ? (
        <List
          data={results}
          renderItem={({item, index}) => (
            <View
              style={[
                a.border_t,
                t.atoms.border_contrast_low,
                a.px_lg,
                a.py_lg,
              ]}>
              <SearchFeedCard position={index} view={item} />
            </View>
          )}
          keyExtractor={item => item.uri}
          desktopFixedHeight
          ListFooterComponent={<ListFooter />}
        />
      ) : (
        <EmptyState messageText={<NoResultsText query={query} />} />
      )}
    </>
  ) : (
    <Loader />
  )
}
SearchScreenFeedsResults = memo(SearchScreenFeedsResults)

function SearchFeedCard({
  position,
  view,
}: {
  position: number
  view: AppBskyFeedDefs.GeneratorView
}) {
  const ax = useAnalytics()

  const handleOnPress = useCallback(() => {
    ax.metric('search:result:press', {
      tab: 'feeds',
      resultType: 'feed',
      position,
      uri: view.uri,
    })
  }, [ax, position, view.uri])

  return <FeedCard.Default view={view} onPress={handleOnPress} />
}
