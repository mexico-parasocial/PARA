# m8 Identity Credentials Specification

> Version: 1.0.0-draft | Date: 2026-05-09
> Status: DRAFT — Open for community review
> Authors: m8 Core Team
> License: CC-BY-SA 4.0

---

## 1. Abstract

This document specifies **m8 Identity Credentials**, a decentralized identity system for Mexican civic verification. It enables Mexican citizens to prove attributes (age, citizenship, district) without revealing underlying personal data, using cryptographic credentials issued by trusted civic authorities.

m8 is designed to be:
- **Privacy-preserving**: Selective disclosure of claims
- **Offline-capable**: Verification without internet
- **Federated**: Multiple issuers with trust policies
- **Interoperable**: W3C Verifiable Credentials 2.0 export

---

## 2. Terminology

| Term | Definition |
|------|------------|
| **Issuer** | Authority that validates identity and issues credentials (e.g., INE) |
| **Holder** | Citizen who owns and presents credentials |
| **Verifier** | Service that checks credential validity (e.g., bank, polling station) |
| **Credential** | Cryptographically signed set of claims about the holder |
| **Presentation** | Subset of claims revealed to a specific verifier |
| **DID** | Decentralized Identifier (`did:m8:<org>:<id>`) |
| **Merkle Tree** | Binary hash tree for transparent revocation |

---

## 3. Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Issuer    │────▶│  Registry   │◀────│  Verifier   │
│  (INE, etc) │     │ (DID + Keys)│     │  (Any app)  │
└──────┬──────┘     └─────────────┘     └──────┬──────┘
       │                                         │
       │ Issue Credential                        │ Verify
       │                                         │ Presentation
       ▼                                         ▼
┌─────────────┐                         ┌─────────────┐
│   Holder    │────────────────────────▶│   Wallet    │
│  (Citizen)  │    Present Claims       │  (Mobile)   │
└─────────────┘                         └─────────────┘
```

---

## 4. DID Method: `did:m8`

### 4.1 Syntax

```
did:m8:<org>:<unique-id>
```

Examples:
- `did:m8:ine:emisor-001` — INE credential issuer
- `did:m8:holder:juan-perez` — Individual citizen
- `did:m8:app:banco-xyz` — Verifying application

### 4.2 Resolution (simplified)

DIDs resolve to a DID Document containing:
- `id`: the DID itself
- `verificationMethod`: public key for signature verification
- `service`: revocation endpoint URL
- `controller`: parent organization DID (optional)

---

## 5. Credential Format

### 5.1 m8 Native Format

```typescript
interface M8Credential {
  id: string                    // UUID v4
  issuerDid: string            // Issuer's DID
  issuedAt: string             // ISO 8601 timestamp
  expiresAt: string            // ISO 8601 timestamp
  claims: {
    ageOver18?: boolean
    ageOver21?: boolean
    citizenship?: string       // ISO 3166-1 alpha-2
    districtHash?: string      // SHA-256 of electoral district
    curvHash?: string          // SHA-256 of CURP + salt
  }
  proof: {
    type: "RsaSignature2026" | "Ed25519Signature2020"
    jws: string                // Base64url-encoded JWS
  }
  revocationHash: string       // SHA-256 of credentialId
  deviceBinding: string       // Device fingerprint
}
```

### 5.2 W3C VC 2.0 Export

m8 credentials can be exported to W3C standard format:

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://w3id.org/m8/v1"
  ],
  "id": "urn:uuid:cred-001",
  "type": ["VerifiableCredential", "M8IdentityCredential"],
  "issuer": {
    "id": "did:m8:ine:emisor-001",
    "name": "Instituto Nacional Electoral"
  },
  "issuanceDate": "2026-01-15T00:00:00Z",
  "expirationDate": "2031-01-15T00:00:00Z",
  "credentialSubject": {
    "id": "did:m8:holder:juan-perez",
    "ageOver18": true,
    "citizenship": "MX"
  },
  "proof": {
    "type": "RsaSignature2026",
    "created": "2026-01-15T00:00:00Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "did:m8:ine:emisor-001#keys-1",
    "jws": "eyJhbGciOiJSUzI1Ni..."
  }
}
```

---

## 6. Presentation Flow

### 6.1 QR-Based Presentation

```
Holder opens Wallet ──▶ Selects credential ──▶ Chooses claims ──▶ Generates QR
                                    │
                                    ▼
                           ┌─────────────────┐
                           │ Presentation    │
                           │ Bundle:         │
                           │ - credentialId  │
                           │ - encryptedPayload
                           │ - nonce         │
                           │ - expiresAt     │
                           │ - revealedClaims│
                           └─────────────────┘
                                    │
                                    ▼
Verifier scans QR ──▶ Decrypts payload ──▶ Verifies signature ──▶ Checks revocation
```

### 6.2 Presentation Bundle Format

```typescript
interface PresentationBundle {
  credentialId: string
  encryptedPayload: string    // libsodium sealed box
  nonce: string              // Random 256-bit nonce
  expiresAt: number         // Unix timestamp (ms)
  revealedClaims: string[]
}
```

**Security properties:**
- One-time use: nonce prevents replay
- Time-bound: expires in 5 minutes
- Selective: only revealed claims included
- Encrypted: only target verifier can decrypt

---

## 7. Verification

### 7.1 Offline Verification

Steps:
1. Parse presentation bundle
2. Check expiry (presentation + credential)
3. Verify signature against issuer public key
4. Check claim requirements
5. **Skip revocation** (no network)

### 7.2 Online Verification

Additional steps:
6. Fetch revocation status from issuer endpoint
7. Verify Merkle proof (if provided)
8. Check issuer trust policy

### 7.3 Trust Policy

Verifiers configure:
- `allowedIssuers`: Whitelist of trusted DIDs
- `blockedIssuers`: Explicitly untrusted DIDs
- `allowedCountries`: Geo-restriction
- `minKeyBits`: Minimum cryptographic strength
- `allowedKeyTypes`: RSA or Ed25519
- `maxCredentialAgeDays`: Staleness limit

---

## 8. Revocation

### 8.1 Merkle Tree Registry

Revocations stored in a binary Merkle tree:
- Leaf: `SHA-256(credentialId)`
- Internal node: `SHA-256(left + right)`
- Root: Published publicly, updated every N entries

### 8.2 Revocation Flow

```
Issuer decides to revoke ──▶ Adds hash to tree ──▶ Rebuilds root ──▶ Publishes new root
                                    │
                                    ▼
                           ┌─────────────────┐
                           │ Revocation List │
                           │ (public, auditable)│
                           └─────────────────┘
                                    │
                                    ▼
Verifier checks credential ──▶ Computes leaf hash ──▶ Verifies Merkle proof
```

### 8.3 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/revocation-check/{hash}` | GET | Check if credential revoked |
| `/merkle-root` | GET | Get current Merkle root |
| `/admin/revoke` | POST | Add credential to revocation list |

---

## 9. Federation

### 9.1 DID Registry

Centralized registry of trusted issuers:
- DID → public key mapping
- Status: active, suspended, revoked
- Revocation endpoint URL
- Country and key metadata

### 9.2 Sync Protocol

```
Registry Node A ──▶ Export signed snapshot ──▶ Registry Node B
Registry Node B ──▶ Verify signature ──▶ Import snapshot
```

Sync frequency: Every 6 hours or on-demand via gossip.

---

## 10. Security Considerations

### 10.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| Credential forgery | RSA/Ed25519 signatures |
| Replay attack | One-time nonce in presentation |
| Revocation bypass | Online + Merkle proof check |
| Issuer compromise | Key rotation + transparency log |
| Device theft | Biometric lock + auto-lock on background |
| Network eavesdropping | TLS 1.3 + no credential over wire |
| Verifier tracking | Selective disclosure + per-verifier nonces |

### 10.2 Cryptographic Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Key type | RSA-2048 or Ed25519 | NIST/IANA standard |
| Hash | SHA-256 | Collision resistant |
| Nonce entropy | 256 bits | Brute-force resistant |
| Presentation expiry | 5 minutes | Limits replay window |
| Credential expiry | 5 years (INE) | Match document validity |

---

## 11. Implementation Reference

### 11.1 Repositories

- `@m8/identity` — TypeScript SDK (credential, verify, registry, w3c)
- `m8-issuer` — Python FastAPI issuer service
- `m8-wallet` — React Native wallet app
- `m8-verify` — Verifier dashboard

### 11.2 Test Vectors

```json
{
  "credential": {
    "id": "cred-test-001",
    "issuerDid": "did:m8:ine:emisor-001",
    "claims": {"ageOver18": true, "citizenship": "MX"},
    "proofJws": "eyJhbGciOiJSUzI1NiIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..."
  },
  "presentation": {
    "credentialId": "cred-test-001",
    "encryptedPayload": "encrypted:mock",
    "nonce": "nonce:test123",
    "expiresAt": 1778389183000,
    "revealedClaims": ["ageOver18"]
  }
}
```

---

## 12. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2026-05-09 | Initial specification |

---

## 13. References

- [W3C Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [DID Core Specification](https://www.w3.org/TR/did-core/)
- [RFC 7515 - JWS](https://tools.ietf.org/html/rfc7515)
- [RFC 8032 - Ed25519](https://tools.ietf.org/html/rfc8032)
- [NIST FIPS 186-5](https://csrc.nist.gov/publications/detail/fips/186/5/final)

---

## 14. Contributing

This specification is open for community review. Submit issues and PRs to:
`https://github.com/paramx/m8-identity`

---

*This specification is published under CC-BY-SA 4.0. You are free to share and adapt, with attribution.*
