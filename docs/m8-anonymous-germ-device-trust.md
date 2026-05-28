# m8 Anonymous Cards, Germ DM, and Device Trust

## Privacy Contract

Anonymous PARA posts must never render a Germ profile button with the real author DID in the URL fragment. Public profile Germ buttons may use Germ's `com.germnetwork.declaration` flow, but anonymous post contact is always resolved through m8:

```ts
const contact = await getAnonymousPublicContact(postUri)
if (!contact.dmEnabled) return null
return {
  label: contact.label,
  url: contact.contactUrl,
  proofBadges: contact.proofBadges,
}
```

m8 stores Germ contact URLs as opaque references. It does not generate Germ key packages, MLS state, HPKE payloads, or card crypto.

## Public Profile Germ Button

For normal non-anonymous profiles, PARA can use `buildGermProfileMessageButton()` with the fetched `com.germnetwork.declaration` record:

```ts
const button = buildGermProfileMessageButton({
  declaration,
  profileDid,
  viewerDid,
  viewerFollowsProfile,
})
```

This helper honors `messageMe.showButtonTo` and appends `[profile DID]+[viewer DID]` only for non-anonymous profile flows.

## Device Trust Model

The current m8 backend has a persistence and policy gate:

```ts
assertTrustedDevice(sessionId, 'LinkAnonymousGermContact')
assertTrustedDevice(sessionId, 'EnableAnonymousPrivateReplies')
```

Production verifier adapters should plug into `trusted_devices` and record:

```ts
type TrustedDevice = {
  sessionId: string
  platform: 'ios' | 'android' | 'web'
  deviceKeyId: string
  publicKey: string
  attestationStatus: 'verified' | 'rejected' | 'unverified'
  riskTier: 'low' | 'medium' | 'high'
  lastVerifiedAt: string
}
```

## Native Verifier Pseudocode

### iOS App Attest

```ts
async function verifyIosAppAttest(sessionId, challenge, attestationObject) {
  const decoded = decodeCbor(attestationObject)
  verifyAppleAppAttestCertificateChain(decoded.x5c)
  verifyNonceBinding(decoded.authData, challenge)
  verifyBundleIdAndTeamId(decoded.authData)
  const publicKey = extractCredentialPublicKey(decoded.authData)
  return upsertTrustedDevice({
    sessionId,
    platform: 'ios',
    deviceKeyId: decoded.credentialId,
    publicKey,
    attestationStatus: 'verified',
    riskTier: 'high',
  })
}
```

### Android Play Integrity

```ts
async function verifyAndroidPlayIntegrity(sessionId, nonce, verdictJwt) {
  const verdict = await googlePlayIntegrity.decodeAndVerify(verdictJwt)
  assert(verdict.requestDetails.nonce === nonce)
  assert(verdict.appIntegrity.packageName === EXPECTED_ANDROID_PACKAGE)
  assert(verdict.appIntegrity.certificateSha256Digest.includes(EXPECTED_CERT_DIGEST))
  assert(verdict.deviceIntegrity.deviceRecognitionVerdict.includes('MEETS_STRONG_INTEGRITY'))
  return upsertTrustedDevice({
    sessionId,
    platform: 'android',
    deviceKeyId: hash(verdict.accountDetails.appLicensingVerdict + nonce),
    publicKey: '',
    attestationStatus: 'verified',
    riskTier: 'high',
  })
}
```

### WebAuthn

```ts
async function verifyWebAuthnDevice(sessionId, challenge, credential) {
  const result = await webauthn.verifyRegistrationResponse({challenge, credential})
  const highAssurance = result.registrationInfo.credentialDeviceType === 'singleDevice'
  return upsertTrustedDevice({
    sessionId,
    platform: 'web',
    deviceKeyId: result.registrationInfo.credentialID,
    publicKey: result.registrationInfo.credentialPublicKey,
    attestationStatus: 'verified',
    riskTier: highAssurance ? 'high' : 'medium',
  })
}
```

Sensitive anonymous/Germ operations should continue to require `riskTier: 'high'`.
