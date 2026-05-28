import Svg, {
  type PathProps,
  type SvgProps,
  Text as SvgText,
} from 'react-native-svg'

import {CINZEL_FONT_FAMILY, useCinzelFont} from '#/lib/hooks/useCinzelFont'
import {usePalette} from '#/lib/hooks/usePalette'

const ratio = 17 / 64
const WORDMARK = 'PARA'

export function Logotype({
  fill,
  variant,
  ...rest
}: {
  fill?: PathProps['fill']
  variant?: 'default' | 'strong'
} & SvgProps) {
  useCinzelFont()
  const pal = usePalette('default')
  // @ts-ignore it's fiiiiine
  const size = parseInt(rest.width || 32, 10)
  const textFill = fill || pal.text.color
  const isStrong = variant === 'strong'

  return (
    <Svg
      fill="none"
      viewBox="0 0 64 17"
      {...rest}
      width={size}
      height={Number(size) * ratio}>
      <SvgText
        fill={textFill}
        fontFamily={CINZEL_FONT_FAMILY}
        fontSize={isStrong ? 12.4 : 12}
        fontWeight={isStrong ? '700' : '600'}
        letterSpacing={isStrong ? 0.2 : 0.4}
        stroke={isStrong ? textFill : undefined}
        strokeWidth={isStrong ? 0.35 : undefined}
        strokeLinejoin="round"
        textAnchor="middle"
        x="50%"
        y={12.5}>
        {WORDMARK}
      </SvgText>
    </Svg>
  )
}
