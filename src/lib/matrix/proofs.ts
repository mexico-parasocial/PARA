import {matrixBridgeFetch} from '#/lib/matrix/bridge'

/**
 * CD-M6 proof-of-possession client (WatZappa matrix-bridge contract — see
 * services/matrix-bridge/docs/CLIENT_INTEGRATION.md).
 *
 * Every identity-bearing bridge call now carries a SignedAssertion: an
 * sr25519 signature by the user's PARA identity key over
 * (purpose, audience, identityPub, challenge, signedAt), where the challenge
 * is one-time, TTL-bounded and session-bound, issued by the bridge.
 *
 * PARA never holds the identity private key — it lives in the identity
 * manager (iM8). The signing seam is therefore explicit: a signer must be
 * installed at boot (see setMatrixAssertionSigner) that asks iM8 to sign.
 * Until that channel exists (W1a open decision: broker-mediated grant vs
 * deep-link return), proof-bearing calls fail fast with
 * MatrixProofUnavailableError instead of silently degrading.
 */

/** Must stay byte-identical to BRIDGE_AUDIENCES in the bridge's identity-proof.ts. */
export const BRIDGE_AUDIENCES = {
  identity: 'para-matrix-bridge/identity.v1',
  session: 'para-matrix-bridge/session.v1',
  join: 'para-matrix-bridge/join.v1',
  attest: 'para-matrix-bridge/attest.v1',
} as const

export type BridgeAudience =
  (typeof BRIDGE_AUDIENCES)[keyof typeof BRIDGE_AUDIENCES]

export const MATRIX_PROOF_PURPOSE = 'matrix-login'

export interface IdentityAssertion {
  type: 'para.identity.pop.v1'
  purpose: string
  audience: string
  identityPub: string
  challenge: string
  signedAt: string
}

export interface SignedAssertion {
  assertion: IdentityAssertion
  /** 64-byte sr25519 signature, hex. */
  signature: string
}

/**
 * Signs a bridge challenge with the user's `public` (or `anonymous`) PARA
 * identity key. Implemented by the iM8 handoff once W1a lands; tests install
 * a fake. Must refuse the ballot (`civic`) identity — that is iM8's
 * allowlist's job, not ours.
 */
export type MatrixAssertionSigner = (input: {
  audience: BridgeAudience
  challenge: string
}) => Promise<SignedAssertion>

export class MatrixProofUnavailableError extends Error {
  constructor(message = 'Matrix proof signer is not configured') {
    super(message)
    this.name = 'MatrixProofUnavailableError'
  }
}

let signer: MatrixAssertionSigner | undefined

export function setMatrixAssertionSigner(s: MatrixAssertionSigner): void {
  signer = s
}

export function hasMatrixAssertionSigner(): boolean {
  return signer != null
}

/** Detach the signer (tests, logout). */
export function clearMatrixAssertionSigner(): void {
  signer = undefined
}

interface ChallengeResponse {
  challenge: string
  expiresAt: string
  purpose: string
}

async function requestChallenge(): Promise<string> {
  const res = await matrixBridgeFetch('/api/matrix-challenge', {
    method: 'POST',
  })
  if (!res.ok) {
    throw new Error(`Failed to obtain Matrix challenge: ${res.status}`)
  }
  const body = (await res.json()) as ChallengeResponse
  if (body.purpose !== MATRIX_PROOF_PURPOSE || !body.challenge) {
    throw new Error('Malformed Matrix challenge response')
  }
  return body.challenge
}

/**
 * Run one proof-bearing bridge call: fetch a fresh challenge, have the
 * installed signer sign it for `audience`, and POST `{...fields, assertion,
 * signature}` to `path`. The challenge is consumed server-side on use —
 * never retry the returned promise with the same assertion.
 */
export async function bridgeCallWithProof<T>(
  audience: BridgeAudience,
  path: string,
  fields: Record<string, unknown> = {},
): Promise<T> {
  if (!signer) {
    throw new MatrixProofUnavailableError()
  }
  const challenge = await requestChallenge()
  const signed = await signer({audience, challenge})
  const res = await matrixBridgeFetch(path, {
    method: 'POST',
    body: JSON.stringify({...fields, ...signed}),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {error?: string}
    throw new Error(body.error || `Bridge call failed: ${res.status}`)
  }
  return (await res.json()) as T
}
