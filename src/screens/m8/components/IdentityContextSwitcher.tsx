import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {EyeSlash_Stroke2_Corner0_Rounded as EyeSlash} from '#/components/icons/EyeSlash'
import {Person_Stroke2_Corner0_Rounded as Person} from '#/components/icons/Person'
import {RaisingHand4Finger_Stroke2_Corner0_Rounded as RaisingHand} from '#/components/icons/RaisingHand'
import {Text} from '#/components/Typography'
import {type IdentityContext, type IdentityContextId} from '../types'

export function IdentityContextSwitcher({
  contexts,
  selectedId,
  onSelect,
}: {
  contexts: IdentityContext[]
  selectedId: IdentityContextId
  onSelect: (id: IdentityContextId) => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  return (
    <View style={[styles.container, a.flex_row, a.gap_xs]}>
      {contexts.map(context => {
        const isSelected = selectedId === context.id
        const Icon =
          context.id === 'public'
            ? Person
            : context.id === 'isolated'
              ? EyeSlash
              : RaisingHand
        return (
          <TouchableOpacity
            key={context.id}
            accessibilityRole="radio"
            accessibilityState={{selected: isSelected}}
            accessibilityLabel={context.label}
            accessibilityHint={`Switch to ${context.label} identity`}
            onPress={() => onSelect(context.id)}
            style={[
              styles.option,
              {
                backgroundColor: isSelected
                  ? t.palette.primary_500 + '18'
                  : t.atoms.bg_contrast_25.backgroundColor,
                borderColor: isSelected
                  ? t.palette.primary_500
                  : t.atoms.border_contrast_low.borderColor,
              },
            ]}>
            <Icon
              size="sm"
              fill={
                isSelected
                  ? t.palette.primary_500
                  : t.atoms.text_contrast_medium.color
              }
              style={{
                color: isSelected
                  ? t.palette.primary_500
                  : t.atoms.text_contrast_medium.color,
              }}
            />
            <Text
              style={[
                styles.label,
                isSelected
                  ? [t.atoms.text, {color: t.palette.primary_500}]
                  : t.atoms.text_contrast_medium,
              ]}>
              {context.label}
            </Text>
            {!context.isAvailable && (
              <Text style={[styles.badge, t.atoms.text_contrast_low]}>
                {_(msg`Soon`)}
              </Text>
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
  },
})
