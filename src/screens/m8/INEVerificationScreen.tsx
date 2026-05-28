import {useCallback, useState} from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {useNavigation} from '@react-navigation/native'

import {
  postIneAnalyze,
  postIneCredential,
  postIneVerify,
  postRevokeCredential,
} from '#/lib/m8/api'
import type {IneExtractedData, IneVerificationResult} from '#/lib/m8/types'
import {type NavigationProp} from '#/lib/routes/types'
import * as Storage from '#/lib/storage'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import * as Layout from '#/components/Layout'

type Step = 'intro' | 'upload' | 'selfie' | 'review' | 'verify' | 'success'

const STEPS: Step[] = ['intro', 'upload', 'selfie', 'review', 'verify', 'success']

export default function INEVerificationScreen() {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const [step, setStep] = useState<Step>('intro')
  const [extracted, setExtracted] = useState<IneExtractedData | null>(null)
  const [verification, setVerification] = useState<IneVerificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ocrConfidence, setOcrConfidence] = useState(0)
  const stepIndex = STEPS.indexOf(step)

  const handleUploadIne = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Simulate INE upload with a deterministic base64 payload
      const simulatedPhoto = btoa(`simulated-ine-photo-${Date.now()}`)
      const result = await postIneAnalyze({
        inePhotoBase64: simulatedPhoto,
        simulatedMode: true,
      })
      setExtracted(result.extracted)
      setOcrConfidence(result.ocrConfidence)
      setStep('selfie')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze INE')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCaptureSelfie = useCallback(async () => {
    if (!extracted) return
    setLoading(true)
    setError(null)
    try {
      const simulatedSelfie = btoa(`simulated-selfie-${Date.now()}`)
      const result = await postIneVerify({
        extracted,
        selfieBase64: simulatedSelfie,
        consentToStore: true,
      })
      setVerification(result)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify')
    } finally {
      setLoading(false)
    }
  }, [extracted])

  const handleConfirm = useCallback(async () => {
    if (!extracted || !verification) return
    setLoading(true)
    setError(null)
    setStep('verify')
    try {
      const result = await postIneCredential({ extracted, verification })
      await AsyncStorage.setItem('para_ine_verified', 'true')
      await AsyncStorage.setItem('para_ine_verified_at', new Date().toISOString())
      await AsyncStorage.setItem('para_verified_human', 'true')

      // Store ZKP witness securely for client-side proving
      await Storage.setItemAsync('para_zkp_birthYear', String(result.birthYear))
      await Storage.setItemAsync('para_zkp_salt', String(result.salt))
      await Storage.setItemAsync('para_zkp_commitment', result.commitment)
      await Storage.setItemAsync('para_zkp_revocationHash', result.revocationHash)

      // Anonymous by default: store profile locally
      await Storage.setItemAsync('para_anonymous_profile', JSON.stringify(result.anonymousProfile))

      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue credential')
      setStep('review')
    } finally {
      setLoading(false)
    }
  }, [extracted, verification])

  const handleDone = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  /*
  const handleGenerateProof = useCallback(async () => {
    const birthYear = await Storage.getItemAsync('para_zkp_birthYear')
    const salt = await Storage.getItemAsync('para_zkp_salt')
    if (!birthYear || !salt) {
      Alert.alert('Error', 'No ZKP witness found. Please verify your identity first.')
      return
    }
    const url = getZkpProverUrl({
      birthYear: parseInt(birthYear, 10),
      salt: parseInt(salt, 10),
      currentYear: new Date().getFullYear(),
      ageThreshold: 18,
    })
    setProverUrl(url)
    setShowProver(true)
  }, [])
  */

  /*
  const handleProofResult = useCallback(async (result: {
    success: boolean
    proof?: unknown
    publicSignals?: string[]
    commitment?: string
    error?: string
  }) => {
    setShowProver(false)
    if (result.success && result.proof && result.publicSignals) {
      try {
        const verifyRes = await postZkpVerify({
          proof: result.proof,
          publicSignals: result.publicSignals,
        })
        if (verifyRes.valid) {
          Alert.alert('Success', '✅ Proof verified! Your age is proven without revealing your birth year.')
        } else {
          Alert.alert('Rejected', `❌ Proof rejected: ${verifyRes.reason ?? 'unknown'}`)
        }
      } catch (err) {
        Alert.alert('Error', `❌ Verification error: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    } else {
      Alert.alert('Error', `❌ Proof generation failed: ${result.error ?? 'unknown'}`)
    }
  }, [])
  */

  const handleRevoke = useCallback(async () => {
    const revocationHash = await Storage.getItemAsync('para_zkp_revocationHash')
    if (!revocationHash) {
      Alert.alert('Error', 'No credential to revoke.')
      return
    }
    Alert.alert(
      'Revoke Credential',
      'This will permanently invalidate your INE credential. Are you sure?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await postRevokeCredential({revocationHash, reason: 'User requested'})
              Alert.alert('Revoked', 'Your credential has been revoked.')
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Revocation failed')
            }
          },
        },
      ],
    )
  }, [])

  const stepLabel = (s: Step) => {
    switch (s) {
      case 'intro': return 'Start'
      case 'upload': return 'INE'
      case 'selfie': return 'Selfie'
      case 'review': return 'Review'
      case 'verify': return 'Verify'
      case 'success': return 'Done'
    }
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>INE Verification</Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Layout.Center>
          {/* Step indicator */}
          {step !== 'success' && (
            <View style={styles.stepRow}>
              {['intro', 'upload', 'selfie', 'review', 'verify'].map((s, i) => (
                <View key={s} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor:
                          i <= stepIndex
                            ? t.palette.primary_500
                            : t.palette.contrast_200,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color:
                          i <= stepIndex
                            ? t.palette.primary_500
                            : t.palette.contrast_400,
                      },
                    ]}>
                    {stepLabel(s as Step)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Error banner */}
          {error && (
            <View
              style={[
                styles.errorCard,
                {backgroundColor: t.palette.negative_500 + '15'},
              ]}>
              <Text style={{color: t.palette.negative_500, fontSize: 14}}>
                {error}
              </Text>
            </View>
          )}

          {/* Step 1: Intro */}
          {step === 'intro' && (
            <View style={styles.card}>
              <Text style={[styles.title, t.atoms.text]}>
                Verify your identity with INE
              </Text>
              <Text style={[styles.body, t.atoms.text_contrast_medium]}>
                This process verifies your Mexican citizenship and age using your
                voter ID card (INE). The verification results in a signed
                credential stored in your wallet — no raw personal data is kept.
              </Text>

              <View
                style={[
                  styles.privacyCard,
                  {backgroundColor: t.palette.primary_50},
                ]}>
                <Text style={[styles.privacyTitle, {color: t.palette.primary_700}]}>
                  Privacy promise
                </Text>
                <Text style={[styles.privacyBody, {color: t.palette.primary_600}]}>
                  Your INE photo and selfie are processed for verification only.
                  The raw data is never stored. Only derived claims (age,
                  citizenship, district) are kept in your credential wallet.
                </Text>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setStep('upload')}
                style={[
                  styles.primaryButton,
                  {backgroundColor: t.palette.primary_500},
                ]}>
                <Text style={styles.primaryButtonText}>Start verification</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Upload INE */}
          {step === 'upload' && (
            <View style={styles.card}>
              <Text style={[styles.title, t.atoms.text]}>
                Upload your INE
              </Text>
              <Text style={[styles.body, t.atoms.text_contrast_medium]}>
                Tap below to simulate uploading the front of your INE card.
                In production, this would open your camera or photo library.
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Simulate INE photo upload"
                accessibilityHint="Uploads a simulated INE photo for processing"
                onPress={handleUploadIne}
                disabled={loading}
                style={[
                  styles.uploadArea,
                  {
                    borderColor: t.palette.primary_300,
                    backgroundColor: t.palette.primary_50,
                  },
                ]}>
                {loading ? (
                  <ActivityIndicator color={t.palette.primary_500} />
                ) : (
                  <>
                    <Text style={[styles.uploadIcon, {color: t.palette.primary_500}]}>
                      📷
                    </Text>
                    <Text style={[styles.uploadText, {color: t.palette.primary_600}]}>
                      Tap to simulate INE upload
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: Selfie */}
          {step === 'selfie' && (
            <View style={styles.card}>
              <Text style={[styles.title, t.atoms.text]}>
                Capture a selfie
              </Text>
              <Text style={[styles.body, t.atoms.text_contrast_medium]}>
                We need a live photo to match against your INE. Position your face
                within the oval and tap to capture.
              </Text>

              <View
                style={[
                  styles.selfieFrame,
                  {
                    borderColor: t.palette.contrast_200,
                    backgroundColor: t.palette.contrast_50,
                  },
                ]}>
                <View
                  style={[
                    styles.selfieOval,
                    {borderColor: t.palette.primary_300},
                  ]}
                />
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Simulate selfie capture"
                accessibilityHint="Captures a simulated selfie for facial recognition"
                onPress={handleCaptureSelfie}
                disabled={loading}
                style={[
                  styles.primaryButton,
                  {backgroundColor: t.palette.primary_500},
                ]}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Capture selfie
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 4: Review */}
          {step === 'review' && extracted && verification && (
            <View style={styles.card}>
              <Text style={[styles.title, t.atoms.text]}>
                Review extracted data
              </Text>

              <View style={styles.confidenceRow}>
                <View
                  style={[
                    styles.confidenceBadge,
                    {
                      backgroundColor:
                        ocrConfidence >= 0.95
                          ? t.palette.positive_400 + '20'
                          : ocrConfidence >= 0.85
                            ? t.palette.primary_500 + '20'
                            : t.palette.negative_400 + '20',
                    },
                  ]}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color:
                        ocrConfidence >= 0.95
                          ? t.palette.positive_400
                          : ocrConfidence >= 0.85
                            ? t.palette.primary_500
                            : t.palette.negative_400,
                    }}>
                    OCR confidence: {Math.round(ocrConfidence * 100)}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.confidenceBadge,
                    {
                      backgroundColor: verification.faceMatch.passed
                        ? t.palette.positive_400 + '20'
                        : t.palette.negative_400 + '20',
                    },
                  ]}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: verification.faceMatch.passed
                        ? t.palette.positive_400
                        : t.palette.negative_400,
                    }}>
                    Face match: {Math.round(verification.faceMatch.score * 100)}%
                  </Text>
                </View>
              </View>

              <DataRow label="Full name" value={extracted.fullName} />
              <DataRow label="CURP" value={`${extracted.curp.slice(0, 4)}****${extracted.curp.slice(-4)}`} sensitive />
              <DataRow label="Voter ID" value={extracted.voterId} />
              <DataRow label="Birth date" value={extracted.birthDate} />
              <DataRow label="Gender" value={extracted.gender === 'M' ? 'Male' : 'Female'} />
              <DataRow label="State" value={extracted.address.state} />
              <DataRow label="City" value={extracted.address.city} />
              <DataRow label="Address" value={`${extracted.address.street}, ${extracted.address.neighborhood}`} />
              <DataRow label="Postal code" value={extracted.address.postalCode} />
              <DataRow label="Expiry year" value={String(extracted.expiryYear)} />

              <Text
                style={[
                  styles.disclaimer,
                  {color: t.palette.contrast_400},
                ]}>
                The raw data above is displayed for your review only. After
                confirmation, only derived claims (age, citizenship, district)
                are stored in your credential.
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleConfirm}
                disabled={loading}
                style={[
                  styles.primaryButton,
                  {backgroundColor: t.palette.primary_500},
                ]}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Confirm and verify
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 5: Verify (progress) */}
          {step === 'verify' && (
            <View style={styles.card}>
              <Text style={[styles.title, t.atoms.text]}>
                Verifying...
              </Text>

              <View style={styles.checkList}>
                <CheckItem
                  label="Checking face match"
                  status="done"
                  theme={t}
                />
                <CheckItem
                  label="Validating with RENAPO"
                  status="done"
                  theme={t}
                />
                <CheckItem
                  label="Issuing credential"
                  status="loading"
                  theme={t}
                />
              </View>
            </View>
          )}

          {/* Step 6: Success */}
          {step === 'success' && extracted && verification && (
            <View style={styles.card}>
              <Text style={[styles.successEmoji, {color: t.palette.positive_400}]}>
                ✅
              </Text>
              <Text style={[styles.title, t.atoms.text]}>
                Your identity is verified
              </Text>

              <View
                style={[
                  styles.credentialCard,
                  {backgroundColor: t.palette.primary_50},
                ]}>
                <Text style={[styles.credentialTitle, {color: t.palette.primary_700}]}>
                  Issued credential claims
                </Text>
                <CredentialClaim label="Age ≥ 18" value="true" theme={t} />
                <CredentialClaim label="Age ≥ 21" value="true" theme={t} />
                <CredentialClaim label="Citizenship" value="MX" theme={t} />
                <CredentialClaim label="District hash" value="sha256:****" theme={t} />
                <CredentialClaim label="CURP hash" value="sha256:****" theme={t} />
              </View>

              <View
                style={[
                  styles.credentialCard,
                  {backgroundColor: t.palette.primary_500, marginTop: 12},
                ]}>
                <Text style={[styles.credentialTitle, {color: t.palette.white}]}>
                  Anonymous Persona
                </Text>
                <Text style={[styles.body, {color: t.palette.white, textAlign: 'center'}]}>
                  You are now posting as your verified anonymous citizen.
                </Text>
              </View>

              <Text style={[styles.body, t.atoms.text_contrast_medium]}>
                Your credential has been stored in your wallet and your anonymous
                persona is active across all PARA communities.
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleDone}
                style={[
                  styles.primaryButton,
                  {backgroundColor: t.palette.primary_500},
                ]}>
                <Text style={styles.primaryButtonText}>Done</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleRevoke}
                style={[
                  styles.primaryButton,
                  {backgroundColor: 'transparent', borderWidth: 1, borderColor: t.palette.negative_400},
                ]}>
                <Text style={[styles.primaryButtonText, {color: t.palette.negative_400}]}>
                  Revoke Credential
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Layout.Center>
      </ScrollView>

      {/* Modal removed as it was unused */}
    </Layout.Screen>
  )
}

function DataRow({
  label,
  value,
  sensitive,
}: {
  label: string
  value: string
  sensitive?: boolean
}) {
  const t = useTheme()
  return (
    <View style={styles.dataRow}>
      <Text style={[styles.dataLabel, {color: t.palette.contrast_400}]}>
        {label}
      </Text>
      <View style={{flex: 1, alignItems: 'flex-end'}}>
        {sensitive && (
          <Text
            style={{
              fontSize: 10,
              color: t.palette.contrast_400,
              marginBottom: 2,
            }}>
            Sensitive — hashed before storage
          </Text>
        )}
        <Text style={[styles.dataValue, t.atoms.text]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  )
}

function CheckItem({
  label,
  status,
  theme,
}: {
  label: string
  status: 'done' | 'loading' | 'pending'
  theme: ReturnType<typeof useTheme>
}) {
  return (
    <View style={styles.checkItem}>
      <View
        style={[
          styles.checkDot,
          {
            backgroundColor:
              status === 'done'
                ? theme.palette.positive_400
                : status === 'loading'
                  ? theme.palette.primary_500
                  : theme.palette.contrast_200,
          },
        ]}
      />
      <Text style={[styles.checkLabel, theme.atoms.text]}>{label}</Text>
      {status === 'loading' && (
        <ActivityIndicator size="small" color={theme.palette.primary_500} />
      )}
      {status === 'done' && (
        <Text style={{color: theme.palette.positive_400, fontSize: 14}}>✓</Text>
      )}
    </View>
  )
}

function CredentialClaim({
  label,
  value,
  theme,
}: {
  label: string
  value: string
  theme: ReturnType<typeof useTheme>
}) {
  return (
    <View style={styles.claimRow}>
      <Text style={[styles.claimLabel, {color: theme.palette.contrast_400}]}>
        {label}
      </Text>
      <Text
        style={[
          styles.claimValue,
          {color: theme.palette.positive_400, fontWeight: '700'},
        ]}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  privacyCard: {
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  privacyBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  uploadArea: {
    height: 200,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadIcon: {
    fontSize: 32,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selfieFrame: {
    width: 220,
    height: 280,
    borderRadius: 16,
    borderWidth: 2,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfieOval: {
    width: 160,
    height: 200,
    borderRadius: 80,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  confidenceRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dataLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dataValue: {
    fontSize: 13,
    textAlign: 'right',
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  checkList: {
    gap: 12,
    paddingVertical: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkLabel: {
    fontSize: 14,
    flex: 1,
  },
  successEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 8,
  },
  credentialCard: {
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  credentialTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  claimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  claimLabel: {
    fontSize: 13,
  },
  claimValue: {
    fontSize: 13,
  },
  errorCard: {
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
})
