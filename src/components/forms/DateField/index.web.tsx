import {forwardRef, type Ref, useCallback} from 'react'
import {StyleSheet, type TextInput, type TextInputProps} from 'react-native'
// @ts-expect-error untyped
import {unstable_createElement} from 'react-native-web'

import {type DateFieldProps} from '#/components/forms/DateField/types'
import {toSimpleDateString} from '#/components/forms/DateField/utils'
import * as TextField from '#/components/forms/TextField'
import {CalendarDays_Stroke2_Corner0_Rounded as CalendarDays} from '#/components/icons/CalendarDays'

export * as utils from '#/components/forms/DateField/utils'
export const LabelText = TextField.LabelText

const InputBase = forwardRef<HTMLInputElement, TextInputProps>(
  ({style, editable, ...props}, ref) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return unstable_createElement('input', {
      ...props,
      ref,
      type: 'date',
      disabled: editable === false,
      style: [
        StyleSheet.flatten(style),
        {
          background: 'transparent',
          border: 0,
        },
      ],
    })
  },
)

InputBase.displayName = 'InputBase'

const Input = TextField.createInput(InputBase as unknown as typeof TextInput)

export function DateField({
  value,
  inputRef,
  onChangeDate,
  onConfirm,
  onBlur,
  disabled,
  label,
  isInvalid,
  testID,
  accessibilityHint,
  maximumDate,
  minimumDate,
}: DateFieldProps) {
  const handleOnChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = e.target.valueAsDate || e.target.value

      if (date) {
        const formatted = toSimpleDateString(date)
        onChangeDate(formatted)
        onConfirm?.(formatted)
      }
    },
    [onChangeDate, onConfirm],
  )

  return (
    <TextField.Root isInvalid={isInvalid}>
      <TextField.Icon icon={CalendarDays} />
      <Input
        editable={!disabled}
        value={value === '' ? '' : toSimpleDateString(value)}
        inputRef={inputRef as Ref<React.ComponentRef<typeof TextInput>>}
        label={label}
        // @ts-expect-error not typed as <input type="date"> even though it is one
        onChange={handleOnChange}
        onBlur={onBlur}
        testID={testID}
        accessibilityHint={accessibilityHint}
        max={maximumDate ? toSimpleDateString(maximumDate) : undefined}
        min={minimumDate ? toSimpleDateString(minimumDate) : undefined}
      />
    </TextField.Root>
  )
}
