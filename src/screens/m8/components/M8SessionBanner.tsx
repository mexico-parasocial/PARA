import {useCallback, useEffect, useRef, useState} from 'react'
import {ActivityIndicator, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {getM8AccessToken, getMe, logoutM8} from '#/lib/im8'
import {M8_GRANT_ERROR_KEY, setM8ActiveAccount} from '#/lib/im8/credentials'
import * as Storage from '#/lib/im8/credentialStorage'
import {connectM8SessionFor} from '#/lib/im8/grant'
import {useSession} from '#/state/session'
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

/** Explicit OAuth connection for the currently signed-in PARA account. */
export function M8SessionBanner() {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const did = currentAccount?.did
  const activeDid = useRef(did)
  activeDid.current = did
  const [state, setState] = useState<ConnectionState>({status: 'loading'})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const describeError = useCallback(
    (code: string) => {
      if (code === 'M8_LOGIN_CANCELLED')
        return _(msg`Sign-in was cancelled. You can try again.`)
      if (code === 'M8_LOGIN_EXPIRED' || code.startsWith('OAUTH_EXCHANGE_'))
        return _(
          msg`This sign-in has expired or was already used. Please connect again.`,
        )
      if (code === 'M8_ACCOUNT_CHANGED' || code === 'M8_ACCOUNT_MISMATCH')
        return _(
          msg`Sign in with your current PARA account to connect your identity wallet.`,
        )
      if (
        code === 'M8_HANDOFF_NOT_CONFIGURED' ||
        code === 'OAUTH_RETURN_TO_INVALID' ||
        code === 'OAUTH_HANDOFF_UNAVAILABLE'
      )
        return _(
          msg`Identity sign-in is not available for this app yet. Please try again later.`,
        )
      return _(msg`Could not connect your identity wallet. Please try again.`)
    },
    [_],
  )

  useEffect(() => {
    let cancelled = false
    setState({status: 'loading'})
    setError(null)
    const restore = async () => {
      await setM8ActiveAccount(did)
      const code = await Storage.getItemAsync(M8_GRANT_ERROR_KEY)
      await Storage.deleteItemAsync(M8_GRANT_ERROR_KEY)
      if (code && !cancelled) setError(describeError(code))
      const token = did && (await getM8AccessToken())
      const result = token ? await getMe().catch(() => null) : null
      if (!cancelled) {
        setState(
          result?.session.did === did && result
            ? {
                status: 'connected',
                did: result.session.did,
                handle: result.session.handle,
              }
            : {status: 'disconnected'},
        )
      }
    }
    void restore().catch(() => {
      if (!cancelled) setState({status: 'disconnected'})
    })
    return () => {
      cancelled = true
    }
  }, [did, describeError])

  const connect = useCallback(async () => {
    if (!did || busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await connectM8SessionFor(did, () => activeDid.current)
      if (activeDid.current === did && result.tokens && result.session) {
        setState({
          status: 'connected',
          did: result.session.did,
          handle: result.session.handle,
        })
      }
    } catch (e) {
      if (activeDid.current === did)
        setError(describeError(e instanceof Error ? e.message : ''))
    } finally {
      setBusy(false)
    }
  }, [did, busy, describeError])

  const disconnect = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await logoutM8()
    } catch {
      if (activeDid.current === did)
        setError(
          _(
            msg`Disconnected on this device. Server sign-out could not be confirmed.`,
          ),
        )
    } finally {
      if (activeDid.current === did) setState({status: 'disconnected'})
      setBusy(false)
    }
  }, [did, _])

  if (state.status === 'loading') {
    return (
      <View style={[a.p_lg, a.align_center]}>
        <ActivityIndicator />
      </View>
    )
  }

  const connected = state.status === 'connected' && state.did === did
  return (
    <View style={[a.p_lg, a.gap_sm, {backgroundColor: t.palette.primary_25}]}>
      <Text style={[a.font_bold, a.text_md]}>
        {connected
          ? _(msg`Connected identity wallet`)
          : _(msg`Connect your identity wallet`)}
      </Text>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>
          Connect the account you are using in PARA to your identity wallet.
        </Trans>
      </Text>
      <View style={[a.flex_row, a.gap_md, a.align_center]}>
        <View style={[a.flex_1]}>
          <Text style={[a.font_bold, a.text_md]} numberOfLines={1}>
            {currentAccount?.handle
              ? `@${currentAccount.handle}`
              : _(msg`Sign in to PARA first`)}
          </Text>
          {did ? (
            <Text
              style={[a.text_sm, t.atoms.text_contrast_medium]}
              numberOfLines={1}>
              {shortenDid(did)}
            </Text>
          ) : null}
        </View>
        <Button
          variant={connected ? 'outline' : 'solid'}
          color={connected ? 'secondary' : 'primary'}
          size="small"
          label={connected ? _(msg`Disconnect`) : _(msg`Connect`)}
          disabled={busy || !did}
          onPress={connected ? disconnect : connect}>
          {busy ? (
            <ActivityIndicator size="small" />
          ) : (
            <ButtonText>
              {connected ? _(msg`Disconnect`) : _(msg`Connect`)}
            </ButtonText>
          )}
        </Button>
      </View>
      {busy && !connected ? (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>Complete sign-in in your browser to continue.</Trans>
        </Text>
      ) : null}
      {error ? (
        <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}
