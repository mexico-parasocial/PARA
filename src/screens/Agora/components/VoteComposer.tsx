import {useCallback, useMemo, useState} from 'react'
import {Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {SIGNAL_COLORS} from './SignalBadge'

const SIGNALS = [-3, -2, -1, 0, 1, 2, 3]

export function VoteComposer({
  initialSignal = 0,
  initialUnits = 1,
  onCast,
}: {
  initialSignal?: number
  initialUnits?: number
  onCast: (signal: number, units: number) => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const [signal, setSignal] = useState(initialSignal)
  const [units, setUnits] = useState(initialUnits)

  const canCast =
    signal !== 0 || signal !== initialSignal || units !== initialUnits

  const decrementUnits = useCallback(() => {
    setUnits(u => Math.max(1, u - 1))
  }, [])

  const incrementUnits = useCallback(() => {
    setUnits(u => Math.min(16, u + 1))
  }, [])

  const cost = useMemo(() => units * units, [units])

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
              accessibilityLabel={s === -3 ? _(msg`Strongly Oppose`) : s === -2 ? _(msg`Oppose`) : s === -1 ? _(msg`Lean Oppose`) : s === 0 ? _(msg`Neutral`) : s === 1 ? _(msg`Lean Support`) : s === 2 ? _(msg`Support`) : _(msg`Strongly Support`)}
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
        {signal === -3 ? _(msg`Strongly Oppose`) : signal === -2 ? _(msg`Oppose`) : signal === -1 ? _(msg`Lean Oppose`) : signal === 0 ? _(msg`Neutral`) : signal === 1 ? _(msg`Lean Support`) : signal === 2 ? _(msg`Support`) : _(msg`Strongly Support`)}
      </Text>

      {/* Intensity stepper */}
      <View style={[a.flex_row, a.align_center, a.justify_center, a.gap_md]}>
        <Pressable
          onPress={decrementUnits}
          accessibilityRole="button"
          accessibilityLabel={_(msg`Decrease units`)}
          accessibilityHint={_(msg`Reduces vote intensity by one unit`)}
          disabled={units <= 1}
          style={[
            a.align_center,
            a.justify_center,
            a.rounded_md,
            t.atoms.bg_contrast_100,
            {
              width: 32,
              height: 32,
              opacity: units <= 1 ? 0.5 : 1,
            },
          ]}>
          <Text style={[a.font_bold, t.atoms.text, {fontSize: 16}]}>−</Text>
        </Pressable>

        <View style={[a.align_center, {minWidth: 32}]}>
          <Text style={[a.font_semi_bold, a.text_lg, t.atoms.text]}>
            {units}
          </Text>
        </View>

        <Pressable
          onPress={incrementUnits}
          accessibilityRole="button"
          accessibilityLabel={_(msg`Increase units`)}
          accessibilityHint={_(msg`Increases vote intensity by one unit`)}
          disabled={units >= 16}
          style={[
            a.align_center,
            a.justify_center,
            a.rounded_md,
            t.atoms.bg_contrast_100,
            {
              width: 32,
              height: 32,
              opacity: units >= 16 ? 0.5 : 1,
            },
          ]}>
          <Text style={[a.font_bold, t.atoms.text, {fontSize: 16}]}>+</Text>
        </Pressable>
      </View>

      {/* Credit preview */}
      <Text
        style={[
          a.text_center,
          t.atoms.text_contrast_medium,
          {
            fontSize: 12,
          },
        ]}>
        {_(msg`Cost: ${cost} credits`)}
      </Text>

      {/* Cast vote button */}
      <Button
        variant="solid"
        color="primary"
        size="large"
        disabled={!canCast}
        label={castLabel}
        onPress={() => onCast(signal, units)}>
        <ButtonText>{castLabel}</ButtonText>
      </Button>
    </View>
  )
}
