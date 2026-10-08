import {useCallback, useEffect, useState} from 'react'
import {ActivityIndicator, Linking, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {getMe, logoutM8, startM8Session} from '#/lib/im8'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import {Text} from '#/components/Typography'
import {Card} from './IdentityPrimitives'

export type M8Connection =
  | {status: 'loading'}
  | {status: 'disconnected'}
  | {status: 'connected'; did: string; handle: string}

export function shortenDid(did: string) {
  return did.length > 26 ? `${did.slice(0, 18)}…${did.slice(-6)}` : did
}

/**
 * Whether this device holds an m8 broker session (mubEZ `GET /v1/sessions/me`).
 * `disconnect` only forgets the tokens on this device; it does not end the
 * session on the server.
 */
export function useM8Connection() {
  const [state, setState] = useState<M8Connection>({status: 'loading'})

  const refresh = useCallback(async () => {
    try {
      const {session} = await getMe()
      setState({
        status: 'connected',
        did: session.did,
        handle: session.handle,
      })
    } catch {
      setState({status: 'disconnected'})
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const disconnect = useCallback(async () => {
    await logoutM8()
    setState({status: 'disconnected'})
  }, [])

  return {state, refresh, disconnect}
}

export function ConnectingIndicator() {
  return (
    <View style={[a.flex_1, a.align_center, a.justify_center, a.p_xl]}>
      <ActivityIndicator />
    </View>
  )
}

/**
 * Connect flow for the Identity Hub: dev token bootstrap today, or an OAuth
 * handoff that opens in the system browser. Shown instead of the tabs while
 * the device has no m8 session.
 */
export function M8ConnectCard({onConnected}: {onConnected: () => void}) {
  const t = useTheme()
  const {_} = useLingui()
  const [identifier, setIdentifier] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [oauthPending, setOauthPending] = useState(false)

  const connect = useCallback(async () => {
    const input = identifier.trim()
    if (!input || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await startM8Session(input)
      if (res.tokens) {
        onConnected()
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
      setError(e instanceof Error ? e.message : _(msg`Connection failed`))
    } finally {
      setBusy(false)
    }
  }, [_, identifier, busy, onConnected])

  return (
    <View style={[a.p_lg]}>
      <Card style={[a.gap_md]}>
        <View style={[a.gap_xs]}>
          <Text style={[a.text_md, a.font_semi_bold, t.atoms.text]}>
            <Trans>Connect your identity wallet</Trans>
          </Text>
          <Text
            style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
            <Trans>
              Link your handle or DID to enable verified voting, anonymous
              identities, and karma.
            </Trans>
          </Text>
        </View>
        <TextField.Root>
          <TextField.Input
            label={_(msg`Handle or DID`)}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder={_(msg`handle.bsky.social or did:plc:…`)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={() => {
              void connect()
            }}
          />
        </TextField.Root>
        <Button
          variant="solid"
          color="primary"
          size="large"
          label={_(msg`Connect`)}
          disabled={busy || !identifier.trim()}
          onPress={() => {
            void connect()
          }}>
          {busy ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <ButtonText>
              <Trans>Connect</Trans>
            </ButtonText>
          )}
        </Button>
        {oauthPending ? (
          <View style={[a.gap_sm]}>
            <Text
              style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
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
              style={[a.self_start]}
              onPress={onConnected}>
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
      </Card>
    </View>
  )
}
