import {StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {openM8Verification} from '#/lib/im8/linking'
import {type NavigationProp} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {RaisingHand4Finger_Stroke2_Corner0_Rounded as RaisingHand} from '#/components/icons/RaisingHand'
import {Text} from '#/components/Typography'

export function CivicProofDialog({
  control,
}: {
  control: Dialog.DialogControlProps
}) {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()

  function handleOpenM8() {
    control.close()
    void openM8Verification()
  }

  function handleOpenParaWallet() {
    control.close()
    navigation.navigate('IdentityHub')
  }

  return (
    <Dialog.Outer control={control} nativeOptions={{preventExpansion: true}}>
      <Dialog.Handle />
      <Dialog.ScrollableInner
        label={_(msg`Civic proof required`)}
        style={styles.inner}>
        <View style={[a.align_center, a.mb_md]}>
          <View
            style={[
              styles.iconCircle,
              {backgroundColor: t.palette.primary_500 + '18'},
            ]}>
            <RaisingHand
              size="lg"
              fill={t.palette.primary_500}
              style={{color: t.palette.primary_500}}
            />
          </View>
        </View>

        <Text style={[styles.title, t.atoms.text]}>
          <Trans>Civic proof required</Trans>
        </Text>
        <Text style={[styles.subtitle, t.atoms.text_contrast_medium]}>
          <Trans>
            This action requires a verified civic identity. Complete
            verification in iM8, or open your PARA wallet.
          </Trans>
        </Text>

        <Button
          label={_(msg`Verify in iM8`)}
          onPress={handleOpenM8}
          variant="solid"
          color="primary"
          size="large"
          style={styles.actionBtn}>
          <ButtonText>
            <Trans>Verify in iM8</Trans>
          </ButtonText>
        </Button>

        <Button
          label={_(msg`Open PARA wallet`)}
          onPress={handleOpenParaWallet}
          variant="outline"
          color="primary"
          size="large"
          style={styles.secondaryBtn}>
          <ButtonText>
            <Trans>Open PARA wallet</Trans>
          </ButtonText>
        </Button>

        <Button
          label={_(msg`Cancel`)}
          onPress={() => control.close()}
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
  actionBtn: {
    marginTop: 24,
  },
  secondaryBtn: {
    marginTop: 12,
  },
  cancelBtn: {
    marginTop: 12,
  },
})
