# m8 Identity Credentials — Security Audit Checklist

> Version: 1.0.0 | Last updated: 2026-05-09
> Status: PRE-AUDIT (self-assessment for production readiness)

## 🔴 CRITICAL — Must pass before production

### Cryptography
- [x] **Key Generation**: RSA 2048+ or Ed25519 for device keys
- [x] **Key Storage**: Private keys never leave secure enclave (Keychain/Keystore/TEE)
- [x] **Signature Algorithm**: RSA-SHA256 or Ed25519-ph (pre-hashed)
- [x] **Signature Verification**: Always verify before trusting any credential
- [x] **Nonce Uniqueness**: Presentation nonces are cryptographically random (≥128 bits)
- [x] **Timing Attack Resistance**: Signature verification uses constant-time comparison

### Credential Lifecycle
- [x] **Expiry Handling**: Reject expired credentials at verification time
- [x] **Revocation Check**: Online check against issuer Merkle registry
- [x] **Revocation Transparency**: Merkle proofs published for public audit
- [x] **Device Binding**: Credentials bound to device fingerprint (hash of pubkey + HW ID)
- [x] **No Cloning**: Same credential cannot be presented from two devices

### Network Security
- [x] **TLS 1.3**: All issuer/verifier communication over TLS 1.3+
- [x] **Certificate Pinning**: Pin issuer TLS certs in mobile apps
- [x] **No Credential Over Network**: Only present via QR or local NFC, never HTTP body
- [x] **Verifier Authentication**: Verifiers present their own DID before requesting claims

## 🟡 HIGH — Should pass before public beta

### Input Validation
- [x] **JSON Schema Validation**: All incoming credentials validated against schema
- [x] **Claim Type Safety**: Boolean claims checked as boolean, strings as strings
- [x] **DID Format Validation**: DIDs parsed per `did:m8:` method spec
- [x] **Max Claim Size**: Individual claims capped at 4KB
- [x] **Max Presentation Size**: QR payload capped at 3KB (error correction L)

### Privacy
- [x] **Selective Disclosure**: Holder chooses which claims to reveal per presentation
- [x] **No Correlation**: Same credential produces different presentation hashes per nonce
- [x] **Minimal Data**: Verifier gets only claims they requested, nothing more
- [x] **No Tracking**: Presentation QR contains no device/advertising identifiers
- [x] **Offline Capable**: Verification works without network (with cached Merkle root)

### Mobile Security
- [x] **Biometric Lock**: Wallet auto-locks on background, requires biometric to unlock
- [x] **Screenshot Prevention**: Wallet screen protected from screenshots (FLAG_SECURE)
- [x] **Root/Jailbreak Detection**: App warns or blocks on compromised devices
- [x] **Memory Safety**: Credential data zeroed from RAM after use
- [x] **Backup Encryption**: Cloud backups encrypted with device key

## 🟢 MEDIUM — Nice to have before v1.0

### Audit & Monitoring
- [ ] **Verification Logs**: All verifications logged locally (not sent to server)
- [ ] **Anomaly Detection**: Flag repeated failed verifications from same verifier
- [ ] **Issuer Health Dashboard**: Public page showing issuer uptime and revocation rate
- [ ] **Bug Bounty Program**: Published policy for responsible disclosure

### Resilience
- [ ] **Issuer Fallback**: If primary issuer down, fallback to secondary issuer
- [ ] **Merkle Root Caching**: Verifiers cache Merkle root for 24h offline operation
- [ ] **Credential Recovery**: Lost device recovery via social recovery or backup phrase
- [ ] **Key Rotation**: Device keys rotatable without re-issuing credentials

### Compliance
- [ ] **GDPR Article 17**: Right to erasure — user can delete all credentials
- [ ] **GDPR Article 15**: Right to access — export all credentials as W3C VC 2.0
- [ ] **Mexican LFPDPPP**: Compliance with Mexican data protection law
- [ ] **Accessibility**: WCAG 2.1 AA compliance for all wallet screens

## 🔧 Hardening Guide

### For Issuer Operators
```bash
# 1. Run with minimal privileges
useradd -r -s /bin/false m8-issuer

# 2. Enable AppArmor/SELinux
aa-enforce /etc/apparmor.d/m8-issuer

# 3. Rotate signing keys quarterly
m8-issuer rotate-keys --notify-verifiers

# 4. Monitor revocation registry size
# Alert if > 1% of issued credentials revoked (indicates breach)
```

### For Verifier Apps
```typescript
// 1. Always use strict trust policy
const policy = createWhitelistPolicy([
  'did:m8:ine:emisor-001',
  'did:m8:renapo:emisor-001',
])

// 2. Cache Merkle root locally
const root = await fetchMerkleRoot()
await secureStorage.set('merkle-root', root)

// 3. Verify offline first, online as fallback
const result = await verifyOffline(bundle, policy)
if (!result.valid) {
  result = await verifyOnline(bundle, policy)
}
```

### For Wallet Developers
```typescript
// 1. Never log credential data
console.log('Credential loaded') // OK
console.log(credential.claims)   // NEVER

// 2. Clear credentials from memory after use
const presentation = createPresentation(credential, claims)
// ... use it ...
presentation.encryptedPayload = '' // zero out

// 3. Require biometric for high-sensitivity claims
if (claims.includes('curvHash')) {
  await biometricAuth.authenticate()
}
```

## 📊 Current Test Coverage

| Module | Tests | Coverage |
|--------|-------|----------|
| credential.ts | 11 | Key gen, signing, tampering, expiry, device binding |
| issuer.py | 15 | Validation, issuance, Merkle tree, revocation |
| verify.ts | 16 | Offline/online verification, Merkle proof, batch |
| registry.ts | 25 | CRUD, trust policy, country filter, import/export |
| w3c.ts | 15 | Export/import, canonicalization, validation |
| **Total** | **82** | **Core functionality covered** |

## 🎯 Pre-Production Action Items

1. [ ] Run `npm audit` and `pip-audit` on all dependencies
2. [ ] Penetration test by external security firm
3. [ ] Fuzz test credential parser with malformed inputs
4. [ ] Load test verification service (target: 10k req/s)
5. [ ] Document incident response plan for key compromise
6. [ ] Set up automated dependency vulnerability scanning
7. [ ] Publish security.txt at `/.well-known/security.txt`

---

**Audited by**: m8 Core Team (self-assessment)
**Next audit**: External firm before public beta
**Contact**: security@paramx.social
