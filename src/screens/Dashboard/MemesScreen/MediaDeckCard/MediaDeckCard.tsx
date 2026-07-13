import {View} from 'react-native'

import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {MediaVisual, MediaVisualMeta} from '../cardPrimitives'
import {buildSubmetaLabel, DECK_VISUAL_HEIGHT} from '../helpers'
import {styles} from '../styles'
import {type MediaItem, type Mode} from '../types'

export function MediaDeckCard({item, mode}: {item: MediaItem; mode: Mode}) {
  const t = useTheme()

  return (
    <View style={styles.deckCardShell}>
      <MediaVisual
        fallbackColor={item.color}
        thumbUri={item.thumbUri}
        style={[styles.deckVisual, {minHeight: DECK_VISUAL_HEIGHT}]}>
        <View style={styles.deckVisualBottom}>
          <Text style={[styles.deckTitle, item.thumbUri && styles.deckTitleOnImage]}>
            {item.title}
          </Text>
          <MediaVisualMeta item={item} mode={mode} />
        </View>
      </MediaVisual>

      <View style={styles.deckBody}>
        <View style={[styles.deckBodyContent, t.atoms.bg_contrast_50]}>
          <Text style={[styles.cardMeta, t.atoms.text_contrast_medium]}>
            {item.party} · {item.state}
          </Text>
          <View style={styles.deckInfoRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.cardSubmeta,
                styles.deckSubmeta,
                t.atoms.text_contrast_medium,
              ]}>
              {buildSubmetaLabel(item, mode)}
            </Text>
          </View>
        </View>
        <View style={styles.deckBodyGlassTail} />
      </View>
    </View>
  )
}
