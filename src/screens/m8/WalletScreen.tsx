import {useCallback, useEffect, useState} from 'react'
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import {useLingui} from '@lingui/react'

import {getGrants, postGrantRevoke, type ProofBrokerGrant} from '#/lib/im8'
import {authenticateBiometric} from '#/lib/im8/biometric'
import {INE_INTEGRATION_APPROVED, INE_PREVIEW_NOTICE} from '#/lib/im8/ine'
import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

// ─── Types ─────────────────────────────────────────────────────────────────

interface StoredCredential {
  id: string
  issuerDid: string
  issuedAt: string
  expiresAt: string
  status: 'pending' | 'approved' | 'revoked' | 'expired'
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

// ─── Secure Storage (m8 integration) ────────────────────────────────────────

const secureStorage = {
  getCredentials: async (): Promise<StoredCredential[]> => {
    try {
      const {grants} = await getGrants()
      return grants.map(grantToCredential)
    } catch (err) {
      console.warn('[m8] Failed to load credentials:', err)
      return []
    }
  },
  deleteCredential: async (id: string): Promise<void> => {
    // Credential ids are grant ids (see grantToCredential).
    await postGrantRevoke(id, 'Revoked from wallet')
  },
}

function grantToCredential(grant: ProofBrokerGrant): StoredCredential {
  const claims: StoredCredential['claims'] = {}
  for (const c of grant.requestedClaims) {
    if (c.type === 'is_age_eligible') claims.ageOver18 = true
    if (c.type === 'has_para_verification') claims.citizenship = 'MX'
    if (c.type === 'is_verified_public_figure')
      claims.verifiedPublicFigure = true
  }
  return {
    id: grant.id,
    // Claims come from the m8 proof broker; the signed INE issuer credential
    // only exists once INE integration is approved.
    issuerDid: INE_INTEGRATION_APPROVED
      ? 'did:m8:ine:emisor-001'
      : 'did:m8:broker',
    issuedAt: grant.issuedAt ?? grant.requestedAt,
    expiresAt: grant.expiresAt ?? grant.issuedAt ?? grant.requestedAt,
    status: grant.status,
    claims,
    proof: {type: 'Ed25519', jws: grant.proofArtifactIds[0] ?? ''},
    revocationHash: `sha256:${grant.id}`,
    deviceBinding: 'device:m8:session',
  }
}

// ─── Wallet Screen ─────────────────────────────────────────────────────────

export default function WalletScreen() {
  const t = useTheme()
  const [credentials, setCredentials] = useState<StoredCredential[]>([])
  const [selectedCredential, setSelectedCredential] =
    useState<StoredCredential | null>(null)
  const [isLocked, setIsLocked] = useState(true)

  // Scan line animation
  const scanLineY = useSharedValue(0)
  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{translateY: scanLineY.value}],
    opacity: 0.6,
  }))

  // Card press animation
  const cardScale = useSharedValue(1)
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: cardScale.value}],
  }))

  useEffect(() => {
    scanLineY.value = withSequence(
      withTiming(0, {duration: 0}),
      withTiming(180, {duration: 2500}),
      withTiming(0, {duration: 2500}),
    )
    const interval = setInterval(() => {
      scanLineY.value = withSequence(
        withTiming(0, {duration: 0}),
        withTiming(180, {duration: 2500}),
        withTiming(0, {duration: 2500}),
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
            style={[
              styles.unlockBtn,
              {backgroundColor: t.palette.primary_500},
            ]}>
            <Text style={styles.unlockBtnText}>Unlock with Biometrics</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ─── Credential Detail ───────────────────────────────────────────────────

  if (selectedCredential) {
    return (
      <CredentialDetail
        credential={selectedCredential}
        onBack={() => setSelectedCredential(null)}
        onDeleted={async () => {
          await loadCredentials()
          setSelectedCredential(null)
        }}
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
        {!INE_INTEGRATION_APPROVED && (
          <Text
            style={[
              styles.headerSubtitle,
              {color: t.palette.primary_600, marginTop: 6},
            ]}>
            {INE_PREVIEW_NOTICE}
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}>
        {credentials.map(cred => (
          <TouchableOpacity
            key={cred.id}
            accessibilityRole="button"
            accessibilityLabel={`Credential from ${cred.issuerDid}`}
            accessibilityHint="Double tap to view credential details"
            onPress={() => setSelectedCredential(cred)}
            style={[
              styles.card,
              t.atoms.bg_contrast_25,
              {borderColor: t.palette.contrast_100},
            ]}>
            <Animated.View style={[styles.cardInner, cardAnimatedStyle]}>
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.issuerBadge,
                    {backgroundColor: t.palette.primary_500 + '20'},
                  ]}>
                  <Text
                    style={[
                      styles.issuerBadgeText,
                      {color: t.palette.primary_500},
                    ]}>
                    {INE_INTEGRATION_APPROVED ? 'INE' : 'm8 broker'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.cardStatus,
                    {
                      color:
                        cred.status === 'approved'
                          ? t.palette.primary_500
                          : t.palette.contrast_500,
                    },
                  ]}>
                  {cred.status.charAt(0).toUpperCase() + cred.status.slice(1)}
                </Text>
              </View>

              <Text style={[styles.cardTitle, t.atoms.text]}>
                {INE_INTEGRATION_APPROVED
                  ? 'Mexican Citizen Credential'
                  : 'Citizen Credential (preview)'}
              </Text>

              <View style={styles.claimsRow}>
                {cred.claims.ageOver18 && (
                  <View
                    style={[
                      styles.claimChip,
                      {backgroundColor: t.palette.primary_500 + '15'},
                    ]}>
                    <Text
                      style={[
                        styles.claimChipText,
                        {color: t.palette.primary_500},
                      ]}>
                      18+
                    </Text>
                  </View>
                )}
                {cred.claims.citizenship === 'MX' && (
                  <View
                    style={[
                      styles.claimChip,
                      {backgroundColor: t.palette.primary_500 + '15'},
                    ]}>
                    <Text
                      style={[
                        styles.claimChipText,
                        {color: t.palette.primary_500},
                      ]}>
                      🇲🇽 MX
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.cardExpiry, t.atoms.text_contrast_medium]}>
                Expires: {new Date(cred.expiresAt).toLocaleDateString()}
              </Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.scanLine,
                scanLineStyle,
                {backgroundColor: t.palette.primary_500},
              ]}
            />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Add new credential"
          accessibilityHint="Click to add a new credential to your wallet"
          style={[styles.addCard, {borderColor: t.palette.contrast_100}]}>
          <Text style={[styles.addCardText, t.atoms.text_contrast_medium]}>
            + Add Credential
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

// ─── Credential Detail Sub-screen ────────────────────────────────────────────

function CredentialDetail({
  credential,
  onBack,
  onDeleted,
}: {
  credential: StoredCredential
  onBack: () => void
  onDeleted: () => Promise<void>
}) {
  const t = useTheme()
  const {} = useLingui()

  return (
    <View style={[styles.container, t.atoms.bg]}>
      <View style={styles.detailHeader}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backBtn}>
          <Text style={[styles.backBtnText, t.atoms.text]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.detailTitle, t.atoms.text]}>
          Credential Detail
        </Text>
      </View>

      <ScrollView style={styles.detailContent}>
        <View
          style={[
            styles.detailCard,
            t.atoms.bg_contrast_25,
            {borderColor: t.palette.contrast_100},
          ]}>
          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>
              Issuer
            </Text>
            <Text style={[styles.detailValue, t.atoms.text]}>
              {credential.issuerDid}
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>
              Issued
            </Text>
            <Text style={[styles.detailValue, t.atoms.text]}>
              {new Date(credential.issuedAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>
              Expires
            </Text>
            <Text style={[styles.detailValue, t.atoms.text]}>
              {new Date(credential.expiresAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>
              Claims
            </Text>
            {Object.entries(credential.claims).map(([key, value]) => (
              <View key={key} style={styles.claimRow}>
                <Text style={[styles.claimKey, t.atoms.text_contrast_medium]}>
                  {key}
                </Text>
                <Text style={[styles.claimValue, t.atoms.text]}>
                  {value?.toString()}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>
              Proof
            </Text>
            <Text style={[styles.proofValue, t.atoms.text_contrast_medium]}>
              {credential.proof.jws
                ? `${credential.proof.type}: ${credential.proof.jws.slice(0, 20)}...`
                : `${credential.proof.type}: pending INE issuance`}
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>
              Device Binding
            </Text>
            <Text style={[styles.proofValue, t.atoms.text_contrast_medium]}>
              {credential.deviceBinding}
            </Text>
          </View>
        </View>

        {/*
          PARA does not present credentials. Presenting happens in the iM8
          wallet, which holds the key and shows everything a presentation
          reveals (mubEZ CD-14).
        */}
        <View style={[styles.detailSection, {marginTop: 16}]}>
          <Text style={[styles.detailLabel, t.atoms.text_contrast_medium]}>
            Sharing
          </Text>
          <Text style={[styles.proofValue, t.atoms.text_contrast_medium]}>
            Credentials are shared from your iM8 wallet, not from PARA. A shared
            credential includes your account DID and every fact in it, and apps
            can link repeat shares. It is not anonymous, and single facts cannot
            be hidden.
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Delete credential"
          accessibilityHint="Click to permanently delete this credential"
          onPress={() => {
            Alert.alert(
              'Delete Credential',
              'This will permanently remove the credential from your device.',
              [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      try {
                        await secureStorage.deleteCredential(credential.id)
                      } catch (err) {
                        console.warn('[m8] Failed to revoke credential:', err)
                      } finally {
                        await onDeleted()
                      }
                    })()
                  },
                },
              ],
            )
          }}
          style={styles.deleteBtn}>
          <Text style={[styles.deleteBtnText, {color: t.palette.contrast_500}]}>
            Delete Credential
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  // QR
})
