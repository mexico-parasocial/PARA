import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {type CreationStep} from '../creation'

export function CreationSteps({
  steps,
  current,
}: {
  steps: CreationStep[]
  current: CreationStep
}) {
  const {_} = useLingui()
  const t = useTheme()
  const names = {
    type: _(msg`Type`),
    basics: _(msg`Basics`),
    details: _(msg`Activity details`),
    money: _(msg`Money plan`),
    review: _(msg`Review`),
  }
  const index = steps.indexOf(current) + 1
  const total = steps.length
  const name = names[current]
  return (
    <View style={[a.gap_sm]}>
      <Text
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={[a.text_lg, a.font_bold]}>
        {_(msg`Step ${index} of ${total}: ${name}`)}
      </Text>
      <View style={[a.flex_row, a.gap_xs]}>
        {steps.map((step, i) => (
          <View
            key={step}
            style={[
              a.flex_1,
              a.rounded_sm,
              {
                height: 4,
                backgroundColor:
                  i < index ? t.palette.primary_500 : t.palette.contrast_100,
              },
            ]}
          />
        ))}
      </View>
    </View>
  )
}
