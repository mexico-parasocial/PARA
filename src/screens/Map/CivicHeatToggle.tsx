import {TouchableOpacity} from 'react-native'

import {atoms as a, useTheme, web} from '#/alf'
import {Flame_Stroke2_Corner1_Rounded as FlameIcon} from '#/components/icons/Flame'

/**
 * Icon button for the civic activity heat. It is an overlay, not a map
 * view: it stays on while the user moves between States, Districts and Cities.
 * Selected = filled tint, unselected = neutral.
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
      accessibilityHint={
        pointCount === 0
          ? 'No located cabildeos yet'
          : `Activity density, ${pointCount} located`
      }
      accessibilityState={{checked: on}}
      onPress={onToggle}
      hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
      style={[
        a.align_center,
        a.justify_center,
        a.rounded_full,
        a.border,
        {width: 32, height: 32},
        on
          ? {
              borderColor: t.palette.primary_500,
              backgroundColor: t.palette.primary_500,
            }
          : [t.atoms.bg_contrast_25, t.atoms.border_contrast_low],
        web({cursor: 'pointer'}),
      ]}>
      <FlameIcon
        width={18}
        height={18}
        fill={on ? '#ffffff' : t.atoms.text_contrast_medium.color}
      />
    </TouchableOpacity>
  )
}
