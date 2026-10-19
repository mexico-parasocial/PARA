import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import {type OidcConfiguration} from '@unomed/react-native-matrix-sdk'

import {approveMatrixIdpLink} from '#/lib/matrix/idpApproval'

/**
 * Where MAS sends the browser back to. Must match the `scheme` in
 * app.config.js and be registered with the authorization server.
 */
export const MATRIX_OIDC_REDIRECT_URI = 'para://matrix-auth'

/**
 * Client metadata presented to MAS during authorization. The user sees
 * `clientName` on the consent screen, so it must name PARA honestly.
 *
 * `staticRegistrations` maps homeserver (or issuer) URL to a pre-registered
 * client id, for authorization servers that do not offer dynamic client
 * registration. MAS supports dynamic registration, so this stays empty until a
 * deployment needs otherwise.
 */
export function buildOidcConfiguration(
  staticRegistrations: Map<string, string> = new Map(),
): OidcConfiguration {
  return {
    clientName: 'PARA',
    redirectUri: MATRIX_OIDC_REDIRECT_URI,
    clientUri: 'https://para.social',
    staticRegistrations,
  }
}

/**
 * Opens the authorization server's login page and resolves with the redirect
 * URL it sends the browser back to.
 *
 * Uses an auth session rather than a plain browser open: the result is
 * delivered to this call instead of a deep-link handler, so a redirect cannot
 * be picked up by unrelated app code, and cancelling is an explicit outcome
 * rather than a hang.
 *
 * The caller is responsible for aborting the SDK's pending authorization when
 * this rejects — see `connectEncryptedChat`.
 */
export async function authorizeInBrowser(loginUrl: string): Promise<string> {
  const issuer = process.env.EXPO_PUBLIC_MATRIX_IDP_URL
  const abort = new AbortController()
  const approvals = new Map<string, Promise<string>>()
  let rejectApproval: (error: unknown) => void = () => {}
  const failedApproval = new Promise<never>((_, reject) => {
    rejectApproval = reject
  })
  const approve = (url: string) => {
    if (!issuer || (!__DEV__ && !issuer.startsWith('https://')))
      return Promise.reject(new Error('CHAT_IDP_NOT_CONFIGURED'))
    let pending = approvals.get(url)
    if (!pending) {
      pending = approveMatrixIdpLink(url, issuer, loginUrl, abort.signal)
      approvals.set(url, pending)
    }
    return pending
  }
  const listener = Linking.addEventListener('url', ({url}) => {
    if (url.startsWith('para://idp-login?'))
      void approve(url).catch(rejectApproval)
  })
  try {
    let nextUrl = loginUrl
    for (let step = 0; step < 3; step++) {
      const result = await Promise.race([
        WebBrowser.openAuthSessionAsync(nextUrl, MATRIX_OIDC_REDIRECT_URI, {
          preferEphemeralSession: false,
        }),
        failedApproval,
      ])
      if (result.type !== 'success') throw new Error('CHAT_LOGIN_CANCELLED')
      // iOS matches the callback scheme, so the IdP handoff can finish the
      // first auth session before the final Matrix callback arrives.
      if (result.url.startsWith('para://idp-login?')) {
        nextUrl = await approve(result.url)
        continue
      }
      const callback = new URL(result.url)
      if (callback.protocol !== 'para:' || callback.hostname !== 'matrix-auth')
        throw new Error('CHAT_INVALID_OIDC_CALLBACK')
      return result.url
    }
    throw new Error('CHAT_IDP_APPROVAL_FAILED')
  } finally {
    abort.abort()
    listener.remove()
    WebBrowser.dismissAuthSession()
  }
}
