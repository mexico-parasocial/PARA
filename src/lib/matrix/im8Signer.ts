import {m8Fetch} from '#/lib/im8/api'
import {
  type BridgeAudience,
  hasMatrixAssertionSigner,
  type MatrixAssertionSigner,
  setMatrixAssertionSigner,
  type SignedAssertion,
} from '#/lib/matrix/proofs'

/**
 * The PARA↔iM8 signing channel (W1a), broker-mediated.
 *
 * PARA cannot sign CD-M4 assertions — identity keys live in the iM8 wallet,
 * and PARA never receives key material. This signer hands the bridge's
 * one-time challenge to the wallet through the M8 broker's sign-request
 * relay and waits for the wallet's approval:
 *
 *   PARA: POST /matrix/sign-requests {challenge, audience}  → requestId
 *   iM8:  user approves → signs locally → POST …/fulfill
 *   PARA: GET /matrix/sign-requests/:id (poll)              → assertion
 *
 * The relay is session-bound end to end: the request lives on PARA's own M8
 * session, so nothing crosses accounts. The challenge TTL on the bridge is
 * 5 minutes and the relay expires with it; we poll for 60s and then surface
 * a rejection the caller can show ("Aprueba la firma en iM8").
 */

const POLL_INTERVAL_MS = 1_000
const POLL_DEADLINE_MS = 60_000

export interface AssertionRequestOptions {
  /** Poll deadline; defaults to 60s. Testable callers may shorten it. */
  deadlineMs?: number
}

interface SignRequestCreated {
  id: string
  status: 'pending'
}

type SignRequestView =
  | {status: 'pending'}
  | {
      status: 'fulfilled'
      assertion: SignedAssertion
    }

export async function requestAssertionSignature(
  audience: BridgeAudience,
  challenge: string,
  options: AssertionRequestOptions = {},
): Promise<SignedAssertion> {
  const created = await m8Fetch('/matrix/sign-requests', {
    method: 'POST',
    body: JSON.stringify({challenge, audience}),
  })
  if (!created.ok) {
    throw new Error(`No se pudo crear la solicitud de firma: ${created.status}`)
  }
  const {id} = (await created.json()) as SignRequestCreated

  const deadline = Date.now() + (options.deadlineMs ?? POLL_DEADLINE_MS)
  while (Date.now() < deadline) {
    await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    const res = await m8Fetch(`/matrix/sign-requests/${id}`, {method: 'GET'})
    if (res.status === 404) {
      // Expired on the broker (or never existed): stop early, the bridge
      // challenge is equally dead.
      break
    }
    if (!res.ok) continue
    const view = (await res.json()) as SignRequestView
    if (view.status === 'fulfilled' && view.assertion?.signature) {
      return view.assertion
    }
  }
  throw new Error('Firma no aprobada a tiempo — ábrela desde iM8')
}

/**
 * The MatrixAssertionSigner handed to proofs.ts. Installed lazily by
 * `ensureMatrixProofSignerInstalled` (bootstrap) so no app-boot edit is
 * required and tests can install fakes instead.
 */
export function createIm8MatrixSigner(): MatrixAssertionSigner {
  return ({audience, challenge}) =>
    requestAssertionSignature(audience, challenge)
}

/** Test seam: the same signer with a short poll deadline. */
export function createIm8MatrixSignerWithDeadline(
  deadlineMs: number,
): MatrixAssertionSigner {
  return ({audience, challenge}) =>
    requestAssertionSignature(audience, challenge, {deadlineMs})
}

/** Install the real signer once; never over an already-installed one. */
export function ensureMatrixProofSignerInstalled(): void {
  if (!hasMatrixAssertionSigner()) {
    setMatrixAssertionSigner(createIm8MatrixSigner())
  }
}
