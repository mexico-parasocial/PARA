import { describe, it, expect, beforeAll } from 'vitest'
import {
  generateDeviceKeyPair,
  createIssuerKeys,
  createCredential,
  verifyCredential,
  createPresentationFixed,
  verifyPresentation,
  checkRevocation,
  filterClaims,
  type M8Credential,
  type IssuerKeySet,
} from '../src/credential'

describe('m8 Identity Credentials', () => {
  let issuerKeys: IssuerKeySet
  let deviceKeys: ReturnType<typeof generateDeviceKeyPair>

  beforeAll(() => {
    issuerKeys = createIssuerKeys('did:m8:issuer:ine-proxy-1')
    deviceKeys = generateDeviceKeyPair()
  })

  describe('Key Generation', () => {
    it('generates unique device key pairs', () => {
      const kp1 = generateDeviceKeyPair()
      const kp2 = generateDeviceKeyPair()
      expect(kp1.fingerprint).not.toBe(kp2.fingerprint)
      expect(kp1.publicKey.toString('hex')).not.toBe(kp2.publicKey.toString('hex'))
    })

    it('creates issuer keys with rotation schedule', () => {
      expect(issuerKeys.did).toBe('did:m8:issuer:ine-proxy-1')
      expect(issuerKeys.signingKey.fingerprint).toHaveLength(16)
      expect(issuerKeys.revocationKey.fingerprint).toHaveLength(16)
      
      const created = new Date(issuerKeys.createdAt)
      const expires = new Date(issuerKeys.expiresAt)
      const daysDiff = (expires.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      expect(daysDiff).toBe(90)
    })
  })

  describe('Credential Creation & Verification', () => {
    it('creates a valid credential', () => {
      const credential = createCredential({
        issuerDid: issuerKeys.did,
        issuerPrivateKey: issuerKeys.signingKey.privateKey,
        claims: {
          ageOver18: true,
          citizenship: 'MX',
          curvHash: 'abc123...',
        },
      })

      expect(credential.version).toBe('m8-identity-1')
      expect(credential.issuerDid).toBe(issuerKeys.did)
      expect(credential.claims.ageOver18).toBe(true)
      expect(credential.proof.jws).toBeTruthy()
      expect(credential.credentialId).toHaveLength(32) // 16 bytes hex
    })

    it('verifies a valid credential', () => {
      const credential = createCredential({
        issuerDid: issuerKeys.did,
        issuerPrivateKey: issuerKeys.signingKey.privateKey,
        claims: { ageOver18: true },
      })

      const result = verifyCredential(credential, issuerKeys.signingKey.publicKey)
      expect(result.valid).toBe(true)
      expect(result.claims?.ageOver18).toBe(true)
    })

    it('rejects credential with invalid signature', () => {
      const credential = createCredential({
        issuerDid: issuerKeys.did,
        issuerPrivateKey: issuerKeys.signingKey.privateKey,
        claims: { ageOver18: true },
      })

      // Tamper with claims
      const tampered = { ...credential, claims: { ...credential.claims, ageOver18: false } }
      const result = verifyCredential(tampered, issuerKeys.signingKey.publicKey)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Invalid signature')
    })

    it('rejects expired credential', () => {
      const credential = createCredential({
        issuerDid: issuerKeys.did,
        issuerPrivateKey: issuerKeys.signingKey.privateKey,
        claims: { ageOver18: true },
        validityDays: -1, // Expired yesterday
      })

      const result = verifyCredential(credential, issuerKeys.signingKey.publicKey)
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Credential expired')
    })
  })

  describe('Presentation & Device Binding', () => {
    let credential: M8Credential

    beforeAll(() => {
      credential = createCredential({
        issuerDid: issuerKeys.did,
        issuerPrivateKey: issuerKeys.signingKey.privateKey,
        claims: {
          ageOver18: true,
          ageOver21: true,
          district: '09-HASHTAG',
          citizenship: 'MX',
        },
      })
    })

    it('creates presentation with selective disclosure', () => {
      const presentation = createPresentationFixed({
        credential,
        devicePrivateKey: deviceKeys.privateKey,
        devicePublicKey: deviceKeys.publicKey,
        disclosedClaims: ['ageOver18', 'citizenship'],
      })

      expect(presentation.disclosedClaims).toEqual(['ageOver18', 'citizenship'])
      expect(presentation.deviceBinding.deviceKeyFingerprint).toBe(deviceKeys.fingerprint)
      expect(presentation.deviceBinding.signature).toBeTruthy()
    })

    it('verifies valid presentation', () => {
      const presentation = createPresentationFixed({
        credential,
        devicePrivateKey: deviceKeys.privateKey,
        devicePublicKey: deviceKeys.publicKey,
        disclosedClaims: ['ageOver18'],
      })

      const result = verifyPresentation(
        presentation,
        issuerKeys.signingKey.publicKey,
        deviceKeys.publicKey,
      )

      expect(result.valid).toBe(true)
      expect(result.deviceBound).toBe(true)
      expect(result.disclosedClaims).toEqual(['ageOver18'])
    })

    it('rejects presentation with wrong device key', () => {
      const otherDevice = generateDeviceKeyPair()
      const presentation = createPresentationFixed({
        credential,
        devicePrivateKey: deviceKeys.privateKey,
        devicePublicKey: deviceKeys.publicKey,
        disclosedClaims: ['ageOver18'],
      })

      const result = verifyPresentation(
        presentation,
        issuerKeys.signingKey.publicKey,
        otherDevice.publicKey, // Wrong key
      )

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Device key mismatch')
    })
  })

  describe('Revocation', () => {
    it('detects revoked credential', () => {
      const credential = createCredential({
        issuerDid: issuerKeys.did,
        issuerPrivateKey: issuerKeys.signingKey.privateKey,
        claims: { ageOver18: true },
      })

      const credentialHash = require('crypto')
        .createHash('sha256')
        .update(credential.credentialId)
        .digest('hex')

      const revocationList = {
        issuerDid: issuerKeys.did,
        listId: 'rev-list-1',
        revokedCredentials: [credentialHash],
        updatedAt: new Date().toISOString(),
        signature: '', // Would be signed in production
      }

      // Mock signature for test
      const { createSign } = require('crypto')
      const sign = createSign('SHA256')
      const { signature, ...listWithoutSig } = revocationList
      sign.update(JSON.stringify(listWithoutSig))
      sign.end()
      revocationList.signature = sign.sign(issuerKeys.signingKey.privateKey, 'base64url')

      const isRevoked = checkRevocation(credential, revocationList, issuerKeys.signingKey.publicKey)
      expect(isRevoked).toBe(true)
    })
  })

  describe('Selective Disclosure', () => {
    it('filters claims correctly', () => {
      const credential = createCredential({
        issuerDid: issuerKeys.did,
        issuerPrivateKey: issuerKeys.signingKey.privateKey,
        claims: {
          ageOver18: true,
          ageOver21: true,
          district: '09-HASHTAG',
        },
      })

      const filtered = filterClaims(credential, ['ageOver18'])
      expect(filtered.ageOver18).toBe(true)
      expect(filtered.ageOver21).toBeUndefined()
      expect(filtered.district).toBeUndefined()
    })
  })
})
