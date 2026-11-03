import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {knownStatus, type StatusTone, statusTone} from '../display'

export function useStatusLabel() {
  const {_} = useLingui()
  return (status: string) => {
    switch (knownStatus(status)) {
      case 'planned':
        return _(msg`Planeado`)
      case 'in_progress':
        return _(msg`En curso`)
      case 'completed':
        return _(msg`Cumplido`)
      case 'blocked':
        return _(msg`Bloqueado`)
      case 'abandoned':
        return _(msg`Abandonado`)
      default:
        // A status this client does not know yet is shown as written.
        return status
    }
  }
}

export function useToneColor() {
  const t = useTheme()
  return (tone: StatusTone) => {
    switch (tone) {
      case 'good':
        return t.palette.positive_500
      case 'active':
        return t.palette.primary_500
      case 'warn':
        return t.palette.yellow
      case 'bad':
        return t.palette.negative_500
      default:
        return t.palette.contrast_500
    }
  }
}

export function Pill({label, color}: {label: string; color: string}) {
  return (
    <View
      style={[
        a.rounded_full,
        a.px_sm,
        a.py_xs,
        {backgroundColor: color + '20'},
      ]}>
      <Text style={[a.text_xs, a.font_bold, {color}]}>{label}</Text>
    </View>
  )
}

/**
 * The status of a compromiso. Overdue is its own pill because it is derived
 * from the due date, not something a steward wrote.
 */
export function StatusPill({
  status,
  overdue,
}: {
  status: string
  overdue: boolean
}) {
  const {_} = useLingui()
  const statusLabel = useStatusLabel()
  const toneColor = useToneColor()
  const tone = statusTone(status, false)
  return (
    <View style={[a.flex_row, a.flex_wrap, a.gap_xs]}>
      <Pill label={statusLabel(status)} color={toneColor(tone)} />
      {overdue ? (
        <Pill label={_(msg`Atrasado`)} color={toneColor('bad')} />
      ) : null}
    </View>
  )
}
