import {View, type ViewStyle} from 'react-native'

import {atoms as a} from '#/alf'
import {Text} from '#/components/Typography'

export type InsigniaVariant = 'shield' | 'banner'

export type CivicInsigniaProps = {
  /** The civic entity's abbreviated name (e.g. "MC", "PAN", "Morena") */
  abbreviation?: string
  /** Primary brand color(s). For shield: uses first color as background.
   *  For banner: distributes colors as vertical stripes. */
  colors: string[]
  /** Visual style — shield (heraldic badge) or banner (striped estandarte) */
  variant: InsigniaVariant
  /** Size preset — only applies to shield variant */
  size?: 'sm' | 'md'
  /** Height in px — only applies to banner variant */
  height?: number
  style?: ViewStyle
}

const SHIELD_SIZE_MAP = {
  sm: {height: 18, fontSize: 10, padH: 4, padV: 1},
  md: {height: 22, fontSize: 12, padH: 6, padV: 2},
} as const

/**
 * Unified civic insignia — used for both political parties (shield)
 * and communities/organizations (banner estandarte).
 *
 * Both are the same thing: a visual identity mark for a civic entity.
 * The only difference is rendering style.
 */
export function CivicInsignia({
  abbreviation,
  colors,
  variant,
  size = 'sm',
  height = 6,
  style,
}: CivicInsigniaProps) {
  if (variant === 'shield') {
    const s = SHIELD_SIZE_MAP[size]
    const safeColors = colors.slice(0, 3)
    if (safeColors.length === 0) {
      safeColors.push('#888888')
    }

    return (
      <View
        style={[
          a.flex_row,
          a.align_center,
          a.justify_center,
          {
            height: s.height,
            paddingHorizontal: s.padH,
            paddingVertical: s.padV,
            backgroundColor: safeColors[0],
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            borderBottomLeftRadius: 10,
            borderBottomRightRadius: 10,
            overflow: 'hidden',
          },
          style,
        ]}>
        {safeColors.length > 1 ? (
          <View
            style={[
              a.flex_row,
              {
                bottom: 0,
                left: 0,
                position: 'absolute',
                right: 0,
                top: 0,
              },
            ]}>
            {safeColors.map((color, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  backgroundColor: color,
                }}
              />
            ))}
          </View>
        ) : null}
        {abbreviation ? (
          <Text
            style={[
              a.font_bold,
              {
                fontSize: s.fontSize,
                color: '#FFFFFF',
                lineHeight: s.fontSize * 1.2,
                textShadowColor: 'rgba(0,0,0,0.3)',
                textShadowOffset: {width: 0, height: 0.5},
                textShadowRadius: 1,
                zIndex: 1,
              },
            ]}>
            {abbreviation}
          </Text>
        ) : null}
      </View>
    )
  }

  // banner variant (estandarte)
  const safeColors = colors.slice(0, 3)
  if (safeColors.length === 0) {
    safeColors.push('#CCCCCC')
  }

  return (
    <View
      style={[
        a.flex_row,
        a.overflow_hidden,
        {
          height,
          borderRadius: height / 2,
        },
        style,
      ]}>
      {safeColors.map((color, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: color,
            marginLeft: i > 0 ? 1 : 0,
          }}
        />
      ))}
    </View>
  )
}
