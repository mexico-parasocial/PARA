import {Pressable, ScrollView, TouchableOpacity} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {MATTER_GROUPS} from '#/lib/matter-filter'
import {atoms as a, useTheme} from '#/alf'
import {Verified_Stroke2_Corner2_Rounded as VerifiedIcon} from '#/components/icons/Verified'
import {Text} from '#/components/Typography'

/**
 * Filters a list by matter, one pill per part of the composer's catalog
 * (Servicios Públicos … Interior). Pills combine: choosing several shows
 * the matters of all of them. The optional verified toggle narrows to
 * official matters, the ones in that catalog.
 */
export function MatterFilter({
  selected,
  onChange,
  counts,
  verified,
  onVerifiedChange,
}: {
  /** Keys of the chosen groups, as the composer writes them. */
  selected: string[]
  onChange: (groupKeys: string[]) => void
  counts: Map<string, number>
  verified?: boolean
  onVerifiedChange?: (verified: boolean) => void
}) {
  const {_} = useLingui()
  const t = useTheme()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[a.gap_sm, a.align_center]}>
      {onVerifiedChange ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={_(msg`Solo oficiales`)}
          accessibilityHint={_(msg`Muestra solo matters del catálogo oficial`)}
          accessibilityState={{selected: Boolean(verified)}}
          onPress={() => onVerifiedChange(!verified)}
          style={[
            a.rounded_full,
            a.align_center,
            a.justify_center,
            verified
              ? {backgroundColor: t.palette.primary_500}
              : [t.atoms.bg_contrast_25, t.atoms.border_contrast_low, a.border],
            {width: 38, height: 38},
          ]}>
          <VerifiedIcon
            width={20}
            height={20}
            style={verified ? {color: 'white'} : t.atoms.text}
          />
        </TouchableOpacity>
      ) : null}
      {MATTER_GROUPS.map(group => {
        const isSelected = selected.includes(group.key)
        const count = counts.get(group.key) ?? 0
        return (
          <Pressable
            key={group.key}
            accessibilityRole="button"
            accessibilityLabel={group.title}
            accessibilityHint={_(msg`Filtra por este grupo de matters`)}
            accessibilityState={{selected: isSelected}}
            onPress={() =>
              onChange(
                isSelected
                  ? selected.filter(key => key !== group.key)
                  : [...selected, group.key],
              )
            }
            style={[
              a.flex_row,
              a.align_center,
              a.gap_xs,
              a.rounded_full,
              {paddingHorizontal: 16, paddingVertical: 10},
              isSelected
                ? {backgroundColor: t.palette.primary_500}
                : [
                    t.atoms.bg_contrast_25,
                    t.atoms.border_contrast_low,
                    a.border,
                  ],
            ]}>
            <Text
              style={[
                a.text_sm,
                a.font_semi_bold,
                isSelected ? {color: '#FFFFFF'} : t.atoms.text,
              ]}>
              {group.title}
            </Text>
            {count > 0 ? (
              <Text
                style={[
                  a.text_xs,
                  a.font_bold,
                  isSelected ? {color: '#FFFFFFCC'} : t.atoms.text_contrast_low,
                ]}>
                {count}
              </Text>
            ) : null}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}
