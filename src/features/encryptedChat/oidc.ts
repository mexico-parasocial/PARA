import * as WebBrowser from 'expo-web-browser'
import {type OidcConfiguration} from '@unomed/react-native-matrix-sdk'

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
  const result = await WebBrowser.openAuthSessionAsync(
    loginUrl,
    MATRIX_OIDC_REDIRECT_URI,
    {preferEphemeralSession: true},
  )
  if (result.type !== 'success') {
    // 'cancel' and 'dismiss' are the user backing out; anything else is the
    // browser failing to open. Neither is a login.
    throw new Error('CHAT_LOGIN_CANCELLED')
  }
  return result.url
}
