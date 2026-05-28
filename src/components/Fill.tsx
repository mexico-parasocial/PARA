import {type ReactNode} from 'react'
import {View} from 'react-native'

import {atoms as a, type ViewStyleProp} from '#/alf'

export function Fill({
  children,
  style,
}: {children?: ReactNode} & ViewStyleProp) {
  return <View style={[a.absolute, a.inset_0, style]}>{children}</View>
}
