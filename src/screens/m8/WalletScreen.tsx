import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  AppState,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native'
// @ts-ignore - QRCode has no types
import QRCode from 'react-native-qrcode-svg'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useLingui } from '@lingui/react'

import { getGrants, type ProofBrokerGrant } from '#/lib/m8'
import { authenticateBiometric } from '#/lib/m8/biometric'
import { useTheme } from '#/alf'
import { Text } from '#/components/Typography'

// ─── Types ─────────────────────────────────────────────────────────────────

interface StoredCredential {
  id: string
  issuerDid: string
  issuedAt: string
  expiresAt: string
  claims: {
    ageOver18?: boolean
    ageOver21?: boolean
    citizenship?: string
    districtHash?: string
    curvHash?: string
    verifiedPublicFigure?: boolean
  }
  proof: {
    type: string
    jws: string
  }
  revocationHash: string
  deviceBinding: string
}

interface PresentationBundle {
  credentialId: string
  encryptedPayload: string
  nonce: string
  expiresAt: number
  revealedClaims: string[]
}

// ─── Secure Storage (m8 integration) ────────────────────────────────────────

const secureStorage = {
  getCredentials: async (): Promise<StoredCredential[]> => {
    try {
      const { grants } = await getGrants()
      return grants.map(grantToCredential)
    } catch (err) {
      console.warn('[m8] Failed to load credentials:', err)
      return []
    }
  },
  deleteCredential: async (_id: string): Promise<void> => {
    // TODO: revoke grant via m8 API
    console.log('Deleting credential', _id)
  },
}

function grantToCredential(grant: ProofBrokerGrant): StoredCredential {
  const claims: StoredCredential['claims'] = {}
  for (const c of grant.requestedClaims) {
    if (c.type === 'is_age_eligible') claims.ageOver18 = true
    if (c.type === 'has_para_verification') claims.citizenship = 'MX'
    if (c.type === 'is_verified_public_figure') claims.verifiedPublicFigure = true
  }
  return {
    id: grant.id,
    issuerDid: 'did:m8:ine:emisor-001',
    issuedAt: grant.issuedAt ?? grant.requestedAt,
    expiresAt: grant.expiresAt ?? '2031-01-01T00:00:00Z',
    claims,
    proof: { type: 'Ed25519', jws: grant.proofArtifactIds[0] ?? 'mock' },
    revocationHash: `sha256:${grant.id}`,
    deviceBinding: 'device:m8:session',
  }
}

// ─── Wallet Screen ─────────────────────────────────────────────────────────

export default function WalletScreen() {
  const t = useTheme()
  const [credentials, setCredentials] = useState<StoredCredential[]>([])
  const [selectedCredential, setSelectedCredential] = useState<StoredCredential | null>(null)
  const [isLocked, setIsLocked] = useState(true)
  const [presentationBundle, setPresentationBundle] = useState<PresentationBundle | null>(null)
  const [showConsent, setShowConsent] = useState(false)

  // Scan line animation
  const scanLineY = useSharedValue(0)
  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
    opacity: 0.6,
  }))

  // Card press animation
  const cardScale = useSharedValue(1)
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }))

  useEffect(() => {
    scanLineY.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(180, { duration: 2500 }),
      withTiming(0, { duration: 2500 })
    )
    const interval = setInterval(() => {
      scanLineY.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(180, { duration: 2500 }),
        withTiming(0, { duration: 2500 })
      )
    }, 5000)
    return () => clearInterval(interval)
  }, [scanLineY])

  const loadCredentials = useCallback(async () => {
    const creds = await secureStorage.getCredentials()
    setCredentials(creds)
  }, [])

  useEffect(() => {
    if (!isLocked) {
      loadCredentials()
    }
  }, [isLocked, loadCredentials])

  // Auto-lock on background
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'background') {
        setIsLocked(true)
        setSelectedCredential(null)
        setPresentationBundle(null)
        setShowConsent(false)
      }
    })
    return () => sub.remove()
  }, [])

  const unlock = useCallback(async () => {
    const ok = await authenticateBiometric()
    if (ok) {
      setIsLocked(false)
      Vibration.vibrate(50)
    } else {
      Alert.alert('Authentication Failed', 'Please try again.')
    }
  }, [])

  const handlePresent = useCallback(() => {
    setShowConsent(true)
  }, [])

  const handleConsentConfirm = useCallback(
    (selectedClaims: (keyof StoredCredential['claims'])[]) => {
      if (!selectedCredential) return
      setShowConsent(false)

      // Build presentation bundle
      const bundle: PresentationBundle = {
        credentialId: selectedCredential.id,
        encryptedPayload: `encrypted:${selectedCredential.proof.jws.slice(0, 20)}...`,
        nonce: `nonce:${Math.random().toString(36).slice(2)}`,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
        revealedClaims: selectedClaims as string[],
      }

      setPresentationBundle(bundle)
      Vibration.vibrate([0, 100, 50, 100])
    },
    [selectedCredential]
  )

  // ─── Locked State ─────────────────────────────────────────────────────────

  if (isLocked) {
    return (
      <View style={[styles.container, t.atoms.bg]}>
        <View style={styles.lockScreen}>
          <Text style={[styles.lockIcon, t.atoms.text]}>🔒</Text>
          <Text style={[styles.lockTitle, t.atoms.text]}>Wallet Locked</Text>
          <Text style={[styles.lockSubtitle, t.atoms.text_contrast_medium]}>
            Authentication required to access credentials
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Unlock wallet"
            accessibilityHint="Click to authenticate and unlock your wallet"
            onPress={unlock}
            style={[styles.unlockBtn, { backgroundColor: t.palette.primary_500 }]}>
            <Text style={styles.unlockBtnText}>Unlock with Biometrics</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ─── Presentation QR ─────────────────────────────────────────────────────

  if (presentationBundle) {
    return (
      <PresentationQRView
        bundle={presentationBundle}
        onClose={() => setPresentationBundle(null)}
      />
    )
  }

  // ─── Consent Screen ────────────────────────────────────────────────────────

  if (showConsent && selectedCredential) {
    return (
      <ConsentScreen
        credential={selectedCredential}
        onCancel={() => setShowConsent(false)}
        onConfirm={handleConsentConfirm}
      />
    )
  }

  // ─── Credential Detail ───────────────────────────────────────────────────

  if (selectedCredential) {
    return (
      <CredentialDetail
        credential={selectedCredential}
        onBack={() => setSelectedCredential(null)}
        onPresent={handlePresent}
      />
    )
  }

  // ─── Main Wallet List ──────────────────────────────────────────────────────

  return (
    <View style={[styles.container, t.atoms.bg]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, t.atoms.text]}>My Wallet</Text>
        <Text style={[styles.headerSubtitle, t.atoms.text_contrast_medium]}>
          {credentials.length} credentials
        </Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {credentials.map(cred => (
          <TouchableOpacity
            key={cred.id}
            accessibilityRole="button"
            accessibilityLabel={`Credential from ${cred.issuerDid}`}
            accessibilityHint="Double tap to view credential details"
            onPress={() => setSelectedCredential(cred)}
            style={[styles.card, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
            <Animated.View style={[styles.cardInner, cardAnimatedStyle]}>
              <View style={styles.cardHeader}>
                <View style={[styles.issuerBadge, { backgroundColor: t.palette.primary_500 + '20' }]}>
                  <Text style={[styles.issuerBadgeText, { color: t.palette.primary_500 }]}>INE</Text>
                </View>
                <Text style={[styles.cardStatus, { color: t.palette.primary_500 }]}>Active</Text>
              </View>

              <Text style={[styles.cardTitle, t.atoms.text]}>Mexican Citizen Credential</Text>

              <View style={styles.claimsRow}>
                {cred.claims.ageOver18 && (
                  <View style={[styles.claimChip, { backgroundColor: t.palette.primary_500 + '15' }]}>
                    <Text style={[styles.claimChipText, { color: t.palette.primary_500 }]}>18+</Text>
                  </View>
                )}
                {cred.claims.citizenship === 'MX' && (
                  <View style={[styles.claimChip, { backgroundColor: t.palette.primary_500 + '15' }]}>
                    <Text style={[styles.claimChipText, { color: t.palette.primary_500 }]}>🇲🇽 MX</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.cardExpiry, t.atoms.text_contrast_medium]}>
                Expires: {new Date(cred.expiresAt).toLocaleDateString()}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.scanLine, scanLineStyle, { backgroundColor: t.palette.primary_500 }]} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Add new credential"
          accessibilityHint="Click to add a new credential to your wallet"
          style={[styles.addCard, { borderColor: t.palette.contrast_100 }]}>
          <Text style={[styles.addCardText, t.atoms.text_contrast_medium]}>+ Add Credential</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

// ─── Credential Detail Sub-screen ────────────────────────────────────────────

function CredentialDetail({
  credential,
  onBack,
  onPresent,
}: {
  credential: StoredCredential
  onBack: () => void
  onPresent: () => void
}) {
  const t = useTheme()
  const {} = useLingui()

  return (
    <View style={[styles.container, t.atoms.bg]}>
      <View style={styles.detailHeader}>
        <TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.backBtn}>
          <Text style={[styles.backBtnText, t.atoms.text]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.detailTitle, t.atoms.text]}>Credential Detail</Text>
      </View>

      <ScrollView style={styles.detailContent}>
        <View style={[styles.detailCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>Issuer</Text>
            <Text style={[styles.detailValue, t.atoms.text]}>{credential.issuerDid}</Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>Issued</Text>
            <Text style={[styles.detailValue, t.atoms.text]}>
              {new Date(credential.issuedAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>Expires</Text>
            <Text style={[styles.detailValue, t.atoms.text]}>
              {new Date(credential.expiresAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>Claims</Text>
            {Object.entries(credential.claims).map(([key, value]) => (
              <View key={key} style={styles.claimRow}>
                <Text style={[styles.claimKey, t.atoms.text_contrast_medium]}>{key}</Text>
                <Text style={[styles.claimValue, t.atoms.text]}>{value?.toString()}</Text>
              </View>
            ))}
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>Proof</Text>
            <Text style={[styles.proofValue, t.atoms.text_contrast_medium]}>
              {credential.proof.type}: {credential.proof.jws.slice(0, 20)}...
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>Device Binding</Text>
            <Text style={[styles.proofValue, t.atoms.text_contrast_medium]}>
              {credential.deviceBinding}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Present credential"
          accessibilityHint="Click to start presenting this credential to a verifier"
          onPress={onPresent}
          style={[styles.presentBtn, { backgroundColor: t.palette.primary_500 }]}>
          <Text style={styles.presentBtnText}>Present Credential</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Delete credential"
          accessibilityHint="Click to permanently delete this credential"
          onPress={() => {
            Alert.alert(
              'Delete Credential',
              'This will permanently remove the credential from your device.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    secureStorage.deleteCredential(credential.id)
                    onBack()
                  },
                },
              ]
            )
          }}
          style={styles.deleteBtn}>
          <Text style={[styles.deleteBtnText, { color: t.palette.contrast_500 }]}>
            Delete Credential
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

// ─── Consent Screen ────────────────────────────────────────────────────────

function ConsentScreen({
  credential,
  onCancel,
  onConfirm,
}: {
  credential: StoredCredential
  onCancel: () => void
  onConfirm: (claims: (keyof StoredCredential['claims'])[]) => void
}) {
  const t = useTheme()
  const {} = useLingui()
  const [selectedClaims, setSelectedClaims] = useState<(keyof StoredCredential['claims'])[]>([
    'ageOver18',
    'citizenship',
  ])

  const toggleClaim = (claim: keyof StoredCredential['claims']) => {
    setSelectedClaims(prev =>
      prev.includes(claim) ? prev.filter(c => c !== claim) : [...prev, claim]
    )
  }

  return (
    <View style={[styles.container, t.atoms.bg]}>
      <View style={styles.consentHeader}>
        <TouchableOpacity accessibilityRole="button" onPress={onCancel} style={styles.backBtn}>
          <Text style={[styles.backBtnText, t.atoms.text]}>✕</Text>
        </TouchableOpacity>
        <Text style={[styles.consentTitle, t.atoms.text]}>Select Claims to Share</Text>
      </View>

      <ScrollView style={styles.consentContent}>
        <Text style={[styles.consentSubtitle, t.atoms.text_contrast_medium]}>
          Choose which verified claims to reveal to the verifier. You control your data.
        </Text>

        <View style={[styles.consentCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
          {Object.entries(credential.claims).map(([key, value]) => {
            const isSelected = selectedClaims.includes(key as keyof StoredCredential['claims'])
            return (
              <TouchableOpacity
                key={key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                onPress={() => toggleClaim(key as keyof StoredCredential['claims'])}
                style={[styles.claimToggle, { borderBottomColor: t.palette.contrast_100 }]}>
                <View style={styles.claimToggleLeft}>
                  <Text style={[styles.claimToggleKey, t.atoms.text]}>{key}</Text>
                  <Text style={[styles.claimToggleValue, t.atoms.text_contrast_medium]}>
                    {String(value)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.claimToggleCheck,
                    {
                      backgroundColor: isSelected ? t.palette.primary_500 : t.palette.contrast_100,
                    },
                  ]}>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={[styles.securityBadge, { backgroundColor: t.palette.primary_500 + '15' }]}>
          <Text style={[styles.securityBadgeText, { color: t.palette.primary_500 }]}>
            🔒 End-to-end encrypted
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Confirm and generate QR"
          accessibilityHint="Click to confirm your selection and generate the presentation QR code"
          onPress={() => onConfirm(selectedClaims)}
          style={[styles.confirmBtn, { backgroundColor: t.palette.primary_500 }]}>
          <Text style={styles.confirmBtnText}>Generate QR Code</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

// ─── Presentation QR View ──────────────────────────────────────────────────

function PresentationQRView({
  bundle,
  onClose,
}: {
  bundle: PresentationBundle
  onClose: () => void
}) {
  const t = useTheme()
  const {} = useLingui()
  const [countdown, setCountdown] = useState(300) // 5 minutes

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer)
          onClose()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [onClose])

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60

  return (
    <View style={[styles.container, t.atoms.bg]}>
      <View style={styles.qrHeader}>
        <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.backBtn}>
          <Text style={[styles.backBtnText, t.atoms.text]}>✕</Text>
        </TouchableOpacity>
        <Text style={[styles.qrTitle, t.atoms.text]}>Scan to Verify</Text>
      </View>

      <View style={styles.qrContent}>
        <View style={[styles.qrCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
          <QRCode
            value={JSON.stringify(bundle)}
            size={220}
            color={t.palette.contrast_500}
            backgroundColor={t.atoms.bg.backgroundColor as string}
          />
        </View>

        <Text style={[styles.qrSubtitle, t.atoms.text_contrast_medium]}>
          Show this QR to the verifier. It contains your selected claims encrypted with a one-time nonce.
        </Text>

        <View style={[styles.countdownBadge, { backgroundColor: t.palette.primary_500 + '15' }]}>
          <Text style={[styles.countdownText, { color: t.palette.primary_500 }]}>
            ⏱️ Expires in {mins}:{secs.toString().padStart(2, '0')}
          </Text>
        </View>

        <View style={styles.revealedClaims}>
          <Text style={[styles.revealedTitle, t.atoms.text]}>Revealing:</Text>
          {bundle.revealedClaims.map(claim => (
            <View key={claim} style={[styles.revealedChip, { backgroundColor: t.palette.primary_500 + '15' }]}>
              <Text style={[styles.revealedChipText, { color: t.palette.primary_500 }]}>{claim}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Lock screen
  lockScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  lockIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  unlockBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  unlockBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  // List
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  // Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cardInner: {
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  issuerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  issuerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  claimsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  claimChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  claimChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardExpiry: {
    fontSize: 12,
    marginTop: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  // Add card
  addCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  addCardText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Detail
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailContent: {
    flex: 1,
  },
  detailCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  detailSection: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
  },
  claimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  claimKey: {
    fontSize: 13,
  },
  claimValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  proofValue: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  presentBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  presentBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 32,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Consent
  consentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  consentTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  consentContent: {
    flex: 1,
  },
  consentSubtitle: {
    fontSize: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    lineHeight: 20,
  },
  consentCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  claimToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  claimToggleLeft: {
    flex: 1,
    gap: 2,
  },
  claimToggleKey: {
    fontSize: 14,
    fontWeight: '600',
  },
  claimToggleValue: {
    fontSize: 12,
  },
  claimToggleCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  securityBadge: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  securityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // QR
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  qrContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  qrCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
  },
  qrSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  countdownBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '700',
  },
  revealedClaims: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  revealedTitle: {
    fontSize: 12,
    fontWeight: '600',
    width: '100%',
    textAlign: 'center',
    marginBottom: 4,
  },
  revealedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  revealedChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
})
