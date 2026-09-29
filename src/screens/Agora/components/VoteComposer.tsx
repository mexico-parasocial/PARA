import {useState} from 'react'
import {Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {IntensityScale} from './IntensityScale'
import {SIGNAL_COLORS} from './SignalBadge'

const SIGNALS = [-3, -2, -1, 0, 1, 2, 3]

/**
 * One control for direction and intensity: the signal's magnitude is the
 * voice, and a voice of k costs k² credits (docs/revocable-mandates-spec.md
 * §5). There is no separate intensity stepper: two knobs for one quantity is
 * how quadratic voting gets misunderstood.
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

  const canCast = signal !== 0 && signal !== initialSignal
  const voice = Math.abs(signal)
  const cost = voice * voice

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

      {/* Quadratic price */}
      <IntensityScale selected={voice} />
      <Text
        style={[
          a.text_center,
          t.atoms.text_contrast_medium,
          {
            fontSize: 12,
          },
        ]}>
        {voice === 0
          ? _(msg`Neutral no gasta créditos.`)
          : _(msg`Este voto cuesta ${cost} de tus créditos.`)}
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
