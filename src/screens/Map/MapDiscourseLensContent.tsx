import {useMemo} from 'react'
import {ScrollView, TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {POST_FLAIRS, type PostFlair} from '#/lib/tags'
import {atoms as a, useTheme} from '#/alf'
import {FlairSelectionList} from '#/components/FlairSelectionList'
import {Filter_Stroke2_Corner0_Rounded as FilterIcon} from '#/components/icons/Filter'
import {Text} from '#/components/Typography'

export interface MapDiscourseLensContentProps {
  discourseType: 'Matter' | 'Policy'
  onChangeDiscourseType: (type: 'Matter' | 'Policy') => void
  selectedDiscourseItem: string
  onSelectDiscourseItem: (item: string, type: 'Matter' | 'Policy') => void
  onClear: () => void
}

export function MapDiscourseLensContent({
  discourseType,
  onChangeDiscourseType,
  selectedDiscourseItem,
  onSelectDiscourseItem,
  onClear,
}: MapDiscourseLensContentProps) {
  const t = useTheme()

  const selectedFlairs = useMemo(() => {
    if (!selectedDiscourseItem || selectedDiscourseItem === 'Any') return []
    return Object.values(POST_FLAIRS).filter(
      (f: PostFlair) => f.label === selectedDiscourseItem,
    )
  }, [selectedDiscourseItem])

  return (
    <View style={[a.w_full, a.flex_1]}>
      <View
        style={[
          a.flex_row,
          a.align_center,
          a.gap_xs,
          a.mb_md,
        ]}>
        <FilterIcon
          fill={t.palette.primary_500}
          width={16}
          height={16}
        />
        <Text
          style={[
            a.text_xs,
            a.font_bold,
            t.atoms.text_contrast_medium,
          ]}>
          DISCUSSION HEAT
        </Text>
      </View>

      <Text style={[a.text_lg, a.font_bold, t.atoms.text, a.mt_xs]}>
        <Trans>Choose a discourse lens</Trans>
      </Text>
      <Text
        style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_xs, a.mb_md]}>
        <Trans>
          This is a visual layer only. It changes how states are tinted across
          the map.
        </Trans>
      </Text>

      <View style={[a.flex_row, a.gap_sm, a.mb_md]}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => onChangeDiscourseType('Matter')}
          style={[
            styles.pillButton(t),
            discourseType === 'Matter' ? styles.pillButtonActive(t) : null,
          ]}>
          <Text
            style={[
              a.text_sm,
              discourseType === 'Matter'
                ? [a.font_bold, {color: t.palette.primary_500}]
                : t.atoms.text_contrast_medium,
            ]}>
            Matter
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => onChangeDiscourseType('Policy')}
          style={[
            styles.pillButton(t),
            discourseType === 'Policy' ? styles.pillButtonActive(t) : null,
          ]}>
          <Text
            style={[
              a.text_sm,
              discourseType === 'Policy'
                ? [a.font_bold, {color: t.palette.primary_500}]
                : t.atoms.text_contrast_medium,
            ]}>
            Policy
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[a.flex_1]}
        contentContainerStyle={[a.gap_sm]}
        showsVerticalScrollIndicator={false}>
        <FlairSelectionList
          selectedFlairs={selectedFlairs}
          setSelectedFlairs={flairs => {
            if (flairs.length > 0) {
              const flair = flairs[0]
              onSelectDiscourseItem(
                flair.label,
                flair.id.startsWith('policy_') ? 'Policy' : 'Matter',
              )
            } else {
              onSelectDiscourseItem('Any', discourseType)
            }
          }}
          mode={discourseType.toLowerCase() as 'matter' | 'policy'}
        />
      </ScrollView>

      <TouchableOpacity
        accessibilityRole="button"
        onPress={onClear}
        style={[a.mt_md, a.align_center]}>
        <Text
          style={[
            a.text_sm,
            a.font_bold,
            t.atoms.text_contrast_medium,
          ]}>
          <Trans>Clear heatmap</Trans>
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = {
  pillButton: (t: ReturnType<typeof useTheme>) => ({
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.atoms.border_contrast_low.borderColor,
    backgroundColor: t.atoms.bg.backgroundColor,
  }),
  pillButtonActive: (t: ReturnType<typeof useTheme>) => ({
    borderColor: t.palette.primary_500,
    backgroundColor: t.palette.primary_500 + '18',
  }),
}
