// Mirror of m8/identity-manager types for PARA client

export type M8IdentityElementId =
  | 'age_over_18'
  | 'age_over_21'
  | 'citizenship'
  | 'district_hash'
  | 'curp_hash'
  | 'verified_public_figure'

export type M8IdentityStorageIntent =
  | { mode: 'will-not-store' }
  | { mode: 'may-store'; days: number }
  | { mode: 'may-store-until-revoked' }

export type M8IdentityRequestedElement = {
  id: M8IdentityElementId
  intentToStore: M8IdentityStorageIntent
  required: boolean
}

export type M8IdentityRequest = {
  id: string
  sessionId: string
  nonce: string
  audienceAppId: string
  audienceAppName: string
  purpose: string
  merchantIdentifier: string
  requestedElements: M8IdentityRequestedElement[]
  status: 'active' | 'used' | 'expired'
  createdAt: string
  expiresAt: string
  usedAt: string | null
}

export type M8IdentityCredentialClaims = Partial<Record<M8IdentityElementId, string | boolean>>

export type M8IdentityCredential = {
  id: string
  issuerDid: string
  subjectDid: string
  issuedAt: string
  expiresAt: string
  claims: M8IdentityCredentialClaims
  revocationHash: string
  signatureAlg: 'Ed25519'
  signature: string
}

export type M8WalletPresentation = {
  type: 'm8.identity.presentation.v1'
  requestId: string
  nonce: string
  audienceAppId: string
  credential: M8IdentityCredential
  disclosedClaims: M8IdentityCredentialClaims
  devicePublicKey: string
  issuedAt: string
  expiresAt: string
  signatureAlg: 'Ed25519'
  signature: string
}

export type M8TrustedIssuer = {
  did: string
  name: string
  country: string
  status: 'active' | 'suspended' | 'revoked'
  publicKeyPem: string
  allowedElements: M8IdentityElementId[]
}

export type M8IdentityVerificationResult = {
  valid: boolean
  requestId: string
  presentationId: string
  issuerDid: string | null
  issuerName: string | null
  subjectDid: string | null
  disclosedClaims: M8IdentityCredentialClaims
  checkedAt: string
  errors: string[]
  warnings: string[]
}

export type M8CivicVoteProof = {
  subjectUri: string
  subjectType:
    | 'cabildeo'
    | 'policy'
    | 'matter'
    | 'governance'
    | 'raq_axis'
    | 'raq_proposal'
    | 'community_proposal'
    | 'community_deliberation'
    | 'open_question_reply'
  aliasDid: string
  voteNullifier: string
  eligibilityProofRef: string
  issuedAt: string
  aliasDids: string[]
}

export type IneAddress = {
  street: string
  neighborhood: string
  city: string
  state: string
  postalCode: string
}

export type IneExtractedData = {
  fullName: string
  firstName: string
  lastNamePaternal: string
  lastNameMaternal: string
  curp: string
  voterId: string
  birthDate: string
  gender: 'M' | 'F'
  address: IneAddress
  photoHash: string
  expiryYear: number
}

export type IneVerificationResult = {
  faceMatch: {
    score: number
    threshold: number
    passed: boolean
  }
  renapo: {
    status: 'active' | 'deceased' | 'not-found' | 'duplicate'
    registeredName: string
    registeredCurp: string
    citizenship: 'MX'
    matched: boolean
  }
  overall: 'verified' | 'rejected' | 'manual-review-required'
  verificationId: string
  verifiedAt: string
}

export type ProofBrokerSurfaceId = 'public' | 'civic' | 'dating'

export type ProofBrokerDisclosureMode = 'proof-only' | 'signed-claim' | 'raw'

export type ProofBrokerGrantStatus = 'pending' | 'approved' | 'revoked' | 'expired'

export type ProofBrokerClaimType =
  | 'is_verified_public_figure'
  | 'is_civic_eligible'
  | 'has_para_verification'
  | 'has_party_affiliation_match'
  | 'joined_during_founding_period'
  | 'has_continuous_party_membership_30d'
  | 'is_age_eligible'
  | 'has_backup_coverage'

export type ProofBrokerAppKind =
  | 'Consumer app'
  | 'Civic app'
  | 'Community app'
  | 'Local app'
  | 'Verifier'
  | 'Broker'

export type ProofBrokerGrant = {
  id: string
  requestId: string
  appId: string
  appName: string
  appKind: ProofBrokerAppKind
  surface: ProofBrokerSurfaceId
  requestedClaims: Array<{ type: ProofBrokerClaimType; disclosure: ProofBrokerDisclosureMode; requestedValue?: string }>
  proofMode: ProofBrokerDisclosureMode
  status: ProofBrokerGrantStatus
  reason: string
  requestedAt: string
  issuedAt: string | null
  lastUsedAt: string | null
  expiresAt: string | null
  proofArtifactIds: string[]
  issuerId: 'para.identity' | 'm8.broker'
  reviewNote: string | null
}

export type ProofBrokerProofArtifact = {
  id: string
  grantId: string
  requestId: string
  claimType: ProofBrokerClaimType
  requestedValue: string | null
  outcome: 'verified' | 'not-verified' | 'matched' | 'mismatched' | 'bounded'
  statement: string
  proofMode: ProofBrokerDisclosureMode
  issuerId: string
  verifierId: string
  audienceAppId: string
  audienceAppName: string
  surface: ProofBrokerSurfaceId
  reference: string
  status: 'pending' | 'active' | 'revoked' | 'expired'
  issuedAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  revokedAt: string | null
}

export type ProofBrokerSession = {
  sessionId: string
  brokerMode: 'mock' | 'local'
  did: string
  handle: string
  displayName: string
  authorizationServer: string
  authenticatedAt: string
  pdsSafety: {
    state: 'Backed up' | 'Enroll now' | 'Needs attention'
    detail: string
    source: string
    lastBackup: string
  }
  personas: Array<{
    id: string
    name: string
    handle: string
    role: string
    summary: string
    activeSurface: ProofBrokerSurfaceId
    surfaceStates: Record<ProofBrokerSurfaceId, 'Live' | 'Limited' | 'Muted'>
  }>
  surfaces: Array<{
    id: ProofBrokerSurfaceId
    label: string
    audience: string
    status: 'Live' | 'Limited' | 'Muted'
    defaultDisclosureMode: ProofBrokerDisclosureMode
  }>
  claimRequests: unknown[]
  grants: ProofBrokerGrant[]
  proofs: ProofBrokerProofArtifact[]
  paraStatus: {
    providerId: 'para.identity'
    displayName: string
    availability: 'online' | 'degraded' | 'offline'
    compatibility: 'ready' | 'scoped' | 'needs-review'
    policyRecord: 'com.para.identity'
    compatibilityRecord: 'app.bsky.graph.verification'
    lastSyncAt: string
    supportedClaims: ProofBrokerClaimType[]
    notes: string
  }
  activePersonaId: string
  activeSurfaceId: ProofBrokerSurfaceId
  createdAt: string
  updatedAt: string
}

export type AnonymousProfile = {
  id: string
  displayName: string
  avatarSeed: string
  createdAt: string
}

export type DeviceTrustSummary = {
  status: 'unknown' | 'limited' | 'trusted'
  platform: 'ios' | 'android' | 'web' | null
  riskTier: 'low' | 'medium' | 'high' | null
  lastVerifiedAt: string | null
}

export type PublicProofBadge = {
  claimType: ProofBrokerClaimType
  label: string
  outcome: string
  issuedAt: string
}

export type AnonymousIdentityPost = {
  id: string
  identityId: string
  postUri: string
  communityUri: string | null
  postType: string
  proofArtifactIds: string[]
  dmPolicy: 'off' | 'requests' | 'para-verified'
  stats: {
    replyCount: number
    repostCount: number
    likeCount: number
    quoteCount: number
    threadCount: number
    syncedAt: string | null
  }
  createdAt: string
  updatedAt: string
}

export type AnonymousGermConnection = {
  id: string
  identityId: string
  provider: 'germ'
  providerRef: string
  contactUrl: string
  mode: 'germ-card-link' | 'm8-relay-pending-germ'
  status: 'active' | 'revoked'
  createdAt: string
  updatedAt: string
  revokedAt: string | null
}

export type AnonymousIdentityCard = {
  id: string
  displayName: string
  avatarSeed: string
  surface: ProofBrokerSurfaceId
  communityUri: string | null
  status: 'active' | 'archived'
  deviceTrust: DeviceTrustSummary
  proofBadges: PublicProofBadge[]
  posts: AnonymousIdentityPost[]
  germ: AnonymousGermConnection | null
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type AnonymousPublicContact =
  | {dmEnabled: false}
  | {
      dmEnabled: true
      provider: 'germ'
      label: 'Private reply via Germ DM'
      contactUrl?: string
      mode: 'germ-card-link' | 'm8-relay-pending-germ'
      proofBadges: PublicProofBadge[]
      dmPolicy?: 'requests' | 'para-verified'
      senderRequirement?: 'none' | 'para-verified'
    }

export type M8PajareoEntryType =
  | 'firma'
  | 'pregunta'
  | 'señal'
  | 'testimonio'

export type M8PajareoResponse = {
  id: string
  entryId: string
  representativeId: string
  kind: 'public' | 'official'
  responderDid: string
  responderDisplayName: string | null
  entityId: string | null
  entityName: string | null
  body: string
  controllerHash: string | null
  createdAt: string
}

export type M8PajareoOfficialResponse = {
  id: string
  entryId: string
  representativeId: string
  entityId: string
  entityName: string
  body: string
  controllerHash: string
  createdAt: string
}

export type M8PajareoEntry = {
  id: string
  representativeId: string
  type: M8PajareoEntryType
  body: string
  anonymousDisplayArea: string
  supportCount: number
  reportCount: number
  responseCount: number
  questionAnswered: boolean
  officialResponse?: M8PajareoOfficialResponse
  responses: M8PajareoResponse[]
  status: 'visible' | 'removed'
  createdAt: string
  updatedAt: string
}

export type M8PajareoEligibility = {
  representativeId: string
  eligible: boolean
  reason: 'eligible' | 'representative_not_verified'
  areaLabel: string
}

export type M8PajareoIdentitySummary = {
  id: string
  displayName: string
  surface: 'civic'
  communityUri: 'm8:pajareo'
}

export type M8PajareoFeed = {
  representativeId: string
  entries: M8PajareoEntry[]
  eligibility?: M8PajareoEligibility
  pajareoIdentity?: M8PajareoIdentitySummary
}

export type M8Tokens = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type M8SessionStartResponse = {
  attempt: {
    sessionId: string
    did: string
    handle: string
    authorizationServer: string
    authUrl: string
    phaseLabel: string
    startedAt: string
    resolvedAt: string
  }
  session: ProofBrokerSession
  tokens: M8Tokens
}
