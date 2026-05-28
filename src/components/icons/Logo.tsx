import Svg, {Path, Text as SvgText} from 'react-native-svg'

import {CINZEL_FONT_FAMILY, useCinzelFont} from '#/lib/hooks/useCinzelFont'
import {type Props, useCommonSVGProps} from './common'
import {createSinglePathSVG} from './TEMPLATE'

export const Mark = createSinglePathSVG({
  path: 'M6.335 4.212c2.293 1.76 4.76 5.327 5.665 7.241.906-1.914 3.372-5.482 5.665-7.241C19.319 2.942 22 1.96 22 5.086c0 .624-.35 5.244-.556 5.994-.713 2.608-3.315 3.273-5.629 2.87 4.045.704 5.074 3.035 2.852 5.366-4.22 4.426-6.066-1.111-6.54-2.53-.086-.26-.126-.382-.127-.278 0-.104-.041.018-.128.278-.473 1.419-2.318 6.956-6.539 2.53-2.222-2.331-1.193-4.662 2.852-5.366-2.314.403-4.916-.262-5.63-2.87C2.35 10.33 2 5.71 2 5.086c0-3.126 2.68-2.144 4.335-.874Z',
})

const WORDMARK = 'PARA'

export function Full(
  props: Omit<Props, 'fill' | 'size' | 'height'> & {
    markFill?: Props['fill']
    textFill?: Props['fill']
  },
) {
  useCinzelFont()
  const {fill, size, style, gradient, ...rest} = useCommonSVGProps(props)
  const ratio = 123 / 555

  return (
    <Svg
      fill="none"
      {...rest}
      viewBox="0 0 555 123"
      width={size}
      height={size * ratio}
      style={[style]}>
      {gradient}
      <Path
        fill={props.markFill ?? fill}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M101.821 7.673C112.575-.367 130-6.589 130 13.21c0 3.953-2.276 33.214-3.611 37.965-4.641 16.516-21.549 20.729-36.591 18.179 26.292 4.457 32.979 19.218 18.535 33.98-27.433 28.035-39.428-7.034-42.502-16.02-.563-1.647-.827-2.418-.831-1.763-.004-.655-.268.116-.831 1.763-3.074 8.986-15.07 44.055-42.502 16.02C7.223 88.571 13.91 73.81 40.202 69.353c-15.041 2.55-31.95-1.663-36.59-18.179C2.275 46.424 0 17.162 0 13.21 0-6.59 17.426-.368 28.18 7.673 43.084 18.817 59.114 41.413 65 53.54c5.886-12.125 21.917-34.722 36.821-45.866Z"
      />
      <SvgText
        fill={props.textFill ?? fill}
        fontFamily={CINZEL_FONT_FAMILY}
        fontSize={72}
        letterSpacing={2}
        textAnchor="middle"
        x={338}
        y={85}>
        {WORDMARK}
      </SvgText>
    </Svg>
  )
}
