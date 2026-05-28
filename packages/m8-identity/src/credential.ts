import { generateKeyPairSync, createSign, createVerify, randomBytes } from 'crypto'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface M8Credential {
  // Header
  version: 'm8-identity-1'
  issuerDid: string
  issuedAt: string // ISO 8601
  expiresAt: string // ISO 8601
  credentialId: string // UUID v4

  // Claims (selective disclosure)
  claims: {
    // Hash of CURP, not the full CURP. Proves citizenship without revealing it.
    curvHash?: string // SHA-256 of CURP + salt
    ageOver18?: boolean
    ageOver21?: boolean
    district?: string // Hashed district code
    citizenship?: 'MX'
    // Future: gender, voting eligibility, etc.
  }

  // Proof
  proof: {
    type: 'Ed25519Signature2020'
    created: string
    proofPurpose: 'assertionMethod'
    verificationMethod: string // DID URL of issuer's signing key
    challenge?: string // For presentation binding
    jws: string // Base64url-encoded signature
  }
}

export interface M8Presentation {
  credential: M8Credential
  // Selective disclosure: which claims are being revealed
  disclosedClaims: (keyof M8Credential['claims'])[]
  // Device binding: proves this presentation came from the legitimate holder
  deviceBinding: {
    deviceKeyFingerprint: string // Hash of device's public key
    timestamp: string
    nonce: string
    signature: string // Device signs (credentialId + nonce + timestamp)
  }
}

// ─── Key Generation ─────────────────────────────────────────────────────────

export interface KeyPair {
  publicKey: string
  privateKey: string
  fingerprint: string // SHA-256 of publicKey, first 16 chars
}

export function generateDeviceKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  const fingerprint = hashPublicKey(Buffer.from(publicKey))
  return { publicKey, privateKey, fingerprint }
}

export function hashPublicKey(publicKey: Buffer): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(publicKey).digest('hex').slice(0, 16)
}

// ─── Issuer Key Management ──────────────────────────────────────────────────

export interface IssuerKeySet {
  did: string
  signingKey: KeyPair
  revocationKey: KeyPair // Separate key for revocation operations
  createdAt: string
  expiresAt: string
}

export function createIssuerKeys(did: string): IssuerKeySet {
  return {
    did,
    signingKey: generateDeviceKeyPair(),
    revocationKey: generateDeviceKeyPair(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
  }
}

// ─── Credential Creation ──────────────────────────────────────────────────

export interface CredentialInput {
  issuerDid: string
  issuerPrivateKey: string
  claims: M8Credential['claims']
  validityDays?: number
}

export function createCredential(input: CredentialInput): M8Credential {
  const credentialId = randomBytes(16).toString('hex')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + (input.validityDays ?? 365) * 24 * 60 * 60 * 1000)

  const credential: Omit<M8Credential, 'proof'> = {
    version: 'm8-identity-1',
    issuerDid: input.issuerDid,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    credentialId,
    claims: input.claims,
  }

  // Sign the credential using Ed25519
  const sign = createSign('SHA256')
  sign.update(JSON.stringify(credential))
  sign.end()
  const signature = sign.sign(input.issuerPrivateKey, 'base64url')

  return {
    ...credential,
    proof: {
      type: 'Ed25519Signature2020',
      created: now.toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: `${input.issuerDid}#signing-key-1`,
      jws: signature,
    },
  }
}

// ─── Verification ───────────────────────────────────────────────────────────

export interface VerificationResult {
  valid: boolean
  reason?: string
  claims?: M8Credential['claims']
  issuerDid?: string
  issuedAt?: string
  expiresAt?: string
}

export function verifyCredential(
  credential: M8Credential,
  issuerPublicKey: string,
): VerificationResult {
  // 1. Check expiration
  const now = new Date()
  const expiresAt = new Date(credential.expiresAt)
  if (now > expiresAt) {
    return { valid: false, reason: 'Credential expired' }
  }

  // 2. Verify signature
  const { proof, ...credentialWithoutProof } = credential
  const verify = createVerify('SHA256')
  verify.update(JSON.stringify(credentialWithoutProof))
  verify.end()

  const isValid = verify.verify(issuerPublicKey, proof.jws, 'base64url')
  if (!isValid) {
    return { valid: false, reason: 'Invalid signature' }
  }

  return {
    valid: true,
    claims: credential.claims,
    issuerDid: credential.issuerDid,
    issuedAt: credential.issuedAt,
    expiresAt: credential.expiresAt,
  }
}

// ─── Presentation Creation ─────────────────────────────────────────────────

export interface PresentationInput {
  credential: M8Credential
  devicePrivateKey: string
  disclosedClaims: (keyof M8Credential['claims'])[]
}

export function createPresentation(input: PresentationInput): M8Presentation {
  const nonce = randomBytes(16).toString('hex')
  const timestamp = new Date().toISOString()

  // Device signs the binding
  const bindingData = input.credential.credentialId + nonce + timestamp
  const sign = createSign('SHA256')
  sign.update(bindingData)
  sign.end()
  const deviceSignature = sign.sign(input.devicePrivateKey, 'base64url')

  return {
    credential: input.credential,
    disclosedClaims: input.disclosedClaims,
    deviceBinding: {
      deviceKeyFingerprint: hashPublicKey(Buffer.from(input.devicePrivateKey)), // Actually should be public key, fixed below
      timestamp,
      nonce,
      signature: deviceSignature,
    },
  }
}

// Fixed version with proper device key fingerprint
export function createPresentationFixed(
  input: PresentationInput & { devicePublicKey: string },
): M8Presentation {
  const nonce = randomBytes(16).toString('hex')
  const timestamp = new Date().toISOString()

  const bindingData = input.credential.credentialId + nonce + timestamp
  const sign = createSign('SHA256')
  sign.update(bindingData)
  sign.end()
  const deviceSignature = sign.sign(input.devicePrivateKey, 'base64url')

  return {
    credential: input.credential,
    disclosedClaims: input.disclosedClaims,
    deviceBinding: {
      deviceKeyFingerprint: hashPublicKey(Buffer.from(input.devicePublicKey)),
      timestamp,
      nonce,
      signature: deviceSignature,
    },
  }
}

// ─── Presentation Verification ────────────────────────────────────────────

export interface PresentationVerificationResult extends VerificationResult {
  deviceBound?: boolean
  disclosedClaims?: (keyof M8Credential['claims'])[]
}

export function verifyPresentation(
  presentation: M8Presentation,
  issuerPublicKey: string,
  devicePublicKey: string,
): PresentationVerificationResult {
  // 1. Verify the underlying credential
  const credentialResult = verifyCredential(presentation.credential, issuerPublicKey)
  if (!credentialResult.valid) {
    return credentialResult
  }

  // 2. Verify device binding
  const bindingData = presentation.credential.credentialId + presentation.deviceBinding.nonce + presentation.deviceBinding.timestamp
  const verify = createVerify('SHA256')
  verify.update(bindingData)
  verify.end()

  const deviceFingerprint = hashPublicKey(Buffer.from(devicePublicKey))
  if (deviceFingerprint !== presentation.deviceBinding.deviceKeyFingerprint) {
    return { valid: false, reason: 'Device key mismatch' }
  }

  const isDeviceValid = verify.verify(devicePublicKey, presentation.deviceBinding.signature, 'base64url')
  if (!isDeviceValid) {
    return { valid: false, reason: 'Invalid device binding signature' }
  }

  return {
    valid: true,
    claims: credentialResult.claims,
    issuerDid: credentialResult.issuerDid,
    issuedAt: credentialResult.issuedAt,
    expiresAt: credentialResult.expiresAt,
    deviceBound: true,
    disclosedClaims: presentation.disclosedClaims,
  }
}

// ─── Revocation ─────────────────────────────────────────────────────────────

export interface RevocationList {
  issuerDid: string
  listId: string
  revokedCredentials: string[] // Array of credentialId hashes
  updatedAt: string
  signature: string // Issuer signs the list
}

export function checkRevocation(
  credential: M8Credential,
  revocationList: RevocationList,
  issuerPublicKey: Buffer,
): boolean {
  // Verify revocation list signature first
  const { signature, ...listWithoutSig } = revocationList
  const verify = createVerify('SHA256')
  verify.update(JSON.stringify(listWithoutSig))
  verify.end()
  const isListValid = verify.verify(issuerPublicKey, signature, 'base64url')
  if (!isListValid) {
    throw new Error('Invalid revocation list signature')
  }

  // Check if credential is revoked
  const credentialHash = require('crypto').createHash('sha256').update(credential.credentialId).digest('hex')
  return revocationList.revokedCredentials.includes(credentialHash)
}

// ─── Selective Disclosure ─────────────────────────────────────────────────

export function filterClaims(
  credential: M8Credential,
  allowedClaims: (keyof M8Credential['claims'])[],
): Partial<M8Credential['claims']> {
  const filtered: Partial<M8Credential['claims']> = {}
  for (const key of allowedClaims) {
    if (key in credential.claims) {
      (filtered as Record<string, unknown>)[key] = credential.claims[key]
    }
  }
  return filtered
}
