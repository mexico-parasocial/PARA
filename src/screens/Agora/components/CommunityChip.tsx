import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function CommunityChip({name, color}: {name: string; color: string}) {
  const t = useTheme()

  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.gap_xs,
        a.rounded_full,
        a.border,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
        {
          paddingHorizontal: 10,
          paddingVertical: 4,
        },
      ]}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
      <Text
        style={[
          a.font_semi_bold,
          t.atoms.text,
          {
            fontSize: 12,
            lineHeight: 16,
          },
        ]}>
        {name}
      </Text>
    </View>
  )
}
