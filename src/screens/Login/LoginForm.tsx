import {useCallback, useRef, useState} from 'react'
import {
  ActivityIndicator,
  Keyboard,
  LayoutAnimation,
  StyleSheet,
  type TextInput,
  View,
} from 'react-native'
import {type ComAtprotoServerDescribeServer} from '@atproto/api'
import {LexAuthFactorError} from '@atproto/lex-password-session'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  HITSLOP_10,
  IS_LOCAL_DEV_MODE,
  LOCAL_DEV_SERVICE,
} from '#/lib/constants'
import {useRequestNotificationsPermission} from '#/lib/notifications/notifications'
import {toNiceHostingUrl} from '#/lib/strings/url-helpers'
import {cleanError, isNetworkError} from '#/lib/strings/errors'
import {createFullHandle} from '#/lib/strings/handles'
import {useSessionApi} from '#/state/session'
import {useSetHasCheckedForStarterPack} from '#/state/preferences/used-starter-packs'
import {getM8AccessToken, restoreM8Session} from '#/lib/im8/api'
import {authenticateBiometric} from '#/lib/im8/biometric'
import {openM8Verification} from '#/lib/im8/linking'
import {logger} from '#/logger'
import {useLoggedOutViewControls} from '#/state/shell/logged-out'
import {atoms as a, native, useBreakpoints, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {useDialogControl} from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import {useTextFieldContext} from '#/components/forms/TextField'
import {useHostingProvider} from '#/state/queries/pds-detection'
import * as SegmentedControl from '#/components/forms/SegmentedControl'
import {At_Stroke2_Corner0_Rounded as At} from '#/components/icons/At'
import {
  Eye_Stroke2_Corner0_Rounded as Eye,
} from '#/components/icons/Eye'
import {
  EyeSlash_Stroke2_Corner0_Rounded as EyeSlash,
} from '#/components/icons/EyeSlash'
import {Lock_Stroke2_Corner0_Rounded as Lock} from '#/components/icons/Lock'
import {Ticket_Stroke2_Corner0_Rounded as Ticket} from '#/components/icons/Ticket'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {IS_IOS} from '#/env'
import {ConfirmHostingProviderDialog} from './components/ConfirmHostingProviderDialog'
import {HostingProviderDialog} from './components/HostingProviderDialog'
import {FormContainer} from './FormContainer'

type ServiceDescription = ComAtprotoServerDescribeServer.OutputSchema

export const LoginForm = ({
  error,
  serviceUrl,
  serviceDescription,
  initialHandle,
  setError,
  setServiceUrl,
  onPressRetryConnect,
  onPressBack,
  onPressForgotPassword,
  onAttemptSuccess,
  onAttemptFailed,
}: {
  error: string
  serviceUrl: string
  serviceDescription: ServiceDescription | undefined
  initialHandle: string
  setError: (v: string) => void
  setServiceUrl: (v: string) => void
  onPressRetryConnect: () => void
  onPressBack: () => void
  onPressForgotPassword: () => void
  onAttemptSuccess: () => void
  onAttemptFailed: () => void
}) => {
  const {_} = useLingui()
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const {login} = useSessionApi()
  const requestNotificationsPermission = useRequestNotificationsPermission()
  const {setShowLoggedOut} = useLoggedOutViewControls()
  const setHasCheckedForStarterPack = useSetHasCheckedForStarterPack()

  const hostingProviderControl = useDialogControl()
  const confirmHostingProviderControl = useDialogControl()

  const [isProcessing, setIsProcessing] = useState(false)
  const [isAuthFactorTokenNeeded, setIsAuthFactorTokenNeeded] = useState(false)
  const [authFactorMethod, setAuthFactorMethod] = useState<'email' | 'im8'>(
    'email',
  )
  const [revealPassword, setRevealPassword] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [errorField, setErrorField] = useState<
    'identifier' | 'password' | 'authFactorToken' | 'unknown'
  >('unknown')
  const identifierValueRef = useRef(initialHandle || '')
  const passwordValueRef = useRef('')
  const [authFactorToken, setAuthFactorToken] = useState('')
  const identifierRef = useRef<React.ComponentRef<typeof TextInput>>(null)
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null)
  const hasFocusedOnce = useRef(false)

  const {
    state: hostingProviderState,
    service: hostingService,
    override: overrideHostingProvider,
    clearOverride: clearHostingOverride,
  } = useHostingProvider({
    identifier: identifierValueRef.current,
  })

  const isEmail = identifierValueRef.current.includes('@')

  const onPressSelectService = useCallback(() => {
    Keyboard.dismiss()
    hostingProviderControl.open()
  }, [hostingProviderControl])

  const onPressIm8Verify = useCallback(async () => {
    if (isProcessing) return
    setAuthFactorMethod('im8')
    setError('')
    setErrorField('unknown')
    setIsProcessing(true)

    // Easy UX: biometric gate in-app, then reuse the M8 session PARA
    // already holds. No app-switch, no polling loop.
    const biometricOk = await authenticateBiometric()
    if (!biometricOk) {
      setIsProcessing(false)
      setError(
        _(msg`Biometric check didn't pass. Try again or use an email code.`),
      )
      return
    }

    let token = await getM8AccessToken()
    if (!token) {
      const session = await restoreM8Session().catch(() => null)
      if (session) {
        token = await getM8AccessToken()
      }
    }
    if (!token) {
      setIsProcessing(false)
      setError(
        _(
          msg`No iM8 session found on this device. Open the iM8 app to connect, or use an email code instead.`,
        ),
      )
      await openM8Verification()
      return
    }

    setAuthFactorToken(token)
    // Auto-submit with the M8 token (isProcessing already true)
    try {
      const identifier = identifierValueRef.current.toLowerCase().trim()
      const password = passwordValueRef.current
      const service =
        hostingProviderState.status === 'overridden' &&
        hostingProviderState.pdsUrl
          ? hostingProviderState.pdsUrl
          : serviceUrl

      let fullIdent = identifier
      if (
        !identifier.includes('@') &&
        !identifier.includes('.') &&
        serviceDescription &&
        serviceDescription.availableUserDomains.length > 0
      ) {
        let matched = false
        for (const domain of serviceDescription.availableUserDomains) {
          if (fullIdent.endsWith(domain)) {
            matched = true
          }
        }
        if (!matched) {
          fullIdent = createFullHandle(
            identifier,
            serviceDescription.availableUserDomains[0],
          )
        }
      }

      await login(
        {
          service,
          identifier: fullIdent,
          password,
          authFactorToken: token,
        },
        'LoginForm',
      )
      onAttemptSuccess()
      setShowLoggedOut(false)
      setHasCheckedForStarterPack(true)
      requestNotificationsPermission('Login')
    } catch (e: unknown) {
      const errMsg = String(e)
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setIsProcessing(false)
      if (e instanceof LexAuthFactorError) {
        setError(_(msg`iM8 verification did not complete. Try again.`))
      } else {
        onAttemptFailed()
        setError(cleanError(errMsg))
      }
    }
  }, [
    isProcessing,
    hostingProviderState,
    serviceUrl,
    serviceDescription,
    login,
    onAttemptSuccess,
    onAttemptFailed,
    setShowLoggedOut,
    setHasCheckedForStarterPack,
    requestNotificationsPermission,
    _,
  ])

  const onPressNext = async () => {
    if (isProcessing) return
    Keyboard.dismiss()
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setError('')
    setErrorField('unknown')

    const identifier = identifierValueRef.current.toLowerCase().trim()
    const password = passwordValueRef.current

    if (!identifier) {
      setErrorField('identifier')
      setError(_(msg`Your username or email address appears to be invalid.`))
      return
    }

    if (!password) {
      setErrorField('password')
      setError(_(msg`Your password appears to be invalid.`))
      return
    }

    setIsProcessing(true)

    try {
      let fullIdent = identifier
      if (
        !identifier.includes('@') &&
        !identifier.includes('.') &&
        serviceDescription &&
        serviceDescription.availableUserDomains.length > 0
      ) {
        let matched = false
        for (const domain of serviceDescription.availableUserDomains) {
          if (fullIdent.endsWith(domain)) {
            matched = true
          }
        }
        if (!matched) {
          fullIdent = createFullHandle(
            identifier,
            serviceDescription.availableUserDomains[0],
          )
        }
      }

      const service = hostingProviderState.status === 'overridden' && hostingProviderState.pdsUrl
        ? hostingProviderState.pdsUrl
        : serviceUrl

      await login(
        {
          service,
          identifier: fullIdent,
          password,
          authFactorToken: authFactorToken.trim(),
        },
        'LoginForm',
      )
      onAttemptSuccess()
      setShowLoggedOut(false)
      setHasCheckedForStarterPack(true)
      requestNotificationsPermission('Login')
    } catch (e: unknown) {
      const errMsg = String(e)
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setIsProcessing(false)

      if (e instanceof LexAuthFactorError) {
        setErrorField('authFactorToken')
        setIsAuthFactorTokenNeeded(true)
      } else {
        onAttemptFailed()
        if (errMsg.includes('Token is invalid')) {
          setErrorField('authFactorToken')
          logger.debug('Failed to login due to invalid 2fa token', {
            error: errMsg,
          })
          setError(_(msg`Your confirmation code is incorrect.`))
        } else if (
          errMsg.includes('Authentication Required') ||
          errMsg.includes('Invalid identifier or password')
        ) {
          logger.debug('Failed to login due to invalid credentials', {
            error: errMsg,
          })

          setErrorField('unknown')
          setError(_(msg`Sorry, your password was incorrect.`))
        } else if (isNetworkError(e)) {
          logger.warn('Failed to login due to network error', {error: errMsg})
          setErrorField('unknown')
          setError(
            _(
              msg`Unable to contact your service. Please check your Internet connection.`,
            ),
          )
        } else if (errMsg.includes('Could not resolve identifier')) {
          setErrorField('identifier')
          setError(
            _(
              msg`It looks like you're not using a Bluesky-hosted PDS. Try signing in with your username and password instead.`,
            ),
          )
        } else {
          logger.warn('Failed to login', {error: errMsg})
          setErrorField('unknown')
          setError(cleanError(errMsg))
        }
      }
    }
  }

  const onSelectAutomatic = useCallback(() => {
    clearHostingOverride()
  }, [clearHostingOverride])

  const onSelectManual = useCallback(
    (url: string) => {
      overrideHostingProvider(url)
    },
    [overrideHostingProvider],
  )

  const onConfirm = useCallback(() => {
    onPressNext()
  }, [onPressNext])

  return (
    <FormContainer testID="loginForm" titleText={<Trans>Sign in</Trans>}>
      <View>
        <View
          style={[
            a.flex_row,
            a.align_center,
            a.gap_md,
            a.justify_between,
          ]}>
          <TextField.LabelText>
            <Trans>Hosting provider</Trans>
          </TextField.LabelText>
          {hostingProviderState.status === 'overridden' ? (
            <Button
              testID="hostingProviderResetBtn"
              label={_(msg`Change`)}
              accessibilityHint={_(
                msg`Resets the hosting provider to the default Bluesky service`,
              )}
              onPress={onPressSelectService}
              hitSlop={HITSLOP_10}>
              <ButtonText>
                <Trans>Change</Trans>
              </ButtonText>
            </Button>
          ) : null}
        </View>

        <View
          style={[
            a.rounded_md,
            a.border,
            t.atoms.border_contrast_medium,
            a.overflow_hidden,
            {flexDirection: 'row', height: 56, alignItems: 'center'},
            t.atoms.bg_contrast_25,
          ]}>
          <View style={[{paddingLeft: 16}]}>
            <Text style={[t.atoms.text_contrast_medium, a.text_sm]}>PARA</Text>
          </View>
          <View
            style={[
              {
                borderLeftWidth: StyleSheet.hairlineWidth,
                height: 28,
                marginVertical: 14,
                marginLeft: 12,
              },
              t.atoms.border_contrast_medium,
            ]}
          />
          <View style={[{flex: 1, paddingLeft: 12}]}>
            <Text numberOfLines={1} style={[t.atoms.text, a.text_md]}>
              {hostingProviderState.status === 'overridden' && hostingProviderState.pdsUrl
                ? toNiceHostingUrl(hostingProviderState.pdsUrl)
                : 'bsky.social'}
            </Text>
          </View>
          <View style={[{paddingRight: 16}]}>
            {hostingProviderState.status === 'overridden' && (
              <Text
                style={[
                  a.text_xs,
                  t.atoms.text_contrast_low,
                  {paddingRight: 10},
                ]}>
                <Trans>Custom</Trans>
              </Text>
            )}
          </View>
        </View>

        {IS_LOCAL_DEV_MODE && (
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_sm]}>
            <Trans>
              Local demo login: use provider {LOCAL_DEV_SERVICE}, account{' '}
              active-a.test, password hunter2.
            </Trans>
          </Text>
        )}
      </View>

      <View>
        <TextField.LabelText nativeID="login-username-label">
          <Trans>Account</Trans>
        </TextField.LabelText>
        <View style={[a.gap_sm]}>
          <TextField.Root isInvalid={errorField === 'identifier'}>
            <TextField.Icon icon={At} />
            <TextField.Input
              testID="loginUsernameInput"
              inputRef={identifierRef}
              label={_(msg`Username or email address`)}
              nativeID="login-username-label"
              autoCapitalize="none"
              autoFocus={!IS_IOS}
              autoCorrect={false}
              autoComplete="username"
              returnKeyType="next"
              textContentType="username"
              defaultValue={initialHandle || ''}
              onChangeText={v => {
                identifierValueRef.current = v
              }}
              onSubmitEditing={() => {
                passwordRef.current?.focus()
              }}
              blurOnSubmit={false}
              editable={!isProcessing}
              accessibilityHint={_(
                msg`Enter the username or email address you used when you created your account`,
              )}
            />
          </TextField.Root>

          <TextField.Root
            isInvalid={errorField === 'password'}
            style={
              !hasPassword || !revealPassword
                ? undefined
                : {color: t.palette.primary_500}
            }>
            <TextField.Icon icon={Lock} />
            <TextField.Input
              testID="loginPasswordInput"
              inputRef={passwordRef}
              label={_(msg`Password`)}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              returnKeyType="done"
              enablesReturnKeyAutomatically={true}
              secureTextEntry={!revealPassword}
              clearButtonMode="while-editing"
              onChangeText={v => {
                passwordValueRef.current = v
                if (v.length > 0) {
                  setHasPassword(true)
                } else {
                  setHasPassword(false)
                }
              }}
              onSubmitEditing={onPressNext}
              blurOnSubmit={false}
              editable={!isProcessing}
              accessibilityHint={_(msg`Enter your password`)}
              onLayout={native(() => {
                if (hasFocusedOnce.current) return
                hasFocusedOnce.current = true
                identifierRef.current?.focus()
              })}
            />
            {gtMobile ? (
              <Button
                testID="forgotPasswordButton"
                onPress={onPressForgotPassword}
                label={_(msg`Forgot password?`)}
                accessibilityHint={_(msg`Opens password reset form`)}
                hitSlop={HITSLOP_10}>
                <ButtonText>
                  <Trans>Forgot?</Trans>
                </ButtonText>
              </Button>
            ) : (
              <RevealPasswordButton
                revealPassword={revealPassword}
                hasPassword={hasPassword}
                onPress={() => setRevealPassword(prev => !prev)}
              />
            )}
          </TextField.Root>
        </View>
      </View>

      {isAuthFactorTokenNeeded && (
        <View>
          <SegmentedControl.Root
            type="tabs"
            label={_(msg`2FA method`)}
            value={authFactorMethod}
            onChange={v => setAuthFactorMethod(v as 'email' | 'im8')}>
            <SegmentedControl.Item
              testID="authFactorEmail"
              value="email"
              label={_(msg`Email code`)}>
              <SegmentedControl.ItemText>
                {_(msg`Email code`)}
              </SegmentedControl.ItemText>
            </SegmentedControl.Item>
            <SegmentedControl.Item
              testID="authFactorIm8"
              value="im8"
              label={_(msg`iM8`)}>
              <SegmentedControl.ItemText>
                {_(msg`iM8`)}
              </SegmentedControl.ItemText>
            </SegmentedControl.Item>
          </SegmentedControl.Root>

          {authFactorMethod === 'email' ? (
            <>
              <View
                style={[
                  a.flex_row,
                  a.align_center,
                  a.gap_md,
                  a.justify_between,
                  a.mt_md,
                ]}>
                <TextField.LabelText nativeID="auth-factor-token-label">
                  <Trans>2FA code</Trans>
                </TextField.LabelText>
                <Button
                  label={_(msg`Resend code`)}
                  accessibilityHint={_(
                    msg`Resends the 2FA code to your email`,
                  )}
                  hitSlop={HITSLOP_10}>
                  <ButtonText>
                    <Trans>Resend</Trans>
                  </ButtonText>
                </Button>
              </View>
              <TextField.Root isInvalid={errorField === 'authFactorToken'}>
                <TextField.Icon icon={Ticket} />
                <TextField.Input
                  testID="loginAuthFactorTokenInput"
                  label={_(msg`Confirmation code`)}
                  nativeID="auth-factor-token-label"
                  autoCapitalize="none"
                  autoFocus
                  autoCorrect={false}
                  autoComplete="one-time-code"
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onChangeText={setAuthFactorToken}
                  value={authFactorToken}
                  onSubmitEditing={onPressNext}
                  editable={!isProcessing}
                  accessibilityHint={_(
                    msg`Input the code which has been emailed to you`,
                  )}
                  style={{
                    textTransform:
                      authFactorToken === '' ? 'none' : 'uppercase',
                  }}
                />
              </TextField.Root>
              <Text
                style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_sm]}>
                <Trans>
                  Check your email for a sign in code and enter it here.
                </Trans>
              </Text>
            </>
          ) : (
            <View style={[a.mt_md]}>
              {authFactorToken ? (
                <Admonition type="tip">
                  <Trans>iM8 verified. Signing in...</Trans>
                </Admonition>
              ) : (
                <>
                  <Admonition type="info">
                    <Trans>
                      One tap: confirm with FaceID and we'll use your iM8
                      session on this device to finish signing in. No codes
                      to type.
                    </Trans>
                  </Admonition>
                  <Button
                    testID="loginIm8VerifyButton"
                    label={_(msg`Verify with iM8`)}
                    accessibilityHint={_(
                      msg`Confirms your identity with biometrics and signs in using iM8`,
                    )}
                    variant="solid"
                    color="primary"
                    size="large"
                    onPress={onPressIm8Verify}
                    style={[a.mt_md]}>
                    <ButtonText>
                      <Trans>Verify with iM8</Trans>
                    </ButtonText>
                  </Button>
                </>
              )}
            </View>
          )}
        </View>
      )}

      <View>
        {error ? (
          <Admonition type="error" style={[{marginBottom: 4}]}>
            {error}
          </Admonition>
        ) : null}
        {isAuthFactorTokenNeeded && !error ? (
          <Admonition type="info">
            <Trans>
              Enter the two-factor authentication code provided by your
              identity provider.
            </Trans>
          </Admonition>
        ) : null}
        {!serviceDescription && !error ? (
          <Admonition type="info">
            <Trans>
              If this service is using a Bluesky hosting provider, you can sign
              in with your Bluesky account. Otherwise, you'll need to sign in
              with the username and password for that specific hosting provider.
            </Trans>
          </Admonition>
        ) : null}
      </View>

      <View style={[a.flex_row, a.align_center, a.pt_md]}>
        <Button
          label={_(msg`Back`)}
          variant="solid"
          color="secondary"
          size="large"
          onPress={onPressBack}>
          <ButtonText>
            <Trans>Back</Trans>
          </ButtonText>
        </Button>
        <View style={a.flex_1} />
        {!serviceDescription && error ? (
          <Button
            testID="loginRetryButton"
            label={_(msg`Retry`)}
            accessibilityHint={_(msg`Retries signing in`)}
            variant="solid"
            color="secondary"
            size="large"
            onPress={onPressRetryConnect}>
            <ButtonText>
              <Trans>Retry</Trans>
            </ButtonText>
          </Button>
        ) : !serviceDescription ? (
          <>
            <ActivityIndicator />
            <Text style={[t.atoms.text_contrast_high, a.pl_md]}>
              <Trans>Connecting...</Trans>
            </Text>
          </>
        ) : (
          <Button
            testID="loginNextButton"
            label={_(msg`Sign in`)}
            accessibilityHint={_(msg`Attempts to sign in`)}
            variant="solid"
            color="primary"
            size="large"
            onPress={onPressNext}>
            <ButtonText>
              <Trans>Sign in</Trans>
            </ButtonText>
            {isProcessing && <ButtonIcon icon={Loader} />}
          </Button>
        )}
      </View>

      <HostingProviderDialog
        control={hostingProviderControl}
        currentOverride={
          hostingProviderState.status === 'overridden' && hostingProviderState.pdsUrl
            ? hostingProviderState.pdsUrl
            : null
        }
        isEmail={isEmail}
        onSelectManual={onSelectManual}
        onSelectAutomatic={onSelectAutomatic}
      />

      <ConfirmHostingProviderDialog
        control={confirmHostingProviderControl}
        host={
          hostingProviderState.status === 'overridden' && hostingProviderState.pdsUrl
            ? toNiceHostingUrl(hostingProviderState.pdsUrl)
            : ''
        }
        identifier={identifierValueRef.current}
        passwordLength={passwordValueRef.current.length}
        onConfirm={onConfirm}
      />
    </FormContainer>
  )
}

function RevealPasswordButton({
  revealPassword,
  hasPassword,
  onPress,
}: {
  revealPassword: boolean
  hasPassword: boolean
  onPress: () => void
}) {
  const {_} = useLingui()
  const {focused} = useTextFieldContext()
  const t = useTheme()
  return (
    <Button
      testID="revealPasswordButton"
      label={_(msg`Reveal password`)}
      accessibilityHint={_(msg`Reveals your current password`)}
      onPress={onPress}
      hitSlop={HITSLOP_10}
      style={[{padding: 6}]}>
      {hasPassword ? (
        <RevealPasswordIcon revealPassword={revealPassword} />
      ) : (
        <Lock size="sm" style={[t.atoms.text_contrast_low]} />
      )}
    </Button>
  )
}

function RevealPasswordIcon({revealPassword}: {revealPassword: boolean}) {
  const {focused} = useTextFieldContext()
  const t = useTheme()
  return (
    <>
      {!revealPassword ? (
        <Eye
          size="sm"
          style={[
            focused
              ? t.atoms.text_contrast_high
              : t.atoms.text_contrast_medium,
          ]}
        />
      ) : (
        <EyeSlash
          size="sm"
          style={[
            focused
              ? t.atoms.text_contrast_high
              : t.atoms.text_contrast_medium,
          ]}
        />
      )}
    </>
  )
}
