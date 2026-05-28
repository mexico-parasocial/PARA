import {memo, useMemo, useState} from 'react'
import {Platform, type StyleProp, View, type ViewStyle} from 'react-native'
import {
  type AppBskyFeedDefs,
  type AppBskyFeedPost,
  type AppBskyFeedThreadgate,
  AtUri,
  type RichText as RichTextAPI,
} from '@atproto/api'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'

import {useHaptics} from '#/lib/haptics'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {makeProfileLink as _makeProfileLink} from '#/lib/routes/links'
import {type NavigationProp} from '#/lib/routes/types'
import {logger} from '#/logger'
import {type Shadow} from '#/state/cache/types'
import {useFeedFeedbackContext} from '#/state/feed-feedback'
import {useHighlightMode, useHighlights} from '#/state/highlights'
import {usePostLikeMutationQueue} from '#/state/queries/post'
import {useRequireAuth} from '#/state/session'
import {
  ProgressGuideAction,
  useProgressGuideControls,
} from '#/state/shell/progress-guide'
import {atoms as a, useBreakpoints} from '#/alf'
import {Reply as Bubble} from '#/components/icons/Reply'
import {useFormatPostStatCount} from '#/components/PostControls/util'
import * as Skele from '#/components/Skeleton'
import * as Toast from '#/components/Toast'
import {BookmarkButton} from './BookmarkButton'
import {
  PostControlButton,
  PostControlButtonIcon,
  PostControlButtonText,
} from './PostControlButton'
import {PostMenuButton} from './PostMenu'
import {QuoteButton} from './QuoteButton'
import {ShareMenuButton} from './ShareMenu'
import {RedditVoteButton} from './VoteButton'

let PostControls = ({
  big,
  post,
  record,
  richText,
  feedContext,
  reqId,
  style,
  onPressReply,
  onPostReply,
  logContext,
  threadgateRecord,
  onShowLess,
  viaQuote,
  variant,
  forceGoogleTranslate = false,
}: {
  big?: boolean
  post: Shadow<AppBskyFeedDefs.PostView>
  record: AppBskyFeedPost.Record
  richText: RichTextAPI
  feedContext?: string | undefined
  reqId?: string | undefined
  style?: StyleProp<ViewStyle>
  onPressReply: () => void
  onPostReply?: (postUri: string | undefined) => void
  logContext: 'FeedItem' | 'PostThreadItem' | 'Post' | 'ImmersiveVideo'
  threadgateRecord?: AppBskyFeedThreadgate.Record
  onShowLess?: (interaction: AppBskyFeedDefs.Interaction) => void
  viaQuote?: {uri: string; cid: string}
  variant?: 'compact' | 'normal' | 'large'
  forceGoogleTranslate?: boolean
}): React.ReactNode => {
  const {_} = useLingui()
  const {openComposer} = useOpenComposer()
  const {feedDescriptor} = useFeedFeedbackContext()
  const [queueLike, queueUnlike] = usePostLikeMutationQueue(
    post,
    viaQuote,
    feedDescriptor,
    logContext,
  )
  const requireAuth = useRequireAuth()
  const {sendInteraction} = useFeedFeedbackContext()
  const {captureAction} = useProgressGuideControls()
  const playHaptic = useHaptics()
  const isBlocked = Boolean(
    post.author.viewer?.blocking ||
    post.author.viewer?.blockedBy ||
    post.author.viewer?.blockingByList,
  )
  const replyDisabled = post.viewer?.replyDisabled
  const {gtPhone} = useBreakpoints()
  const formatPostStatCount = useFormatPostStatCount()

  const [hasVoteIconBeenToggled, setHasVoteIconBeenToggled] = useState(false)
  const [isDownvoted, setIsDownvoted] = useState(false)
  const [currentVoteOverride, setCurrentVoteOverride] = useState<
    'upvote' | 'downvote' | 'none'
  >('none')

  // Calculate vote state and counts
  const currentVote =
    currentVoteOverride !== 'none'
      ? currentVoteOverride
      : post.viewer?.like
        ? 'upvote'
        : 'none'

  // Calculate net score: likes minus downvotes
  const baseScore = post.likeCount || 0
  const downvoteAdjustment = isDownvoted ? -1 : 0
  const netScore = baseScore + downvoteAdjustment

  const onPressUpvote = async () => {
    if (isBlocked) {
      Toast.show(_(msg`Cannot interact with a blocked user`), {
        type: 'warning',
      })
      return
    }

    try {
      setHasVoteIconBeenToggled(true)

      // If currently downvoted, clear downvote first
      if (currentVoteOverride === 'downvote') {
        setIsDownvoted(false)
        setCurrentVoteOverride('none')
      }

      if (!post.viewer?.like) {
        playHaptic('Light')
        sendInteraction({
          item: post.uri,
          event: 'app.bsky.feed.defs#interactionLike',
          feedContext,
          reqId,
        })
        captureAction(ProgressGuideAction.Like)
        await queueLike()
      } else {
        // Only unlike if we're actually liked (not just clearing downvote)
        if (currentVoteOverride !== 'downvote') {
          await queueUnlike()
        }
      }
    } catch (e: unknown) {
      if ((e as {name?: string})?.name !== 'AbortError') {
        throw e
      }
    }
  }

  const onPressDownvote = async () => {
    if (isBlocked) {
      Toast.show(_(msg`Cannot interact with a blocked user`), {
        type: 'warning',
      })
      return
    }

    setHasVoteIconBeenToggled(true)

    // Toggle downvote state and update vote override
    if (currentVoteOverride === 'downvote') {
      // Currently downvoted, unselect
      setIsDownvoted(false)
      setCurrentVoteOverride('none')
    } else {
      // Switch to downvote (from upvote or none)
      setIsDownvoted(true)
      setCurrentVoteOverride('downvote')
      // If currently liked, unlike first
      if (post.viewer?.like) {
        try {
          await queueUnlike()
        } catch (e: unknown) {
          if ((e as {name?: string})?.name !== 'AbortError') {
            throw e
          }
        }
      }
    }
  }

  const onQuote = () => {
    if (isBlocked) {
      Toast.show(_(msg`Cannot interact with a blocked user`), {
        type: 'warning',
      })
      return
    }

    sendInteraction({
      item: post.uri,
      event: 'app.bsky.feed.defs#interactionQuote',
      feedContext,
      reqId,
    })
    logger.metric('post:clickQuotePost', {
      uri: post.uri,
      authorDid: post.author.did,
      logContext,
      feedDescriptor,
    })
    openComposer({
      quote: post,
      onPost: onPostReply,
      logContext: 'QuotePost',
    })
  }

  const onShare = () => {
    sendInteraction({
      item: post.uri,
      event: 'app.bsky.feed.defs#interactionShare',
      feedContext,
      reqId,
    })
  }

  const navigation = useNavigation<NavigationProp>()
  const {enterHighlightMode} = useHighlightMode()
  const {highlights, clearAll: clearAllHighlights} = useHighlights(post.uri)

  const onHighlight = () => {
    if (isBlocked) {
      Toast.show(_(msg`Cannot interact with a blocked user`), {
        type: 'warning',
      })
      return
    }

    // Enter highlight mode for this post
    enterHighlightMode(post.uri)

    // Only navigate to post thread if not already there
    // The 'big' prop is true when rendered from ThreadItemAnchor (post thread screen)
    if (!big) {
      const urip = new AtUri(post.uri)
      navigation.push('PostThread', {
        name: post.author.handle,
        rkey: urip.rkey,
        ...(urip.collection !== 'app.bsky.feed.post'
          ? {collection: urip.collection}
          : {}),
      })
    }
  }

  const onRemoveAllHighlights = () => {
    if (highlights.length > 0) {
      clearAllHighlights()
      Toast.show(_(msg`All highlights removed`))
    } else {
      Toast.show(_(msg`No highlights to remove`))
    }
  }

  const secondaryControlSpacingStyles = useSecondaryControlSpacingStyles({
    variant,
    big,
    gtPhone,
  })

  return (
    <View
      style={[
        a.flex_row,
        a.justify_between,
        a.align_center,
        !big && a.pt_2xs,
        a.gap_md,
        style,
      ]}>
      <View style={[a.flex_row, a.flex_1, {maxWidth: 320}]}>
        {/* Vote buttons with integrated CountWheel */}
        <View style={[a.flex_1, a.align_start, {flex: 1}]}>
          <RedditVoteButton
            score={netScore}
            currentVote={currentVote}
            big={big}
            hasBeenToggled={hasVoteIconBeenToggled}
            onUpvote={() => requireAuth(() => onPressUpvote())}
            onDownvote={() => requireAuth(() => onPressDownvote())}
          />
        </View>

        {/* Reply button */}
        <View
          style={[
            a.flex_1,
            a.align_start,
            {marginLeft: Platform.OS === 'web' ? 36 : 40},
          ]}>
          <PostControlButton
            testID="replyBtn"
            onPress={
              !replyDisabled
                ? () =>
                    requireAuth(() => {
                      logger.metric('post:clickReply', {
                        uri: post.uri,
                        authorDid: post.author.did,
                        logContext,
                        feedDescriptor,
                      })
                      onPressReply()
                    })
                : undefined
            }
            label={_(
              msg({
                message: `Reply (${plural(post.replyCount || 0, {
                  one: '# reply',
                  other: '# replies',
                })})`,
                comment:
                  'Accessibility label for the reply button, verb form followed by number of replies and noun form',
              }),
            )}
            big={big}>
            <PostControlButtonIcon icon={Bubble} />
            {typeof post.replyCount !== 'undefined' && post.replyCount > 0 && (
              <PostControlButtonText>
                {formatPostStatCount(post.replyCount)}
              </PostControlButtonText>
            )}
          </PostControlButton>
        </View>
      </View>

      {/* Secondary controls */}
      <View style={[a.flex_row, a.justify_end, secondaryControlSpacingStyles]}>
        <View
          style={[
            a.align_start,
            {marginRight: Platform.OS === 'web' ? 102 : 24},
          ]}>
          <QuoteButton
            quoteCount={post.quoteCount ?? 0}
            onQuote={onQuote}
            onHighlight={onHighlight}
            onRemoveAllHighlights={onRemoveAllHighlights}
            hasHighlights={highlights.length > 0}
            big={big}
            embeddingDisabled={Boolean(post.viewer?.embeddingDisabled)}
          />
        </View>
        <BookmarkButton
          post={post}
          big={big}
          logContext={logContext}
          hitSlop={{
            right: secondaryControlSpacingStyles.gap / 2,
          }}
        />
        <ShareMenuButton
          testID="postShareBtn"
          post={post}
          big={big}
          record={record}
          richText={richText}
          timestamp={post.indexedAt}
          threadgateRecord={threadgateRecord}
          onShare={onShare}
          hitSlop={{
            left: secondaryControlSpacingStyles.gap / 2,
            right: secondaryControlSpacingStyles.gap / 2,
          }}
          logContext={logContext}
        />
        <PostMenuButton
          testID="postDropdownBtn"
          post={post}
          postFeedContext={feedContext}
          postReqId={reqId}
          big={big}
          record={record}
          richText={richText}
          timestamp={post.indexedAt}
          threadgateRecord={threadgateRecord}
          onShowLess={onShowLess}
          hitSlop={{
            left: secondaryControlSpacingStyles.gap / 2,
          }}
          logContext={logContext}
          forceGoogleTranslate={forceGoogleTranslate}
        />
      </View>
    </View>
  )
}
PostControls = memo(PostControls)
export {PostControls}

export function PostControlsSkeleton({
  big,
  style,
  variant,
}: {
  big?: boolean
  style?: StyleProp<ViewStyle>
  variant?: 'compact' | 'normal' | 'large'
}) {
  const {gtPhone} = useBreakpoints()

  const rowHeight = big ? 32 : 28
  const padding = 4
  const size = rowHeight - padding * 2

  const secondaryControlSpacingStyles = useSecondaryControlSpacingStyles({
    variant,
    big,
    gtPhone,
  })

  const itemStyles = {
    padding,
  }

  return (
    <Skele.Row
      style={[a.flex_row, a.justify_between, a.align_center, a.gap_md, style]}>
      <View style={[a.flex_row, a.flex_1, {maxWidth: 320}]}>
        <View style={[itemStyles, a.flex_1, a.align_start]}>
          <Skele.Row>
            <Skele.Pill blend size={size} />
            <View style={[a.align_center, a.mx_xs]}>
              <Skele.Pill blend size={size * 0.6} />
            </View>
            <Skele.Pill blend size={size} />
          </Skele.Row>
        </View>
        <View
          style={[
            itemStyles,
            a.flex_1,
            a.align_start,
            {marginLeft: Platform.OS === 'web' ? 36 : 40},
          ]}>
          <Skele.Pill blend size={size} />
        </View>
      </View>
      <View style={[a.flex_row, a.justify_end, secondaryControlSpacingStyles]}>
        <View
          style={[
            itemStyles,
            a.align_start,
            {marginRight: Platform.OS === 'web' ? 102 : 24},
          ]}>
          <Skele.Pill blend size={size} />
        </View>
        <View style={itemStyles}>
          <Skele.Circle blend size={size} />
        </View>
        <View style={itemStyles}>
          <Skele.Circle blend size={size} />
        </View>
        <View style={itemStyles}>
          <Skele.Circle blend size={size} />
        </View>
      </View>
    </Skele.Row>
  )
}

function useSecondaryControlSpacingStyles({
  variant,
  big,
  gtPhone,
}: {
  variant?: 'compact' | 'normal' | 'large'
  big?: boolean
  gtPhone: boolean
}) {
  return useMemo(() => {
    let gap = 0 // default, we want `gap` to be defined on the resulting object
    if (variant !== 'compact') gap = a.gap_xs.gap
    if (big || gtPhone) gap = a.gap_sm.gap
    return {gap}
  }, [variant, big, gtPhone])
}
