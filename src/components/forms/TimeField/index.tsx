import {useState} from 'react'
import {Keyboard, View} from 'react-native'
import DatePicker from 'react-native-date-picker'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {type TimeFieldProps} from './types'

export function TimeField({
  disabled,
  value,
  label,
  onChangeTime,
  onConfirm,
  isInvalid,
  accessibilityHint,
}: TimeFieldProps) {
  const {_, i18n} = useLingui()
  const t = useTheme()
  const [open, setOpen] = useState(false)
  const date = new Date()
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  if (valid) {
    const [hours, minutes] = value.split(':').map(Number)
    date.setHours(hours, minutes, 0, 0)
  }
  const displayValue = valid
    ? i18n.date(date, {hour: '2-digit', minute: '2-digit'})
    : _(msg`Choose time`)
  return (
    <View>
      <Button
        disabled={disabled}
        label={label}
        accessibilityValue={{text: displayValue}}
        accessibilityHint={accessibilityHint}
        size="small"
        color="secondary"
        style={[
          a.justify_start,
          a.border,
          isInvalid
            ? {borderColor: t.palette.negative_500}
            : t.atoms.border_contrast_low,
        ]}
        onPress={() => {
          Keyboard.dismiss()
          setOpen(true)
        }}>
        <ButtonText>{displayValue}</ButtonText>
      </Button>
      {open ? (
        <DatePicker
          modal
          open
          mode="time"
          date={date}
          theme={t.scheme}
          locale={i18n.locale}
          title={label}
          confirmText={_(msg`Done`)}
          cancelText={_(msg`Cancel`)}
          onConfirm={selected => {
            setOpen(false)
            onChangeTime(
              `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`,
            )
            onConfirm?.()
          }}
          onCancel={() => setOpen(false)}
        />
      ) : null}
    </View>
  )
}
