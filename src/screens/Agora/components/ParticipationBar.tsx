import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'

export function ParticipationBar({
  current,
  target,
}: {
  current: number
  target: number
}) {
  const t = useTheme()
  const ratio = Math.min(1, Math.max(0, current / target))

  return (
    <View
      style={[
        a.w_full,
        a.rounded_full,
        a.overflow_hidden,
        t.atoms.bg_contrast_100,
        {
          height: 3,
        },
      ]}>
      <View
        style={[
          a.h_full,
          a.rounded_full,
          {
            width: `${ratio * 100}%`,
            backgroundColor: t.palette.primary_500,
          },
        ]}
      />
    </View>
  )
}
