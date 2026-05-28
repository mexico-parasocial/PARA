import {useWindowDimensions} from 'react-native'

import {useAlf} from '#/alf'
import {type Props, sizes} from '#/components/icons/common'
import {VerifiedCheck} from '#/components/icons/VerifiedCheck'
import {VerifierCheck} from '#/components/icons/VerifierCheck'

export function VerificationCheck({
  verifier,
  size,
  width,
  ...rest
}: Props & {
  verifier?: boolean
}) {
  const {fontScale: nativeScaleMultiplier} = useWindowDimensions()
  const {
    fonts: {scaleMultiplier: alfScaleMultiplier},
  } = useAlf()
  const baseWidth =
    typeof width === 'number' ? width : size ? sizes[size] : undefined
  const scaledWidth =
    baseWidth !== undefined
      ? baseWidth * nativeScaleMultiplier * alfScaleMultiplier
      : undefined
  const props =
    scaledWidth !== undefined
      ? {...rest, width: scaledWidth}
      : {...rest, size, width}

  return verifier ? <VerifierCheck {...props} /> : <VerifiedCheck {...props} />
}
