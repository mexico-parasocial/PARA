import {StyleSheet, View} from 'react-native'
import {useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

const MARKER_SIZE = 16

/**
 * Where a community sits on one official axis. The marker is a published
 * aggregate (0-100), not a vote count or an electoral weight.
 */
export function AxisAlignmentCard({
  title,
  score,
  label,
  labelLow,
  labelHigh,
}: {
  title: string
  score: number
  label: string
  labelLow?: string
  labelHigh?: string
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const position = Math.max(0, Math.min(100, score))

  return (
    <View
      accessible
      accessibilityLabel={l`${title}: ${label}, ${position} out of 100`}
      accessibilityHint={l`Where this community sits between ${labelLow} and ${labelHigh}`}
      style={[a.p_md, a.rounded_md, a.gap_md, t.atoms.bg_contrast_25]}>
      <View style={[a.flex_row, a.justify_between, a.align_center, a.gap_md]}>
        <Text style={[a.flex_1, a.text_md, a.font_bold, t.atoms.text]}>
          {title}
        </Text>
        {!!label && (
          <View
            style={[
              a.px_sm,
              a.py_2xs,
              a.rounded_full,
              {backgroundColor: t.palette.primary_100},
            ]}>
            <Text
              style={[
                a.text_xs,
                a.font_semi_bold,
                {color: t.palette.primary_700},
              ]}>
              {label}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.trackWrap}>
        <View style={[styles.track, t.atoms.bg_contrast_100]}>
          <View
            style={[
              styles.fill,
              {width: `${position}%`, backgroundColor: t.palette.primary_300},
            ]}
          />
        </View>
        <View
          style={[
            styles.marker,
            {
              left: `${position}%`,
              backgroundColor: t.palette.primary_500,
              borderColor: t.atoms.bg.backgroundColor,
            },
          ]}
        />
      </View>

      <View style={[a.flex_row, a.justify_between, a.gap_md]}>
        <Text
          style={[a.flex_1, a.text_xs, t.atoms.text_contrast_medium]}
          numberOfLines={1}>
          {labelLow}
        </Text>
        <Text
          style={[
            a.flex_1,
            a.text_xs,
            a.text_right,
            t.atoms.text_contrast_medium,
          ]}
          numberOfLines={1}>
          {labelHigh}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  trackWrap: {
    height: MARKER_SIZE,
    justifyContent: 'center',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  marker: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    marginLeft: -MARKER_SIZE / 2,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 2,
  },
})
