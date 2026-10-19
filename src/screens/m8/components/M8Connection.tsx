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
import {Card} from './IdentityPrimitives'

export type M8Connection =
  | {status: 'loading'}
  | {status: 'disconnected'}
  | {status: 'connected'; did: string; handle: string}

export function shortenDid(did: string) {
  return did.length > 26 ? `${did.slice(0, 18)}…${did.slice(-6)}` : did
}

/**
 * Whether the signed-in PARA account holds an m8 broker session, and the
 * actions to change that. Connecting is DID-bound: it always connects the
 * account PARA is currently using (OAuth handoff in the system browser).
 * Disconnecting revokes this device's m8 refresh token; grants and proofs
 * belong to the account's m8 session and are still there after reconnecting.
 */
export function useM8Connection() {
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const did = currentAccount?.did
  const activeDid = useRef(did)
  activeDid.current = did
  const [state, setState] = useState<M8Connection>({status: 'loading'})
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

  // A session for a different account than the one PARA is using is not ours.
  const connection: M8Connection =
    state.status === 'connected' && state.did !== did
      ? {status: 'disconnected'}
      : state

  return {
    connection,
    account: {did, handle: currentAccount?.handle},
    busy,
    error,
    connect,
    disconnect,
  }
}

export function ConnectingIndicator() {
  return (
    <View style={[a.flex_1, a.align_center, a.justify_center, a.p_xl]}>
      <ActivityIndicator />
    </View>
  )
}

/**
 * Shown instead of the tabs while the signed-in account has no m8 session.
 */
export function M8ConnectCard({
  account,
  busy,
  error,
  onConnect,
}: {
  account: {did: string | undefined; handle: string | undefined}
  busy: boolean
  error: string | null
  onConnect: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()

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
              Connect the account you are using in PARA to your identity wallet.
            </Trans>
          </Text>
        </View>
        <View style={[a.gap_2xs]}>
          <Text
            style={[a.text_md, a.font_semi_bold, t.atoms.text]}
            numberOfLines={1}>
            {account.handle
              ? `@${account.handle}`
              : _(msg`Sign in to PARA first`)}
          </Text>
          {account.did ? (
            <Text
              style={[a.text_sm, t.atoms.text_contrast_medium]}
              numberOfLines={1}>
              {shortenDid(account.did)}
            </Text>
          ) : null}
        </View>
        <Button
          variant="solid"
          color="primary"
          size="large"
          label={_(msg`Connect`)}
          disabled={busy || !account.did}
          onPress={onConnect}>
          {busy ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <ButtonText>
              <Trans>Connect</Trans>
            </ButtonText>
          )}
        </Button>
        {busy ? (
          <Text
            style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
            <Trans>Complete sign-in in your browser to continue.</Trans>
          </Text>
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
