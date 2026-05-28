import {type ReactNode} from 'react'
import {type StyleProp, type ViewStyle} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'

import {gradients} from '#/alf/tokens'

export function LinearGradientBackground({
  style,
  gradient = 'sky',
  colors: customColors,
  children,
  start,
  end,
}: {
  style?: StyleProp<ViewStyle>
  gradient?: keyof typeof gradients
  colors?: [string, string, ...string[]]
  children?: ReactNode
  start?: [number, number]
  end?: [number, number]
}) {
  const colors =
    customColors ??
    (gradients[gradient].values.map(([_, color]) => {
      return color
    }) as [string, string, ...string[]])

  if (colors.length < 2) {
    throw new Error('Gradient must have at least 2 colors')
  }

  return (
    <LinearGradient colors={colors} style={style} start={start} end={end}>
      {children}
    </LinearGradient>
  )
}
