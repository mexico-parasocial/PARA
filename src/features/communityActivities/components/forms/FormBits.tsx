import {View} from 'react-native'
import {type I18n} from '@lingui/core'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {DateField} from '#/components/forms/DateField'
import * as TextField from '#/components/forms/TextField'
import {Text} from '#/components/Typography'

/** Lingui's bound `_`, handed to the pure `build*` validators. */
export type Translate = I18n['_']

/** Result of turning a form draft into record data. */
export type Built<T> = {value?: T; problems: string[]}

/** Local date `YYYY-MM-DD` plus `HH:MM` → ISO instant, or undefined. */
export function combineDateTime(date: string, time: string) {
  if (!date) return undefined
  const hhmm = /^\d{1,2}:\d{2}$/.test(time.trim()) ? time.trim() : '00:00'
  const [h, m] = hhmm.split(':')
  const value = new Date(`${date}T${h.padStart(2, '0')}:${m}:00`)
  return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
}

/** One entry per non-empty line, for list fields typed into a textarea. */
export function splitLines(input: string) {
  return input
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

/** Empty → undefined; otherwise a non-negative whole number or NaN. */
export function optionalCount(input: string) {
  if (!input.trim()) return undefined
  const value = Number(input.trim())
  return Number.isInteger(value) && value >= 0 ? value : NaN
}

export function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const t = useTheme()
  return (
    <View
      style={[
        a.gap_md,
        a.p_lg,
        a.rounded_md,
        a.border,
        t.atoms.border_contrast_low,
        t.atoms.bg,
      ]}>
      <View style={[a.gap_xs]}>
        <Text style={[a.text_lg, a.font_bold]}>{title}</Text>
        {subtitle ? (
          <Text
            style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <View>
      <TextField.LabelText>{label}</TextField.LabelText>
      <TextField.Root>{children}</TextField.Root>
    </View>
  )
}

/** A labelled single text input, the most common field in these forms. */
export function TextRow({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
  maxLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'url'
  maxLength?: number
}) {
  return (
    <Field label={label}>
      <TextField.Input
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? null}
        multiline={multiline}
        numberOfLines={multiline ? 3 : undefined}
        style={
          multiline ? [{minHeight: 72, textAlignVertical: 'top'}] : undefined
        }
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'url' ? 'none' : undefined}
        maxLength={maxLength}
      />
    </Field>
  )
}

export function DateTimeRow({
  dateLabel,
  date,
  onDate,
  time,
  onTime,
}: {
  dateLabel: string
  date: string
  onDate: (date: string) => void
  time?: string
  /** Omit to collect a date only. */
  onTime?: (time: string) => void
}) {
  const {_} = useLingui()
  return (
    <View style={[a.flex_row, a.gap_sm, a.align_end]}>
      <View style={[a.flex_1]}>
        <TextField.LabelText>{dateLabel}</TextField.LabelText>
        <DateField
          label={dateLabel}
          value={date}
          onChangeDate={onDate}
          minimumDate={new Date(Date.now() - 1000 * 60 * 60 * 24 * 365)}
        />
      </View>
      {onTime ? (
        <View style={[{width: 96}]}>
          <TextField.LabelText>{_(msg`Time`)}</TextField.LabelText>
          <TextField.Root>
            <TextField.Input
              label={_(msg`Time (HH:MM)`)}
              placeholder="HH:MM"
              value={time}
              onChangeText={onTime}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </TextField.Root>
        </View>
      ) : null}
    </View>
  )
}
