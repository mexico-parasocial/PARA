export type TimeFieldProps = {
  disabled?: boolean
  value: string
  label: string
  onChangeTime: (value: string) => void
  onConfirm?: () => void
  isInvalid?: boolean
  accessibilityHint?: string
}
