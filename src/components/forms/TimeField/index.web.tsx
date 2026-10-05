import {forwardRef} from 'react'
import {StyleSheet, type TextInput, type TextInputProps} from 'react-native'
// @ts-expect-error untyped
import {unstable_createElement} from 'react-native-web'

import * as TextField from '#/components/forms/TextField'
import {type TimeFieldProps} from './types'

const InputBase = forwardRef<HTMLInputElement, TextInputProps>(
  ({style, editable, ...props}, ref) =>
    unstable_createElement('input', {
      ...props,
      ref,
      type: 'time',
      disabled: editable === false,
      step: 60,
      style: [
        StyleSheet.flatten(style),
        {background: 'transparent', border: 0},
      ],
    }),
)
InputBase.displayName = 'TimeInput'
const Input = TextField.createInput(InputBase as unknown as typeof TextInput)

export function TimeField({
  disabled,
  value,
  label,
  onChangeTime,
  onConfirm,
  isInvalid,
  accessibilityHint,
}: TimeFieldProps) {
  return (
    <TextField.Root isInvalid={isInvalid}>
      <Input
        editable={!disabled}
        value={value}
        label={label}
        accessibilityHint={accessibilityHint}
        // @ts-expect-error native text field wraps an HTML time input
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onChangeTime(event.target.value)
        }
        onBlur={onConfirm}
      />
    </TextField.Root>
  )
}
