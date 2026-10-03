import {useEffect, useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function VotingButtonHorizontal({
  initialVote = 0,
  onVoteChange,
  disabled = false,
  saveFailed = false,
}: {
  initialVote?: number
  onVoteChange?: (vote: number) => void
  disabled?: boolean
  saveFailed?: boolean
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const [draft, setDraft] = useState(initialVote)
  useEffect(() => setDraft(initialVote), [initialVote, saveFailed])
  const commit = () => {
    if (!disabled && draft !== initialVote) onVoteChange?.(draft)
  }
  const color =
    draft > 0
      ? t.palette.positive_500
      : draft < 0
        ? t.palette.negative_500
        : t.palette.contrast_600
  return (
    <View style={[a.gap_sm, {width: '100%'}]}>
      <View style={[a.flex_row, a.justify_between, a.align_center]}>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>Your position</Trans>
        </Text>
        <Text style={[a.text_sm, a.font_bold, {color}]}>
          {draft > 0 ? `+${draft}` : draft}
        </Text>
      </View>
      <input
        aria-label={l`Policy position`}
        aria-valuetext={
          draft > 0
            ? l`Support ${draft}`
            : draft < 0
              ? l`Oppose ${Math.abs(draft)}`
              : l`Neutral`
        }
        type="range"
        min={-3}
        max={3}
        step={1}
        value={draft}
        disabled={disabled}
        onChange={event => setDraft(Number(event.currentTarget.value))}
        onPointerUp={commit}
        onKeyUp={event => {
          if (
            [
              'ArrowLeft',
              'ArrowRight',
              'ArrowUp',
              'ArrowDown',
              'Home',
              'End',
            ].includes(event.key)
          )
            commit()
        }}
        style={{
          width: '100%',
          margin: 0,
          accentColor: color,
          cursor: disabled ? 'default' : 'pointer',
        }}
      />
      <View style={[a.flex_row, a.justify_between]}>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>Oppose</Trans> −3
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>Neutral</Trans>
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          +3 <Trans>Support</Trans>
        </Text>
      </View>
    </View>
  )
}
