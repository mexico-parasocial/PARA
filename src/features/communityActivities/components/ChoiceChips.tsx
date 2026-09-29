import {View} from 'react-native'

import {atoms as a} from '#/alf'
import {Button, ButtonText} from '#/components/Button'

export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{value: T; label: string}>
  value: T
  onChange: (value: T) => void
  /** Accessibility label for the group, e.g. "Activity type". */
  label: string
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      accessibilityHint=""
      style={[a.flex_row, a.flex_wrap, a.gap_xs]}>
      {options.map(option => {
        const selected = option.value === value
        return (
          <Button
            key={option.value}
            label={option.label}
            accessibilityRole="radio"
            accessibilityState={{checked: selected}}
            size="small"
            color={selected ? 'primary' : 'secondary'}
            onPress={() => onChange(option.value)}>
            <ButtonText>{option.label}</ButtonText>
          </Button>
        )
      })}
    </View>
  )
}
