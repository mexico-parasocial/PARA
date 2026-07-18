import {useCallback, useEffect, useState} from 'react'
import {ActivityIndicator, Linking, TextInput, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {getMe, logoutM8, startM8Session} from '#/lib/m8'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'

type ConnectionState =
  | {status: 'loading'}
  | {status: 'disconnected'}
  | {status: 'connected'; did: string; handle: string}

function shortenDid(did: string) {
  return did.length > 26 ? `${did.slice(0, 18)}…${did.slice(-6)}` : did
}

/**
 * Session banner for the Identity Hub. Shows whether the app holds an m8
 * broker session, offers the connect flow (dev token bootstrap today; OAuth
 * handoff opens in the system browser), and disconnect.
 */
export function M8SessionBanner() {
  const t = useTheme()
  const {_} = useLingui()
  const [state, setState] = useState<ConnectionState>({status: 'loading'})
  const [identifier, setIdentifier] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oauthPending, setOauthPending] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const {session} = await getMe()
      setState({
        status: 'connected',
        did: session.did,
        handle: session.handle,
      })
      setOauthPending(false)
    } catch {
      setState({status: 'disconnected'})
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const connect = useCallback(async () => {
    const input = identifier.trim()
    if (!input || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await startM8Session(input)
      if (res.tokens) {
        await refresh()
      } else {
        // OAuth-gated attempt: hand off to the system browser. The broker's
        // callback returns JSON tokens and cannot deep-link back into the
        // app yet, so the user completes sign-in manually.
        const url = res.oauthUrl ?? res.attempt.authUrl
        setOauthPending(true)
        if (url) {
          await Linking.openURL(url)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setBusy(false)
    }
  }, [identifier, busy, refresh])

  const disconnect = useCallback(async () => {
    setBusy(true)
    try {
      await logoutM8()
      setState({status: 'disconnected'})
    } finally {
      setBusy(false)
    }
  }, [])

  if (state.status === 'loading') {
    return (
      <View style={[a.p_lg, a.align_center]}>
        <ActivityIndicator />
      </View>
    )
  }

  if (state.status === 'connected') {
    return (
      <View
        style={[
          a.flex_row,
          a.align_center,
          a.justify_between,
          a.px_lg,
          a.py_md,
          a.gap_md,
          {backgroundColor: t.palette.primary_25},
        ]}>
        <View style={[a.flex_1]}>
          <Text style={[a.font_bold, a.text_md]} numberOfLines={1}>
            {state.handle ? `@${state.handle}` : _(msg`Connected wallet`)}
          </Text>
          <Text
            style={[a.text_sm, t.atoms.text_contrast_medium]}
            numberOfLines={1}>
            {shortenDid(state.did)}
          </Text>
        </View>
        <Button
          variant="outline"
          color="secondary"
          size="small"
          label={_(msg`Disconnect`)}
          disabled={busy}
          onPress={disconnect}>
          <ButtonText>
            <Trans>Disconnect</Trans>
          </ButtonText>
        </Button>
      </View>
    )
  }

  return (
    <View style={[a.p_lg, a.gap_sm, {backgroundColor: t.palette.primary_25}]}>
      <Text style={[a.font_bold, a.text_md]}>
        <Trans>Connect your identity wallet</Trans>
      </Text>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>
          Link your handle or DID to enable verified voting, anonymous
          identities, and karma.
        </Trans>
      </Text>
      <View style={[a.flex_row, a.gap_sm, a.align_center]}>
        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          placeholder={_(msg`handle.bsky.social or did:plc:…`)}
          placeholderTextColor={t.atoms.text_contrast_low.color}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={_(msg`Handle or DID`)}
          accessibilityHint={_(msg`Enter the account to connect to the identity wallet`)}
          style={[
            a.flex_1,
            a.px_md,
            a.py_sm,
            a.rounded_sm,
            t.atoms.text,
            {
              backgroundColor: t.atoms.bg.backgroundColor,
              borderWidth: 1,
              borderColor: t.atoms.border_contrast_low.borderColor,
            },
          ]}
        />
        <Button
          variant="solid"
          color="primary"
          size="small"
          label={_(msg`Connect`)}
          disabled={busy || !identifier.trim()}
          onPress={connect}>
          {busy ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <ButtonText>
              <Trans>Connect</Trans>
            </ButtonText>
          )}
        </Button>
      </View>
      {oauthPending ? (
        <View style={[a.gap_xs]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            <Trans>
              Finish signing in in your browser, then tap "Check status".
            </Trans>
          </Text>
          <Button
            variant="outline"
            color="secondary"
            size="small"
            label={_(msg`Check status`)}
            disabled={busy}
            onPress={refresh}>
            <ButtonText>
              <Trans>Check status</Trans>
            </ButtonText>
          </Button>
        </View>
      ) : null}
      {error ? (
        <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}
