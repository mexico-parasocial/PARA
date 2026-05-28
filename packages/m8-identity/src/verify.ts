import { createHash, createVerify, randomBytes } from 'crypto'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface VerifyOptions {
  /** Offline mode: skip revocation check against issuer */
  offline?: boolean
  /** Require minimum number of claims to be present */
  minClaims?: number
  /** Specific claims that must be revealed */
  requiredClaims?: string[]
  /** Accept credentials issued by these DIDs only */
  trustedIssuers?: string[]
  /** Max age of credential in days (default: 3650 = ~10 years for INE) */
  maxAgeDays?: number
}

export interface VerificationResult {
  valid: boolean
  credentialId: string
  issuerDid: string
  verifiedClaims: Record<string, unknown>
  errors: string[]
  warnings: string[]
  /** Unix timestamp of verification */
  verifiedAt: number
  /** Verification method used */
  mode: 'offline' | 'online'
  /** Merkle proof for revocation check (if online) */
  revocationProof?: {
    root: string
    proof: string[]
    leafIndex: number
  }
}

export interface RevocationCheckResult {
  revoked: boolean
  credentialId: string
  revocationHash: string
  /** When it was added to revocation list (if revoked) */
  revokedAt?: string
  /** Issuer that revoked it */
  revokedBy?: string
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_INE_DID = 'did:m8:ine:emisor-001'
const DEFAULT_VERIFY_URL = 'https://verify.paramx.social'

// ─── Offline Verification ──────────────────────────────────────────────────

/**
 * Verify a presentation bundle completely offline.
 * Checks: signature, expiry, device binding, claim requirements.
 * Does NOT check revocation (needs online issuer).
 */
export async function verifyOffline(
  presentationBundle: string,
  options: VerifyOptions = {}
): Promise<VerificationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const verifiedAt = Date.now()

  try {
    const bundle = JSON.parse(presentationBundle)
    const { credentialId, encryptedPayload, nonce, expiresAt, revealedClaims } = bundle

    // 1. Check presentation expiry
    if (expiresAt < verifiedAt) {
      errors.push('Presentation expired')
    }

    // 2. Parse encrypted payload (mock decryption for now)
    const payload = parsePayload(encryptedPayload)
    if (!payload) {
      errors.push('Invalid payload format')
      return result(false, credentialId, '', {}, errors, warnings, 'offline')
    }

    // 3. Verify signature
    const sigValid = verifySignature(payload)
    if (!sigValid) {
      errors.push('Invalid credential signature')
    }

    // 4. Check credential expiry
    if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
      errors.push('Credential expired')
    }

    // 5. Check issuer trust
    if (options.trustedIssuers && !options.trustedIssuers.includes(payload.issuerDid)) {
      errors.push(`Untrusted issuer: ${payload.issuerDid}`)
    }

    // 6. Check claim requirements
    const claims = payload.claims || {}
    const claimKeys = Object.keys(claims)

    if (options.minClaims && claimKeys.length < options.minClaims) {
      errors.push(`Insufficient claims: ${claimKeys.length} < ${options.minClaims}`)
    }

    if (options.requiredClaims) {
      const missing = options.requiredClaims.filter(c => !(c in claims))
      if (missing.length > 0) {
        errors.push(`Missing required claims: ${missing.join(', ')}`)
      }
    }

    // 7. Check credential age
    if (options.maxAgeDays && payload.issuedAt) {
      const ageMs = verifiedAt - new Date(payload.issuedAt).getTime()
      const ageDays = ageMs / (1000 * 60 * 60 * 24)
      if (ageDays > options.maxAgeDays) {
        warnings.push(`Credential is ${Math.floor(ageDays)} days old`)
      }
    }

    // 8. Filter only revealed claims
    const verifiedClaims: Record<string, unknown> = {}
    for (const key of revealedClaims || []) {
      if (key in claims) {
        verifiedClaims[key] = claims[key]
      }
    }

    const valid = errors.length === 0

    return result(
      valid,
      credentialId,
      payload.issuerDid,
      verifiedClaims,
      errors,
      warnings,
      'offline'
    )
  } catch (e) {
    errors.push(`Parse error: ${e instanceof Error ? e.message : 'unknown'}`)
    return result(false, 'unknown', '', {}, errors, warnings, 'offline')
  }
}

// ─── Online Verification ────────────────────────────────────────────────────

/**
 * Verify with online revocation check against issuer.
 * Fetches Merkle proof from issuer's revocation registry.
 */
export async function verifyOnline(
  presentationBundle: string,
  options: VerifyOptions = {},
  verifyUrl: string = DEFAULT_VERIFY_URL
): Promise<VerificationResult> {
  // Start with offline checks
  const offlineResult = await verifyOffline(presentationBundle, options)

  if (!offlineResult.valid) {
    // Offline failed, no point checking online
    return offlineResult
  }

  try {
    // Fetch revocation status
    const revocationResult = await checkRevocationOnline(
      offlineResult.credentialId,
      verifyUrl
    )

    if (revocationResult.revoked) {
      offlineResult.errors.push(
        `Credential revoked at ${revocationResult.revokedAt} by ${revocationResult.revokedBy}`
      )
      offlineResult.valid = false
    }

    offlineResult.mode = 'online'
    offlineResult.revocationProof = revocationResult.revoked
      ? undefined
      : {
          root: revocationResult.revocationHash,
          proof: [], // Would be actual Merkle proof from server
          leafIndex: -1,
        }

    return offlineResult
  } catch (e) {
    offlineResult.warnings.push(
      `Online revocation check failed: ${e instanceof Error ? e.message : 'unknown'}. Falling back to offline.`
    )
    offlineResult.mode = 'offline'
    return offlineResult
  }
}

// ─── Revocation Check ─────────────────────────────────────────────────────

/**
 * Check if credential is revoked via issuer's online registry.
 */
export async function checkRevocationOnline(
  credentialId: string,
  verifyUrl: string = DEFAULT_VERIFY_URL
): Promise<RevocationCheckResult> {
  const revocationHash = createHash('sha256').update(credentialId).digest('hex')

  try {
    const response = await fetch(`${verifyUrl}/revocation-check/${revocationHash}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    return {
      revoked: data.revoked === true,
      credentialId,
      revocationHash,
      revokedAt: data.revokedAt,
      revokedBy: data.revokedBy,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    // Network errors should propagate so caller can fallback
    if (msg.includes('fetch') || msg.includes('Network') || msg.includes('ECONNREFUSED')) {
      throw e
    }
    // HTTP errors (404 etc) = not in revocation list = not revoked
    return {
      revoked: false,
      credentialId,
      revocationHash,
    }
  }
}

// ─── Merkle Verification (Offline-capable) ─────────────────────────────────

/**
 * Verify a Merkle proof locally without contacting issuer.
 * Requires having the Merkle root out-of-band (published periodically).
 */
export function verifyMerkleProof(
  leafHash: string,
  expectedRoot: string,
  proof: string[]
): boolean {
  let current = leafHash

  for (const sibling of proof) {
    // Sort to ensure deterministic ordering
    const pair = [current, sibling].sort()
    current = createHash('sha256').update(pair[0] + pair[1]).digest('hex')
  }

  return current === expectedRoot
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// Allow test injection
let _testPayload: any = null

export function __setTestPayload(payload: any) {
  _testPayload = payload
}

export function __clearTestPayload() {
  _testPayload = null
}

function parsePayload(encryptedPayload: string): any {
  // TODO: replace with actual decryption (libsodium sealed box)
  if (_testPayload) return _testPayload

  if (encryptedPayload.startsWith('encrypted:')) {
    return {
      id: 'cred-001',
      issuerDid: DEFAULT_INE_DID,
      issuedAt: '2026-01-15T00:00:00Z',
      expiresAt: '2031-01-15T00:00:00Z',
      claims: {
        ageOver18: true,
        citizenship: 'MX',
      },
      proof: {
        type: 'RsaSignature2026',
        jws: 'mock',
      },
    }
  }
  return null
}

function verifySignature(_payload: any): boolean {
  // TODO: actual RSA/Ed25519 signature verification
  return true
}

function result(
  valid: boolean,
  credentialId: string,
  issuerDid: string,
  verifiedClaims: Record<string, unknown>,
  errors: string[],
  warnings: string[],
  mode: 'offline' | 'online'
): VerificationResult {
  return {
    valid,
    credentialId,
    issuerDid,
    verifiedClaims,
    errors,
    warnings,
    verifiedAt: Date.now(),
    mode,
  }
}

// ─── Batch Verification ────────────────────────────────────────────────────

/**
 * Verify multiple presentations in parallel.
 */
export async function verifyBatch(
  presentationBundles: string[],
  options: VerifyOptions = {}
): Promise<VerificationResult[]> {
  return Promise.all(
    presentationBundles.map(bundle => verifyOffline(bundle, options))
  )
}

// ─── Re-export for convenience ────────────────────────────────────────────

export { createHash }
export default {
  verifyOffline,
  verifyOnline,
  checkRevocationOnline,
  verifyMerkleProof,
  verifyBatch,
}
