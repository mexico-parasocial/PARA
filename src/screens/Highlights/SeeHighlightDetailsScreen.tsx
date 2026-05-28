import {useCallback, useMemo} from 'react'
import {Image, StyleSheet, View} from 'react-native'
import {
  type AppBskyFeedDefs,
  AppBskyFeedPost,
  RichText as RichTextAPI,
} from '@atproto/api'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {NINTHS_COMMUNITIES} from '#/lib/communities'
import {useInitialNumToRender} from '#/lib/hooks/useInitialNumToRender'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {type Highlight} from '#/lib/services/highlights'
import {type Shadow} from '#/state/cache/post-shadow'
import {FeedFeedbackProvider, useFeedFeedback} from '#/state/feed-feedback'
import {getAllHighlights} from '#/state/highlights/highlightStorage'
import {
  type HighlightColor,
  type HighlightData,
} from '#/state/highlights/highlightTypes'
import {useHighlights} from '#/state/highlights/useHighlights'
import {useHighlightQuery, useHighlightsQuery} from '#/state/queries/highlights'
import {
  PostThreadContextProvider,
  type ThreadItem,
  usePostThread,
} from '#/state/queries/usePostThread'
import {useSession} from '#/state/session'
import {List} from '#/view/com/util/List'
import {Text} from '#/view/com/util/text/Text'
import {ThreadItemPost} from '#/screens/PostThread/components/ThreadItemPost'
import {useTheme} from '#/alf'
import {ArrowShareRight_Stroke2_Corner2_Rounded as ShareIcon} from '#/components/icons/ArrowShareRight'
import {Bookmark, BookmarkFilled} from '#/components/icons/Bookmark'
import {DotGrid_Stroke2_Corner0_Rounded as MoreIcon} from '#/components/icons/DotGrid'
import {Message_Stroke2_Corner0_Rounded as MessageIcon} from '#/components/icons/Message'
import {Verified_Stroke2_Corner2_Rounded as VerifiedIcon} from '#/components/icons/Verified'
import * as Layout from '#/components/Layout'
import {
  PostControlButton,
  PostControlButtonIcon,
  PostControlButtonText,
} from '#/components/PostControls/PostControlButton'
import {PostMenuButton} from '#/components/PostControls/PostMenu'
import * as Toast from '#/components/Toast'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'SeeHighlightDetails'
>
type ThreadPostItem = Extract<ThreadItem, {type: 'threadPost'}>
const SAVED_HIGHLIGHT_PREFIX = 'saved:'

// Helper function to extract highlight data from feed

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

function localHighlightToHighlight(item: HighlightData): Highlight {
  return {
    id: item.id,
    sourcePostUri: item.postUri,
    start: item.start,
    end: item.end,
    text: item.text,
    postAuthor: 'unknown',
    authorName: 'Saved highlight',
    avatarUrl: 'https://i.pravatar.cc/150',
    postPreview: item.text,
    color: item.color,
    community: item.tag || 'Saved',
    state: 'Unknown',
    createdAt: item.createdAt,
    upvotes: 0,
    downvotes: 0,
    saves: 1,
    replyCount: 0,
    isVerified: false,
    isTrending: false,
    viewerHasSaved: true,
  }
}

function getPrimaryColor(color: string | readonly string[]) {
  return Array.isArray(color) ? color[0] : color
}

export function SeeHighlightDetailsScreen({route}: Props) {
  const t = useTheme()
  const {highlightId} = route.params
  const initialNumToRender = useInitialNumToRender()
  const {openComposer} = useOpenComposer()
  const {hasSession, currentAccount} = useSession()
  const feedFeedback = useFeedFeedback(undefined, hasSession)

  const {data: remoteHighlight} = useHighlightQuery(
    isHighlightRecordUri(highlightId) ? highlightId : undefined,
  )
  const {data: relatedHighlightPool = []} = useHighlightsQuery()
  const localHighlight = useMemo(() => {
    return getAllHighlights().find(
      item =>
        item.id === highlightId ||
        item.id === `${SAVED_HIGHLIGHT_PREFIX}${highlightId}`,
    )
  }, [highlightId])

  // Fetch full thread for the post behind this highlight.
  const isRealUri = highlightId.startsWith('at://')
  const sourceUri =
    remoteHighlight?.sourcePostUri ||
    localHighlight?.postUri ||
    (isRealUri && !isHighlightRecordUri(highlightId) ? highlightId : undefined)
  const {highlights, addHighlight, removeHighlight} = useHighlights(
    sourceUri || '',
  )
  const savedHighlightId = `${SAVED_HIGHLIGHT_PREFIX}${highlightId}`
  const savedHighlight = highlights.find(
    item =>
      item.id === savedHighlightId ||
      (localHighlight?.id === highlightId && item.id === highlightId),
  )
  const isSaved = Boolean(savedHighlight)
  const {data: threadData, context: threadContext} = usePostThread({
    anchor: sourceUri,
  })

  const {post, record, richText} = useMemo(() => {
    const anchorItem = threadData?.items.find(
      item => item.type === 'threadPost' && item.uri === sourceUri,
    )
    if (
      anchorItem &&
      anchorItem.type === 'threadPost' &&
      AppBskyFeedPost.isRecord(anchorItem.value.post.record)
    ) {
      const p = anchorItem.value.post
      const r = anchorItem.value.post.record
      return {
        post: p as unknown as Shadow<AppBskyFeedDefs.PostView>,
        record: r,
        richText: new RichTextAPI({
          text: r.text,
          facets: r.facets,
        }),
      }
    }
    return {post: null, record: null, richText: null}
  }, [threadData, sourceUri])

  // Derive highlight data
  const highlight = useMemo(() => {
    if (remoteHighlight) {
      return remoteHighlight
    }

    // Derive from fetched post when the route points directly to a post URI.
    if (sourceUri && threadData?.items) {
      const anchorItem = threadData.items.find(
        item => item.type === 'threadPost' && item.uri === sourceUri,
      )

      if (anchorItem && anchorItem.type === 'threadPost') {
        const post = anchorItem.value.post
        const record = post.record
        const text = record.text || ''
        const tags = text.match(/#\w+/g) || []

        let community = 'Unknown'
        let state: string | undefined
        let color: string | string[] = '#888888'

        for (const tag of tags) {
          const cleanTag = tag.substring(1)
          const matchingComm = Object.values(NINTHS_COMMUNITIES).find(
            c =>
              c.name.replace(/\s+/g, '').toLowerCase() ===
              cleanTag.toLowerCase(),
          )
          if (matchingComm) {
            community = matchingComm.name
            color = getPrimaryColor(matchingComm.color)
          } else {
            state = cleanTag
          }
        }

        const fallbackStart = localHighlight?.start ?? 0
        const fallbackEnd = localHighlight?.end ?? text.length
        const highlightText =
          localHighlight?.text || text.slice(fallbackStart, fallbackEnd) || text

        return {
          id: highlightId,
          sourcePostUri: post.uri,
          start: fallbackStart,
          end: fallbackEnd,
          text: highlightText,
          postAuthor: post.author.handle,
          authorName: post.author.displayName || post.author.handle,
          avatarUrl: post.author.avatar || 'https://i.pravatar.cc/150',
          postPreview: text,
          color: color as HighlightColor,
          community,
          state: state || 'Unknown',
          createdAt: new Date(post.indexedAt).getTime(),
          upvotes: post.likeCount || 0,
          downvotes: 0,
          saves: post.repostCount || 0,
          replyCount: post.replyCount || 0,
          isVerified: !!post.author.viewer?.followedBy,
          isTrending: (post.likeCount || 0) > 0,
          viewerHasUpvoted: !!post.viewer?.like,
          viewerHasDownvoted: false,
          // viewerHasSaved is handled by our local persistence now
        }
      }
    }

    if (localHighlight) {
      return localHighlightToHighlight(localHighlight)
    }

    return null
  }, [remoteHighlight, localHighlight, sourceUri, threadData, highlightId])

  const relatedHighlights = useMemo(() => {
    if (!highlight) return []
    return relatedHighlightPool
      .filter(item => {
        if (item.id === highlight.id) return false
        return (
          item.sourcePostUri === highlight.sourcePostUri ||
          item.community === highlight.community ||
          item.state === highlight.state
        )
      })
      .slice(0, 5)
  }, [highlight, relatedHighlightPool])

  // Highlight text splitting logic
  const {textParts, highlightPart, fullContent} = useMemo(() => {
    if (!highlight) return {textParts: [], highlightPart: '', fullContent: ''}

    // Determine full content vs. the saved/remote highlighted snippet.
    let fullText = highlight.text
    let snippet = highlight.text

    if (
      highlight.postPreview &&
      highlight.postPreview.length > highlight.text.length
    ) {
      fullText = highlight.postPreview
      snippet = highlight.text
    }

    // If we have saved highlight range (from persistence), prioritize that.
    if (savedHighlight) {
      const h = savedHighlight
      if (h.end > h.start && fullText.length >= h.end) {
        const before = fullText.slice(0, h.start)
        const hl = fullText.slice(h.start, h.end)
        const after = fullText.slice(h.end)
        return {
          textParts: [before, after],
          highlightPart: hl,
          fullContent: fullText,
        }
      }
    }

    if (
      typeof highlight.start === 'number' &&
      typeof highlight.end === 'number' &&
      highlight.end > highlight.start &&
      fullText.length >= highlight.end
    ) {
      const before = fullText.slice(0, highlight.start)
      const hl = fullText.slice(highlight.start, highlight.end)
      const after = fullText.slice(highlight.end)
      return {
        textParts: [before, after],
        highlightPart: hl,
        fullContent: fullText,
      }
    }

    // Otherwise, try to match the snippet in the full text
    if (fullText.includes(snippet) && snippet !== fullText) {
      const parts = fullText.split(snippet)
      // Limitation: only highlighting first occurrence for now
      if (parts.length >= 2) {
        const before = parts[0]
        const after = parts.slice(1).join(snippet) // Join rest in case of multiple
        return {
          textParts: [before, after],
          highlightPart: snippet,
          fullContent: fullText,
        }
      }
    }

    // Fallback: Show entire text as highlight or just text
    return {textParts: [fullText], highlightPart: '', fullContent: fullText}
  }, [highlight, savedHighlight])

  const toggleSave = useCallback(() => {
    if (isSaved) {
      if (savedHighlight) {
        void removeHighlight(savedHighlight.id)
      }
    } else {
      if (!highlight || !sourceUri) return
      const start = typeof highlight.start === 'number' ? highlight.start : 0
      const end =
        typeof highlight.end === 'number'
          ? highlight.end
          : highlight.text.length
      void addHighlight(
        start,
        end,
        (highlight.color || '#FEF08A') as HighlightColor,
        false,
        highlight.text,
        highlight.community,
        savedHighlightId,
      )
    }
  }, [
    isSaved,
    highlight,
    sourceUri,
    savedHighlight,
    savedHighlightId,
    addHighlight,
    removeHighlight,
  ])

  const slices = useMemo(() => {
    return (threadData?.items || []).filter(
      item => item.type === 'threadPost' && item.depth > 0,
    ) as ThreadPostItem[]
  }, [threadData])

  const renderItem = useCallback(
    ({item}: {item: unknown}) => {
      return (
        <ThreadItemPost
          item={item as ThreadPostItem}
          threadgateRecord={threadData?.threadgate?.record ?? undefined}
        />
      )
    },
    [threadData],
  )

  const header = useMemo(() => {
    if (!highlight) return null
    return (
      <View style={styles.content}>
        {/* 1. The Highlight (Quote) with Nested Source */}
        <View
          style={[
            styles.card,
            t.atoms.bg_contrast_25,
            t.atoms.border_contrast_low,
          ]}>
          {/* Header: Highlight Author */}
          <View style={styles.cardHeader}>
            <Image
              accessibilityIgnoresInvertColors
              source={{uri: highlight.avatarUrl}}
              style={styles.cardAvatar}
            />
            <View style={{flex: 1}}>
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <Text style={[styles.cardName, t.atoms.text]} numberOfLines={1}>
                  {highlight.authorName}
                </Text>
                {highlight.isVerified && (
                  <VerifiedIcon
                    width={14}
                    height={14}
                    style={{color: t.palette.primary_500}}
                  />
                )}
              </View>
              <Text
                style={[styles.cardHandle, t.atoms.text_contrast_low]}
                numberOfLines={1}>
                @{highlight.postAuthor}
              </Text>
            </View>
            <Text style={[styles.cardTime, t.atoms.text_contrast_low]}>
              {formatRelativeTime(highlight.createdAt)}
            </Text>
          </View>

          {/* Quote Snippet (Title/Comment) */}
          <View style={{marginTop: 12}}>
            <Text style={[styles.highlightText, t.atoms.text]}>
              "{highlightPart || highlight.text}"
            </Text>
          </View>

          {/* Embedded Source Post */}
          <View
            style={[
              styles.embedCard,
              {borderColor: t.atoms.border_contrast_low.borderColor},
            ]}>
            <View style={styles.embedHeader}>
              <Image
                accessibilityIgnoresInvertColors
                source={{uri: highlight.avatarUrl}}
                style={styles.embedAvatar}
              />
              <View style={{flex: 1}}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                  <Text
                    style={[styles.embedName, t.atoms.text]}
                    numberOfLines={1}>
                    {highlight.authorName}
                  </Text>
                  <Text
                    style={[styles.embedHandle, t.atoms.text_contrast_low]}
                    numberOfLines={1}>
                    @{highlight.postAuthor}
                  </Text>
                </View>
              </View>
              <Text style={[styles.embedTime, t.atoms.text_contrast_low]}>
                {formatRelativeTime(highlight.createdAt)}
              </Text>
            </View>

            <Text style={[styles.embedText, t.atoms.text]}>
              {textParts.length > 1 ? (
                <>
                  {textParts[0]}
                  <Text
                    style={{
                      color: getPrimaryColor(highlight.color),
                      fontWeight: '700',
                    }}>
                    {highlightPart}
                  </Text>
                  {textParts[1]}
                </>
              ) : (
                fullContent || highlight.text
              )}
            </Text>
          </View>
        </View>

        {relatedHighlights.length > 0 && (
          <View
            style={[
              styles.card,
              t.atoms.bg_contrast_25,
              t.atoms.border_contrast_low,
            ]}>
            <Text style={[styles.relatedTitle, t.atoms.text]}>
              Related signals
            </Text>
            {relatedHighlights.map(item => (
              <View
                key={item.id}
                style={[
                  styles.relatedRow,
                  {borderTopColor: t.atoms.border_contrast_low.borderColor},
                ]}>
                <View
                  style={[
                    styles.relatedDot,
                    {
                      backgroundColor: Array.isArray(item.color)
                        ? item.color[0]
                        : item.color,
                    },
                  ]}
                />
                <View style={{flex: 1}}>
                  <Text style={[styles.relatedText, t.atoms.text]} numberOfLines={2}>
                    {item.text}
                  </Text>
                  <Text
                    style={[styles.relatedMeta, t.atoms.text_contrast_medium]}
                    numberOfLines={1}>
                    {item.community} · {item.state}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Engagement & Actions (Controls) */}
        <View
          style={[
            styles.card,
            t.atoms.bg_contrast_25,
            t.atoms.border_contrast_low,
        ]}>
          <View style={styles.controlsRow}>
            {/* Reply */}
            <PostControlButton
              testID="replyBtn"
              label="Reply"
              onPress={() => {
                if (post && record) {
                  const anchorThreadItem = threadData?.items?.find(
                    item => item.type === 'threadPost' && item.uri === post.uri,
                  )
                  openComposer({
                    replyTo: {
                      uri: post.uri,
                      cid: post.cid,
                      text: record.text,
                      author: post.author,
                      embed: post.embed,
                      moderation:
                        anchorThreadItem?.type === 'threadPost'
                          ? anchorThreadItem.moderation
                          : undefined,
                      langs: record.langs,
                    },
                    logContext: 'PostReply',
                  })
                } else if (highlight) {
                  const mention =
                    highlight.postAuthor === currentAccount?.handle
                      ? undefined
                      : highlight.postAuthor
                  openComposer({
                    mention,
                    logContext: 'PostReply',
                  })
                }
              }}>
              <PostControlButtonIcon icon={MessageIcon} />
              <PostControlButtonText>
                {highlight.replyCount || 0}
              </PostControlButtonText>
            </PostControlButton>

            {/* Save */}
            <PostControlButton
              testID="saveBtn"
              label={isSaved ? 'Unsave highlight' : 'Save highlight'}
              onPress={toggleSave}
              active={isSaved}
              activeColor={t.palette.primary_500}>
              <PostControlButtonIcon
                icon={isSaved ? BookmarkFilled : Bookmark}
              />
              <PostControlButtonText>
                {isSaved ? 'Saved' : 'Save'}
              </PostControlButtonText>
            </PostControlButton>

            {/* Share */}
            <PostControlButton
              testID="shareBtn"
              label="Share highlight"
              onPress={() => {}}>
              <PostControlButtonIcon icon={ShareIcon} />
            </PostControlButton>

            {/* More / Menu */}
            {post && record && richText ? (
              <PostMenuButton
                testID="moreBtn"
                post={post}
                postFeedContext={undefined}
                postReqId={undefined}
                big={true}
                record={record}
                richText={richText}
                timestamp={post.indexedAt}
                logContext="Post"
                forceGoogleTranslate={false}
              />
            ) : (
              <PostControlButton
                testID="moreBtn"
                label="More options"
                onPress={() => Toast.show('More highlight actions coming soon')}>
                <PostControlButtonIcon icon={MoreIcon} />
              </PostControlButton>
            )}
          </View>
        </View>

        <View style={styles.commentsHeader}>
          <Text style={[styles.commentsTitle, t.atoms.text_contrast_medium]}>
            Comments
          </Text>
        </View>
      </View>
    )
  }, [
    highlight,
    t,
    highlightPart,
    textParts,
    fullContent,
    isSaved,
    toggleSave,
    relatedHighlights,
    post,
    record,
    richText,
    openComposer,
    threadData,
    currentAccount?.handle,
  ])

  if (!highlight) {
    return (
      <Layout.Screen>
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Highlight</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
          <Layout.Header.Slot />
        </Layout.Header.Outer>
        <Layout.Content>
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, t.atoms.text_contrast_medium]}>
              Highlight not found.
            </Text>
          </View>
        </Layout.Content>
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Highlight</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Content>
        <PostThreadContextProvider context={threadContext}>
          <FeedFeedbackProvider value={feedFeedback}>
            <List
              data={slices}
              renderItem={renderItem}
              ListHeaderComponent={header}
              keyExtractor={(item: unknown) => (item as ThreadPostItem).key}
              initialNumToRender={initialNumToRender}
              contentContainerStyle={{paddingBottom: 40}}
              ListEmptyComponent={
                <View style={styles.emptyComments}>
                  <Text
                    style={[styles.emptyText, t.atoms.text_contrast_medium]}>
                    No comments yet.
                  </Text>
                </View>
              }
            />
          </FeedFeedbackProvider>
        </PostThreadContextProvider>
      </Layout.Content>
    </Layout.Screen>
  )
}

function isHighlightRecordUri(uri: string) {
  return uri.includes('/com.para.highlight.annotation/')
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 60,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },

  // Common Card Style
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },

  // Highlight Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccc',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardHandle: {
    fontSize: 14,
  },
  cardTime: {
    fontSize: 12,
    marginLeft: 'auto',
  },

  // Highlight Text
  highlightText: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 26,
  },
  commentsHeader: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 8,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyComments: {
    padding: 40,
    alignItems: 'center',
  },

  // Embed Card (Reddit Style)
  embedCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  embedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  embedAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ccc',
  },
  embedName: {
    fontSize: 13,
    fontWeight: '700',
  },
  embedHandle: {
    fontSize: 12,
    opacity: 0.8,
  },
  embedTime: {
    fontSize: 11,
    marginLeft: 'auto',
    opacity: 0.7,
  },
  embedText: {
    fontSize: 14, // Slightly smaller
    lineHeight: 20,
  },
  relatedTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  relatedRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
  },
  relatedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  relatedText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  relatedMeta: {
    fontSize: 12,
    marginTop: 3,
  },

  // Source Card
  sourceLabelRow: {
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },

  // Controls
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  voteSection: {
    //
  },

  // Related
  relatedCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  relatedPlaceholder: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
  },

  // Simplified source card for now
})
