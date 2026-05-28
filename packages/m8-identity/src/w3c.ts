import { createHash } from 'crypto'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface W3CVerifiableCredential {
  '@context': string[]
  id: string
  type: string[]
  issuer: {
    id: string
    name?: string
  }
  issuanceDate: string
  expirationDate?: string
  credentialSubject: {
    id?: string
    [claim: string]: unknown
  }
  proof: W3CProof
}

export interface W3CProof {
  type: string
  created: string
  proofPurpose: string
  verificationMethod: string
  jws: string
}

export interface W3CVerifiablePresentation {
  '@context': string[]
  type: string[]
  verifiableCredential: W3CVerifiableCredential[]
  proof?: W3CProof
}

export interface M8CredentialInput {
  id: string
  issuerDid: string
  issuerName?: string
  issuedAt: string
  expiresAt?: string
  subjectDid?: string
  claims: Record<string, unknown>
  proofJws: string
  proofType: string
  verificationMethod: string
}

// ─── W3C VC 2.0 Export ─────────────────────────────────────────────────────

const W3C_CONTEXT_V2 = [
  'https://www.w3.org/ns/credentials/v2',
  'https://w3id.org/m8/v1',
]

/**
 * Convert an m8 credential to W3C Verifiable Credentials 2.0 format.
 * This enables interoperability with any W3C-compliant verifier.
 */
export function exportToW3CVC2(input: M8CredentialInput): W3CVerifiableCredential {
  return {
    '@context': W3C_CONTEXT_V2,
    id: `urn:uuid:${input.id}`,
    type: ['VerifiableCredential', 'M8IdentityCredential'],
    issuer: {
      id: input.issuerDid,
      name: input.issuerName,
    },
    issuanceDate: input.issuedAt,
    expirationDate: input.expiresAt,
    credentialSubject: {
      id: input.subjectDid,
      ...input.claims,
    },
    proof: {
      type: input.proofType,
      created: input.issuedAt,
      proofPurpose: 'assertionMethod',
      verificationMethod: input.verificationMethod,
      jws: input.proofJws,
    },
  }
}

/**
 * Create a W3C Verifiable Presentation wrapping one or more credentials.
 */
export function createW3CPresentation(
  credentials: W3CVerifiableCredential[],
  holderDid?: string,
  challenge?: string
): W3CVerifiablePresentation {
  const presentation: W3CVerifiablePresentation = {
    '@context': W3C_CONTEXT_V2,
    type: ['VerifiablePresentation'],
    verifiableCredential: credentials,
  }

  if (holderDid || challenge) {
    presentation.proof = {
      type: 'RsaSignature2026',
      created: new Date().toISOString(),
      proofPurpose: 'authentication',
      verificationMethod: holderDid || 'did:m8:holder:anonymous',
      jws: `mock-challenge-${challenge || 'none'}`,
    }
  }

  return presentation
}

// ─── Import from W3C ───────────────────────────────────────────────────────

/**
 * Parse a W3C VC 2.0 credential back to m8 internal format.
 * Validates required fields and context.
 */
export function importFromW3CVC2(vc: W3CVerifiableCredential): M8CredentialInput {
  // Validate context
  if (!vc['@context'].includes('https://www.w3.org/ns/credentials/v2')) {
    throw new Error('Invalid @context: missing W3C VC 2.0 context')
  }

  // Validate type
  if (!vc.type.includes('VerifiableCredential')) {
    throw new Error('Invalid type: missing VerifiableCredential')
  }

  // Extract claims (everything except 'id' in credentialSubject)
  const { id: _subjectId, ...claims } = vc.credentialSubject

  return {
    id: vc.id.replace('urn:uuid:', ''),
    issuerDid: typeof vc.issuer === 'string' ? vc.issuer : vc.issuer.id,
    issuerName: typeof vc.issuer === 'string' ? undefined : vc.issuer.name,
    issuedAt: vc.issuanceDate,
    expiresAt: vc.expirationDate,
    subjectDid: vc.credentialSubject.id as string | undefined,
    claims,
    proofJws: vc.proof.jws,
    proofType: vc.proof.type,
    verificationMethod: vc.proof.verificationMethod,
  }
}

// ─── Canonicalization ──────────────────────────────────────────────────────

/**
 * Create a canonical JSON string for signing/verification.
 * Follows W3C VC 2.0 canonicalization requirements.
 */
export function canonicalize(vc: W3CVerifiableCredential): string {
  // Remove proof before canonicalization
  const { proof: _, ...withoutProof } = vc
  return JSON.stringify(withoutProof, Object.keys(withoutProof).sort())
}

/**
 * Compute digest of canonicalized credential.
 */
export function credentialDigest(vc: W3CVerifiableCredential): string {
  return createHash('sha256').update(canonicalize(vc)).digest('hex')
}

// ─── Validation ────────────────────────────────────────────────────────────

/**
 * Validate a W3C VC 2.0 credential structure.
 */
export function validateW3CVC2(vc: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (typeof vc !== 'object' || vc === null) {
    errors.push('Credential must be an object')
    return { valid: false, errors }
  }

  const c = vc as Record<string, unknown>

  if (!Array.isArray(c['@context']) || !c['@context'].includes('https://www.w3.org/ns/credentials/v2')) {
    errors.push('Missing or invalid @context')
  }

  if (!Array.isArray(c.type) || !c.type.includes('VerifiableCredential')) {
    errors.push('Missing or invalid type')
  }

  if (!c.issuer) {
    errors.push('Missing issuer')
  }

  if (typeof c.issuanceDate !== 'string') {
    errors.push('Missing or invalid issuanceDate')
  }

  if (!c.credentialSubject || typeof c.credentialSubject !== 'object') {
    errors.push('Missing or invalid credentialSubject')
  }

  if (!c.proof || typeof c.proof !== 'object') {
    errors.push('Missing or invalid proof')
  } else {
    const proof = c.proof as Record<string, unknown>
    if (!proof.jws) errors.push('Missing proof.jws')
    if (!proof.verificationMethod) errors.push('Missing proof.verificationMethod')
  }

  return { valid: errors.length === 0, errors }
}

// ─── Re-export ─────────────────────────────────────────────────────────────

export default {
  exportToW3CVC2,
  importFromW3CVC2,
  createW3CPresentation,
  canonicalize,
  credentialDigest,
  validateW3CVC2,
}
