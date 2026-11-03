import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'

/** A bar for a progress that was written or derived. Draw nothing without one. */
export function ProgressBar({
  value,
  color,
  label,
}: {
  value: number
  color?: string
  label: string
}) {
  const t = useTheme()
  const {_} = useLingui()
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityHint={_(msg`Porcentaje de avance`)}
      accessibilityValue={{min: 0, max: 100, now: value}}
      style={[
        a.w_full,
        a.rounded_full,
        a.overflow_hidden,
        {height: 6, backgroundColor: t.palette.contrast_100},
      ]}>
      <View
        style={{
          height: 6,
          width: `${value}%`,
          backgroundColor: color ?? t.palette.primary_500,
        }}
      />
    </View>
  )
}
