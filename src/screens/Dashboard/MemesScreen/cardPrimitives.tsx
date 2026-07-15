import {type ReactNode} from 'react'
import {Pressable, StyleSheet, useWindowDimensions, View} from 'react-native'
import {Line, Polygon, Svg} from 'react-native-svg'
import {Image} from 'expo-image'

import {getCommunityInsignia} from '#/lib/civic-insignias'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {CivicInsignia} from '#/components/CivicInsignia'
import {ArrowsDiagonalOut_Stroke2_Corner2_Rounded as ExpandIcon} from '#/components/icons/ArrowsDiagonal'
import {Bubble_Stroke2_Corner2_Rounded as CommentIcon} from '#/components/icons/Bubble'
import {RedditVoteButton} from '#/components/PostControls/VoteButton'
import {DECK_OVERLAP} from './helpers'
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
}: {
  item: MediaItem
  mode: Mode
}) {
  const meme = item
  const onImage = !!meme.thumbUri
  return (
    <View style={styles.metaPillRow}>
      <MetaPill label={meme.author} onImage={onImage} />
      <MetaPill label={meme.state} onImage={onImage} />
    </View>
  )
}

export function DeckCommandCenter({
  activeItem,
  activeVote = 0,
  onVoteChange,
  onExpandActive,
  onExpandTop,
  onExpandBottom,
}: {
  activeItem: MediaItem
  activeVote?: 1 | -1 | 0
  onVoteChange: (vote: 1 | -1 | 0) => void
  onExpandActive?: () => void
  onExpandTop: () => void
  onExpandBottom?: () => void
}) {
  const t = useTheme()
  const {width: screenWidth} = useWindowDimensions()
  const shapeWidth = Math.max(0, screenWidth - 104)
  const slant = DECK_OVERLAP
  const height = 44
  const totalHeight = slant + height
  const points = `0,0 ${shapeWidth},${slant} ${shapeWidth},${slant + height} 0,${height}`
  const bg = t.atoms.bg.backgroundColor
  const stroke = t.palette.contrast_200

  const score = activeItem.votes + activeVote
  const voteState =
    activeVote === 1 ? 'upvote' : activeVote === -1 ? 'downvote' : 'none'

  const zoneWidth = shapeWidth / 3
  const bandCenterY = (x: number) => (slant * x) / shapeWidth + height / 2

  return (
    <View style={[styles.deckCommandCenter, {height: totalHeight}]}>
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
        <Line
          x1={zoneWidth}
          y1={(slant * zoneWidth) / shapeWidth}
          x2={zoneWidth}
          y2={height + (slant * zoneWidth) / shapeWidth}
          stroke={stroke}
          strokeWidth="1"
        />
        <Line
          x1={2 * zoneWidth}
          y1={(2 * slant * zoneWidth) / shapeWidth}
          x2={2 * zoneWidth}
          y2={height + (2 * slant * zoneWidth) / shapeWidth}
          stroke={stroke}
          strokeWidth="1"
        />
      </Svg>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Expand next card"
        accessibilityHint="Opens the card behind in full view"
        onPress={onExpandBottom ?? (() => {})}
        style={[
          styles.deckCommandCenterZone,
          {
            left: 0,
            paddingTop: bandCenterY(zoneWidth / 2) - 9,
            width: zoneWidth,
          },
        ]}>
        <ExpandIcon size="sm" style={t.atoms.text} />
      </Pressable>

      <View
        style={[
          styles.deckCommandCenterZone,
          {
            left: zoneWidth,
            paddingTop: bandCenterY(zoneWidth * 1.5) - 18,
            width: zoneWidth,
          },
        ]}>
        <RedditVoteButton
          currentVote={voteState}
          hasBeenToggled={activeVote !== 0}
          onDownvote={() => onVoteChange(activeVote === -1 ? 0 : -1)}
          onUpvote={() => onVoteChange(activeVote === 1 ? 0 : 1)}
          score={score}
          style={{marginLeft: 0}}
        />
        <CommentChip
          comments={activeItem.comments}
          compact
          onPress={onExpandActive}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Expand current card"
        accessibilityHint="Opens the front card in full view"
        onPress={onExpandTop}
        style={[
          styles.deckCommandCenterZone,
          {
            left: 2 * zoneWidth,
            paddingTop: bandCenterY(zoneWidth * 2.5) - 9,
            width: zoneWidth,
          },
        ]}>
        <ExpandIcon size="sm" style={t.atoms.text} />
      </Pressable>
    </View>
  )
}
