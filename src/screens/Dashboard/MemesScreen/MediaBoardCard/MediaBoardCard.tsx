import {Pressable, View} from 'react-native'

import {useShowPartyShields} from '#/state/preferences/show-party-shields'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {Bubble_Stroke2_Corner2_Rounded as CommentIcon} from '#/components/icons/Bubble'
import {RedditVoteButton} from '#/components/PostControls/VoteButton'
import {ActionButton, MediaVisualMeta, PartyInsignia} from '../cardPrimitives'
import {buildSubmetaLabel} from '../helpers'
import {styles} from '../styles'
import {type MediaItem, type Mode} from '../types'

export function MediaBoardCard({
  item,
  mode,
  vote,
  onVoteChange,
  onExpand,
  width,
}: {
  item: MediaItem
  mode: Mode
  vote: 1 | -1 | 0
  onVoteChange: (vote: 1 | -1 | 0) => void
  onExpand: () => void
  width?: number
}) {
  const t = useTheme()
  const score = item.votes + vote
  const voteState = vote === 1 ? 'upvote' : vote === -1 ? 'downvote' : 'none'
  const showPartyShields = useShowPartyShields() ?? true

  return (
    <View
      style={[
        styles.cardShell,
        t.atoms.bg_contrast_50,
        width ? {width} : null,
      ]}>
      <Pressable
        accessibilityHint="Opens this card in a larger view"
        accessibilityLabel={item.title}
        accessibilityRole="button"
        onPress={onExpand}
        style={[
          styles.cardVisual,
          {backgroundColor: item.color, minHeight: 196},
        ]}>
        <View style={styles.cardBadgeRow}>
          <PartyInsignia party={item.party} visible={showPartyShields} />
        </View>

        <View style={styles.cardVisualBottom}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <MediaVisualMeta item={item} mode={mode} />
        </View>
      </Pressable>

      <View style={[styles.cardBody, t.atoms.bg_contrast_50]}>
        <Text style={[styles.cardMeta, t.atoms.text_contrast_medium]}>
          {item.party} · {item.state}
        </Text>
        <Text style={[styles.cardSubmeta, t.atoms.text_contrast_medium]}>
          {buildSubmetaLabel(item, mode)}
        </Text>

        <View style={styles.actionsRow}>
          <RedditVoteButton
            score={score}
            currentVote={voteState}
            hasBeenToggled={vote !== 0}
            onUpvote={() => onVoteChange(vote === 1 ? 0 : 1)}
            onDownvote={() => onVoteChange(vote === -1 ? 0 : -1)}
          />

          <ActionButton
            icon={
              <CommentIcon size="sm" style={t.atoms.text_contrast_medium} />
            }
            label={String(item.comments)}
            onPress={() => {}}
          />
        </View>
      </View>
    </View>
  )
}
