import {type ReactNode, useState} from 'react'
import {Pressable, StyleSheet, View} from 'react-native'
import {Image} from 'expo-image'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {getCommunityInsignia} from '#/lib/civic-insignias'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {CivicInsignia} from '#/components/CivicInsignia'
import {ArrowsDiagonalOut_Stroke2_Corner2_Rounded as ExpandIcon} from '#/components/icons/ArrowsDiagonal'
import {Bubble_Stroke2_Corner2_Rounded as CommentIcon} from '#/components/icons/Bubble'
import {ReactionVoteButton} from '#/components/PostControls/ReactionVoteButton'
import {RedditVoteButton} from '#/components/PostControls/VoteButton'
import {styles} from './styles'
import {type MediaItem, type Mode} from './types'

export function PartyInsignia({
  party,
  visible,
}: {
  party: string
  visible: boolean
}) {
  if (!visible) return null

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
  children,
  style,
}: {
  thumbUri?: string
  fallbackColor: string
  children: ReactNode
  style?: any
}) {
  return (
    <View style={[styles.mediaVisual, style, {backgroundColor: fallbackColor}]}>
      {thumbUri ? (
        <>
          <Image
            source={{uri: thumbUri}}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.mediaVisualOverlay} />
        </>
      ) : null}
      {children}
    </View>
  )
}

export function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: ReactNode
  label: string
  onPress?: () => void
}) {
  const t = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.actionButton, t.atoms.bg_contrast_25]}>
      {icon}
      <Text style={[styles.actionButtonText, t.atoms.text]}>{label}</Text>
    </Pressable>
  )
}

export function CommentChip({
  comments,
  compact,
  onPress,
}: {
  comments: number
  compact?: boolean
  onPress?: () => void
}) {
  const t = useTheme()

  const content = (
    <>
      <CommentIcon size="sm" style={t.atoms.text_contrast_medium} />
      <Text style={[styles.commentChipText, t.atoms.text]}>{comments}</Text>
    </>
  )

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${comments} comments`}
        accessibilityHint="Opens this card to view comments"
        onPress={onPress}
        style={[
          styles.commentChip,
          compact ? styles.commentChipCompact : styles.commentChipFloating,
          t.atoms.bg_contrast_25,
        ]}>
        {content}
      </Pressable>
    )
  }

  return (
    <View
      style={[
        styles.commentChip,
        compact ? styles.commentChipCompact : styles.commentChipFloating,
        t.atoms.bg_contrast_25,
      ]}>
      {content}
    </View>
  )
}

function MetaPill({
  label,
  icon,
  onImage,
}: {
  label: string
  icon?: ReactNode
  onImage?: boolean
}) {
  const t = useTheme()

  return (
    <View
      style={[
        styles.metaPill,
        onImage ? styles.metaPillOnImage : t.atoms.bg_contrast_25,
      ]}>
      {icon}
      <Text
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

export function MediaVisualMeta({
  item,
  mode: _mode,
  showCategory,
}: {
  item: MediaItem
  mode: Mode
  showCategory?: boolean
}) {
  const meme = item
  const onImage = !!meme.thumbUri
  return (
    <View style={styles.metaPillRow}>
      {[
        meme.author,
        showCategory ? meme.category : undefined,
        meme.community,
        meme.state,
      ]
        .filter((label): label is string => Boolean(label))
        .map(label => (
          <MetaPill key={label} label={label} onImage={onImage} />
        ))}
    </View>
  )
}

/**
 * The control band shared by the two visible deck cards. It fills the overlap
 * between the current card (upper left) and the next card (lower right): the
 * quarter disc on the left sits on the next card's top-left corner and expands
 * it, the one on the right sits on the current card's bottom-right corner and
 * expands that one. Votes in the middle apply to whichever card is active.
 */
export function DeckCommandCenter({
  inset,
  activeItem,
  activeSide,
  onOpenComments,
  onPressCurrent,
  onPressNext,
}: {
  /** Distance from each stage edge: the gutter plus the current stagger. */
  inset: number
  activeItem: MediaItem
  activeSide: 'current' | 'next'
  onOpenComments: () => void
  onPressCurrent: () => void
  onPressNext?: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  const corner = (side: 'current' | 'next', onPress?: () => void) => {
    if (!onPress) return null
    const isActive = activeSide === side
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          side === 'current'
            ? _(msg`Expand upper card`)
            : _(msg`Expand lower card`)
        }
        accessibilityHint={_(msg`Opens this card in a larger view`)}
        onPress={onPress}
        style={[
          styles.deckBandCorner,
          side === 'next'
            ? styles.deckBandCornerStart
            : styles.deckBandCornerEnd,
          isActive
            ? {backgroundColor: t.palette.contrast_900}
            : t.atoms.bg_contrast_50,
        ]}>
        <ExpandIcon
          size="md"
          style={{
            color: isActive ? t.palette.contrast_0 : t.palette.contrast_700,
          }}
        />
      </Pressable>
    )
  }

  return (
    <View
      style={[
        styles.deckBand,
        {left: inset, right: inset},
        t.atoms.bg,
        {borderColor: t.palette.contrast_100},
      ]}>
      <View pointerEvents="box-none" style={styles.deckBandCenter}>
        <MemeVoteButton key={activeItem.id} big item={activeItem} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={_(msg`${activeItem.comments} comments`)}
          accessibilityHint={_(msg`Opens the comments for this meme`)}
          hitSlop={8}
          onPress={onOpenComments}
          style={styles.deckBandComments}>
          <CommentIcon size="md" style={t.atoms.text_contrast_medium} />
          <Text
            style={[styles.deckBandCommentsText, t.atoms.text_contrast_medium]}>
            {activeItem.comments}
          </Text>
        </Pressable>
      </View>
      {corner('next', onPressNext)}
      {corner('current', onPressCurrent)}
    </View>
  )
}

/**
 * Up/down votes for a meme, stored as public reactions (see
 * para-meme-reactions.ts). The score comes from the AppView; the viewer's
 * change shows immediately and is reconciled when the feed refetches.
 */
export function MemeVoteButton({item, big}: {item: MediaItem; big?: boolean}) {
  if (!item.post) return <LocalMemeVoteButton big={big} item={item} />
  return (
    <ReactionVoteButton
      big={big}
      hasLegacyLike={Boolean(item.post.viewer?.like)}
      serverScore={item.votes}
      subject={item.post.uri}
    />
  )
}

/** Items without a post (mock data) keep their vote in local state only. */
function LocalMemeVoteButton({item, big}: {item: MediaItem; big?: boolean}) {
  const [vote, setVote] = useState<1 | -1 | 0>(0)
  return (
    <RedditVoteButton
      big={big}
      currentVote={vote === 1 ? 'upvote' : vote === -1 ? 'downvote' : 'none'}
      hasBeenToggled={vote !== 0}
      onDownvote={() => setVote(v => (v === -1 ? 0 : -1))}
      onUpvote={() => setVote(v => (v === 1 ? 0 : 1))}
      score={item.votes + vote}
    />
  )
}
