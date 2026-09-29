import {postIdentityRequest} from './api'
import {type M8IdentityRequest, type M8IdentityRequestOutcome} from './types'
import {awaitWalletPresentation, type WalletPollOptions} from './wallet'

/**
 * Identity verification from PARA goes through the iM8 wallet only (mubEZ
 * CD-14): PARA creates the request, the wallet shows the user everything the
 * presentation reveals, signs on the phone and submits it, and PARA reads the
 * minimal result back once. v2 presentations are full-credential and carry
 * the account DID; do not describe them as anonymous or selective.
 */
export async function requestIdentityVerification(payload: {
  audienceAppId: string
  audienceAppName: string
  purpose: string
  requestedElements: Array<{
    id: string
    intentToStore: unknown
    required: boolean
  }>
}): Promise<M8IdentityRequest> {
  return postIdentityRequest(payload)
}

export async function awaitIdentityVerification(
  requestId: string,
  options?: WalletPollOptions,
): Promise<NonNullable<M8IdentityRequestOutcome['result']>> {
  return awaitWalletPresentation(requestId, options)
}
