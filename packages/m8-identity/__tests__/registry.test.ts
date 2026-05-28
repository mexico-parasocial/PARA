import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerIssuer,
  updateIssuer,
  unregisterIssuer,
  lookupIssuer,
  listIssuers,
  isIssuerActive,
  evaluateTrust,
  createWhitelistPolicy,
  createCountryPolicy,
  exportRegistry,
  importRegistry,
  seedMexicanIssuers,
  DEFAULT_TRUST_POLICY,
} from '../src/registry'

beforeEach(() => {
  // Clear and re-seed for each test
  // We can't easily clear the module-level Map, so we work with what's there
})

describe('lookupIssuer', () => {
  it('finds seeded INE issuer', () => {
    const issuer = lookupIssuer('did:m8:ine:emisor-001')
    expect(issuer).not.toBeNull()
    expect(issuer!.name).toBe('Instituto Nacional Electoral')
    expect(issuer!.country).toBe('MX')
    expect(issuer!.status).toBe('active')
  })

  it('returns null for unknown DID', () => {
    const issuer = lookupIssuer('did:m8:unknown:xxx')
    expect(issuer).toBeNull()
  })
})

describe('listIssuers', () => {
  it('lists all seeded issuers', () => {
    const issuers = listIssuers()
    expect(issuers.length).toBeGreaterThanOrEqual(3)
  })

  it('filters by country', () => {
    const issuers = listIssuers({ country: 'MX' })
    expect(issuers.every(i => i.country === 'MX')).toBe(true)
  })

  it('filters by status', () => {
    const issuers = listIssuers({ status: 'active' })
    expect(issuers.every(i => i.status === 'active')).toBe(true)
  })
})

describe('isIssuerActive', () => {
  it('returns true for active issuer', () => {
    expect(isIssuerActive('did:m8:ine:emisor-001')).toBe(true)
  })

  it('returns false for unknown issuer', () => {
    expect(isIssuerActive('did:m8:unknown')).toBe(false)
  })
})

describe('registerIssuer', () => {
  it('adds new issuer', () => {
    registerIssuer({
      did: 'did:m8:test:new-issuer',
      name: 'Test Issuer',
      country: 'US',
      publicKey: 'pk-test',
      keyType: 'Ed25519',
      addedAt: '2026-01-01T00:00:00Z',
      status: 'active',
      revocationEndpoint: 'https://test.example/revocation',
    })

    const found = lookupIssuer('did:m8:test:new-issuer')
    expect(found).not.toBeNull()
    expect(found!.name).toBe('Test Issuer')
  })

  it('throws on duplicate DID', () => {
    expect(() => {
      registerIssuer({
        did: 'did:m8:ine:emisor-001',
        name: 'Duplicate',
        country: 'MX',
        publicKey: 'pk',
        keyType: 'RSA',
        addedAt: '2026-01-01T00:00:00Z',
        status: 'active',
        revocationEndpoint: 'https://dup.example/revocation',
      })
    }).toThrow('already registered')
  })
})

describe('updateIssuer', () => {
  it('updates issuer status', () => {
    updateIssuer('did:m8:ine:emisor-001', { status: 'suspended' })
    const issuer = lookupIssuer('did:m8:ine:emisor-001')
    expect(issuer!.status).toBe('suspended')

    // Restore for other tests
    updateIssuer('did:m8:ine:emisor-001', { status: 'active' })
  })

  it('throws for unknown DID', () => {
    expect(() => {
      updateIssuer('did:m8:unknown', { name: 'New Name' })
    }).toThrow('not found')
  })
})

describe('unregisterIssuer', () => {
  it('removes issuer', () => {
    registerIssuer({
      did: 'did:m8:test:temp',
      name: 'Temp',
      country: 'MX',
      publicKey: 'pk',
      keyType: 'RSA',
      addedAt: '2026-01-01T00:00:00Z',
      status: 'active',
      revocationEndpoint: 'https://temp.example/revocation',
    })

    expect(unregisterIssuer('did:m8:test:temp')).toBe(true)
    expect(lookupIssuer('did:m8:test:temp')).toBeNull()
  })
})

describe('evaluateTrust', () => {
  it('allows active known issuer with default policy', () => {
    const result = evaluateTrust('did:m8:ine:emisor-001')
    expect(result.allowed).toBe(true)
    expect(result.issuer).not.toBeNull()
  })

  it('allows unknown issuer when no whitelist', () => {
    const result = evaluateTrust('did:m8:unknown:issuer')
    expect(result.allowed).toBe(true)
    expect(result.warnings).toContain('Unknown issuer: did:m8:unknown:issuer')
  })

  it('blocks unknown issuer with whitelist', () => {
    const policy = createWhitelistPolicy(['did:m8:ine:emisor-001'])
    const result = evaluateTrust('did:m8:unknown:issuer', policy)
    expect(result.allowed).toBe(false)
    expect(result.errors).toContain('Issuer did:m8:unknown:issuer not in allowed list')
  })

  it('blocks explicitly blocked issuer', () => {
    const policy = createWhitelistPolicy([], { blockedIssuers: ['did:m8:ine:emisor-001'] })
    const result = evaluateTrust('did:m8:ine:emisor-001', policy)
    expect(result.allowed).toBe(false)
    expect(result.errors).toContain('Issuer did:m8:ine:emisor-001 is blocked')
  })

  it('enforces country restriction', () => {
    const policy = createCountryPolicy(['US'])
    const result = evaluateTrust('did:m8:ine:emisor-001', policy)
    expect(result.allowed).toBe(false)
    expect(result.errors).toContain('Issuer country MX not allowed')
  })

  it('allows matching country', () => {
    const policy = createCountryPolicy(['MX'])
    const result = evaluateTrust('did:m8:ine:emisor-001', policy)
    expect(result.allowed).toBe(true)
  })

  it('blocks revoked issuer', () => {
    updateIssuer('did:m8:ine:emisor-001', { status: 'revoked' })
    const result = evaluateTrust('did:m8:ine:emisor-001')
    expect(result.allowed).toBe(false)
    expect(result.errors).toContain('Issuer did:m8:ine:emisor-001 has been revoked')
    updateIssuer('did:m8:ine:emisor-001', { status: 'active' })
  })

  it('warns on suspended issuer', () => {
    updateIssuer('did:m8:ine:emisor-001', { status: 'suspended' })
    const result = evaluateTrust('did:m8:ine:emisor-001')
    expect(result.allowed).toBe(true) // suspended = warning, not block
    expect(result.warnings).toContain('Issuer did:m8:ine:emisor-001 is suspended')
    updateIssuer('did:m8:ine:emisor-001', { status: 'active' })
  })
})

describe('createWhitelistPolicy', () => {
  it('creates policy with trusted DIDs', () => {
    const policy = createWhitelistPolicy(['did:m8:ine:emisor-001'])
    expect(policy.allowedIssuers).toContain('did:m8:ine:emisor-001')
    expect(policy.allowedIssuers).toHaveLength(1)
  })

  it('preserves other defaults', () => {
    const policy = createWhitelistPolicy(['did:m8:ine:emisor-001'])
    expect(policy.minKeyBits).toBe(DEFAULT_TRUST_POLICY.minKeyBits)
    expect(policy.allowedKeyTypes).toEqual(DEFAULT_TRUST_POLICY.allowedKeyTypes)
  })
})

describe('createCountryPolicy', () => {
  it('creates policy with country filter', () => {
    const policy = createCountryPolicy(['MX', 'US'])
    expect(policy.allowedCountries).toContain('MX')
    expect(policy.allowedCountries).toContain('US')
  })
})

describe('exportRegistry / importRegistry', () => {
  it('round-trips registry', () => {
    const exported = exportRegistry()
    expect(exported.length).toBeGreaterThanOrEqual(3)

    // Import a new one
    importRegistry([{
      did: 'did:m8:test:imported',
      name: 'Imported Issuer',
      country: 'CA',
      publicKey: 'pk-imported',
      keyType: 'Ed25519',
      addedAt: '2026-01-01T00:00:00Z',
      status: 'active',
      revocationEndpoint: 'https://imported.example/revocation',
    }])

    expect(lookupIssuer('did:m8:test:imported')).not.toBeNull()
  })
})

describe('seedMexicanIssuers', () => {
  it('seeds expected issuers', () => {
    // Already seeded in module, just verify
    const issuers = listIssuers()
    const names = issuers.map(i => i.name)
    expect(names).toContain('Instituto Nacional Electoral')
    expect(names).toContain('RENAPO')
    expect(names).toContain('Gobierno CDMX')
  })
})
