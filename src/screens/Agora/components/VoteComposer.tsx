import {useState} from 'react'
import {Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {SIGNAL_COLORS} from './SignalBadge'

const SIGNALS = [-3, -2, -1, 0, 1, 2, 3]

/**
 * A policy ballot: one person, one vote, weighted by its signal from -3 to +3
 * (docs/revocable-mandates-spec.md §4). One control for direction and weight;
 * there are no credits and no separate intensity stepper.
 */
export function VoteComposer({
  initialSignal = 0,
  onCast,
}: {
  initialSignal?: number
  onCast: (signal: number) => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const [signal, setSignal] = useState(initialSignal)

  const canCast = signal !== initialSignal
  const signed = signal > 0 ? `+${signal}` : `${signal}`

  const castLabel = _(msg`Cast vote`)

  return (
    <View style={[a.gap_lg]}>
      {/* Signal selector */}
      <View style={[a.flex_row, a.justify_between, a.align_center]}>
        {SIGNALS.map(s => {
          const color = SIGNAL_COLORS[s]
          const isSelected = s === signal
          return (
            <Pressable
              key={s}
              onPress={() => setSignal(s)}
              accessibilityRole="radio"
              accessibilityState={{checked: isSelected}}
              accessibilityLabel={
                s === -3
                  ? _(msg`Strongly Oppose`)
                  : s === -2
                    ? _(msg`Oppose`)
                    : s === -1
                      ? _(msg`Lean Oppose`)
                      : s === 0
                        ? _(msg`Neutral`)
                        : s === 1
                          ? _(msg`Lean Support`)
                          : s === 2
                            ? _(msg`Support`)
                            : _(msg`Strongly Support`)
              }
              accessibilityHint={_(msg`Selects this signal strength`)}
              style={[
                a.align_center,
                a.justify_center,
                a.rounded_full,
                {
                  width: 36,
                  height: 36,
                  borderWidth: 2,
                  borderColor: color,
                  backgroundColor: isSelected ? color : 'transparent',
                },
              ]}>
              <Text
                style={[
                  a.font_semi_bold,
                  {
                    fontSize: 12,
                    color: isSelected ? '#FFFFFF' : color,
                  },
                ]}>
                {s > 0 ? `+${s}` : s}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Signal label */}
      <Text
        style={[
          a.text_center,
          a.font_medium,
          t.atoms.text,
          {
            fontSize: 14,
          },
        ]}>
        {signal === -3
          ? _(msg`Strongly Oppose`)
          : signal === -2
            ? _(msg`Oppose`)
            : signal === -1
              ? _(msg`Lean Oppose`)
              : signal === 0
                ? _(msg`Neutral`)
                : signal === 1
                  ? _(msg`Lean Support`)
                  : signal === 2
                    ? _(msg`Support`)
                    : _(msg`Strongly Support`)}
      </Text>

      {/* What the weight means */}
      <Text
        style={[
          a.text_center,
          t.atoms.text_contrast_medium,
          {
            fontSize: 12,
          },
        ]}>
        {signal === 0
          ? _(msg`0 cuenta tu participación sin mover el resultado.`)
          : _(msg`Tu voto suma ${signed} al conteo: +3 pesa el triple que +1.`)}
      </Text>

      {/* Cast vote button */}
      <Button
        variant="solid"
        color="primary"
        size="large"
        disabled={!canCast}
        label={castLabel}
        onPress={() => onCast(signal)}>
        <ButtonText>{castLabel}</ButtonText>
      </Button>
    </View>
  )
}
