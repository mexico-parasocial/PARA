import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a} from '#/alf'
import {Text} from '#/components/Typography'

export const SIGNAL_COLORS: Record<number, string> = {
  [-3]: '#DC2626',
  [-2]: '#EF4444',
  [-1]: '#F87171',
  [0]: '#F59E0B',
  [1]: '#34D399',
  [2]: '#10B981',
  [3]: '#059669',
}

export const SIGNAL_LABELS: Record<number, ReturnType<typeof msg>> = {
  [-3]: msg`Strongly Oppose`,
  [-2]: msg`Oppose`,
  [-1]: msg`Lean Oppose`,
  [0]: msg`Neutral`,
  [1]: msg`Lean Support`,
  [2]: msg`Support`,
  [3]: msg`Strongly Support`,
}

const SIZE_STYLES = {
  sm: {height: 20, fontSize: 11, paddingHorizontal: 8},
  md: {height: 24, fontSize: 12, paddingHorizontal: 10},
  lg: {height: 32, fontSize: 14, paddingHorizontal: 12},
}

export function SignalBadge({
  signal,
  size = 'md',
  showLabel = false,
}: {
  signal: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}) {
  const {_} = useLingui()
  const rounded = Math.max(-3, Math.min(3, Math.round(signal)))
  const color = SIGNAL_COLORS[rounded]
  const sizeStyles = SIZE_STYLES[size]

  const label = showLabel
    ? rounded === -3
      ? _(msg`Strongly Oppose`)
      : rounded === -2
        ? _(msg`Oppose`)
        : rounded === -1
          ? _(msg`Lean Oppose`)
          : rounded === 0
            ? _(msg`Neutral`)
            : rounded === 1
              ? _(msg`Lean Support`)
              : rounded === 2
                ? _(msg`Support`)
                : _(msg`Strongly Support`)
    : `${rounded > 0 ? '+' : ''}${rounded}`

  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.justify_center,
        a.rounded_full,
        {
          height: sizeStyles.height,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          backgroundColor: color + '26', // 15% opacity in hex
        },
      ]}>
      <Text
        style={[
          a.font_semi_bold,
          {
            fontSize: sizeStyles.fontSize,
            lineHeight: sizeStyles.height,
            color,
          },
        ]}>
        {label}
      </Text>
    </View>
  )
}
