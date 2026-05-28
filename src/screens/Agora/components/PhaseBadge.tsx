import {useMemo} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function PhaseBadge({
  phase,
  closesAt,
}: {
  phase: 'open' | 'closing' | 'closed'
  closesAt?: string
}) {
  const t = useTheme()
  const {_} = useLingui()

  const {backgroundColor, textColor, label} = useMemo(() => {
    if (phase === 'open') {
      return {
        backgroundColor: t.palette.positive_500 + '26',
        textColor: t.palette.positive_500,
        label: _(msg`Open`),
      }
    }
    if (phase === 'closed') {
      return {
        backgroundColor: t.atoms.bg_contrast_100.backgroundColor,
        textColor: t.atoms.text_contrast_medium.color,
        label: _(msg`Closed`),
      }
    }
    // closing
    let countdown = ''
    if (closesAt) {
      const diff = new Date(closesAt).getTime() - Date.now()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      if (days > 0 && days <= 7) {
        countdown = ` ${days}d`
      }
    }
    return {
      backgroundColor: t.palette.yellow + '26',
      textColor: t.palette.yellow,
      label: _(msg`Closing`) + countdown,
    }
  }, [phase, closesAt, t, _])

  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.justify_center,
        a.rounded_full,
        {
          height: 18,
          paddingHorizontal: 8,
          backgroundColor,
        },
      ]}>
      <Text
        style={[
          a.font_semi_bold,
          {
            fontSize: 10,
            lineHeight: 18,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: textColor,
          },
        ]}>
        {label}
      </Text>
    </View>
  )
}
