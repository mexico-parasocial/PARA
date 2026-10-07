import {
  completeAuthorizationCodeGrant,
  generateOidcAuthorizationUrl,
  registerOidcClient,
  validateAuthMetadataAndKeys,
} from 'matrix-js-sdk/lib/oidc/index.js'

import * as Storage from '#/lib/storage'
import {logger} from '#/logger'

/**
 * Matrix login for the web client, through the homeserver's own OAuth 2.0
 * authorization-code flow.
 *
 * Why this exists: the bridge cannot mint a Matrix session on this deployment.
 * Authentication is delegated to MAS, so Synapse serves no `/login` at all
 * (`404 M_UNRECOGNIZED`), `m.login.application_service` included, and
 * `POST /api/matrix-token` answers `503 MATRIX_CLIENT_LOGIN_REQUIRED` by
 * design. The client has to obtain its own session, and the native engine's
 * flow (`oidc.ts`) cannot run here — it needs expo-web-browser and the Rust
 * SDK. See `services/matrix-bridge/docs/CLIENT_INTEGRATION.md`.
 *
 * The bridge is never in this path and never sees the resulting token.
 *
 * Storage: the session lands in `localStorage` (via `#/lib/storage`, which on
 * web is AsyncStorage). That is reachable by any script running on this origin,
 * so an XSS on PARA web can steal a chat session — the same exposure every
 * browser Matrix client has, and the reason the native engine keeps its
 * session in the OS keystore instead. It holds a chat session only: no PARA
 * identity key, no ballot key, and nothing that can mint a new session beyond
 * its own refresh token.
 */

/** Where the OP sends the browser back. Must be served by the SPA. */
export const MATRIX_OIDC_CALLBACK_PATH = '/matrix-auth'

const CLIENT_ID_KEY_PREFIX = 'matrix_oidc_client_id.'
const SESSION_KEY = 'matrix_oidc_session'
const RETURN_TO_KEY = 'matrix_oidc_return_to'

export interface MatrixWebSession {
  accessToken: string
  /** Absent when the OP issues no refresh token; the session then just expires. */
  refreshToken?: string
  /** Epoch ms. Absent when the OP returned no `expires_in`. */
  expiresAt?: number
  deviceId: string
  userId: string
  homeServer: string
  /** Needed to refresh: MAS is a public client, so the id is not a secret. */
  clientId: string
  tokenEndpoint: string
}

function origin(): string {
  return window.location.origin
}

function redirectUri(): string {
  return `${origin()}${MATRIX_OIDC_CALLBACK_PATH}`
}

/**
 * MSC2967 carries the Matrix device id inside the granted scope, because the
 * OP — not the client and not the bridge — decides it. It is the only place the
 * device id can be read from, so a response without one is unusable: a client
 * that invents a device id would attach its crypto identity to a device the
 * homeserver does not know.
 */
function deviceIdFromScope(scope: string): string | undefined {
  const prefix = 'urn:matrix:org.matrix.msc2967.client:device:'
  for (const entry of scope.split(' ')) {
    if (entry.startsWith(prefix)) {
      const deviceId = entry.slice(prefix.length)
      if (deviceId) return deviceId
    }
  }
  return undefined
}

async function authMetadata(homeServer: string) {
  const res = await fetch(
    `${homeServer.replace(/\/$/, '')}/_matrix/client/v1/auth_metadata`,
  )
  if (!res.ok) {
    throw new Error(`MATRIX_AUTH_METADATA_UNAVAILABLE_${res.status}`)
  }
  // Validates the metadata and fetches the issuer's signing keys. Throws on a
  // homeserver that advertises a flow we cannot complete.
  return validateAuthMetadataAndKeys(await res.json())
}

/**
 * Dynamic client registration (MSC2966). PARA has no pre-provisioned client id
 * on the homeserver's OP, and should not need one: a self-hosted deployment
 * would otherwise have to hand-register every client it wants to allow.
 *
 * The id is cached per issuer. It is not a credential — registration is public
 * and the client authenticates with PKCE, not a secret — but re-registering on
 * every login would litter the OP with duplicate clients.
 */
async function clientIdFor(
  config: Awaited<ReturnType<typeof authMetadata>>,
): Promise<string> {
  const cacheKey = `${CLIENT_ID_KEY_PREFIX}${config.issuer}`
  const cached = await Storage.getItemAsync(cacheKey)
  if (cached) return cached
  const clientId = await registerOidcClient(config, {
    clientName: 'PARA',
    // The spec requires every redirect uri to share this base, so it has to be
    // the app origin rather than a marketing URL.
    clientUri: origin(),
    applicationType: 'web',
    redirectUris: [redirectUri()],
    contacts: [],
    tosUri: `${origin()}/support/tos`,
    policyUri: `${origin()}/support/privacy-policy`,
  })
  await Storage.setItemAsync(cacheKey, clientId)
  return clientId
}

/**
 * Send the browser to the homeserver's authorization endpoint. Does not return:
 * the page navigates away, and the flow resumes in
 * {@link completeMatrixWebAuthorization} after the OP redirects back.
 */
export async function beginMatrixWebAuthorization({
  homeServer,
  returnTo,
}: {
  homeServer: string
  returnTo?: string
}): Promise<never> {
  const config = await authMetadata(homeServer)
  const clientId = await clientIdFor(config)
  // Where to land afterwards. The callback path renders nothing itself.
  await Storage.setItemAsync(
    RETURN_TO_KEY,
    returnTo ?? `${window.location.pathname}${window.location.search}`,
  )
  const url = await generateOidcAuthorizationUrl({
    metadata: config,
    redirectUri: redirectUri(),
    clientId,
    homeserverUrl: homeServer,
    nonce: crypto.randomUUID(),
  })
  window.location.assign(url)
  // Navigation is not instantaneous; keep callers from proceeding meanwhile.
  return new Promise<never>(() => {})
}

/**
 * Finish the flow if the current URL is the OP's redirect back to us.
 *
 * Returns the path to continue at, or `undefined` when this is an ordinary
 * page load and there is nothing to complete. Call it before the app renders,
 * so an authorization code never sits in a URL the app has started routing on.
 */
export async function completeMatrixWebAuthorization(): Promise<
  string | undefined
> {
  if (window.location.pathname !== MATRIX_OIDC_CALLBACK_PATH) return undefined
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  const returnTo = (await Storage.getItemAsync(RETURN_TO_KEY)) ?? '/'
  await Storage.deleteItemAsync(RETURN_TO_KEY)

  if (!code || !state) {
    // The OP reports a refusal here too — a declined consent screen is not an
    // error worth a crash, so go back and let the chat screen offer a retry.
    const error = params.get('error')
    if (error) {
      logger.warn('matrix: authorization refused by the homeserver', {
        safeMessage: error,
      })
    }
    return returnTo
  }

  const grant = await completeAuthorizationCodeGrant(code, state)
  const deviceId = deviceIdFromScope(grant.tokenResponse.scope)
  if (!deviceId) throw new Error('MATRIX_AUTH_NO_DEVICE_ID')

  const config = await authMetadata(grant.homeserverUrl)
  const session: MatrixWebSession = {
    accessToken: grant.tokenResponse.access_token,
    refreshToken: grant.tokenResponse.refresh_token,
    expiresAt: grant.tokenResponse.expires_in
      ? Date.now() + grant.tokenResponse.expires_in * 1000
      : undefined,
    deviceId,
    // `sub` is the OP's own subject identifier, not an MXID. The MXID comes
    // from the bridge's identity endpoint, which is the mapping's owner.
    userId: '',
    homeServer: grant.homeserverUrl,
    clientId: grant.oidcClientSettings.clientId,
    tokenEndpoint: config.token_endpoint,
  }
  await Storage.setItemAsync(SESSION_KEY, JSON.stringify(session))
  return returnTo
}

export async function loadMatrixWebSession(): Promise<
  MatrixWebSession | undefined
> {
  const raw = await Storage.getItemAsync(SESSION_KEY)
  if (!raw) return undefined
  try {
    const session = JSON.parse(raw) as MatrixWebSession
    if (!session.accessToken || !session.deviceId || !session.homeServer) {
      return undefined
    }
    return session
  } catch {
    await Storage.deleteItemAsync(SESSION_KEY)
    return undefined
  }
}

export async function clearMatrixWebSession(): Promise<void> {
  await Storage.deleteItemAsync(SESSION_KEY)
}

/**
 * Exchange the refresh token for a new access token.
 *
 * MAS issues short-lived access tokens, so a stored session is usually already
 * expired by the next page load. The iframe client refreshes itself while it
 * runs (see `tokenRefreshFunction` in matrix-client.ts); this is the host-side
 * refresh that makes the session usable again before the client is built.
 */
export async function refreshMatrixWebSession(
  session: MatrixWebSession,
): Promise<MatrixWebSession | undefined> {
  if (!session.refreshToken) return undefined
  const res = await fetch(session.tokenEndpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
      client_id: session.clientId,
    }).toString(),
  })
  if (!res.ok) {
    // An expired or revoked refresh token means the session is over, not that
    // something went wrong: drop it so the UI asks for authorization again
    // instead of retrying a grant the OP has already rejected.
    await clearMatrixWebSession()
    return undefined
  }
  const body = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope?: string
  }
  const refreshed: MatrixWebSession = {
    ...session,
    accessToken: body.access_token,
    // The OP may rotate the refresh token; keeping the old one would fail next
    // time. Only replace it when a new one is actually issued.
    refreshToken: body.refresh_token ?? session.refreshToken,
    expiresAt: body.expires_in
      ? Date.now() + body.expires_in * 1000
      : undefined,
  }
  await Storage.setItemAsync(SESSION_KEY, JSON.stringify(refreshed))
  return refreshed
}

/**
 * Persist a token the running chat client refreshed on its own.
 *
 * The client inside the iframe renews its access token when the homeserver
 * rejects it, and MAS rotates the refresh token when it does. Without storing
 * the rotation, the next page load would replay a refresh token the OP has
 * already retired and the session would be lost for no reason.
 */
export async function storeRefreshedMatrixWebSession(tokens: {
  accessToken: string
  refreshToken?: string
  expiresInMs?: number
}): Promise<void> {
  const current = await loadMatrixWebSession()
  if (!current) return
  const next: MatrixWebSession = {
    ...current,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? current.refreshToken,
    expiresAt: tokens.expiresInMs
      ? Date.now() + tokens.expiresInMs
      : undefined,
  }
  await Storage.setItemAsync(SESSION_KEY, JSON.stringify(next))
}

/** Treat a session as expired slightly early, so it does not die mid-request. */
const EXPIRY_SKEW_MS = 30_000

export function isMatrixWebSessionExpired(session: MatrixWebSession): boolean {
  if (session.expiresAt == null) return false
  return session.expiresAt - EXPIRY_SKEW_MS <= Date.now()
}
