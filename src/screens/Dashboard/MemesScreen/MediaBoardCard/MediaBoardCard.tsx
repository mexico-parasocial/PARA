import {Pressable, View} from 'react-native'
import {useLingui} from '@lingui/react/macro'

import {useShowPartyShields} from '#/state/preferences/show-party-shields'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {
  CommentsButton,
  MediaVisual,
  MediaVisualMeta,
  MemeVoteButton,
  PartyInsignia,
} from '../cardPrimitives'
import {buildMetaLabel} from '../helpers'
import {styles} from '../styles'
import {type MediaItem} from '../types'

export function MediaBoardCard({
  item,
  onExpand,
  onOpenComments,
}: {
  item: MediaItem
  onExpand: () => void
  onOpenComments: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const showPartyShields = useShowPartyShields() ?? true
  const metaLabel = buildMetaLabel(item)

  return (
    <View style={[styles.cardShell, t.atoms.bg_contrast_50]}>
      <Pressable
        accessibilityHint={l`Opens this card in a larger view`}
        accessibilityLabel={item.title}
        accessibilityRole="button"
        onPress={onExpand}
        style={({pressed}) => pressed && {opacity: 0.9}}>
        <MediaVisual
          fallbackColor={item.color}
          thumbUri={item.thumbUri}
          style={styles.cardVisual}>
          <View style={styles.cardBadgeRow}>
            <PartyInsignia party={item.party} visible={showPartyShields} />
          </View>

          <View style={styles.cardVisualBottom}>
            <Text emoji numberOfLines={4} style={styles.cardTitle}>
              {item.title}
            </Text>
            <MediaVisualMeta item={item} />
          </View>
        </MediaVisual>
      </Pressable>

      <View style={styles.cardBody}>
        {metaLabel ? (
          <Text
            numberOfLines={1}
            style={[styles.cardMeta, t.atoms.text_contrast_medium]}>
            {metaLabel}
          </Text>
        ) : null}

        <View style={styles.actionsRow}>
          <MemeVoteButton item={item} />
          <CommentsButton item={item} onPress={onOpenComments} />
        </View>
      </View>
    </View>
  )
}
