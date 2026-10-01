import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'

// Local questionnaire answers are distinct from public support reactions.
export function AnswerScale({
  value,
  onChange,
}: {
  value?: number
  onChange: (value: number) => void
}) {
  const {_} = useLingui()
  const t = useTheme()
  return (
    <View style={[a.gap_sm, a.w_full]}>
      <View style={[a.flex_row, a.gap_2xs]}>
        {[-3, -2, -1, 0, 1, 2, 3].map(answer => (
          <Button
            key={answer}
            label={
              answer === 0
                ? _(msg`Neutral (0)`)
                : answer < 0
                  ? _(msg`Disagree (${answer})`)
                  : _(msg`Agree (+${answer})`)
            }
            accessibilityState={{selected: value === answer}}
            size="small"
            variant="solid"
            color={value === answer ? 'primary' : 'secondary'}
            style={a.flex_1}
            onPress={() => onChange(answer)}>
            <ButtonText>{answer > 0 ? `+${answer}` : answer}</ButtonText>
          </Button>
        ))}
      </View>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        {value === undefined ? (
          <Trans>Not answered</Trans>
        ) : value === 0 ? (
          <Trans>Neutral</Trans>
        ) : value < 0 ? (
          <Trans>Disagree</Trans>
        ) : (
          <Trans>Agree</Trans>
        )}
      </Text>
    </View>
  )
}
