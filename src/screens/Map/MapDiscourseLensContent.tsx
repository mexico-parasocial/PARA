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

  const active = !!selectedDiscourseItem && selectedDiscourseItem !== 'Any'

  return (
    <View style={[a.w_full, a.flex_1]}>
      <View style={[a.flex_row, a.align_center, a.gap_sm, a.mb_md]}>
        <View
          style={[
            a.align_center,
            a.justify_center,
            a.rounded_md,
            {width: 34, height: 34, backgroundColor: '#FF5A3618'},
          ]}>
          <FilterIcon fill="#FF5A36" width={18} height={18} />
        </View>
        <View style={[a.flex_1]}>
          <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
            <Trans>Choose a discourse lens</Trans>
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>
              Heatmap tint only. The map data underneath stays the same.
            </Trans>
          </Text>
        </View>
      </View>

      {active && (
        <View
          style={[
            a.mb_md,
            a.p_md,
            a.rounded_lg,
            {backgroundColor: '#FF5A3614'},
            a.border,
            {borderColor: '#FF5A3636'},
          ]}>
          <Text style={[a.text_2xs, a.font_bold, {color: '#FF5A36'}]}>
            CURRENT LENS
          </Text>
          <Text style={[a.text_md, a.font_bold, t.atoms.text, a.mt_2xs]}>
            {discourseType}: {selectedDiscourseItem}
          </Text>
        </View>
      )}

      <View style={[a.flex_row, a.gap_sm, a.mb_md]}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => onChangeDiscourseType('Matter')}
          style={[
            a.flex_1,
            a.align_center,
            styles.pillButton(t),
            discourseType === 'Matter' ? styles.pillButtonActive : null,
          ]}>
          <Text
            style={[
              a.text_sm,
              discourseType === 'Matter'
                ? [a.font_bold, {color: '#FF5A36'}]
                : t.atoms.text_contrast_medium,
            ]}>
            Matter
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => onChangeDiscourseType('Policy')}
          style={[
            a.flex_1,
            a.align_center,
            styles.pillButton(t),
            discourseType === 'Policy' ? styles.pillButtonActive : null,
          ]}>
          <Text
            style={[
              a.text_sm,
              discourseType === 'Policy'
                ? [a.font_bold, {color: '#FF5A36'}]
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
        style={[
          a.mt_md,
          a.align_center,
          a.py_sm,
          a.rounded_lg,
          t.atoms.bg_contrast_25,
        ]}>
        <Text style={[a.text_sm, a.font_bold, t.atoms.text_contrast_medium]}>
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
  pillButtonActive: {
    borderColor: '#FF5A36',
    backgroundColor: '#FF5A3618',
  },
}
