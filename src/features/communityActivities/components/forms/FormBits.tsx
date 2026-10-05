import {createContext, useContext} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {DateField} from '#/components/forms/DateField'
import * as TextField from '#/components/forms/TextField'
import {TimeField} from '#/components/forms/TimeField'
import {Text} from '#/components/Typography'
import {type FieldIssue} from '../../creation'

export {
  type Built,
  combineDateTime,
  optionalCount,
  splitLines,
  type Translate,
} from '../../creation'

export const FormContext = createContext<{
  disabled: boolean
  issues: FieldIssue[]
  visible: (field: string) => boolean
  touch: (field: string) => void
  register: (
    field: string,
    node: React.ComponentRef<typeof View> | null,
  ) => void
}>({
  disabled: false,
  issues: [],
  visible: () => false,
  touch: () => {},
  register: () => {},
})

export function useField(id: string, error?: string) {
  const form = useContext(FormContext)
  return {
    error:
      error ??
      (form.visible(id)
        ? form.issues.find(issue => issue.field === id)?.message
        : undefined),
    disabled: form.disabled,
    onBlur: () => form.touch(id),
    ref: (node: React.ComponentRef<typeof View> | null) =>
      form.register(id, node),
  }
}

export function FieldMessage({error, help}: {error?: string; help?: string}) {
  const t = useTheme()
  return error || help ? (
    <Text
      accessibilityLiveRegion={error ? 'polite' : 'none'}
      style={[
        a.text_sm,
        a.leading_snug,
        error ? {color: t.palette.negative_600} : t.atoms.text_contrast_medium,
      ]}>
      {error ?? help}
    </Text>
  ) : null
}

export function FieldGroup({
  id,
  help,
  children,
}: {
  id: string
  help?: string
  children: React.ReactNode
}) {
  const field = useField(id)
  return (
    <View ref={field.ref} collapsable={false} style={[a.gap_xs]}>
      {children}
      <FieldMessage error={field.error} help={help} />
    </View>
  )
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
        <Text accessibilityRole="header" style={[a.text_lg, a.font_bold]}>
          {title}
        </Text>
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

export function TextRow({
  id,
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
  maxLength,
  help,
  error,
  onBlur,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'url'
  maxLength?: number
  help?: string
  error?: string
  onBlur?: () => void
}) {
  const field = useField(id, error)
  return (
    <View ref={field.ref} collapsable={false} style={[a.gap_xs]}>
      <TextField.LabelText>{label}</TextField.LabelText>
      <TextField.Root isInvalid={Boolean(field.error)}>
        <TextField.Input
          editable={!field.disabled}
          label={label}
          value={value}
          onChangeText={onChange}
          onBlur={() => {
            field.onBlur()
            onBlur?.()
          }}
          accessibilityHint={field.error ?? help}
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
      </TextField.Root>
      <FieldMessage error={field.error} help={help} />
    </View>
  )
}

export function DateTimeRow({
  id,
  dateLabel,
  date,
  onDate,
  time,
  onTime,
  help,
  optional,
}: {
  id: string
  dateLabel: string
  date: string
  onDate: (date: string) => void
  time?: string
  onTime?: (time: string) => void
  help?: string
  optional?: boolean
}) {
  const {_} = useLingui()
  const field = useField(id)
  return (
    <View ref={field.ref} collapsable={false} style={[a.gap_xs]}>
      <View
        pointerEvents={field.disabled ? 'none' : 'auto'}
        style={[a.flex_row, a.flex_wrap, a.gap_sm, a.align_end]}>
        <View style={[a.flex_1, {minWidth: 190}]}>
          <TextField.LabelText>{dateLabel}</TextField.LabelText>
          <DateField
            disabled={field.disabled}
            label={dateLabel}
            value={date}
            onChangeDate={onDate}
            onConfirm={field.onBlur}
            onBlur={field.onBlur}
            isInvalid={Boolean(field.error)}
            accessibilityHint={field.error ?? help}
          />
        </View>
        {onTime ? (
          <View style={[{minWidth: 140}, a.flex_1]}>
            <TextField.LabelText>{_(msg`Time`)}</TextField.LabelText>
            <TimeField
              disabled={field.disabled}
              label={_(msg`${dateLabel}: time`)}
              value={time ?? ''}
              onChangeTime={onTime}
              onConfirm={field.onBlur}
              isInvalid={Boolean(field.error)}
              accessibilityHint={field.error ?? help}
            />
          </View>
        ) : null}
      </View>
      {optional && date ? (
        <Button
          label={_(msg`Clear date`)}
          disabled={field.disabled}
          size="tiny"
          color="secondary"
          style={[a.self_start]}
          onPress={() => onDate('')}>
          <ButtonText>{_(msg`Clear date`)}</ButtonText>
        </Button>
      ) : null}
      <FieldMessage error={field.error} help={help} />
    </View>
  )
}
