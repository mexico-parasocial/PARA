import {useState} from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {getDmServiceHeadersForServiceUrl} from '#/lib/constants'
import {usePalette} from '#/lib/hooks/usePalette'
import {useWebMediaQueries} from '#/lib/hooks/useWebMediaQueries'
import {cleanError} from '#/lib/strings/errors'
import {colors, gradients, s} from '#/lib/styles'
import {useTheme} from '#/lib/ThemeContext'
import {useAgent, useSession, useSessionApi} from '#/state/session'
import {ErrorMessage} from '#/view/com/util/error/ErrorMessage'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme as useNewTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfo} from '#/components/icons/CircleInfo'
import * as Toast from '#/components/Toast'
import {Text as NewText} from '#/components/Typography'
import {IS_WEB} from '#/env'
import {resetToTab} from '#/Navigation'

export function DeleteAccountDialog({
  control,
}: {
  control: Dialog.DialogOuterProps['control']
}) {
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <DeleteAccountDialogInner control={control} />
    </Dialog.Outer>
  )
}

function DeleteAccountDialogInner({
  control,
}: {
  control: Dialog.DialogOuterProps['control']
}) {
  const pal = usePalette('default')
  const theme = useTheme()
  const t = useNewTheme()
  const {currentAccount} = useSession()
  const agent = useAgent()
  const {removeAccount} = useSessionApi()
  const dmServiceHeaders = getDmServiceHeadersForServiceUrl(
    agent.serviceUrl.toString(),
  )
  const {_} = useLingui()
  const {isMobile} = useWebMediaQueries()
  const [isEmailSent, setIsEmailSent] = useState<boolean>(false)
  const [confirmCode, setConfirmCode] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const onPressSendEmail = async () => {
    setError('')
    setIsProcessing(true)
    try {
      await agent.com.atproto.server.requestAccountDelete()
      setIsEmailSent(true)
    } catch (e: unknown) {
      setError(cleanError(e))
    }
    setIsProcessing(false)
  }

  const onPressConfirmDelete = async () => {
    if (!currentAccount?.did) {
      throw new Error(`DeleteAccount modal: currentAccount.did is undefined`)
    }

    setError('')
    setIsProcessing(true)
    const token = confirmCode.replace(/\s/g, '')

    try {
      // inform chat service of intent to delete account
      const {success} = await agent.api.chat.bsky.actor.deleteAccount(
        undefined,
        {
          headers: dmServiceHeaders,
        },
      )
      if (!success) {
        throw new Error('Failed to inform chat service of account deletion')
      }
      await agent.com.atproto.server.deleteAccount({
        did: currentAccount.did,
        password,
        token,
      })
      Toast.show(_(msg`Your account has been deleted`))
      resetToTab('HomeTab')
      removeAccount(currentAccount)
      control.close()
    } catch (e: unknown) {
      setError(cleanError(e))
    }
    setIsProcessing(false)
  }

  const onCancel = () => {
    control.close()
  }

  return (
    <Dialog.ScrollableInner
      style={[pal.view, a.px_0]}
      label={_(msg`Delete Account`)}>
      <View style={[styles.titleContainer, pal.view]}>
        <Text type="title-xl" style={[s.textCenter, pal.text]}>
          <Trans>
            Delete Account{' '}
            <Text type="title-xl" style={[pal.text, s.bold]}>
              "
            </Text>
            <Text
              type="title-xl"
              numberOfLines={1}
              style={[
                isMobile ? styles.titleMobile : styles.titleDesktop,
                pal.text,
                s.bold,
              ]}>
              {currentAccount?.handle}
            </Text>
            <Text type="title-xl" style={[pal.text, s.bold]}>
              "
            </Text>
          </Trans>
        </Text>
      </View>
      {!isEmailSent ? (
        <>
          <Text type="lg" style={[styles.description, pal.text]}>
            <Trans>
              For security reasons, we'll need to send a confirmation code to
              your email address.
            </Trans>
          </Text>
          {error ? (
            <View style={[s.mt10, a.px_xl]}>
              <ErrorMessage message={error} />
            </View>
          ) : undefined}
          {isProcessing ? (
            <View style={[styles.btn, s.mt10]}>
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.mt20}
                onPress={onPressSendEmail}
                accessibilityRole="button"
                accessibilityLabel={_(msg`Send email`)}
                accessibilityHint={_(
                  msg`Sends email with confirmation code for account deletion`,
                )}>
                <LinearGradient
                  colors={[gradients.blueLight.start, gradients.blueLight.end]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={[styles.btn]}>
                  <Text type="button-lg" style={[s.white, s.bold]}>
                    <Trans context="action">Send Email</Trans>
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, s.mt10]}
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel={_(msg`Cancel account deletion`)}
                accessibilityHint=""
                onAccessibilityEscape={onCancel}>
                <Text type="button-lg" style={pal.textLight}>
                  <Trans context="action">Cancel</Trans>
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={[!IS_WEB && a.px_xl, a.px_xl]}>
            <View
              style={[
                a.w_full,
                a.flex_row,
                a.gap_sm,
                a.mt_lg,
                a.p_lg,
                a.rounded_sm,
                t.atoms.bg_contrast_25,
              ]}>
              <CircleInfo
                size="md"
                style={[
                  a.relative,
                  {
                    top: -1,
                  },
                ]}
              />

              <NewText style={[a.leading_snug, a.flex_1]}>
                <Trans>
                  You can also temporarily deactivate your account instead, and
                  reactivate it at any time.
                </Trans>
              </NewText>
            </View>
          </View>
        </>
      ) : (
        <>
          <Text
            type="lg"
            style={[pal.text, styles.description]}
            nativeID="confirmationCode">
            <Trans>
              Check your inbox for an email with the confirmation code to enter
              below:
            </Trans>
          </Text>
          <TextInput
            style={[styles.textInput, pal.borderDark, pal.text, styles.mb20]}
            placeholder={_(msg`Confirmation code`)}
            placeholderTextColor={pal.textLight.color}
            keyboardAppearance={theme.colorScheme}
            value={confirmCode}
            onChangeText={setConfirmCode}
            accessibilityLabelledBy="confirmationCode"
            accessibilityLabel={_(msg`Confirmation code`)}
            accessibilityHint={_(
              msg`Input confirmation code for account deletion`,
            )}
          />
          <Text
            type="lg"
            style={[pal.text, styles.description]}
            nativeID="password">
            <Trans>Please enter your password as well:</Trans>
          </Text>
          <TextInput
            style={[styles.textInput, pal.borderDark, pal.text]}
            placeholder={_(msg`Password`)}
            placeholderTextColor={pal.textLight.color}
            keyboardAppearance={theme.colorScheme}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            accessibilityLabelledBy="password"
            accessibilityLabel={_(msg`Password`)}
            accessibilityHint={_(msg`Input password for account deletion`)}
          />
          {error ? (
            <View style={[styles.mt20, a.px_xl]}>
              <ErrorMessage message={error} />
            </View>
          ) : undefined}
          {isProcessing ? (
            <View style={[styles.btn, s.mt10]}>
              <ActivityIndicator />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.evilBtn, styles.mt20]}
                onPress={onPressConfirmDelete}
                accessibilityRole="button"
                accessibilityLabel={_(msg`Confirm delete account`)}
                accessibilityHint="">
                <Text type="button-lg" style={[s.white, s.bold]}>
                  <Trans>Delete my account</Trans>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, s.mt10]}
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel={_(msg`Cancel account deletion`)}
                accessibilityHint={_(msg`Exits account deletion process`)}
                onAccessibilityEscape={onCancel}>
                <Text type="button-lg" style={pal.textLight}>
                  <Trans context="action">Cancel</Trans>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}
      <Dialog.Close />
    </Dialog.ScrollableInner>
  )
}

const styles = StyleSheet.create({
  titleContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 12,
    marginLeft: 20,
    marginRight: 20,
  },
  titleMobile: {
    textAlign: 'center',
  },
  titleDesktop: {
    textAlign: 'center',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    // @ts-ignore only rendered on web
    maxWidth: '400px',
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: 22,
    marginBottom: 10,
  },
  mt20: {
    marginTop: 20,
  },
  mb20: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    marginHorizontal: 20,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    padding: 14,
    marginHorizontal: 20,
  },
  evilBtn: {
    backgroundColor: colors.red4,
  },
})
