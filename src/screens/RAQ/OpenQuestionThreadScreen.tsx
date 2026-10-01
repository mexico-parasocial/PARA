import {useCallback, useMemo, useRef} from 'react'
import {useWindowDimensions, View} from 'react-native'
import Animated, {useAnimatedStyle} from 'react-native-reanimated'
import {type DidString} from '@atproto/syntax'
import {Trans} from '@lingui/react/macro'
import {type RouteProp, useRoute} from '@react-navigation/native'

import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {type OpenQuestion} from '#/lib/mock-data'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {useProfilesQuery} from '#/state/queries/profile'
import {
  type OpenQuestionThread,
  type OpenQuestionThreadReply,
  useOpenQuestionThread,
  useOpenQuestionVoteMutation,
} from '#/state/queries/useOpenQuestions'
import {useSession} from '#/state/session'
import {useShellLayout} from '#/state/shell/shell-layout'
import {List, type ListMethods} from '#/view/com/util/List'
import {ThreadComposePrompt} from '#/screens/PostThread/components/ThreadComposePrompt'
import {atoms as a, useBreakpoints, web} from '#/alf'
import * as Layout from '#/components/Layout'
import {ListFooter} from '#/components/Lists'
import {Text} from '#/components/Typography'
import {type app} from '#/lexicons'
import {
  flattenReplies,
  OpenQuestionAnchor,
  OpenQuestionAnchorSkeleton,
  OpenQuestionReply,
  type OpenQuestionReplyData,
  OpenQuestionReplySkeleton,
  type OQThreadItem,
} from './components/OpenQuestionItem'
import {QueryStatus} from './components/QueryStatus'

function buildThreadItems(
  question: OpenQuestion,
  replies: OpenQuestionReplyData[],
): OQThreadItem[] {
  const flatReplies = flattenReplies(replies)

  const items: OQThreadItem[] = [{type: 'anchor', question}, ...flatReplies]

  return items
}

function buildSkeletonItems(): OQThreadItem[] {
  return [
    {type: 'skeleton-anchor'},
    {type: 'skeleton-reply', index: 0},
    {type: 'skeleton-reply', index: 1},
    {type: 'skeleton-reply', index: 2},
  ]
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Props = {_?: never} // navigator props — route accessed via hook
export default function OpenQuestionThreadScreen(_props: Props) {
  const route =
    useRoute<RouteProp<CommonNavigatorParams, 'OpenQuestionThread'>>()
  const {id} = route.params
  const {gtMobile} = useBreakpoints()
  const {hasSession} = useSession()
  const {openComposer} = useOpenComposer()
  const {height: windowHeight} = useWindowDimensions()
  const thread = useOpenQuestionThread(id)
  const voteMutation = useOpenQuestionVoteMutation(id)
  const authors = useMemo(
    () =>
      thread.data
        ? [
            ...new Set([
              thread.data.post.author,
              ...flattenReplies(mapThreadReplies(thread.data.replies)).map(
                item => item.reply.author.handle,
              ),
            ]),
          ].slice(0, 25)
        : [],
    [thread.data],
  )
  const profilesQuery = useProfilesQuery({handles: authors})
  const profiles = useMemo(
    () =>
      new Map<string, app.bsky.actor.defs.ProfileViewDetailed>(
        profilesQuery.data?.profiles.map(profile => [profile.did, profile]),
      ),
    [profilesQuery.data],
  )

  const listRef = useRef<ListMethods>(null)
  const headerRef = useRef<React.ComponentRef<typeof View> | null>(null)
  const anchorRef = useRef<React.ComponentRef<typeof View> | null>(null)

  const question = useMemo(
    () => (thread.data ? mapThreadQuestion(thread.data, profiles) : undefined),
    [thread.data, profiles],
  )
  const replies = useMemo(
    () => (thread.data ? mapThreadReplies(thread.data.replies, profiles) : []),
    [thread.data, profiles],
  )
  const isLoading = thread.isLoading

  // Scroll to anchor on load — mirrors PostThread onContentSizeChangeWebOnly
  const didHandleScroll = useRef(false)
  const onContentSizeChange = web(() => {
    if (didHandleScroll.current) return
    const list = listRef.current
    const anchor = anchorRef.current as unknown as HTMLElement
    const header = headerRef.current as unknown as HTMLElement
    if (list && anchor && header) {
      const anchorOffsetTop = anchor.getBoundingClientRect().top
      const headerHeight = header.getBoundingClientRect().height
      const offset = anchorOffsetTop - headerHeight
      list.scrollToOffset({offset})
      didHandleScroll.current = true
    }
  })

  const items = useMemo<OQThreadItem[]>(() => {
    if (isLoading || !question) return buildSkeletonItems()
    return buildThreadItems(question, replies)
  }, [isLoading, question, replies])

  const openReplyComposer = useCallback(
    (target?: OpenQuestionReplyData) => {
      if (!hasSession || !thread.data) return
      const post = target
        ? findReply(thread.data.replies, target.id)
        : thread.data.post
      if (!post) return

      openComposer({
        replyTo: {
          uri: post.uri,
          cid: post.cid,
          text: post.text,
          author: profiles.has(post.author)
            ? didAuthor(post.author, profiles.get(post.author))
            : didAuthor(post.author),
          langs: 'langs' in post ? post.langs : undefined,
        },
        logContext: 'PostReply',
        onPost: () => void thread.refetch(),
      })
    },
    [openComposer, thread, hasSession, profiles],
  )

  const onVote = useCallback(
    (reply: OpenQuestionReplyData, value: -1 | 0 | 1) => {
      if (!hasSession || voteMutation.isPending) return
      voteMutation.mutate({subject: reply.id, value})
    },
    [voteMutation, hasSession],
  )

  const renderItem = useCallback(
    ({item, index: _index}: {item: OQThreadItem; index: number}) => {
      if (item.type === 'skeleton-anchor') {
        return <OpenQuestionAnchorSkeleton />
      }
      if (item.type === 'skeleton-reply') {
        return <OpenQuestionReplySkeleton index={item.index} />
      }
      if (item.type === 'anchor') {
        return (
          <View collapsable={false}>
            <View ref={anchorRef} onLayout={() => {}} />
            <OpenQuestionAnchor question={item.question} />
          </View>
        )
      }
      if (item.type === 'reply') {
        return (
          <OpenQuestionReply
            reply={item.reply}
            depth={item.depth}
            showParentLine={item.showParentLine}
            showChildLine={item.showChildLine}
            isFirst={item.isFirst}
            onVote={hasSession && !voteMutation.isPending ? onVote : undefined}
            onReply={hasSession ? openReplyComposer : undefined}
          />
        )
      }
      return null
    },
    [onVote, openReplyComposer, hasSession, voteMutation.isPending],
  )

  const keyExtractor = useCallback((item: OQThreadItem, index: number) => {
    if (item.type === 'anchor') return `anchor-${item.question.id}`
    if (item.type === 'reply') return `reply-${item.reply.id}`
    return `skeleton-${index}`
  }, [])

  if ((!question || thread.isError) && !isLoading) {
    return (
      <Layout.Screen>
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Error</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <Layout.Center>
          <View style={[a.p_lg]}>
            <QueryStatus
              error={thread.isError}
              empty={!question}
              emptyMessageText={<Trans>Question not found</Trans>}
              retry={thread.refetch}
              refreshing={thread.isRefetching}
            />
          </View>
        </Layout.Center>
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer headerRef={headerRef}>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans context="description">Open Question</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      {voteMutation.isError && (
        <View style={a.p_md}>
          <Text>
            <Trans>Vote failed. Please try again.</Trans>
          </Text>
        </View>
      )}
      <List
        ref={listRef}
        data={items}
        refreshing={thread.isRefetching}
        onRefresh={() => void thread.refetch()}
        renderItem={renderItem as never}
        keyExtractor={keyExtractor as never}
        onContentSizeChange={onContentSizeChange}
        desktopFixedHeight
        sideBorders={false}
        maintainVisibleContentPosition={{minIndexForVisible: 0}}
        ListFooterComponent={<ListFooter height={windowHeight - 200} />}
        initialNumToRender={10}
        windowSize={7}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={100}
      />

      {/* Compose prompt — mirrors PostThread MobileComposePrompt + ThreadComposePrompt */}
      {gtMobile && hasSession && (
        <View style={[a.border_t, {borderTopWidth: 1}]}>
          <ThreadComposePrompt onPressCompose={() => openReplyComposer()} />
        </View>
      )}

      {!gtMobile && hasSession && (
        <MobileComposePrompt onPressReply={() => openReplyComposer()} />
      )}
    </Layout.Screen>
  )
}

type Profiles = Map<string, app.bsky.actor.defs.ProfileViewDetailed>
function mapThreadQuestion(
  thread: OpenQuestionThread,
  profiles: Profiles,
): OpenQuestion {
  return {
    id: thread.post.uri,
    text: thread.post.text.replace(/\|#\?OpenQuestion/g, '').trim(),
    author: {
      handle: profiles.get(thread.post.author)?.handle ?? thread.post.author,
      avatar: profiles.get(thread.post.author)?.avatar ?? '',
    },
    replyCount: countReplies(thread.replies),
    timestamp: thread.post.createdAt,
  }
}

function mapThreadReplies(
  replies: OpenQuestionThreadReply[],
  profiles?: Profiles,
): OpenQuestionReplyData[] {
  return replies.map(reply => ({
    id: reply.uri,
    text: reply.text,
    author: {
      handle: profiles?.get(reply.author)?.handle ?? reply.author,
      avatar: profiles?.get(reply.author)?.avatar ?? '',
      displayName: profiles?.get(reply.author)?.displayName,
    },
    votes: reply.voteScore,
    viewerVote: reply.viewerVote ?? 0,
    timestamp: reply.createdAt,
    replies: reply.replies?.length
      ? mapThreadReplies(reply.replies, profiles)
      : undefined,
  }))
}

function countReplies(replies: OpenQuestionThreadReply[]): number {
  return replies.reduce(
    (total, reply) => total + 1 + countReplies(reply.replies ?? []),
    0,
  )
}

function findReply(
  replies: OpenQuestionThreadReply[],
  uri: string,
): OpenQuestionThreadReply | undefined {
  for (const reply of replies) {
    if (reply.uri === uri) return reply
    const child = findReply(reply.replies ?? [], uri)
    if (child) return child
  }
}

function didAuthor(
  did: string,
  profile?: app.bsky.actor.defs.ProfileViewDetailed,
): app.bsky.actor.defs.ProfileViewBasic {
  return {
    did: did as DidString,
    handle: profile?.handle ?? 'handle.invalid',
    displayName: profile?.displayName ?? did,
    avatar: profile?.avatar,
  }
}

function MobileComposePrompt({onPressReply}: {onPressReply: () => unknown}) {
  const {footerHeight} = useShellLayout()

  const animatedStyle = useAnimatedStyle(() => ({
    bottom: footerHeight.get(),
  }))

  return (
    <Animated.View style={[a.fixed, a.left_0, a.right_0, animatedStyle]}>
      <ThreadComposePrompt onPressCompose={onPressReply} />
    </Animated.View>
  )
}
