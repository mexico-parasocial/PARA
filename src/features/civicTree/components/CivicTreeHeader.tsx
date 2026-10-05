import {type ReactNode} from 'react'
import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import * as Layout from '#/components/Layout'

/** Top bar shared by the personal and community civic trees. */
export function CivicTreeHeader({
  titleText,
  subtitleText,
  backFallback,
  right,
}: {
  titleText: ReactNode
  subtitleText?: ReactNode
  backFallback?: string
  /** Actions on the right; an empty slot keeps the title centered without. */
  right?: ReactNode
}) {
  const t = useTheme()
  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.gap_sm,
        a.px_md,
        a.py_xs,
        a.border_b,
        t.atoms.bg,
        t.atoms.border_contrast_low,
        {minHeight: 52},
      ]}>
      <Layout.Header.BackButton fallback={backFallback} />
      <Layout.Header.Content>
        <Layout.Header.TitleText>{titleText}</Layout.Header.TitleText>
        {subtitleText ? (
          <Layout.Header.SubtitleText>
            {subtitleText}
          </Layout.Header.SubtitleText>
        ) : null}
      </Layout.Header.Content>
      {right ?? <Layout.Header.Slot />}
    </View>
  )
}
