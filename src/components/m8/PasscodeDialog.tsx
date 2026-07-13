import {useState} from 'react'
import {StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {OTPInput} from '#/components/contacts/components/OTPInput'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'

export function PasscodeDialog({
  control,
  onSubmit,
}: {
  control: Dialog.DialogControlProps
  onSubmit: (code: string) => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const [code, setCode] = useState('')

  function handleComplete(value: string) {
    onSubmit(value)
    setCode('')
  }

  function handleCancel() {
    onSubmit('')
    setCode('')
    control.close()
  }

  return (
    <Dialog.Outer control={control} nativeOptions={{preventExpansion: true}}>
      <Dialog.Handle />
      <Dialog.ScrollableInner
        label={_(msg`Wallet passcode`)}
        style={styles.inner}>
        <Text style={[styles.title, t.atoms.text]}>
          <Trans>Wallet passcode</Trans>
        </Text>
        <Text style={[styles.subtitle, t.atoms.text_contrast_medium]}>
          <Trans>Enter the 4-digit passcode to unlock your wallet.</Trans>
        </Text>

        <View style={styles.inputWrap}>
          <OTPInput
            label={_(msg`Passcode`)}
            value={code}
            onChange={setCode}
            numberOfDigits={4}
            onComplete={handleComplete}
          />
        </View>

        <Button
          label={_(msg`Cancel`)}
          onPress={handleCancel}
          variant="ghost"
          color="secondary"
          size="large"
          style={styles.cancelBtn}>
          <ButtonText>
            <Trans>Cancel</Trans>
          </ButtonText>
        </Button>
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  inputWrap: {
    marginTop: 24,
  },
  cancelBtn: {
    marginTop: 20,
  },
})
