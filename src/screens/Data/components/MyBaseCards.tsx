import {StyleSheet, TouchableOpacity} from 'react-native'

import {type CabildeoView} from '#/lib/cabildeo-client'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'

export function ActionCard({
  cabildeo,
  onPress,
}: {
  cabildeo: CabildeoView
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <TouchableOpacity accessibilityRole="button"
      style={[
        styles.actionCard,
        t.atoms.bg_contrast_25,
        {borderLeftWidth: 3, borderLeftColor: t.palette.primary_500},
      ]}
      onPress={onPress}>
      <Text style={[styles.actionCardTitle, t.atoms.text]} numberOfLines={2}>
        {cabildeo.title}
      </Text>
      <Text style={[styles.actionCardMeta, t.atoms.text_contrast_medium]}>
        Ready for your review.
      </Text>
    </TouchableOpacity>
  )
}

export function LedgerCard({
  cabildeo,
  onPress,
}: {
  cabildeo: CabildeoView
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <TouchableOpacity accessibilityRole="button"
      style={[styles.ledgerCard, t.atoms.bg_contrast_25]}
      onPress={onPress}>
      <Text style={[styles.ledgerCardTitle, t.atoms.text]} numberOfLines={1}>
        Voted on: {cabildeo.title}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  actionCard: {
    padding: 16,
    borderRadius: 12,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  actionCardMeta: {
    fontSize: 13,
  },
  ledgerCard: {
    padding: 12,
    borderRadius: 8,
  },
  ledgerCardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
})
