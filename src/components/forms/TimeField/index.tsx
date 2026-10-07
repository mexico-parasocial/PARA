import {useCallback, useState} from 'react'
import {Keyboard, View} from 'react-native'
import {DateTimePicker} from '@expo/ui/community/datetime-picker'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {TimeFieldButton} from './index.shared'
import {type TimeFieldProps} from './types'
import {toSimpleTimeString, toTimeDate} from './utils'
export * as utils from './utils'

/**
 * SwiftUI only accepts identifiers from `Locale.availableIdentifiers`, which
 * use underscores (`pt_BR`) rather than BCP 47 hyphens (`pt-BR`). Unknown
 * identifiers make the picker fall back to the system locale.
 */
function toAppleLocale(locale: string): string {
  return locale.replace(/-/g, '_')
}

/**
 * Time-only input. Accepts a string in the format HH:MM (24h). Returns the
 * picked time in the same format.
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
  const {_, i18n} = useLingui()
  const t = useTheme()
  const control = Dialog.useDialogControl()
  const [draft, setDraft] = useState(() => toTimeDate(value))

  const onChangeInternal = useCallback(
    (date: Date | undefined) => {
      if (date) {
        setDraft(date)
        onChangeTime(toSimpleTimeString(date))
      }
    },
    [onChangeTime],
  )

  return (
    <View>
      <TimeFieldButton
        disabled={disabled}
        label={label}
        value={value}
        onPress={() => {
          Keyboard.dismiss()
          setDraft(toTimeDate(value))
          control.open()
        }}
        isInvalid={isInvalid}
        accessibilityHint={accessibilityHint}
      />
      <Dialog.Outer control={control} nativeOptions={{preventExpansion: true}}>
        <Dialog.Handle />
        <Dialog.ScrollableInner label={label}>
          <View style={a.gap_lg}>
            <View style={[a.relative, a.w_full, a.align_center]}>
              <DateTimePicker
                style={a.w_full}
                value={draft}
                onValueChange={(_event, date) => onChangeInternal(date)}
                mode="time"
                display="spinner"
                themeVariant={t.scheme}
                locale={toAppleLocale(i18n.locale)}
              />
            </View>
            <Button
              label={_(msg`Done`)}
              onPress={() => {
                /*
                 * Commit the currently shown time even if the user never
                 * scrolled (onValueChange only fires on scroll), so onConfirm
                 * never reports a stale value.
                 */
                onChangeTime(toSimpleTimeString(draft))
                onConfirm?.()
                control.close()
              }}
              size="large"
              color="primary"
              variant="solid">
              <ButtonText>
                <Trans>Done</Trans>
              </ButtonText>
            </Button>
          </View>
        </Dialog.ScrollableInner>
      </Dialog.Outer>
    </View>
  )
}
