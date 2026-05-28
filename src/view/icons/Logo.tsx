import {forwardRef} from 'react'
import {type TextProps} from 'react-native'
import Svg, {
  Defs,
  LinearGradient,
  Path,
  type PathProps,
  Stop,
  type SvgProps,
} from 'react-native-svg'
import {Image} from 'expo-image'

import {useKawaiiMode} from '#/state/preferences/kawaii'
import {flatten, useTheme} from '#/alf'

const ratio = 1

type Props = {
  fill?: PathProps['fill']
  style?: TextProps['style']
} & Omit<SvgProps, 'style'>

export const Logo = forwardRef(function LogoImpl(props: Props, ref) {
  const t = useTheme()
  const {fill, ...rest} = props
  const gradient = fill === 'sky'
  const styles = flatten(props.style)
  const _fill = gradient
    ? 'url(#sky)'
    : fill || styles?.color || t.palette.primary_500
  // @ts-ignore it's fiiiiine
  const size = parseInt(rest.width || 32, 10)

  const isKawaii = useKawaiiMode()

  if (isKawaii) {
    return (
      <Image
        source={
          size > 100
            ? require('../../../assets/kawaii.png')
            : require('../../../assets/kawaii_smol.png')
        }
        accessibilityLabel="PARA"
        accessibilityHint=""
        accessibilityIgnoresInvertColors
        style={[{height: size, aspectRatio: 1.4}]}
      />
    )
  }

  return (
    <Svg
      fill="none"
      // @ts-ignore it's fiiiiine
      ref={ref}
      viewBox="0 0 24 24"
      {...rest}
      style={[{width: size, height: size * ratio}, styles]}>
      {gradient && (
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#5B2FA1" stopOpacity="1" />
            <Stop offset="1" stopColor="#474652" stopOpacity="1" />
          </LinearGradient>
        </Defs>
      )}

      <Path
        fill={_fill}
        d="M6.335 4.212c2.293 1.76 4.76 5.327 5.665 7.241.906-1.914 3.372-5.482 5.665-7.241C19.319 2.942 22 1.96 22 5.086c0 .624-.35 5.244-.556 5.994-.713 2.608-3.315 3.273-5.629 2.87 4.045.704 5.074 3.035 2.852 5.366-4.22 4.426-6.066-1.111-6.54-2.53-.086-.26-.126-.382-.127-.278 0-.104-.041.018-.128.278-.473 1.419-2.318 6.956-6.539 2.53-2.222-2.331-1.193-4.662 2.852-5.366-2.314.403-4.916-.262-5.63-2.87C2.35 10.33 2 5.71 2 5.086c0-3.126 2.68-2.144 4.335-.874Z"
      />
    </Svg>
  )
})
