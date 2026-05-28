import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: string
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}) {
  const t = useTheme()

  return (
    <View
      style={[
        a.align_center,
        a.justify_center,
        a.gap_sm,
        {
          paddingVertical: 48,
        },
      ]}>
      <Text style={{fontSize: 36}}>{icon}</Text>
      <Text
        style={[
          a.font_semi_bold,
          t.atoms.text,
          {
            fontSize: 16,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          a.text_center,
          t.atoms.text_contrast_medium,
          {
            fontSize: 13,
            lineHeight: 18,
            maxWidth: 280,
          },
        ]}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <View style={[a.mt_md]}>
          <Button
            variant="solid"
            color="primary"
            size="small"
            label={actionLabel}
            onPress={onAction}>
            <ButtonText>{actionLabel}</ButtonText>
          </Button>
        </View>
      )}
    </View>
  )
}
