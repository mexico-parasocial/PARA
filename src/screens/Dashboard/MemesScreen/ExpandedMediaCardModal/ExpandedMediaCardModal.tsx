import {
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {useLingui} from '@lingui/react/macro'

import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {TimesLarge_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'
import {
  ActionButton,
  CommentsButton,
  MediaVisual,
  MediaVisualMeta,
  MemeVoteButton,
} from '../cardPrimitives'
import {buildMetaLabel} from '../helpers'
import {styles} from '../styles'
import {type MediaItem} from '../types'

export function ExpandedMediaCardModal({
  item,
  onClose,
  onOpenComments,
}: {
  item: MediaItem | null
  onClose: () => void
  onOpenComments: (item: MediaItem) => void
}) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(item)}
      onRequestClose={onClose}>
      {item ? (
        <ExpandedMediaCard
          item={item}
          onClose={onClose}
          onOpenComments={() => onOpenComments(item)}
        />
      ) : null}
    </Modal>
  )
}

function ExpandedMediaCard({
  item,
  onClose,
  onOpenComments,
}: {
  item: MediaItem
  onClose: () => void
  onOpenComments: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {bottom, top} = useSafeAreaInsets()
  const {height} = useWindowDimensions()
  const metaLabel = buildMetaLabel(item)

  return (
    <View
      style={[
        styles.expandedModalOverlay,
        {paddingTop: top + 12, paddingBottom: bottom + 12},
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={l`Close expanded view`}
        accessibilityHint={l`Closes the expanded card`}
        onPress={onClose}
        style={styles.expandedModalDismiss}
      />

      <View
        accessibilityViewIsModal
        style={[
          styles.expandedModalSheet,
          t.atoms.bg,
          {paddingBottom: Math.max(bottom, 16) + 12},
        ]}>
        <View style={[styles.expandedHandle, t.atoms.bg_contrast_100]} />

        <ScrollView bounces={false} style={styles.expandedScroll}>
          <MediaVisual
            fallbackColor={item.color}
            thumbUri={item.thumbUri}
            contentFit="contain"
            dimmed={false}
            style={[styles.expandedVisual, {height: height * 0.55}]}>
            {null}
          </MediaVisual>

          <View style={styles.expandedBody}>
            <Text
              emoji
              style={[styles.cardTitle, t.atoms.text, {textShadowRadius: 0}]}>
              {item.title}
            </Text>
            <MediaVisualMeta item={item} />
            {metaLabel ? (
              <Text style={[styles.cardMeta, t.atoms.text_contrast_medium]}>
                {metaLabel}
              </Text>
            ) : null}

            <View style={styles.actionsRow}>
              <MemeVoteButton item={item} />
              <CommentsButton item={item} onPress={onOpenComments} />
              <ActionButton
                icon={
                  <CloseIcon size="sm" style={t.atoms.text_contrast_medium} />
                }
                label={l`Close`}
                accessibilityLabel={l`Close expanded view`}
                accessibilityHint={l`Closes the expanded card`}
                onPress={onClose}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  )
}
