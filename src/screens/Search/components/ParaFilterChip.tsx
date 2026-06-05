import {Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export type ParaFilterChipProps = {
  label: string
  activeCount?: number
  onPress: () => void
  onClear?: () => void
  testID?: string
  accessibilityHint?: string
}

export function ParaFilterChip({
  label,
  activeCount,
  onPress,
  onClear,
  testID,
  accessibilityHint,
}: ParaFilterChipProps) {
  const t = useTheme()
  const {_} = useLingui()
  const isActive = (activeCount ?? 0) > 0

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      hitSlop={8}
      style={({pressed}) => [
        a.flex_row,
        a.align_center,
        a.gap_xs,
        a.py_xs,
        a.px_md,
        a.rounded_full,
        a.border,
        t.atoms.bg_contrast_25,
        isActive
          ? {
              backgroundColor: t.palette.primary_500,
              borderColor: t.palette.primary_500,
            }
          : {
              borderColor: t.atoms.border_contrast_medium.borderColor,
            },
        pressed && {opacity: 0.7},
      ]}>
      <Text
        style={[
          a.text_sm,
          a.font_medium,
          isActive ? {color: t.palette.white} : t.atoms.text,
        ]}
        numberOfLines={1}>
        {label}
      </Text>
      {isActive && activeCount ? (
        <View
          style={[
            a.rounded_full,
            a.px_xs,
            {
              backgroundColor: 'rgba(255,255,255,0.25)',
            },
          ]}>
          <Text
            style={[
              a.text_xs,
              a.font_bold,
              {color: t.palette.white},
            ]}>
            {activeCount}
          </Text>
        </View>
      ) : null}
      {isActive && onClear ? (
        <Pressable
          onPress={e => {
            e.stopPropagation?.()
            onClear()
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={_(msg`Clear ${label} filter`)}
          accessibilityHint={_(
            msg`Remove all ${label} filters from this search`,
          )}>
          <View
            style={[
              a.rounded_full,
              a.align_center,
              a.justify_center,
              {width: 16, height: 16, backgroundColor: 'rgba(255,255,255,0.3)'},
            ]}>
            <Text
              style={[
                a.text_xs,
                a.font_bold,
                {color: t.palette.white, lineHeight: 12},
              ]}>
              ×
            </Text>
          </View>
        </Pressable>
      ) : null}
    </Pressable>
  )
}
