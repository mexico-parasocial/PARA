import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Plural} from '@lingui/react/macro'

import {creditCost, MAX_INTENSITY} from '#/lib/mandates/voice'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

const CELL = 7
const GAP = 2

/**
 * The quadratic price, drawn: a voice of k is a k×k square of credits. One
 * voice costs one credit; three cost nine. The square is the whole lesson.
 */
export function IntensityScale({selected = 0}: {selected?: number}) {
  const {_} = useLingui()
  const levels = Array.from({length: MAX_INTENSITY}, (_v, i) => i + 1)

  return (
    <View
      accessible
      accessibilityLabel={_(
        msg`Cada voz extra cuesta más: 1 voz cuesta 1 crédito, 2 voces cuestan 4, 3 voces cuestan 9.`,
      )}
      accessibilityHint={_(
        msg`El precio de un voto crece con el cuadrado de su intensidad`,
      )}
      style={[a.flex_row, a.justify_between, a.align_end, a.gap_md]}>
      {levels.map(k => (
        <Level key={k} intensity={k} isSelected={k === selected} />
      ))}
    </View>
  )
}

function Level({
  intensity,
  isSelected,
}: {
  intensity: number
  isSelected: boolean
}) {
  const t = useTheme()
  const credits = creditCost(intensity)
  const side = intensity * CELL + (intensity - 1) * GAP
  const color = isSelected ? t.palette.primary_500 : t.palette.contrast_300

  return (
    <View style={[a.flex_1, a.align_center, a.gap_xs]}>
      <View
        style={[
          a.flex_row,
          a.flex_wrap,
          {width: side, height: side, gap: GAP},
        ]}>
        {Array.from({length: credits}, (_v, i) => (
          <View
            key={i}
            style={{
              width: CELL,
              height: CELL,
              borderRadius: 1.5,
              backgroundColor: color,
            }}
          />
        ))}
      </View>
      <Text
        style={[
          a.text_xs,
          a.font_semi_bold,
          isSelected ? {color: t.palette.primary_500} : t.atoms.text,
        ]}>
        <Plural value={intensity} one="# voz" other="# voces" />
      </Text>
      <Text style={[a.text_2xs, t.atoms.text_contrast_medium]}>
        <Plural value={credits} one="# crédito" other="# créditos" />
      </Text>
    </View>
  )
}
