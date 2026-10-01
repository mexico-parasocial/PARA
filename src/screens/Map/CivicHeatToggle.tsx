import {TouchableOpacity, View} from 'react-native'

import {atoms as a, useTheme, web} from '#/alf'
import {Text} from '#/components/Typography'

/**
 * On/off switch for the civic activity heat. It is an overlay, not a map
 * view: it stays on while the user moves between States, Districts and Cities.
 */
export function CivicHeatToggle({
  on,
  onToggle,
  pointCount,
}: {
  on: boolean
  onToggle: () => void
  /** Cabildeos that have a location and can contribute heat. */
  pointCount: number
}) {
  const t = useTheme()

  return (
    <TouchableOpacity
      accessibilityRole="switch"
      accessibilityLabel="Civic activity heat"
      accessibilityHint=""
      accessibilityState={{checked: on}}
      onPress={onToggle}
      style={[
        a.flex_row,
        a.align_center,
        a.gap_sm,
        a.px_md,
        a.py_sm,
        a.rounded_lg,
        a.border,
        {minHeight: 58},
        on
          ? {
              borderColor: t.palette.primary_500,
              backgroundColor: t.palette.primary_500 + '14',
            }
          : [t.atoms.bg_contrast_25, t.atoms.border_contrast_low],
        web({cursor: 'pointer'}),
      ]}>
      <View style={[a.flex_1, {minWidth: 0}]}>
        <Text
          style={[
            a.text_md,
            on ? [a.font_bold, t.atoms.text] : t.atoms.text_contrast_high,
          ]}>
          Civic heat
        </Text>
        <Text
          style={[a.text_xs, t.atoms.text_contrast_medium]}
          numberOfLines={1}>
          {pointCount === 0
            ? 'No located cabildeos yet'
            : `Activity density · ${pointCount} located`}
        </Text>
      </View>
      <View
        style={[
          a.rounded_full,
          a.justify_center,
          {
            width: 40,
            height: 24,
            padding: 2,
            backgroundColor: on
              ? t.palette.primary_500
              : t.palette.contrast_200,
          },
        ]}>
        <View
          style={[
            a.rounded_full,
            {
              width: 20,
              height: 20,
              backgroundColor: '#ffffff',
              alignSelf: on ? 'flex-end' : 'flex-start',
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  )
}
