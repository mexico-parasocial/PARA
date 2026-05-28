import {type ReactNode} from 'react'
import {Alert, Pressable, View} from 'react-native'

import {getCommunityInsignia} from '#/lib/civic-insignias'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {CivicInsignia} from '#/components/CivicInsignia'
import {ArrowsDiagonalOut_Stroke2_Corner2_Rounded as ExpandIcon} from '#/components/icons/ArrowsDiagonal'
import {Bubble_Stroke2_Corner2_Rounded as CommentIcon} from '#/components/icons/Bubble'
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
}: {
  comments: number
  compact?: boolean
}) {
  const t = useTheme()

  return (
    <View
      style={[
        styles.commentChip,
        compact ? styles.commentChipCompact : styles.commentChipFloating,
        t.atoms.bg_contrast_25,
      ]}>
      <CommentIcon size="sm" style={t.atoms.text_contrast_medium} />
      <Text style={[styles.commentChipText, t.atoms.text]}>{comments}</Text>
    </View>
  )
}

function MetaPill({label, icon}: {label: string; icon?: ReactNode}) {
  const t = useTheme()

  return (
    <View style={[styles.metaPill, t.atoms.bg_contrast_25]}>
      {icon}
      <Text
        numberOfLines={1}
        style={[styles.metaPillText, t.atoms.text_contrast_medium]}>
        {label}
      </Text>
    </View>
  )
}

export function MediaVisualMeta({item, mode: _mode}: {item: MediaItem; mode: Mode}) {
  const meme = item
  return (
    <View style={styles.metaPillRow}>
      <MetaPill label={meme.author} />
      <MetaPill label={meme.state} />
    </View>
  )
}

export function DeckExpandButton({
  onPress,
  placement,
}: {
  onPress: () => void
  placement: 'bottom-right' | 'top-left'
}) {
  const t = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Expand card"
      accessibilityHint="Opens the card in full view"
      onPress={onPress}
      style={[
        styles.deckExpandButton,
        placement === 'bottom-right'
          ? styles.deckExpandButtonBottomRight
          : styles.deckExpandButtonTopLeft,
        t.atoms.bg_contrast_25,
        {borderColor: t.palette.contrast_200},
      ]}>
      <ExpandIcon size="sm" style={t.atoms.text} />
    </Pressable>
  )
}

export function DeckOptionsButton({onPress}: {onPress?: () => void}) {
  const t = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="More options"
      accessibilityHint="Shows actions for this card"
      onPress={onPress}
      style={styles.deckOptionsButton}>
      <View style={styles.deckOptionsDots}>
        {[0, 1, 2].map(index => (
          <View
            key={index}
            style={[
              styles.deckOptionsDot,
              {backgroundColor: t.palette.contrast_900},
            ]}
          />
        ))}
      </View>
    </Pressable>
  )
}

export function showDeckOptionsAlert() {
  Alert.alert('Options', 'Actions are coming soon')
}
