import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {isValidTimeString, toTimeDate} from './utils'

// looks like the PARA form button, but opens a time picker that does something
// different on each platform on press
// iOS: open a dialog with an inline spinner picker
// Android: open the native Material time picker dialog
// web: native <input type="time">

export function TimeFieldButton({
  label,
  value,
  onPress,
  disabled,
  isInvalid,
  accessibilityHint,
}: {
  label: string
  value: string
  onPress: () => void
  disabled?: boolean
  isInvalid?: boolean
  accessibilityHint?: string
}) {
  const {_, i18n} = useLingui()
  const t = useTheme()
  const valid = isValidTimeString(value)
  const displayValue = valid
    ? i18n.date(toTimeDate(value), {hour: '2-digit', minute: '2-digit'})
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
        onPress={onPress}>
        <ButtonText>{displayValue}</ButtonText>
      </Button>
    </View>
  )
}
