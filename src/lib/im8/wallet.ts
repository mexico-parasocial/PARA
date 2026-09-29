import {m8Fetch} from '#/lib/im8/api'
import {
  type M8IdentityRequestOutcome,
  type M8WalletBindingRequest,
} from '#/lib/im8/types'

/**
 * PARA's side of the iM8 wallet relay (mubEZ CD-14), on the pattern of
 * im8Signer.ts. PARA never generates, holds or signs with a holder key, and
 * never receives the credentials:
 *
 *   Issuance:  PARA: POST /identity/wallet/binding-requests       → id, challenge
 *              iM8:  user approves → key made on the phone → fulfill
 *              PARA: poll until `bound`, then issue with walletBindingRequestId;
 *                    the credentials go to iM8's mailbox, not to PARA.
 *   Presenting: PARA: POST /identity/request                      → request id
 *              iM8:  shows everything it would reveal → user approves → signs
 *                    on the phone → POST /identity/verify
 *              PARA: poll GET /identity/request/:id                → result, once
 *
 * A v2 presentation is full-credential and carries the account DID: nothing
 * here is anonymous or selective. Gated with WALLET_HOLDER_KEY_SUPPORTED.
 */

const POLL_INTERVAL_MS = 1_500
/** The user has to switch to iM8 and confirm: allow more than the Matrix relay. */
const POLL_DEADLINE_MS = 120_000

export interface WalletPollOptions {
  deadlineMs?: number
  intervalMs?: number
}

export class WalletRequestError extends Error {
  constructor(
    message: string,
    public readonly reason: 'declined' | 'expired' | 'timeout' | 'failed',
  ) {
    super(message)
    this.name = 'WalletRequestError'
  }
}

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms))

/** Asks the iM8 wallet to bind a holder key for the next INE issuance. */
export async function requestWalletHolderBinding(
  options: WalletPollOptions = {},
): Promise<{walletBindingRequestId: string; issuanceChallenge: string}> {
  const created = await m8Fetch('/identity/wallet/binding-requests', {
    method: 'POST',
  })
  if (!created.ok) {
    throw new WalletRequestError(
      `Could not ask the iM8 wallet for a key (${created.status})`,
      'failed',
    )
  }
  const {id, issuanceChallenge} =
    (await created.json()) as M8WalletBindingRequest

  const deadline = Date.now() + (options.deadlineMs ?? POLL_DEADLINE_MS)
  while (Date.now() < deadline) {
    await sleep(options.intervalMs ?? POLL_INTERVAL_MS)
    const res = await m8Fetch(`/identity/wallet/binding-requests/${id}`, {
      method: 'GET',
    })
    if (res.status === 404) {
      throw new WalletRequestError('The wallet request expired', 'expired')
    }
    if (!res.ok) continue
    const view = (await res.json()) as M8WalletBindingRequest
    if (view.status === 'bound') {
      return {walletBindingRequestId: id, issuanceChallenge}
    }
    if (view.status === 'declined') {
      throw new WalletRequestError('Declined in iM8', 'declined')
    }
  }
  throw new WalletRequestError(
    'Approve the request in iM8 to continue',
    'timeout',
  )
}

/**
 * Waits for the iM8 wallet to present for an identity request PARA created,
 * and returns the minimal result. The broker hands it out once.
 */
export async function awaitWalletPresentation(
  requestId: string,
  options: WalletPollOptions = {},
): Promise<NonNullable<M8IdentityRequestOutcome['result']>> {
  const deadline = Date.now() + (options.deadlineMs ?? POLL_DEADLINE_MS)
  while (Date.now() < deadline) {
    await sleep(options.intervalMs ?? POLL_INTERVAL_MS)
    const res = await m8Fetch(`/identity/request/${requestId}`, {
      method: 'GET',
    })
    if (res.status === 404) {
      throw new WalletRequestError('Identity request not found', 'expired')
    }
    if (!res.ok) continue
    const outcome = (await res.json()) as M8IdentityRequestOutcome
    if (outcome.status === 'used') {
      if (outcome.result) return outcome.result
      throw new WalletRequestError(
        'The result was already read by another client',
        'failed',
      )
    }
    if (outcome.status === 'declined') {
      throw new WalletRequestError('Declined in iM8', 'declined')
    }
    if (
      outcome.status === 'expired' ||
      Date.parse(outcome.expiresAt) <= Date.now()
    ) {
      throw new WalletRequestError('The identity request expired', 'expired')
    }
  }
  throw new WalletRequestError(
    'Approve the request in iM8 to continue',
    'timeout',
  )
}
