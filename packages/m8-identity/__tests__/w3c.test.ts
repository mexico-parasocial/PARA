import { describe, it, expect } from 'vitest'
import {
  exportToW3CVC2,
  importFromW3CVC2,
  createW3CPresentation,
  canonicalize,
  credentialDigest,
  validateW3CVC2,
} from '../src/w3c'

const mockCredential = {
  id: 'cred-001',
  issuerDid: 'did:m8:ine:emisor-001',
  issuerName: 'Instituto Nacional Electoral',
  issuedAt: '2026-01-15T00:00:00Z',
  expiresAt: '2031-01-15T00:00:00Z',
  subjectDid: 'did:m8:holder:juan-perez',
  claims: {
    ageOver18: true,
    citizenship: 'MX',
    districtHash: 'sha256:abc123',
  },
  proofJws: 'eyJhbGciOiJSUzI1Ni...mock',
  proofType: 'RsaSignature2026',
  verificationMethod: 'did:m8:ine:emisor-001#keys-1',
}

describe('exportToW3CVC2', () => {
  it('produces valid W3C VC 2.0 structure', () => {
    const vc = exportToW3CVC2(mockCredential)

    expect(vc['@context']).toContain('https://www.w3.org/ns/credentials/v2')
    expect(vc['@context']).toContain('https://w3id.org/m8/v1')
    expect(vc.type).toContain('VerifiableCredential')
    expect(vc.type).toContain('M8IdentityCredential')
    expect(vc.id).toBe('urn:uuid:cred-001')
    expect(vc.issuer).toEqual({
      id: 'did:m8:ine:emisor-001',
      name: 'Instituto Nacional Electoral',
    })
    expect(vc.issuanceDate).toBe('2026-01-15T00:00:00Z')
    expect(vc.expirationDate).toBe('2031-01-15T00:00:00Z')
    expect(vc.credentialSubject.ageOver18).toBe(true)
    expect(vc.credentialSubject.citizenship).toBe('MX')
    expect(vc.credentialSubject.id).toBe('did:m8:holder:juan-perez')
    expect(vc.proof.type).toBe('RsaSignature2026')
    expect(vc.proof.proofPurpose).toBe('assertionMethod')
    expect(vc.proof.verificationMethod).toBe('did:m8:ine:emisor-001#keys-1')
  })

  it('handles minimal credential without optional fields', () => {
    const minimal = {
      id: 'cred-min',
      issuerDid: 'did:m8:test',
      issuedAt: '2026-01-01T00:00:00Z',
      claims: { ageOver18: true },
      proofJws: 'mock-jws',
      proofType: 'Ed25519Signature2020',
      verificationMethod: 'did:m8:test#key1',
    }

    const vc = exportToW3CVC2(minimal)
    expect(vc.expirationDate).toBeUndefined()
    expect(vc.credentialSubject.id).toBeUndefined()
    expect(vc.issuer.name).toBeUndefined()
  })
})

describe('importFromW3CVC2', () => {
  it('round-trips credential correctly', () => {
    const vc = exportToW3CVC2(mockCredential)
    const imported = importFromW3CVC2(vc)

    expect(imported.id).toBe(mockCredential.id)
    expect(imported.issuerDid).toBe(mockCredential.issuerDid)
    expect(imported.issuerName).toBe(mockCredential.issuerName)
    expect(imported.claims.ageOver18).toBe(true)
    expect(imported.claims.citizenship).toBe('MX')
    expect(imported.proofJws).toBe(mockCredential.proofJws)
  })

  it('rejects invalid context', () => {
    const bad = exportToW3CVC2(mockCredential)
    bad['@context'] = ['https://old-context.example']

    expect(() => importFromW3CVC2(bad)).toThrow('Invalid @context')
  })

  it('rejects missing VerifiableCredential type', () => {
    const bad = exportToW3CVC2(mockCredential)
    bad.type = ['RandomCredential']

    expect(() => importFromW3CVC2(bad)).toThrow('Invalid type')
  })
})

describe('createW3CPresentation', () => {
  it('creates presentation with credentials', () => {
    const vc = exportToW3CVC2(mockCredential)
    const vp = createW3CPresentation([vc])

    expect(vp['@context']).toContain('https://www.w3.org/ns/credentials/v2')
    expect(vp.type).toContain('VerifiablePresentation')
    expect(vp.verifiableCredential).toHaveLength(1)
    expect(vp.proof).toBeUndefined()
  })

  it('adds proof when holder/challenge provided', () => {
    const vc = exportToW3CVC2(mockCredential)
    const vp = createW3CPresentation([vc], 'did:m8:holder:juan', 'challenge-abc')

    expect(vp.proof).toBeDefined()
    expect(vp.proof!.proofPurpose).toBe('authentication')
    expect(vp.proof!.verificationMethod).toBe('did:m8:holder:juan')
    expect(vp.proof!.jws).toContain('challenge-abc')
  })
})

describe('canonicalize', () => {
  it('produces deterministic JSON string', () => {
    const vc = exportToW3CVC2(mockCredential)
    const canon1 = canonicalize(vc)
    const canon2 = canonicalize(vc)

    expect(canon1).toBe(canon2)
    expect(canon1).not.toContain('proof')
  })
})

describe('credentialDigest', () => {
  it('produces 64-char hex SHA-256', () => {
    const vc = exportToW3CVC2(mockCredential)
    const digest = credentialDigest(vc)

    expect(digest).toHaveLength(64)
    expect(digest).toMatch(/^[a-f0-9]+$/)
  })

  it('is deterministic', () => {
    const vc = exportToW3CVC2(mockCredential)
    const d1 = credentialDigest(vc)
    const d2 = credentialDigest(vc)

    expect(d1).toBe(d2)
  })
})

describe('validateW3CVC2', () => {
  it('validates correct credential', () => {
    const vc = exportToW3CVC2(mockCredential)
    const result = validateW3CVC2(vc)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects non-object', () => {
    const result = validateW3CVC2('not-an-object')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Credential must be an object')
  })

  it('rejects missing context', () => {
    const vc = exportToW3CVC2(mockCredential)
    vc['@context'] = ['https://wrong-context.example']
    const result = validateW3CVC2(vc)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing or invalid @context')
  })

  it('rejects missing type', () => {
    const vc = exportToW3CVC2(mockCredential)
    vc.type = ['OtherType']
    const result = validateW3CVC2(vc)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing or invalid type')
  })

  it('rejects missing proof', () => {
    const vc = exportToW3CVC2(mockCredential)
    delete (vc as any).proof
    const result = validateW3CVC2(vc)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Missing or invalid proof')
  })
})
