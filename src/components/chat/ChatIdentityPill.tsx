import {StyleSheet, View} from 'react-native'

import {
  CHAT_IDENTITY_COPY,
  type ChatIdentityMode,
} from '#/lib/chat/identity'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function ChatIdentityPill({
  mode,
  compact = false,
  showMicrocopy = true,
}: {
  mode: ChatIdentityMode
  compact?: boolean
  showMicrocopy?: boolean
}) {
  const t = useTheme()
  const copy = CHAT_IDENTITY_COPY[mode]
  const color =
    copy.tone === 'civic'
      ? t.palette.primary_500
      : copy.tone === 'isolated'
        ? t.palette.positive_400
        : t.palette.contrast_700

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`Modo de identidad: ${copy.label}. ${copy.microcopy}`}
      accessibilityHint="Explica qué identidad se usa en este canal de conversación."
      style={[
        styles.container,
        compact ? styles.compact : styles.standard,
        {
          backgroundColor: color + '14',
          borderColor: color + '33',
        },
      ]}>
      <View style={[styles.labelRow]}>
        <Text style={[a.text_xs, a.font_semi_bold, {color}]}>Modo</Text>
        <Text style={[a.text_xs, a.font_bold, {color}]}>
          {compact ? copy.shortLabel : copy.label}
        </Text>
      </View>
      {showMicrocopy ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {copy.microcopy}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  standard: {
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  compact: {
    alignSelf: 'flex-start',
    marginHorizontal: 8,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
})
