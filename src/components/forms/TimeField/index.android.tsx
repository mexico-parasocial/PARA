import {useCallback, useState} from 'react'
import {Keyboard, View} from 'react-native'
import {DateTimePicker} from '@expo/ui/community/datetime-picker'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {TimeFieldButton} from './index.shared'
import {type TimeFieldProps} from './types'
import {toSimpleTimeString, toTimeDate} from './utils'

export * as utils from './utils'

/**
 * Time-only input. The community picker defaults to a dialog presentation on
 * Android: mounting opens the native Material dialog, `onValueChange` fires
 * on confirmation and `onDismiss` on cancel, and the caller unmounts it.
 */
export function TimeField({
  disabled,
  value,
  label,
  onChangeTime,
  onConfirm,
  isInvalid,
  accessibilityHint,
}: TimeFieldProps) {
  const {_} = useLingui()
  const [open, setOpen] = useState(false)

  const onChangeInternal = useCallback(
    (_event: unknown, date: Date) => {
      setOpen(false)
      onChangeTime(toSimpleTimeString(date))
      onConfirm?.()
    },
    [onChangeTime, onConfirm, setOpen],
  )

  const onCancel = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <View>
      <TimeFieldButton
        disabled={disabled}
        label={label}
        value={value}
        onPress={() => {
          Keyboard.dismiss()
          setOpen(true)
        }}
        isInvalid={isInvalid}
        accessibilityHint={accessibilityHint}
      />
      {open && (
        <DateTimePicker
          value={toTimeDate(value)}
          mode="time"
          onValueChange={onChangeInternal}
          onDismiss={onCancel}
          positiveButton={{label: _(msg`Done`)}}
          negativeButton={{label: _(msg`Cancel`)}}
        />
      )}
    </View>
  )
}
