import {type ReactNode} from 'react'
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native'
import {Line, Polygon, Svg} from 'react-native-svg'
import {Image} from 'expo-image'
import {useLingui} from '@lingui/react/macro'

import {getCommunityInsignia} from '#/lib/civic-insignias'
import {sanitizeHandle} from '#/lib/strings/handles'
import {POST_TOMBSTONE, usePostShadow} from '#/state/cache/post-shadow'
import {usePostLikeMutationQueue} from '#/state/queries/post'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {CivicInsignia} from '#/components/CivicInsignia'
import {ArrowsDiagonalOut_Stroke2_Corner2_Rounded as ExpandIcon} from '#/components/icons/ArrowsDiagonal'
import {Bubble_Stroke2_Corner2_Rounded as CommentIcon} from '#/components/icons/Bubble'
import {RedditVoteButton} from '#/components/PostControls/VoteButton'
import {DECK_OVERLAP} from './helpers'
import {styles} from './styles'
import {type MediaItem} from './types'

export function PartyInsignia({
  party,
  visible,
}: {
  party: string
  visible: boolean
}) {
  if (!visible || !party) return null

  const displayParty = party.replace(/^p\//i, '')
  const colors = getCommunityInsignia(displayParty)

  return (
    <CivicInsignia
      colors={colors}
      variant="shield"
      size="md"
      style={styles.partyInsignia}
    />
  )
}

export function MediaVisual({
  thumbUri,
  fallbackColor,
  contentFit = 'cover',
  dimmed = true,
  children,
  style,
}: {
  thumbUri?: string
  fallbackColor: string
  contentFit?: 'cover' | 'contain'
  dimmed?: boolean
  children: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.mediaVisual, style, {backgroundColor: fallbackColor}]}>
      {thumbUri ? (
        <>
          <Image
            source={{uri: thumbUri}}
            style={StyleSheet.absoluteFill}
            contentFit={contentFit}
            cachePolicy="memory-disk"
            transition={150}
            accessibilityIgnoresInvertColors
          />
          {dimmed ? <View style={styles.mediaVisualOverlay} /> : null}
        </>
      ) : null}
      {children}
    </View>
  )
}

export function ActionButton({
  icon,
  label,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}: {
  icon: ReactNode
  label: string
  accessibilityLabel: string
  accessibilityHint?: string
  onPress?: () => void
}) {
  const t = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({pressed}) => [
        styles.actionButton,
        t.atoms.bg_contrast_25,
        pressed && {opacity: 0.7},
      ]}>
      {icon}
      <Text style={[styles.actionButtonText, t.atoms.text]}>{label}</Text>
    </Pressable>
  )
}

export function CommentsButton({
  item,
  onPress,
}: {
  item: MediaItem
  onPress: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()

  return (
    <ActionButton
      icon={<CommentIcon size="sm" style={t.atoms.text_contrast_medium} />}
      label={String(item.comments)}
      accessibilityLabel={l`${item.comments} comments`}
      accessibilityHint={l`Opens the post thread`}
      onPress={onPress}
    />
  )
}

/**
 * Meme votes are backed by likes. Reads and writes go through the post shadow
 * so votes update instantly and stay in sync with the rest of the app. There
 * is no persisted downvote, so the down arrow only clears an existing upvote.
 */
export function MemeVoteButton({
  item,
  style,
}: {
  item: MediaItem
  style?: StyleProp<ViewStyle>
}) {
  if (!item.post) return null
  return <MemeVoteButtonInner post={item.post} style={style} />
}

function MemeVoteButtonInner({
  post,
  style,
}: {
  post: NonNullable<MediaItem['post']>
  style?: StyleProp<ViewStyle>
}) {
  const shadow = usePostShadow(post)
  if (shadow === POST_TOMBSTONE) return null
  return <MemeVoteButtonControls post={shadow} style={style} />
}

function MemeVoteButtonControls({
  post,
  style,
}: {
  post: Exclude<ReturnType<typeof usePostShadow>, typeof POST_TOMBSTONE>
  style?: StyleProp<ViewStyle>
}) {
  const [queueLike, queueUnlike] = usePostLikeMutationQueue(
    post,
    undefined,
    undefined,
    'FeedItem',
  )
  const isLiked = Boolean(post.viewer?.like)

  return (
    <RedditVoteButton
      score={post.likeCount ?? 0}
      currentVote={isLiked ? 'upvote' : 'none'}
      hasBeenToggled={isLiked}
      onUpvote={() => void (isLiked ? queueUnlike() : queueLike())}
      onDownvote={() => {
        if (isLiked) void queueUnlike()
      }}
      style={style}
    />
  )
}

function MetaPill({label, onImage}: {label: string; onImage?: boolean}) {
  const t = useTheme()

  return (
    <View
      style={[
        styles.metaPill,
        onImage ? styles.metaPillOnImage : t.atoms.bg_contrast_25,
      ]}>
      <Text
        emoji
        numberOfLines={1}
        style={[
          styles.metaPillText,
          onImage ? styles.metaPillTextOnImage : t.atoms.text_contrast_medium,
        ]}>
        {label}
      </Text>
    </View>
  )
}

export function MediaVisualMeta({item}: {item: MediaItem}) {
  const labels = [
    item.author ? sanitizeHandle(item.author, '@') : '',
    item.community,
  ].filter(Boolean)
  if (!labels.length) return null
  return (
    <View style={styles.metaPillRow}>
      {labels.map(label => (
        <MetaPill key={label} label={label} onImage />
      ))}
    </View>
  )
}

/**
 * Slanted control band that sits across the seam between the front card and
 * the one peeking out behind it. Always acts on the front card.
 */
export function DeckCommandCenter({
  activeItem,
  top,
  left,
  width,
  onOpenComments,
  onExpand,
}: {
  activeItem: MediaItem
  top: number
  left: number
  width: number
  onOpenComments: () => void
  onExpand: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const shapeWidth = Math.max(0, width)
  const slant = DECK_OVERLAP
  const height = 44
  const totalHeight = slant + height
  const points = `0,0 ${shapeWidth},${slant} ${shapeWidth},${slant + height} 0,${height}`
  const bg = t.atoms.bg.backgroundColor
  const stroke = t.palette.contrast_200

  const sideZoneWidth = shapeWidth * 0.22
  const middleZoneWidth = shapeWidth - sideZoneWidth * 2
  const bandCenterY = (x: number) =>
    (slant * x) / (shapeWidth || 1) + height / 2

  return (
    <View
      style={[
        styles.deckCommandCenter,
        {height: totalHeight, top, left, width: shapeWidth},
      ]}>
      <Svg
        pointerEvents="none"
        width={shapeWidth}
        height={totalHeight}
        viewBox={`0 0 ${shapeWidth} ${totalHeight}`}>
        <Polygon
          points={points}
          fill={bg}
          stroke={bg}
          strokeLinejoin="round"
          strokeWidth="10"
        />
        <Polygon
          points={points}
          fill="none"
          stroke={stroke}
          strokeLinejoin="round"
          strokeWidth="1"
        />
        {[sideZoneWidth, sideZoneWidth + middleZoneWidth].map(x => (
          <Line
            key={x}
            x1={x}
            y1={(slant * x) / (shapeWidth || 1)}
            x2={x}
            y2={height + (slant * x) / (shapeWidth || 1)}
            stroke={stroke}
            strokeWidth="1"
          />
        ))}
      </Svg>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={l`${activeItem.comments} comments`}
        accessibilityHint={l`Opens the post thread`}
        onPress={onOpenComments}
        style={[
          styles.deckCommandCenterZone,
          {
            left: 0,
            paddingTop: bandCenterY(sideZoneWidth / 2) - 9,
            width: sideZoneWidth,
          },
        ]}>
        <CommentIcon size="sm" style={t.atoms.text} />
        <Text style={[styles.commentChipText, t.atoms.text]}>
          {activeItem.comments}
        </Text>
      </Pressable>

      <View
        style={[
          styles.deckCommandCenterZone,
          {
            left: sideZoneWidth,
            paddingTop: bandCenterY(shapeWidth / 2) - 18,
            width: middleZoneWidth,
          },
        ]}>
        <MemeVoteButton item={activeItem} style={{marginLeft: 0}} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={l`Expand card`}
        accessibilityHint={l`Opens the front card in full view`}
        onPress={onExpand}
        style={[
          styles.deckCommandCenterZone,
          {
            left: sideZoneWidth + middleZoneWidth,
            paddingTop:
              bandCenterY(sideZoneWidth + middleZoneWidth + sideZoneWidth / 2) -
              9,
            width: sideZoneWidth,
          },
        ]}>
        <ExpandIcon size="sm" style={t.atoms.text} />
      </Pressable>
    </View>
  )
}
