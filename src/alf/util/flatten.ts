import {type DimensionValue, type StyleProp, StyleSheet} from 'react-native'

export const flatten = StyleSheet.flatten

function num(v: unknown): number {
  return typeof v === 'number' ? v : 0
}

type PaddingStyle = {
  padding?: DimensionValue
  paddingHorizontal?: DimensionValue
  paddingVertical?: DimensionValue
  paddingTop?: DimensionValue
  paddingBottom?: DimensionValue
  paddingLeft?: DimensionValue
  paddingRight?: DimensionValue
}

export function extractPadding(style: StyleProp<PaddingStyle>) {
  const s = flatten<PaddingStyle>(style) ?? {}
  const base = num(s.padding)
  return {
    paddingTop: num(s.paddingTop) || num(s.paddingVertical) || base,
    paddingBottom: num(s.paddingBottom) || num(s.paddingVertical) || base,
    paddingLeft: num(s.paddingLeft) || num(s.paddingHorizontal) || base,
    paddingRight: num(s.paddingRight) || num(s.paddingHorizontal) || base,
  }
}
