import {useMemo, useState} from 'react'
import {Modal, Pressable, StyleSheet, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {Image} from 'expo-image'
import {LinearGradient} from 'expo-linear-gradient'
import {RichText as RichTextAPI} from '@bsky/sdk/richtext'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {HITSLOP_20} from '#/lib/constants'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeHandle} from '#/lib/strings/handles'
import {POST_TOMBSTONE, usePostShadow} from '#/state/cache/post-shadow'
import {useProfileShadow} from '#/state/cache/profile-shadow'
import {useProfileFollowMutationQueue} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {useSetLightStatusBar} from '#/state/shell/light-status-bar'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {ThreadComposePrompt} from '#/screens/PostThread/components/ThreadComposePrompt'
import {atoms as a, ThemeProvider, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {ArrowLeft_Stroke2_Corner0_Rounded as ArrowLeftIcon} from '#/components/icons/Arrow'
import {Bubble_Stroke2_Corner2_Rounded as CommentIcon} from '#/components/icons/Bubble'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {PostControls} from '#/components/PostControls'
import {RichText} from '#/components/RichText'
import {Text} from '#/components/Typography'
import {app} from '#/lexicons'
import * as bsky from '#/types/bsky'
import {MemeVoteButton} from '../cardPrimitives'
import {buildMetaLabel} from '../helpers'
import {styles} from '../styles'
import {type MediaItem, type Mode} from '../types'

/**
 * Full-screen, immersive view of a meme, modeled on the video feed: the image
 * fills the screen and the author, text, votes and reply prompt float over a
 * gradient at the bottom. Tapping the image hides or shows the overlay.
 */
export function ExpandedMediaCardModal({
  item,
  mode,
  onClose,
  onOpenComments,
}: {
  item: MediaItem | null
  mode: Mode
  onClose: () => void
  onOpenComments?: () => void
}) {
  if (!item) return null

  const handleClose = onClose

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible>
      <ThemeProvider theme="dark">
        <MemeViewer
          item={item}
          mode={mode}
          onClose={handleClose}
          onOpenComments={
            onOpenComments
              ? () => {
                  handleClose()
                  onOpenComments()
                }
              : undefined
          }
        />
      </ThemeProvider>
    </Modal>
  )
}

function MemeViewer({
  item,
  onClose,
  onOpenComments,
}: {
  item: MediaItem
  mode: Mode
  onClose: () => void
  onOpenComments?: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const insets = useSafeAreaInsets()
  const {openComposer} = useOpenComposer()
  const [chromeVisible, setChromeVisible] = useState(true)
  const [textExpanded, setTextExpanded] = useState(false)
  useSetLightStatusBar(true)

  const post = item.post
  const record =
    post && bsky.isType(app.bsky.feed.post, post.record)
      ? post.record
      : undefined
  const text = record?.text?.trim() || item.title
  const richText = useMemo(
    () => new RichTextAPI({text, facets: record?.facets}),
    [text, record?.facets],
  )
  const metaLabel = [buildMetaLabel(item), item.category]
    .filter(Boolean)
    .join(' · ')
  const imageUri = item.fullsizeUri ?? item.thumbUri

  const onPressReply = post
    ? () => {
        onClose()
        openComposer({
          replyTo: {
            uri: post.uri,
            cid: post.cid,
            text: record?.text || '',
            author: post.author,
            embed: post.embed,
            langs: record?.langs,
          },
          logContext: 'PostReply',
        })
      }
    : undefined

  return (
    <View style={styles.viewerRoot}>
      <Pressable
        accessibilityHint={_(msg`Shows or hides the meme details`)}
        accessibilityLabel={item.title}
        accessibilityRole="button"
        onPress={() => setChromeVisible(visible => !visible)}
        style={StyleSheet.absoluteFill}>
        {imageUri ? (
          <Image
            accessibilityIgnoresInvertColors
            cachePolicy="memory-disk"
            contentFit="contain"
            placeholder={item.thumbUri ? {uri: item.thumbUri} : undefined}
            source={{uri: imageUri}}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, {backgroundColor: item.color}]}
          />
        )}
      </Pressable>

      {chromeVisible ? (
        <>
          <View
            pointerEvents="box-none"
            style={[styles.viewerHeader, {paddingTop: insets.top + 6}]}>
            <Pressable
              accessibilityHint={_(msg`Returns to the memes`)}
              accessibilityLabel={_(msg`Close`)}
              accessibilityRole="button"
              hitSlop={HITSLOP_20}
              onPress={onClose}
              style={styles.viewerBackButton}>
              <ArrowLeftIcon size="lg" style={{color: '#fff'}} />
            </Pressable>
          </View>

          <LinearGradient
            colors={[
              'rgba(0,0,0,0)',
              'rgba(0,0,0,0.7)',
              'rgba(0,0,0,0.95)',
              'rgba(0,0,0,0.95)',
            ]}
            pointerEvents="box-none"
            style={[styles.viewerFooter, {paddingBottom: insets.bottom}]}>
            <View style={a.px_md}>
              {post ? (
                <AuthorRow post={post} />
              ) : (
                <Text style={[a.text_md, a.font_bold]}>{item.author}</Text>
              )}

              <Pressable
                accessibilityHint={_(msg`Expands or collapses the meme text`)}
                accessibilityLabel={
                  textExpanded ? _(msg`Read less`) : _(msg`Read more`)
                }
                accessibilityRole="button"
                onPress={() => setTextExpanded(expanded => !expanded)}
                style={a.py_sm}>
                <RichText
                  authorHandle={post?.author.handle}
                  enableTags
                  numberOfLines={textExpanded ? undefined : 2}
                  style={[a.text_sm, a.leading_relaxed]}
                  value={richText}
                />
                {metaLabel ? (
                  <Text
                    numberOfLines={1}
                    style={[a.text_xs, a.pt_xs, t.atoms.text_contrast_medium]}>
                    {metaLabel}
                  </Text>
                ) : null}
              </Pressable>

              {post && record ? (
                <MemePostControls
                  onPressReply={onOpenComments ?? (() => {})}
                  post={post}
                  record={record}
                  richText={richText}
                />
              ) : (
                <View style={styles.viewerControls}>
                  <MemeVoteButton big item={item} />
                  <View style={styles.viewerControl}>
                    <CommentIcon size="lg" style={t.atoms.text_contrast_high} />
                    <Text style={[a.text_md, t.atoms.text_contrast_high]}>
                      {item.comments}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {onPressReply ? (
              <ThreadComposePrompt
                onPressCompose={onPressReply}
                style={[a.pt_md, a.pb_sm]}
              />
            ) : (
              <View style={a.pb_md} />
            )}
          </LinearGradient>
        </>
      ) : null}
    </View>
  )
}

/** The standard bsky post controls, as in the immersive video feed. */
function MemePostControls({
  post: rawPost,
  record,
  richText,
  onPressReply,
}: {
  post: NonNullable<MediaItem['post']>
  record: app.bsky.feed.post.Main
  richText: RichTextAPI
  onPressReply: () => void
}) {
  const post = usePostShadow(rawPost)

  if (post === POST_TOMBSTONE) return null

  return (
    <View style={{left: -5}}>
      <PostControls
        big
        forceGoogleTranslate
        logContext="ImmersiveVideo"
        onPressReply={onPressReply}
        post={post}
        record={record}
        richText={richText}
      />
    </View>
  )
}

function AuthorRow({post}: {post: NonNullable<MediaItem['post']>}) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const profile = useProfileShadow(post.author)
  const [queueFollow, queueUnfollow] = useProfileFollowMutationQueue(
    profile,
    'PostThreadItem',
  )
  const displayName = sanitizeDisplayName(
    post.author.displayName || post.author.handle,
  )
  const handle = sanitizeHandle(post.author.handle, '@')
  const isFollowing = !!profile.viewer?.following

  return (
    <View style={[a.w_full, a.flex_row, a.align_center, a.gap_md]}>
      <View style={[a.flex_1, a.flex_row, a.align_center, a.gap_md]}>
        <UserAvatar avatar={post.author.avatar} size={36} type="user" />
        <View style={a.flex_1}>
          <Text emoji numberOfLines={1} style={[a.text_md, a.font_bold]}>
            {displayName}
          </Text>
          <Text
            numberOfLines={1}
            style={[a.text_sm, t.atoms.text_contrast_high]}>
            {handle}
          </Text>
        </View>
      </View>
      {/* Based on the non-reactive value so the button stays after a follow. */}
      {post.author.did !== currentAccount?.did &&
      !post.author.viewer?.following ? (
        <Button
          accessibilityHint={isFollowing ? _(msg`Unfollows the user`) : ''}
          color="secondary_inverted"
          label={
            isFollowing ? _(msg`Following ${handle}`) : _(msg`Follow ${handle}`)
          }
          onPress={() =>
            isFollowing ? void queueUnfollow() : void queueFollow()
          }
          size="small"
          variant="solid">
          {isFollowing ? <ButtonIcon icon={CheckIcon} /> : null}
          <ButtonText>
            {isFollowing ? <Trans>Following</Trans> : <Trans>Follow</Trans>}
          </ButtonText>
        </Button>
      ) : null}
    </View>
  )
}
