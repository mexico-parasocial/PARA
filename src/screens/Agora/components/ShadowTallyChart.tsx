import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {SignalBar} from './SignalBar'

export function ShadowTallyChart({
  flat,
  sqrtN,
  correlation,
}: {
  flat: number
  sqrtN: number
  correlation: number
}) {
  const {_} = useLingui()

  return (
    <View style={[a.gap_md]}>
      <TallyRow label={_(msg`Flat`)} value={flat} />
      <TallyRow label={_(msg`√n Weighted`)} value={sqrtN} />
      <TallyRow label={_(msg`Correlation Adj.`)} value={correlation} />
    </View>
  )
}

function TallyRow({label, value}: {label: string; value: number}) {
  const t = useTheme()

  return (
    <View style={[a.flex_row, a.align_center, a.gap_sm]}>
      <Text
        style={[
          a.font_medium,
          t.atoms.text_contrast_medium,
          {
            fontSize: 12,
            width: 100,
          },
        ]}>
        {label}
      </Text>
      <View style={[a.flex_1]}>
        <SignalBar value={value} height={6} />
      </View>
      <Text
        style={[
          a.font_semi_bold,
          t.atoms.text,
          {
            fontSize: 12,
            width: 40,
            textAlign: 'right',
          },
        ]}>
        {value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}
      </Text>
    </View>
  )
}
