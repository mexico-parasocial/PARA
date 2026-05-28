import {useCallback, useMemo, useState} from 'react'
import {type ListRenderItemInfo, View} from 'react-native'
import {
  type AppBskyActorDefs,
  type AppBskyFeedDefs,
  type BskyAgent,
} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useFocusEffect} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'
import {useInfiniteQuery} from '@tanstack/react-query'

import {
  hydrateParaPostView,
  isParaPostView,
  type ParaPostView,
} from '#/lib/api/feed/para'
import {useInitialNumToRender} from '#/lib/hooks/useInitialNumToRender'
import {usePostViewTracking} from '#/lib/hooks/usePostViewTracking'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {FLAIR_GROUPS} from '#/lib/tags'
import {useAgent, useSession} from '#/state/session'
import {useSetMinimalShellMode} from '#/state/shell'
import {useLoggedOutViewControls} from '#/state/shell/logged-out'
import {useCloseAllActiveElements} from '#/state/util'
import {Pager} from '#/view/com/pager/Pager'
import {TabBar} from '#/view/com/pager/TabBar'
import {Post} from '#/view/com/post/Post'
import {List} from '#/view/com/util/List'
import {atoms as a, useTheme, web} from '#/alf'
import * as Layout from '#/components/Layout'
import {InlineLinkText} from '#/components/Link'
import {ListFooter, ListMaybePlaceholder} from '#/components/Lists'
import {SearchError} from '#/components/SearchError'
import {Text} from '#/components/Typography'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Find which axis (eje) a flair belongs to within its kind group.
 */
function getFlairAxis(
  flairId: string,
  kind: 'matter' | 'policy',
): string | undefined {
  const groups = FLAIR_GROUPS[kind === 'matter' ? 'MATTER' : 'POLICY']
  const entries = Object.entries(groups) as Array<[string, Array<{id: string}>]>
  for (const [axisName, flairs] of entries) {
    if (flairs.some(f => f.id === flairId)) {
      return axisName
    }
  }
  return undefined
}

// ─── Renderers ───────────────────────────────────────────────────────────────

const renderItem = ({item}: ListRenderItemInfo<AppBskyFeedDefs.PostView>) => {
  return <Post post={item} />
}

const keyExtractor = (item: AppBskyFeedDefs.PostView, index: number) => {
  return `${item.uri}-${index}`
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function FlairFeedScreen({
  route,
}: NativeStackScreenProps<CommonNavigatorParams, 'FlairFeed'>) {
  const {flairId, flairTag, flairLabel, kind, color} = route.params
  const {_} = useLingui()

  const axis = useMemo(() => getFlairAxis(flairId, kind), [flairId, kind])

  // | = matter (always one bar, official or not)
  // || = policy (always two bars, official or not)
  const kindLabel = kind === 'policy' ? _(msg`|| Política`) : _(msg`| Asunto`)

  const [activeTab, setActiveTab] = useState(0)
  const setMinimalShellMode = useSetMinimalShellMode()

  useFocusEffect(
    useCallback(() => {
      setMinimalShellMode(false)
    }, [setMinimalShellMode]),
  )

  const onPageSelected = useCallback(
    (index: number) => {
      setMinimalShellMode(false)
      setActiveTab(index)
    },
    [setMinimalShellMode],
  )

  const sections = useMemo(() => {
    return [
      {
        title: _(msg`Top`),
        component: (
          <FlairFeedTab
            flairTag={flairTag}
            sort="top"
            active={activeTab === 0}
          />
        ),
      },
      {
        title: _(msg`Latest`),
        component: (
          <FlairFeedTab
            flairTag={flairTag}
            sort="latest"
            active={activeTab === 1}
          />
        ),
      },
    ]
  }, [_, flairTag, activeTab])

  return (
    <Layout.Screen>
      <Pager
        onPageSelected={onPageSelected}
        renderTabBar={props => (
          <Layout.Center style={[a.z_10, web([a.sticky, {top: 0}])]}>
            <Layout.Header.Outer noBottomBorder>
              <Layout.Header.BackButton />
              <Layout.Header.Content>
                <Layout.Header.TitleText>
                  <View
                    style={[
                      {
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: color,
                        marginRight: 6,
                        alignSelf: 'center',
                        display: 'flex',
                      },
                    ]}
                  />
                  {flairLabel}
                </Layout.Header.TitleText>
                <Layout.Header.SubtitleText>
                  {axis ? `${axis}  ·  ${kindLabel}` : kindLabel}
                </Layout.Header.SubtitleText>
              </Layout.Header.Content>
            </Layout.Header.Outer>
            <TabBar items={sections.map(s => s.title)} {...props} />
          </Layout.Center>
        )}
        initialPage={0}>
        {sections.map((section, i) => (
          <View key={i}>{section.component}</View>
        ))}
      </Pager>
    </Layout.Screen>
  )
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

function FlairFeedTab({
  flairTag,
  sort,
  active,
}: {
  flairTag: string
  sort: 'top' | 'latest'
  active: boolean
}) {
  const {_} = useLingui()
  const t = useTheme()
  const initialNumToRender = useInitialNumToRender()
  const [isPTR, setIsPTR] = useState(false)
  const {hasSession} = useSession()
  const agent = useAgent()
  const trackPostView = usePostViewTracking('FlairFeed')

  const {
    data,
    isFetched,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['para-flair-feed', flairTag, sort],
    queryFn: async ({pageParam}: {pageParam?: string}) => {
      const res = await agent.call('com.para.feed.getTimeline', {
        limit: 25,
        cursor: pageParam,
        flairTag,
      })
      const payload = res.data as {cursor?: string; feed?: unknown[]}
      const feed = (payload.feed ?? []).filter(isParaPostView)
      const posts = await hydrateParaPosts(agent, feed)
      return {
        cursor: payload.cursor,
        posts,
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.cursor,
    enabled: active && hasSession,
  })

  const posts = useMemo(() => {
    return data?.pages.flatMap(page => page.posts) ?? []
  }, [data])

  const onRefresh = useCallback(async () => {
    setIsPTR(true)
    await refetch()
    setIsPTR(false)
  }, [refetch])

  const onEndReached = useCallback(() => {
    if (isFetchingNextPage || !hasNextPage || error) return
    void fetchNextPage()
  }, [isFetchingNextPage, hasNextPage, error, fetchNextPage])

  const closeAllActiveElements = useCloseAllActiveElements()
  const {requestSwitchToAccount} = useLoggedOutViewControls()

  const showSignIn = useCallback(() => {
    closeAllActiveElements()
    requestSwitchToAccount({requestedAccount: 'none'})
  }, [closeAllActiveElements, requestSwitchToAccount])

  const showCreateAccount = useCallback(() => {
    closeAllActiveElements()
    requestSwitchToAccount({requestedAccount: 'new'})
  }, [closeAllActiveElements, requestSwitchToAccount])

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
              to search for posts about this topic on PARA.
            </Text>
          </Trans>
        </Text>
      </SearchError>
    )
  }

  return (
    <>
      {posts.length < 1 ? (
        <ListMaybePlaceholder
          isLoading={isLoading || !isFetched}
          isError={isError}
          onRetry={refetch}
          emptyType="results"
          emptyMessage={_(msg`We couldn't find any results for that flair.`)}
        />
      ) : (
        <List
          data={posts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshing={isPTR}
          onRefresh={() => {
            void onRefresh()
          }}
          onEndReached={onEndReached}
          onEndReachedThreshold={4}
          onItemSeen={trackPostView}
          // @ts-ignore web only -prf
          desktopFixedHeight
          ListFooterComponent={
            <ListFooter
              isFetchingNextPage={isFetchingNextPage}
              error={cleanError(error)}
              onRetry={fetchNextPage}
            />
          }
          initialNumToRender={initialNumToRender}
          windowSize={11}
        />
      )}
    </>
  )
}

async function hydrateParaPosts(
  agent: BskyAgent,
  feed: ParaPostView[],
): Promise<AppBskyFeedDefs.PostView[]> {
  const profiles = new Map<string, AppBskyActorDefs.ProfileViewDetailed>()
  const posts: AppBskyFeedDefs.PostView[] = []

  for (const item of feed) {
    let profile = profiles.get(item.author)
    if (!profile) {
      const res = await agent.getProfile({actor: item.author})
      profile = res.data
      profiles.set(item.author, profile)
    }
    posts.push(hydrateParaPostView(item, profile).post)
  }

  return posts
}
