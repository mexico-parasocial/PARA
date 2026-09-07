import {Text, View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {type FeedPostNumbering} from '#/lib/api/feed-manip'
import {atoms as a, ios, platform, useTheme} from '#/alf'

/**
 * How far the inline badge is nudged below the text baseline. Android's
 * containing `RichText` reserves matching room via `suffixOffset`.
 */
export const POST_NUMBER_INLINE_OFFSET = 6

export type ThreadItemPostNumbering = FeedPostNumbering

export function useHasThreadItemPostNumber(
  value: ThreadItemPostNumbering | undefined,
) {
  const index = value?.opThreadPostIndex
  const count = value?.opThreadPostCount

  return (
    index != null && count != null && index >= 1 && count >= 1 && index <= count
  )
}

export function ThreadItemPostNumber({
  value,
  inline = true,
}: {
  value: ThreadItemPostNumbering | undefined
  inline?: boolean
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const shouldRender = useHasThreadItemPostNumber(value)
  const index = value?.opThreadPostIndex
  const count = value?.opThreadPostCount

  if (!shouldRender) {
    return null
  }

  return (
    <View
      style={[
        a.flex_shrink_0,
        a.rounded_full,
        t.atoms.bg_contrast_50,
        !inline && a.self_start,
        ios(a.py_2xs),
        {
          paddingLeft: 5,
          paddingRight: 5,
        },
        inline
          ? platform({
              android: {transform: [{translateY: POST_NUMBER_INLINE_OFFSET}]},
              ios: {transform: [{translateY: a.py_2xs.paddingBottom}]},
              web: {
                // Inline views inherit the surrounding line height on web. Keep
                // the badge at its usual size when emoji-only text enlarges it.
                lineHeight: a.text_xs.fontSize * a.leading_normal.lineHeight,
              },
            })
          : {top: -2, marginBottom: -2},
      ]}>
      <Text
        accessibilityLabel={l({
          // `shouldRender` has already validated these as numbers >= 1, but
          // the field type stays `number | null | undefined` until the
          // lexicon declares the fields.
          message: `Post ${Number(index)} of ${Number(count)}`,
          context: 'post-number-in-thread',
          comment:
            "Screen reader label indicating post count in a thread, e.g., the 3rd post of 5 total is 'Post 3 of 5'",
        })}
        accessibilityHint=""
        style={[
          a.text_xs,
          a.font_medium,
          t.atoms.text_contrast_medium,
          {
            fontVariant: ['tabular-nums'],
          },
        ]}>
        <Trans
          context="post-number-in-thread"
          comment="Badge indicating post count in a thread, e.g., the 3rd post of 5 total is '3/5'">
          {Number(index)}/{Number(count)}
        </Trans>
      </Text>
    </View>
  )
}
