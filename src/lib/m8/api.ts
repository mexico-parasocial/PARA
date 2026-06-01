import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  type AnonymousGermConnection,
  type AnonymousIdentityCard,
  type AnonymousIdentityPost,
  type AnonymousProfile,
  type AnonymousPublicContact,
  type DeviceTrustSummary,
  type IneExtractedData,
  type IneVerificationResult,
  type M8CivicVoteProof,
  type M8IdentityRequest,
  type M8IdentityVerificationResult,
  type M8SessionStartResponse,
  type M8WalletPresentation,
  type ProofBrokerGrant,
  type ProofBrokerProofArtifact,
  type ProofBrokerSession,
} from './types'

const M8_BROKER_URL =
  process.env.EXPO_PUBLIC_M8_BROKER_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8787' : 'http://127.0.0.1:8787')

const API_BASE = `${M8_BROKER_URL}/v1`

export async function getM8AccessToken(): Promise<string | null> {
  return AsyncStorage.getItem('m8_access_token')
}

async function setTokens(accessToken: string, refreshToken: string) {
  await AsyncStorage.setItem('m8_access_token', accessToken)
  await AsyncStorage.setItem('m8_refresh_token', refreshToken)
}

async function clearTokens() {
  await AsyncStorage.multiRemove(['m8_access_token', 'm8_refresh_token', 'm8_session_id'])
}

export async function m8Fetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getM8AccessToken()
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    // Attempt refresh
    const refreshed = await refreshM8AccessToken()
    if (refreshed) {
      const newToken = await getM8AccessToken()
      headers.authorization = `Bearer ${newToken}`
      return fetch(`${API_BASE}${path}`, { ...options, headers })
    }
  }

  return res
}

export async function refreshM8AccessToken(): Promise<boolean> {
  const refreshToken = await AsyncStorage.getItem('m8_refresh_token')
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_BASE}/sessions/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const body = (await res.json()) as { accessToken: string; expiresIn: number }
    await AsyncStorage.setItem('m8_access_token', body.accessToken)
    return true
  } catch {
    return false
  }
}

export async function postSessionStart(identifier: string): Promise<M8SessionStartResponse> {
  const res = await m8Fetch('/sessions/start', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Session start failed (${res.status})`)
  }
  const body = (await res.json()) as M8SessionStartResponse
  await setTokens(body.tokens.accessToken, body.tokens.refreshToken)
  await AsyncStorage.setItem('m8_session_id', body.attempt.sessionId)
  return body
}

export async function getMe(): Promise<{
  session: ProofBrokerSession
  anonymousProfile: AnonymousProfile | null
}> {
  const res = await m8Fetch('/sessions/me')
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Get session failed (${res.status})`)
  }
  const body = (await res.json()) as {
    session: ProofBrokerSession
    anonymousProfile: AnonymousProfile | null
  }
  return body
}

export async function getCurrentSession(): Promise<ProofBrokerSession> {
  const {session} = await getMe()
  return session
}

export async function restoreM8Session(): Promise<ProofBrokerSession | null> {
  const token = await getM8AccessToken()
  if (!token) return null
  try {
    return await getCurrentSession()
  } catch {
    return null
  }
}

export async function clearM8Session() {
  await clearTokens()
}

export async function postGrantRequest(payload: {
  appId: string
  appName: string
  appKind: string
  surface: string
  requestedClaims: Array<{ type: string; disclosure: string; requestedValue?: string }>
  proofMode: string
  reason: string
  expiresAt?: string | null
}): Promise<{ session: ProofBrokerSession; grant: ProofBrokerGrant; proofs: ProofBrokerProofArtifact[] }> {
  const res = await m8Fetch('/grants', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Grant request failed (${res.status})`)
  }
  return (await res.json()) as { session: ProofBrokerSession; grant: ProofBrokerGrant; proofs: ProofBrokerProofArtifact[] }
}

export async function postGrantApprove(grantId: string, reviewNote?: string): Promise<{ session: ProofBrokerSession; grant: ProofBrokerGrant; proofs: ProofBrokerProofArtifact[] }> {
  const res = await m8Fetch(`/grants/${grantId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ grantId, reviewNote }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Grant approve failed (${res.status})`)
  }
  return (await res.json()) as { session: ProofBrokerSession; grant: ProofBrokerGrant; proofs: ProofBrokerProofArtifact[] }
}

export async function postGrantRevoke(grantId: string, reason?: string): Promise<{ session: ProofBrokerSession; grant: ProofBrokerGrant; proofs: ProofBrokerProofArtifact[] }> {
  const res = await m8Fetch(`/grants/${grantId}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ grantId, reason }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Grant revoke failed (${res.status})`)
  }
  return (await res.json()) as { session: ProofBrokerSession; grant: ProofBrokerGrant; proofs: ProofBrokerProofArtifact[] }
}

export async function getGrants(): Promise<{ grants: ProofBrokerGrant[]; proofs: ProofBrokerProofArtifact[] }> {
  const res = await m8Fetch('/grants')
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Get grants failed (${res.status})`)
  }
  return (await res.json()) as { grants: ProofBrokerGrant[]; proofs: ProofBrokerProofArtifact[] }
}

export async function postIdentityRequest(payload: {
  audienceAppId: string
  audienceAppName: string
  purpose: string
  merchantIdentifier?: string
  requestedElements: Array<{ id: string; intentToStore: unknown; required: boolean }>
  expiresInSeconds?: number
}): Promise<M8IdentityRequest> {
  const res = await m8Fetch('/identity/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Identity request failed (${res.status})`)
  }
  return (await res.json()) as M8IdentityRequest
}

export async function postIdentityPresent(requestId: string, subjectDid: string, selectedElementIds?: string[]): Promise<M8WalletPresentation> {
  const res = await m8Fetch('/identity/present', {
    method: 'POST',
    body: JSON.stringify({ requestId, subjectDid, selectedElementIds }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Identity present failed (${res.status})`)
  }
  return (await res.json()) as M8WalletPresentation
}

export async function postIdentityVerify(requestId: string, presentation: M8WalletPresentation): Promise<M8IdentityVerificationResult> {
  const res = await m8Fetch('/identity/verify', {
    method: 'POST',
    body: JSON.stringify({ requestId, presentation }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Identity verify failed (${res.status})`)
  }
  return (await res.json()) as M8IdentityVerificationResult
}

export async function postCivicVoteProof(payload: {
  subjectUri: string
  subjectType: M8CivicVoteProof['subjectType']
  aliasDid?: string
}): Promise<M8CivicVoteProof> {
  const res = await m8Fetch('/identity/civic-vote-proof', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Civic vote proof failed (${res.status})`)
  }
  const body = (await res.json()) as { proof: M8CivicVoteProof }
  return body.proof
}

export async function getParaProviderStatus(): Promise<ProofBrokerSession['paraStatus']> {
  const res = await m8Fetch('/providers/para/status')
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Provider status failed (${res.status})`)
  }
  return (await res.json()) as ProofBrokerSession['paraStatus']
}

export async function postIneAnalyze(payload: {
  inePhotoBase64: string
  selfieBase64?: string
  simulatedMode?: boolean
}): Promise<{
  extracted: IneExtractedData
  ocrConfidence: number
  extractionStatus: 'complete' | 'partial' | 'failed'
  missingFields: string[]
}> {
  const res = await m8Fetch('/identity/ine/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `INE analyze failed (${res.status})`)
  }
  return (await res.json()) as {
    extracted: IneExtractedData
    ocrConfidence: number
    extractionStatus: 'complete' | 'partial' | 'failed'
    missingFields: string[]
  }
}

export async function postIneVerify(payload: {
  extracted: IneExtractedData
  selfieBase64: string
  consentToStore?: boolean
}): Promise<IneVerificationResult> {
  const res = await m8Fetch('/identity/ine/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `INE verify failed (${res.status})`)
  }
  return (await res.json()) as IneVerificationResult
}

export async function postIneCredential(payload: {
  extracted: IneExtractedData
  verification: IneVerificationResult
}): Promise<{
  credential: { claims: Record<string, unknown>; issuedAt: string; expiresAt: string }
  proofArtifactId: string
  verificationId: string
  salt: number
  birthYear: number
  commitment: string
  revocationHash: string
  anonymousProfile: AnonymousProfile
}> {
  const res = await m8Fetch('/identity/ine/credential', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `INE credential failed (${res.status})`)
  }
  return (await res.json()) as {
    credential: { claims: Record<string, unknown>; issuedAt: string; expiresAt: string }
    proofArtifactId: string
    verificationId: string
    salt: number
    birthYear: number
    commitment: string
    revocationHash: string
    anonymousProfile: AnonymousProfile
  }
}

export async function postZkpVerify(payload: {
  proof: unknown
  publicSignals: string[]
}): Promise<{ valid: boolean; commitment?: string; reason?: string }> {
  const res = await m8Fetch('/identity/ine/zkp-verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const body = (await res.json().catch(() => ({}))) as { valid: boolean; commitment?: string; reason?: string }
  if (!res.ok && !body.reason) {
    throw new Error(`ZKP verification failed (${res.status})`)
  }
  return body
}

export async function postRevokeCredential(payload: {
  revocationHash: string
  reason?: string
}): Promise<{ revoked: boolean; revokedAt?: string }> {
  const res = await m8Fetch('/identity/revoke', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Revocation failed (${res.status})`)
  }
  return (await res.json()) as { revoked: boolean; revokedAt?: string }
}

export async function getCrl(): Promise<{ revokedHashes: string[]; updatedAt: string }> {
  const res = await m8Fetch('/identity/crl')
  if (!res.ok) {
    throw new Error(`CRL fetch failed (${res.status})`)
  }
  return (await res.json()) as { revokedHashes: string[]; updatedAt: string }
}

export async function postAnonymousEnable(): Promise<{
  anonymousProfile: {
    id: string
    displayName: string
    avatarSeed: string
    createdAt: string
  }
}> {
  const res = await m8Fetch('/sessions/anonymous/enable', {
    method: 'POST',
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Enable anonymous mode failed (${res.status})`)
  }
  return (await res.json()) as {
    anonymousProfile: {
      id: string
      displayName: string
      avatarSeed: string
      createdAt: string
    }
  }
}

export async function postAnonymousDisable(): Promise<{ disabled: boolean }> {
  const res = await m8Fetch('/sessions/anonymous/disable', {
    method: 'POST',
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Disable anonymous mode failed (${res.status})`)
  }
  return (await res.json()) as { disabled: boolean }
}

export async function getAnonymousIdentities(): Promise<{identities: AnonymousIdentityCard[]}> {
  const res = await m8Fetch('/anonymous/identities')
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {error?: string}
    throw new Error(err.error ?? `Anonymous identities failed (${res.status})`)
  }
  return (await res.json()) as {identities: AnonymousIdentityCard[]}
}

export async function postAnonymousIdentity(payload: {
  displayName?: string
  surface?: string
  communityUri?: string | null
}): Promise<{identity: AnonymousIdentityCard}> {
  const res = await m8Fetch('/anonymous/identities', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {error?: string}
    throw new Error(err.error ?? `Create anonymous identity failed (${res.status})`)
  }
  return (await res.json()) as {identity: AnonymousIdentityCard}
}

export async function patchAnonymousIdentity(
  identityId: string,
  payload: {displayName?: string; status?: 'active' | 'archived'},
): Promise<{identity: AnonymousIdentityCard}> {
  const res = await m8Fetch(`/anonymous/identities/${encodeURIComponent(identityId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {error?: string}
    throw new Error(err.error ?? `Update anonymous identity failed (${res.status})`)
  }
  return (await res.json()) as {identity: AnonymousIdentityCard}
}

export async function postAnonymousPost(payload: {
  identityId?: string
  postUri: string
  communityUri?: string | null
  postType?: string
  stats?: {
    replyCount?: number
    repostCount?: number
    likeCount?: number
    quoteCount?: number
    threadCount?: number
  }
}): Promise<{post: AnonymousIdentityPost}> {
  const res = await m8Fetch('/anonymous/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {error?: string}
    throw new Error(err.error ?? `Link anonymous post failed (${res.status})`)
  }
  return (await res.json()) as {post: AnonymousIdentityPost}
}

export async function patchAnonymousPostStats(
  postId: string,
  stats: {
    replyCount?: number
    repostCount?: number
    likeCount?: number
    quoteCount?: number
    threadCount?: number
  },
): Promise<{post: AnonymousIdentityPost}> {
  const res = await m8Fetch(`/anonymous/posts/${encodeURIComponent(postId)}/stats`, {
    method: 'PATCH',
    body: JSON.stringify(stats),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {error?: string}
    throw new Error(err.error ?? `Update anonymous post stats failed (${res.status})`)
  }
  return (await res.json()) as {post: AnonymousIdentityPost}
}

export async function patchAnonymousPostDmPolicy(
  postId: string,
  dmPolicy: 'off' | 'requests',
): Promise<{post: AnonymousIdentityPost}> {
  const res = await m8Fetch(`/anonymous/posts/${encodeURIComponent(postId)}/dm-policy`, {
    method: 'PATCH',
    body: JSON.stringify({dmPolicy}),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {error?: string}
    throw new Error(err.error ?? `Update private reply policy failed (${res.status})`)
  }
  return (await res.json()) as {post: AnonymousIdentityPost}
}

export async function postAnonymousGermLink(
  identityId: string,
  payload: {
    contactUrl: string
    providerRef?: string
    mode?: 'germ-card-link' | 'm8-relay-pending-germ'
  },
): Promise<{germ: AnonymousGermConnection}> {
  const res = await m8Fetch(`/anonymous/identities/${encodeURIComponent(identityId)}/germ/link`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {error?: string}
    throw new Error(err.error ?? `Link Germ contact failed (${res.status})`)
  }
  return (await res.json()) as {germ: AnonymousGermConnection}
}

export async function postAnonymousGermUnlink(identityId: string): Promise<{germ: AnonymousGermConnection | null}> {
  const res = await m8Fetch(`/anonymous/identities/${encodeURIComponent(identityId)}/germ/unlink`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {error?: string}
    throw new Error(err.error ?? `Unlink Germ contact failed (${res.status})`)
  }
  return (await res.json()) as {germ: AnonymousGermConnection | null}
}

export async function getAnonymousPublicContact(postUri: string): Promise<AnonymousPublicContact> {
  const res = await m8Fetch(`/anonymous/public-contact?postUri=${encodeURIComponent(postUri)}`)
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {error?: string}
    throw new Error(err.error ?? `Anonymous contact failed (${res.status})`)
  }
  return (await res.json()) as AnonymousPublicContact
}

export async function getDeviceTrustMe(): Promise<{deviceTrust: DeviceTrustSummary}> {
  const res = await m8Fetch('/device-trust/me')
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {error?: string}
    throw new Error(err.error ?? `Device trust failed (${res.status})`)
  }
  return (await res.json()) as {deviceTrust: DeviceTrustSummary}
}

export function getZkpProverUrl(params: {
  birthYear: number
  salt: number
  currentYear: number
  ageThreshold: number
  circuit?: 'ine_age_proof' | 'nullifier_proof'
  communityId?: number
}): string {
  const search = new URLSearchParams({
    birthYear: String(params.birthYear),
    salt: String(params.salt),
    currentYear: String(params.currentYear),
    ageThreshold: String(params.ageThreshold),
    baseUrl: API_BASE,
    circuit: params.circuit ?? 'ine_age_proof',
  })
  if (params.communityId !== undefined) {
    search.append('communityId', String(params.communityId))
  }
  return `${API_BASE}/identity/ine/zkp-prover.html?${search.toString()}`
}

export async function postZkpNullifier(payload: {
  proof: unknown
  publicSignals: string[]
  communityId: string
}): Promise<{ valid: boolean; commitment?: string; nullifier?: string; reason?: string }> {
  const res = await m8Fetch('/identity/ine/zkp-nullifier', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const body = (await res.json().catch(() => ({}))) as {
    valid: boolean
    commitment?: string
    nullifier?: string
    reason?: string
  }
  if (!res.ok && !body.reason) {
    throw new Error(`Nullifier verification failed (${res.status})`)
  }
  return body
}

export async function postKarmaEarn(payload: {
  actionType: string
  communityId?: string
  points?: number
  detail?: Record<string, unknown>
}): Promise<{ earned: boolean; id: string; points: number }> {
  const res = await m8Fetch('/karma/earn', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Karma earn failed (${res.status})`)
  }
  return (await res.json()) as { earned: boolean; id: string; points: number }
}

export async function getKarmaMe(): Promise<{
  global: number
  byCommunity: Record<string, number>
  actions: Record<string, number>
  profileId: string
}> {
  const res = await m8Fetch('/karma/me')
  if (!res.ok) {
    throw new Error(`Karma fetch failed (${res.status})`)
  }
  return (await res.json()) as {
    global: number
    byCommunity: Record<string, number>
    actions: Record<string, number>
    profileId: string
  }
}

export async function getKarmaProfile(profileId: string): Promise<{
  profileId: string
  global: number | null
  byCommunity: Record<string, number>
  actions: Record<string, number>
  revealed: { global: boolean; communities: string[] }
}> {
  const res = await m8Fetch(`/karma/${profileId}`)
  if (!res.ok) {
    throw new Error(`Karma profile fetch failed (${res.status})`)
  }
  return (await res.json()) as {
    profileId: string
    global: number | null
    byCommunity: Record<string, number>
    actions: Record<string, number>
    revealed: { global: boolean; communities: string[] }
  }
}

export async function putKarmaRevelation(payload: {
  revealGlobal?: boolean
  revealCommunities?: string[]
}): Promise<{ updated: boolean }> {
  const res = await m8Fetch('/karma/revelation', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error ?? `Karma revelation update failed (${res.status})`)
  }
  return (await res.json()) as { updated: boolean }
}
