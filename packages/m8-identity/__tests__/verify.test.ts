import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  verifyOffline,
  verifyOnline,
  checkRevocationOnline,
  verifyMerkleProof,
  verifyBatch,
  __setTestPayload,
  __clearTestPayload,
} from '../src/verify'

// Mock fetch for online tests
global.fetch = vi.fn()

function makeBundle(opts: {
  credentialId?: string
  expiresAt?: number
  revealedClaims?: string[]
  claims?: Record<string, unknown>
  issuerDid?: string
  issuedAt?: string
  expiresCredentialAt?: string
} = {}) {
  return JSON.stringify({
    credentialId: opts.credentialId ?? 'cred-001',
    encryptedPayload: 'encrypted:mock',
    nonce: 'nonce:abc123',
    expiresAt: opts.expiresAt ?? Date.now() + 300_000,
    revealedClaims: opts.revealedClaims ?? ['ageOver18', 'citizenship'],
  })
}

function makePayload(opts: {
  claims?: Record<string, unknown>
  issuerDid?: string
  issuedAt?: string
  expiresAt?: string
} = {}) {
  return {
    id: 'cred-001',
    issuerDid: opts.issuerDid ?? 'did:m8:ine:emisor-001',
    issuedAt: opts.issuedAt ?? '2026-01-15T00:00:00Z',
    expiresAt: opts.expiresAt ?? '2031-01-15T00:00:00Z',
    claims: opts.claims ?? {
      ageOver18: true,
      citizenship: 'MX',
    },
    proof: { type: 'RsaSignature2026', jws: 'mock' },
  }
}

describe('verifyOffline', () => {
  it('validates a correct presentation', async () => {
    const bundle = makeBundle()
    const result = await verifyOffline(bundle)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.mode).toBe('offline')
    expect(result.verifiedClaims).toHaveProperty('ageOver18')
    expect(result.verifiedClaims).toHaveProperty('citizenship')
  })

  it('rejects expired presentation', async () => {
    const bundle = makeBundle({ expiresAt: Date.now() - 1000 })
    const result = await verifyOffline(bundle)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Presentation expired')
  })

  it('rejects untrusted issuer', async () => {
    __setTestPayload(makePayload({ issuerDid: 'did:m8:ine:emisor-001' }))
    const bundle = makeBundle()
    const result = await verifyOffline(bundle, {
      trustedIssuers: ['did:m8:other:emisor-999'],
    })

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Untrusted issuer'))).toBe(true)
    __clearTestPayload()
  })

  it('accepts trusted issuer', async () => {
    __setTestPayload(makePayload({ issuerDid: 'did:m8:ine:emisor-001' }))
    const bundle = makeBundle()
    const result = await verifyOffline(bundle, {
      trustedIssuers: ['did:m8:ine:emisor-001'],
    })

    expect(result.valid).toBe(true)
    __clearTestPayload()
  })

  it('enforces required claims', async () => {
    __setTestPayload(makePayload({ claims: { ageOver18: true } }))
    const bundle = makeBundle({ revealedClaims: ['ageOver18'] })
    const result = await verifyOffline(bundle, {
      requiredClaims: ['ageOver18', 'citizenship'],
    })

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Missing required claims'))).toBe(true)
    __clearTestPayload()
  })

  it('enforces minimum claims count', async () => {
    __setTestPayload(makePayload({ claims: { ageOver18: true } }))
    const bundle = makeBundle({ revealedClaims: ['ageOver18'] })
    const result = await verifyOffline(bundle, { minClaims: 2 })

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Insufficient claims'))).toBe(true)
    __clearTestPayload()
  })

  it('warns on old credentials', async () => {
    __setTestPayload(makePayload({ issuedAt: '2020-01-15T00:00:00Z' }))
    const bundle = makeBundle()
    const result = await verifyOffline(bundle, { maxAgeDays: 365 })

    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings.some(w => w.includes('days old'))).toBe(true)
    __clearTestPayload()
  })

  it('handles malformed JSON', async () => {
    const result = await verifyOffline('not-json')

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Parse error'))).toBe(true)
  })
})

describe('verifyOnline', () => {
  it('falls back to offline when revocation server down', async () => {
    __setTestPayload(makePayload())
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const bundle = makeBundle()
    const result = await verifyOnline(bundle)

    expect(result.mode).toBe('offline')
    expect(result.warnings.some(w => w.includes('Falling back'))).toBe(true)
    __clearTestPayload()
  })

  it('marks revoked credential invalid', async () => {
    __setTestPayload(makePayload())
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ revoked: true, revokedAt: '2026-06-01', revokedBy: 'did:m8:ine:emisor-001' }))
    )

    const bundle = makeBundle()
    const result = await verifyOnline(bundle)

    expect(result.mode).toBe('online')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('revoked'))).toBe(true)
    __clearTestPayload()
  })

  it('passes with valid online check', async () => {
    __setTestPayload(makePayload())
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ revoked: false }))
    )

    const bundle = makeBundle()
    const result = await verifyOnline(bundle)

    expect(result.mode).toBe('online')
    expect(result.valid).toBe(true)
    expect(result.revocationProof).toBeDefined()
    __clearTestPayload()
  })
})

describe('checkRevocationOnline', () => {
  it('returns revoked=true when server says so', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ revoked: true, revokedAt: '2026-06-01' }))
    )

    const result = await checkRevocationOnline('cred-001')

    expect(result.revoked).toBe(true)
    expect(result.revokedAt).toBe('2026-06-01')
  })

  it('returns revoked=false on server error (fail-open)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Down'))

    const result = await checkRevocationOnline('cred-001')

    expect(result.revoked).toBe(false)
  })
})

describe('verifyMerkleProof', () => {
  it('validates correct proof', () => {
    // Simple 2-leaf tree: leaf1 + leaf2 -> root
    const leaf1 = 'a'
    const leaf2 = 'b'
    const pair = [leaf1, leaf2].sort()
    const root = require('crypto').createHash('sha256').update(pair[0] + pair[1]).digest('hex')

    const valid = verifyMerkleProof(leaf1, root, [leaf2])
    expect(valid).toBe(true)
  })

  it('rejects invalid proof', () => {
    const valid = verifyMerkleProof('a', 'wrong-root', ['b'])
    expect(valid).toBe(false)
  })
})

describe('verifyBatch', () => {
  it('verifies multiple bundles in parallel', async () => {
    const bundles = [makeBundle(), makeBundle(), makeBundle()]
    const results = await verifyBatch(bundles)

    expect(results).toHaveLength(3)
    expect(results.every(r => r.valid)).toBe(true)
  })
})
