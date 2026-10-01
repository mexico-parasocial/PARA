import {View} from 'react-native'

import {Text} from '#/view/com/util/text/Text'
import {MediaVisual, MediaVisualMeta} from '../cardPrimitives'
import {styles} from '../styles'
import {type MediaItem, type Mode} from '../types'

export function MediaDeckCard({item, mode}: {item: MediaItem; mode: Mode}) {
  return (
    <View style={styles.deckCardShell}>
      <MediaVisual
        fallbackColor={item.color}
        thumbUri={item.thumbUri}
        style={styles.deckVisual}>
        <View style={styles.deckVisualBottom}>
          <Text
            numberOfLines={4}
            style={[
              styles.deckTitle,
              item.thumbUri && styles.deckTitleOnImage,
            ]}>
            {item.title}
          </Text>
          <MediaVisualMeta item={item} mode={mode} showCategory />
        </View>
      </MediaVisual>
    </View>
  )
}
