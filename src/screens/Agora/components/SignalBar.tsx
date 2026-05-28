import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {SIGNAL_COLORS} from './SignalBadge'

export function SignalBar({
  value,
  width,
  height = 4,
}: {
  value: number
  width?: number
  height?: number
}) {
  const t = useTheme()
  const rounded = Math.max(-3, Math.min(3, Math.round(value)))
  const color = SIGNAL_COLORS[rounded]
  const ratio = Math.min(1, Math.abs(value) / 3)

  return (
    <View
      style={[
        a.relative,
        a.rounded_full,
        a.overflow_hidden,
        t.atoms.bg_contrast_100,
        {
          width: width ?? '100%',
          height,
        },
      ]}>
      {/* Center line */}
      <View
        style={[
          a.absolute,
          {
            left: '50%',
            width: 1,
            height: '100%',
            backgroundColor: t.atoms.border_contrast_low.borderColor,
            marginLeft: -0.5,
          },
        ]}
      />
      {/* Fill */}
      <View
        style={[
          a.absolute,
          a.rounded_full,
          {
            top: 0,
            bottom: 0,
            ...(value < 0
              ? {right: '50%', width: `${ratio * 50}%`}
              : {left: '50%', width: `${ratio * 50}%`}),
            backgroundColor: color,
          },
        ]}
      />
    </View>
  )
}
