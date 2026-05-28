import {Pressable, View} from 'react-native'

import {atoms as a, flatten, useTheme} from '#/alf'
import {Portal} from '#/components/Portal'
import {Text} from '#/components/Typography'
import {type CivicAutocompleteItem} from '../civic-autocomplete'

export function CivicAutocomplete({
  items,
  selectedIndex,
  position,
  onSelect,
  onHover,
}: {
  items: CivicAutocompleteItem[]
  selectedIndex: number
  position: {left: number; top: number}
  onSelect: (item: CivicAutocompleteItem) => void
  onHover: (index: number) => void
}) {
  const t = useTheme()

  if (!items.length) return null

  return (
    <Portal>
      <View
        style={flatten([
          a.fixed,
          a.z_50,
          {
            top: position.top,
            left: position.left,
            width: 320,
          },
        ])}>
        <View
          style={[
            t.atoms.border_contrast_low,
            t.atoms.bg,
            a.rounded_sm,
            a.border,
            a.p_xs,
          ]}>
          {items.map((item, index) => {
            const isSelected = selectedIndex === index
            const badgeColor =
              item.type === 'composerCommand'
                ? item.postType.color
                : item.flair.color || t.palette.primary_500
            const badgeText =
              item.type === 'composerCommand'
                ? item.value
                : item.type === 'policyFlair'
                  ? '||#'
                  : '|#'

            return (
              <Pressable
                key={item.key}
                style={[
                  isSelected && t.atoms.bg_contrast_25,
                  a.align_center,
                  a.justify_between,
                  a.flex_row,
                  a.px_md,
                  a.py_sm,
                  a.gap_md,
                  a.rounded_xs,
                  a.transition_color,
                ]}
                onPress={() => onSelect(item)}
                onPointerEnter={() => onHover(index)}
                accessibilityRole="button">
                <View
                  style={[
                    a.align_center,
                    a.justify_center,
                    a.rounded_full,
                    {
                      width: 34,
                      height: 34,
                      backgroundColor: badgeColor,
                    },
                  ]}>
                  <Text style={[a.font_bold, {color: 'white', fontSize: 11}]}>
                    {badgeText}
                  </Text>
                </View>
                <View style={[a.flex_1]}>
                  <Text style={[a.font_semi_bold]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text
                    style={[a.text_sm, t.atoms.text_contrast_medium]}
                    numberOfLines={1}>
                    {item.type === 'composerCommand'
                      ? item.description
                      : item.value}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </View>
    </Portal>
  )
}
