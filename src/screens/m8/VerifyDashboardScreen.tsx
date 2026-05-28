import { useCallback, useEffect, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLingui } from '@lingui/react'

import { getGrants, type ProofBrokerProofArtifact } from '#/lib/m8'
import { useTheme } from '#/alf'
import { Text } from '#/components/Typography'

// ─── Types ─────────────────────────────────────────────────────────────────

interface VerificationLog {
  id: string
  credentialId: string
  verifierDid: string
  timestamp: string
  result: 'success' | 'failed' | 'revoked'
  revealedClaims: string[]
  mode: 'offline' | 'online'
}

interface VerifyMetrics {
  totalVerifications: number
  successfulVerifications: number
  failedVerifications: number
  revokedCredentials: number
  averageResponseMs: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function proofToLog(proof: ProofBrokerProofArtifact): VerificationLog {
  return {
    id: proof.id,
    credentialId: proof.grantId,
    verifierDid: proof.verifierId,
    timestamp: proof.issuedAt,
    result: proof.status === 'active' ? 'success' : proof.status === 'revoked' ? 'revoked' : 'failed',
    revealedClaims: [proof.claimType],
    mode: 'online',
  }
}

function computeMetrics(logs: VerificationLog[]): VerifyMetrics {
  const total = logs.length
  const successful = logs.filter(l => l.result === 'success').length
  const failed = logs.filter(l => l.result === 'failed').length
  const revoked = logs.filter(l => l.result === 'revoked').length
  return {
    totalVerifications: total,
    successfulVerifications: successful,
    failedVerifications: failed,
    revokedCredentials: revoked,
    averageResponseMs: 45,
  }
}

// ─── Verify Dashboard Screen ───────────────────────────────────────────────

export default function VerifyDashboardScreen() {
  const t = useTheme()
  const {} = useLingui()
  const [logs, setLogs] = useState<VerificationLog[]>([])
  const [metrics, setMetrics] = useState<VerifyMetrics>({
    totalVerifications: 0,
    successfulVerifications: 0,
    failedVerifications: 0,
    revokedCredentials: 0,
    averageResponseMs: 0,
  })
  const [scanInput, setScanInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState<{
    valid: boolean
    credentialId: string
    claims: string[]
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    getGrants()
      .then(({ proofs }) => {
        if (cancelled) return
        const mapped = proofs.map(proofToLog)
        setLogs(mapped)
        setMetrics(computeMetrics(mapped))
      })
      .catch(err => {
        console.warn('[m8] Failed to load verification logs:', err)
      })
    return () => { cancelled = true }
  }, [])

  const handleScan = useCallback(() => {
    if (!scanInput.trim()) return
    setScanning(true)

    // Simulate verification
    setTimeout(() => {
      const isValid = scanInput.includes('encrypted:')
      const mockClaims = ['ageOver18', 'citizenship']

      setLastResult({
        valid: isValid,
        credentialId: 'scanned-' + Math.random().toString(36).slice(2, 8),
        claims: isValid ? mockClaims : [],
      })

      if (isValid) {
        const newLog: VerificationLog = {
          id: 'v-' + Date.now(),
          credentialId: 'scanned-cred',
          verifierDid: 'did:m8:app:this-device',
          timestamp: new Date().toISOString(),
          result: 'success',
          revealedClaims: mockClaims,
          mode: 'offline',
        }
        setLogs(prev => [newLog, ...prev])
        setMetrics(prev => ({
          ...prev,
          totalVerifications: prev.totalVerifications + 1,
          successfulVerifications: prev.successfulVerifications + 1,
        }))
      } else {
        setMetrics(prev => ({
          ...prev,
          totalVerifications: prev.totalVerifications + 1,
          failedVerifications: prev.failedVerifications + 1,
        }))
      }

      setScanning(false)
      setScanInput('')
    }, 800)
  }, [scanInput])

  return (
    <View style={[styles.container, t.atoms.bg]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={[styles.headerTitle, t.atoms.text]}>Verification Dashboard</Text>
        <Text style={[styles.headerSubtitle, t.atoms.text_contrast_medium]}>
          Monitor and verify m8 credentials
        </Text>

        {/* Metrics Cards */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
            <Text style={[styles.metricValue, t.atoms.text]}>{metrics.totalVerifications}</Text>
            <Text style={[styles.metricLabel, t.atoms.text_contrast_medium]}>Total</Text>
          </View>
          <View style={[styles.metricCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
            <Text style={[styles.metricValue, { color: t.palette.primary_500 }]}>
              {metrics.successfulVerifications}
            </Text>
            <Text style={[styles.metricLabel, t.atoms.text_contrast_medium]}>Success</Text>
          </View>
          <View style={[styles.metricCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
            <Text style={[styles.metricValue, { color: t.palette.contrast_500 }]}>
              {metrics.failedVerifications}
            </Text>
            <Text style={[styles.metricLabel, t.atoms.text_contrast_medium]}>Failed</Text>
          </View>
          <View style={[styles.metricCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
            <Text style={[styles.metricValue, { color: t.palette.contrast_500 }]}>
              {metrics.revokedCredentials}
            </Text>
            <Text style={[styles.metricLabel, t.atoms.text_contrast_medium]}>Revoked</Text>
          </View>
        </View>

        {/* Scan Input */}
        <View style={[styles.scanCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
          <Text style={[styles.scanLabel, t.atoms.text]}>Verify Presentation</Text>
          <TextInput accessibilityLabel="Text input field" accessibilityHint="Paste your credential presentation bundle here"
            value={scanInput}
            onChangeText={setScanInput}
            placeholder="Paste presentation bundle JSON..."
            placeholderTextColor={t.palette.contrast_300}
            multiline
            numberOfLines={3}
            style={[styles.scanInput, t.atoms.bg, t.atoms.text, { borderColor: t.palette.contrast_100 }]}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Verify presentation"
            accessibilityHint="Click to verify the pasted presentation"
            onPress={handleScan}
            disabled={scanning || !scanInput.trim()}
            style={[
              styles.scanBtn,
              { backgroundColor: scanning ? t.palette.contrast_200 : t.palette.primary_500 },
            ]}
          >
            <Text style={styles.scanBtnText}>
              {scanning ? 'Verifying...' : 'Verify'}
            </Text>
          </TouchableOpacity>

          {lastResult && (
            <View style={[styles.resultBadge, { backgroundColor: lastResult.valid ? t.palette.primary_500 + '15' : t.palette.contrast_200 }]}>
              <Text style={[styles.resultText, { color: lastResult.valid ? t.palette.primary_500 : t.palette.contrast_500 }]}>
                {lastResult.valid ? '✓ Valid' : '✗ Invalid'} — {lastResult.credentialId}
              </Text>
              {lastResult.valid && (
                <Text style={[styles.resultClaims, t.atoms.text_contrast_medium]}>
                  Claims: {lastResult.claims.join(', ')}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Verification Logs */}
        <Text style={[styles.sectionTitle, t.atoms.text]}>Recent Verifications</Text>
        {logs.map(log => (
          <View
            key={log.id}
            style={[styles.logCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}
          >
            <View style={styles.logHeader}>
              <View style={[styles.logBadge, { backgroundColor: resultColor(log.result, t) + '20' }]}>
                <Text style={[styles.logBadgeText, { color: resultColor(log.result, t) }]}>
                  {log.result.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.logMode, t.atoms.text_contrast_medium]}>{log.mode}</Text>
            </View>
            <Text style={[styles.logCredential, t.atoms.text]}>{log.credentialId}</Text>
            <Text style={[styles.logVerifier, t.atoms.text_contrast_medium]}>{log.verifierDid}</Text>
            <View style={styles.logClaims}>
              {log.revealedClaims.map(claim => (
                <View key={claim} style={[styles.logClaimChip, { backgroundColor: t.palette.primary_500 + '15' }]}>
                  <Text style={[styles.logClaimText, { color: t.palette.primary_500 }]}>{claim}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.logTime, t.atoms.text_contrast_medium]}>
              {new Date(log.timestamp).toLocaleString()}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

function resultColor(result: string, t: ReturnType<typeof useTheme>): string {
  switch (result) {
    case 'success': return t.palette.primary_500
    case 'failed': return t.palette.contrast_500
    case 'revoked': return t.palette.contrast_500
    default: return t.palette.contrast_300
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  scanCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  scanLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  scanInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    fontFamily: 'monospace',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  scanBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  resultBadge: {
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultClaims: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  logCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  logBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  logMode: {
    fontSize: 11,
  },
  logCredential: {
    fontSize: 14,
    fontWeight: '600',
  },
  logVerifier: {
    fontSize: 12,
  },
  logClaims: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  logClaimChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  logClaimText: {
    fontSize: 11,
    fontWeight: '600',
  },
  logTime: {
    fontSize: 11,
    marginTop: 2,
  },
})
