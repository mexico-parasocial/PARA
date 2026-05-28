import { createHash } from 'crypto'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface IssuerRecord {
  did: string
  name: string
  country: string
  publicKey: string
  keyType: 'RSA' | 'Ed25519'
  addedAt: string
  status: 'active' | 'suspended' | 'revoked'
  /** URL to fetch current Merkle root */
  revocationEndpoint: string
  /** Human-readable description */
  description?: string
  /** Official website */
  website?: string
}

export interface TrustPolicy {
  /** Only accept credentials from these issuers (empty = any) */
  allowedIssuers: string[]
  /** Explicitly blocked issuers */
  blockedIssuers: string[]
  /** Require issuer to be from these countries */
  allowedCountries: string[]
  /** Minimum key strength (bits) */
  minKeyBits: number
  /** Only accept these key types */
  allowedKeyTypes: ('RSA' | 'Ed25519')[]
  /** Auto-reject credentials older than this (days) */
  maxCredentialAgeDays: number
}

export interface TrustPolicyResult {
  allowed: boolean
  issuer: IssuerRecord | null
  errors: string[]
  warnings: string[]
}

// ─── DID Registry ──────────────────────────────────────────────────────────

/**
 * In-memory DID registry. In production this syncs from a
 * decentralized source (e.g., smart contract, DHT, or federation gossip).
 */
const REGISTRY: Map<string, IssuerRecord> = new Map()

/** Default trust policy — permissive but safe defaults */
export const DEFAULT_TRUST_POLICY: TrustPolicy = {
  allowedIssuers: [],
  blockedIssuers: [],
  allowedCountries: [],
  minKeyBits: 2048,
  allowedKeyTypes: ['RSA', 'Ed25519'],
  maxCredentialAgeDays: 3650,
}

// ─── Registry Operations ───────────────────────────────────────────────────

/**
 * Register a new issuer in the DID registry.
 */
export function registerIssuer(record: IssuerRecord): void {
  if (REGISTRY.has(record.did)) {
    throw new Error(`Issuer ${record.did} already registered`)
  }
  REGISTRY.set(record.did, record)
}

/**
 * Update an existing issuer record.
 */
export function updateIssuer(did: string, updates: Partial<IssuerRecord>): void {
  const existing = REGISTRY.get(did)
  if (!existing) {
    throw new Error(`Issuer ${did} not found`)
  }
  REGISTRY.set(did, { ...existing, ...updates })
}

/**
 * Remove an issuer from the registry.
 */
export function unregisterIssuer(did: string): boolean {
  return REGISTRY.delete(did)
}

/**
 * Lookup an issuer by DID.
 */
export function lookupIssuer(did: string): IssuerRecord | null {
  return REGISTRY.get(did) || null
}

/**
 * List all registered issuers.
 */
export function listIssuers(filter?: { country?: string; status?: string }): IssuerRecord[] {
  let issuers = Array.from(REGISTRY.values())
  if (filter?.country) {
    issuers = issuers.filter(i => i.country === filter.country)
  }
  if (filter?.status) {
    issuers = issuers.filter(i => i.status === filter.status)
  }
  return issuers
}

/**
 * Check if an issuer is currently active.
 */
export function isIssuerActive(did: string): boolean {
  const issuer = REGISTRY.get(did)
  return issuer?.status === 'active'
}

// ─── Trust Policy Enforcement ────────────────────────────────────────────

/**
 * Evaluate a credential issuer against a trust policy.
 */
export function evaluateTrust(
  issuerDid: string,
  policy: TrustPolicy = DEFAULT_TRUST_POLICY
): TrustPolicyResult {
  const errors: string[] = []
  const warnings: string[] = []

  const issuer = lookupIssuer(issuerDid)

  if (!issuer) {
    if (policy.allowedIssuers.length > 0) {
      errors.push(`Issuer ${issuerDid} not in allowed list`)
      return { allowed: false, issuer: null, errors, warnings }
    }
    // Unknown issuer, but no whitelist — warn but allow
    warnings.push(`Unknown issuer: ${issuerDid}`)
    return { allowed: true, issuer: null, errors, warnings }
  }

  // Check explicit blocklist
  if (policy.blockedIssuers.includes(issuerDid)) {
    errors.push(`Issuer ${issuerDid} is blocked`)
  }

  // Check explicit allowlist
  if (policy.allowedIssuers.length > 0 && !policy.allowedIssuers.includes(issuerDid)) {
    errors.push(`Issuer ${issuerDid} not in allowed list`)
  }

  // Check country restriction
  if (policy.allowedCountries.length > 0 && !policy.allowedCountries.includes(issuer.country)) {
    errors.push(`Issuer country ${issuer.country} not allowed`)
  }

  // Check key type
  if (!policy.allowedKeyTypes.includes(issuer.keyType)) {
    errors.push(`Key type ${issuer.keyType} not allowed`)
  }

  // Check key strength (mock — real would parse PEM)
  if (issuer.keyType === 'RSA' && policy.minKeyBits > 2048) {
    warnings.push(`RSA key strength not verified (require ${policy.minKeyBits} bits)`)
  }

  // Check issuer status
  if (issuer.status === 'revoked') {
    errors.push(`Issuer ${issuerDid} has been revoked`)
  } else if (issuer.status === 'suspended') {
    warnings.push(`Issuer ${issuerDid} is suspended`)
  }

  return {
    allowed: errors.length === 0,
    issuer,
    errors,
    warnings,
  }
}

/**
 * Create a restrictive trust policy from a list of trusted DIDs.
 */
export function createWhitelistPolicy(
  trustedDids: string[],
  overrides: Partial<TrustPolicy> = {}
): TrustPolicy {
  return {
    ...DEFAULT_TRUST_POLICY,
    allowedIssuers: trustedDids,
    ...overrides,
  }
}

/**
 * Create a country-restricted policy.
 */
export function createCountryPolicy(
  countries: string[],
  overrides: Partial<TrustPolicy> = {}
): TrustPolicy {
  return {
    ...DEFAULT_TRUST_POLICY,
    allowedCountries: countries,
    ...overrides,
  }
}

// ─── Federation Sync ───────────────────────────────────────────────────────

/**
 * Sync registry from a remote federation endpoint.
 * TODO: implement actual HTTP fetch + signature verification
 */
export async function syncRegistryFromUrl(url: string): Promise<number> {
  // Mock: would fetch JSON array of IssuerRecord
  console.log(`Syncing registry from ${url}...`)
  return REGISTRY.size
}

/**
 * Export registry as JSON for federation sharing.
 */
export function exportRegistry(): IssuerRecord[] {
  return Array.from(REGISTRY.values())
}

/**
 * Import registry from JSON (e.g., from federation peer).
 */
export function importRegistry(records: IssuerRecord[]): void {
  for (const record of records) {
    REGISTRY.set(record.did, record)
  }
}

// ─── Seed Data ─────────────────────────────────────────────────────────────

/** Pre-populate with known Mexican civic issuers */
export function seedMexicanIssuers(): void {
  const issuers: IssuerRecord[] = [
    {
      did: 'did:m8:ine:emisor-001',
      name: 'Instituto Nacional Electoral',
      country: 'MX',
      publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----',
      keyType: 'RSA',
      addedAt: '2026-01-01T00:00:00Z',
      status: 'active',
      revocationEndpoint: 'https://ine.paramx.social/revocation',
      description: 'Official Mexican voter ID credential issuer',
      website: 'https://ine.mx',
    },
    {
      did: 'did:m8:renapo:emisor-001',
      name: 'RENAPO',
      country: 'MX',
      publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----',
      keyType: 'RSA',
      addedAt: '2026-01-01T00:00:00Z',
      status: 'active',
      revocationEndpoint: 'https://renapo.paramx.social/revocation',
      description: 'Mexican national population registry',
      website: 'https://renapo.gob.mx',
    },
    {
      did: 'did:m8:cdmx:emisor-001',
      name: 'Gobierno CDMX',
      country: 'MX',
      publicKey: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----',
      keyType: 'Ed25519',
      addedAt: '2026-02-01T00:00:00Z',
      status: 'active',
      revocationEndpoint: 'https://cdmx.paramx.social/revocation',
      description: 'Mexico City municipal credential issuer',
      website: 'https://cdmx.gob.mx',
    },
  ]

  for (const issuer of issuers) {
    REGISTRY.set(issuer.did, issuer)
  }
}

// Auto-seed on module load
seedMexicanIssuers()

// ─── Re-export ─────────────────────────────────────────────────────────────

export default {
  registerIssuer,
  updateIssuer,
  unregisterIssuer,
  lookupIssuer,
  listIssuers,
  isIssuerActive,
  evaluateTrust,
  createWhitelistPolicy,
  createCountryPolicy,
  syncRegistryFromUrl,
  exportRegistry,
  importRegistry,
  seedMexicanIssuers,
}
