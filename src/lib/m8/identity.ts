import { postIdentityPresent, postIdentityRequest, postIdentityVerify } from './api'
import type { M8IdentityRequest, M8IdentityVerificationResult,M8WalletPresentation } from './types'

export async function requestIdentityVerification(payload: {
  audienceAppId: string
  audienceAppName: string
  purpose: string
  requestedElements: Array<{ id: string; intentToStore: unknown; required: boolean }>
}): Promise<M8IdentityRequest> {
  return postIdentityRequest(payload)
}

export async function presentIdentityCredential(
  requestId: string,
  subjectDid: string,
  selectedElementIds?: string[]
): Promise<M8WalletPresentation> {
  return postIdentityPresent(requestId, subjectDid, selectedElementIds)
}

export async function verifyIdentityPresentation(
  requestId: string,
  presentation: M8WalletPresentation
): Promise<M8IdentityVerificationResult> {
  return postIdentityVerify(requestId, presentation)
}
