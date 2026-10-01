import {Pressable, View} from 'react-native'

import {useShowPartyShields} from '#/state/preferences/show-party-shields'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {Bubble_Stroke2_Corner2_Rounded as CommentIcon} from '#/components/icons/Bubble'
import {
  ActionButton,
  MediaVisual,
  MediaVisualMeta,
  MemeVoteButton,
  PartyInsignia,
} from '../cardPrimitives'
import {buildMetaLabel, buildSubmetaLabel} from '../helpers'
import {styles} from '../styles'
import {type MediaItem, type Mode} from '../types'

export function MediaBoardCard({
  item,
  mode,
  onExpand,
  width,
}: {
  item: MediaItem
  mode: Mode
  onExpand: () => void
  width?: number
}) {
  const t = useTheme()
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
        onPress={onExpand}>
        <MediaVisual
          fallbackColor={item.color}
          thumbUri={item.thumbUri}
          style={[styles.cardVisual, {minHeight: 196}]}>
          <View style={styles.cardBadgeRow}>
            <PartyInsignia party={item.party} visible={showPartyShields} />
          </View>

          <View style={styles.cardVisualBottom}>
            <Text
              style={[
                styles.cardTitle,
                item.thumbUri && styles.cardTitleOnImage,
              ]}>
              {item.title}
            </Text>
            <MediaVisualMeta item={item} mode={mode} />
          </View>
        </MediaVisual>
      </Pressable>

      <View style={[styles.cardBody, t.atoms.bg_contrast_50]}>
        {buildMetaLabel(item) ? (
          <Text style={[styles.cardMeta, t.atoms.text_contrast_medium]}>
            {buildMetaLabel(item)}
          </Text>
        ) : null}
        <Text style={[styles.cardSubmeta, t.atoms.text_contrast_medium]}>
          {buildSubmetaLabel(item, mode)}
        </Text>

        <View style={styles.actionsRow}>
          <MemeVoteButton item={item} />

          <ActionButton
            icon={
              <CommentIcon size="sm" style={t.atoms.text_contrast_medium} />
            }
            label={String(item.comments)}
            onPress={onExpand}
          />
        </View>
      </View>
    </View>
  )
}
