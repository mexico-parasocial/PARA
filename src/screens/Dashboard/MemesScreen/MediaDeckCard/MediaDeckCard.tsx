import {View} from 'react-native'

import {useShowPartyShields} from '#/state/preferences/show-party-shields'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {
  CommentChip,
  DeckExpandButton,
  DeckOptionsButton,
  MediaVisualMeta,
  PartyInsignia,
  showDeckOptionsAlert,
} from '../cardPrimitives'
import {buildSubmetaLabel, DECK_VISUAL_HEIGHT} from '../helpers'
import {styles} from '../styles'
import {type MediaItem, type Mode} from '../types'

export function MediaDeckCard({
  item,
  mode,
  onExpand,
  expandPlacement,
  showOptions,
  showExpand,
}: {
  item: MediaItem
  mode: Mode
  onExpand?: () => void
  expandPlacement?: 'bottom-right' | 'top-left'
  showOptions?: boolean
  showExpand?: boolean
}) {
  const t = useTheme()
  const isTopLeftExpand = expandPlacement === 'top-left'
  const showPartyShields = useShowPartyShields() ?? true

  return (
    <View style={styles.deckCardShell}>
      {showOptions ? (
        <View style={styles.deckOptionsPlacement}>
          <DeckOptionsButton onPress={showDeckOptionsAlert} />
        </View>
      ) : null}

      <View
        style={[
          styles.deckVisual,
          isTopLeftExpand && styles.deckVisualInsetTopLeft,
          showOptions && styles.deckVisualInsetTopRight,
          {
            backgroundColor: item.color,
            minHeight: DECK_VISUAL_HEIGHT,
          },
        ]}>
        <View style={styles.cardBadgeRow}>
          <PartyInsignia party={item.party} visible={showPartyShields} />
        </View>

        <View style={styles.deckVisualBottom}>
          <Text style={styles.deckTitle}>{item.title}</Text>
          <MediaVisualMeta item={item} mode={mode} />
        </View>
      </View>

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
          <CommentChip comments={item.comments} compact />
        </View>
        <View style={styles.deckBodyGlassTail} />
      </View>

      {(showExpand ?? true) && onExpand && expandPlacement ? (
        <View
          style={[
            styles.deckExpandPlacement,
            expandPlacement === 'bottom-right'
              ? styles.deckExpandPlacementBottomRight
              : styles.deckExpandPlacementTopLeft,
          ]}>
          <View
            style={[
              styles.deckExpandSubpixelBleedBlocker,
              t.atoms.bg,
              expandPlacement === 'bottom-right'
                ? {bottom: 0, right: 0}
                : {left: 0, top: 0},
            ]}
          />
          <View
            style={[
              styles.deckExpandInnerBody,
              t.atoms.bg,
              expandPlacement === 'bottom-right'
                ? {borderTopLeftRadius: 36}
                : {borderBottomRightRadius: 36},
            ]}>
            <DeckExpandButton onPress={onExpand} placement={expandPlacement} />
          </View>
        </View>
      ) : null}
    </View>
  )
}
