import {View} from 'react-native'

import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {MediaVisual, MediaVisualMeta} from '../cardPrimitives'
import {buildMetaLabel} from '../helpers'
import {styles} from '../styles'
import {type MediaItem} from '../types'

export function MediaDeckCard({
  item,
  height,
}: {
  item: MediaItem
  height: number
}) {
  const t = useTheme()
  const metaLabel = buildMetaLabel(item)

  return (
    <View style={[styles.deckCardShell, t.atoms.bg_contrast_50, {height}]}>
      <MediaVisual
        fallbackColor={item.color}
        thumbUri={item.thumbUri}
        style={[styles.deckVisual, {height: Math.max(100, height - 66)}]}>
        <View style={styles.deckVisualBottom}>
          <Text emoji numberOfLines={2} style={styles.deckTitle}>
            {item.title}
          </Text>
          <MediaVisualMeta item={item} />
        </View>
      </MediaVisual>

      {metaLabel ? (
        <View style={styles.deckBodyContent}>
          <Text
            numberOfLines={1}
            style={[styles.cardMeta, t.atoms.text_contrast_medium]}>
            {metaLabel}
          </Text>
        </View>
      ) : null}
    </View>
  )
}
