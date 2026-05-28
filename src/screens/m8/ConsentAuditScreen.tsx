import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
// @ts-ignore - lingui macro types not available
import { msg } from '@lingui/macro' // eslint-disable-line import-x/no-unresolved
import { useLingui } from '@lingui/react'

import { m8Fetch, postGrantRevoke } from '#/lib/m8'
import { useTheme } from '#/alf'
import { Text } from '#/components/Typography'

// ─── Types ─────────────────────────────────────────────────────────────────

interface LedgerEntry {
  id: number
  action: string
  targetType: string
  targetId: string
  detail: Record<string, unknown>
  createdAt: string
}

interface Grant {
  id: string
  appId: string
  appName: string
  appKind: string
  surface: string
  requestedClaims: Array<{ type: string; disclosure: string; requestedValue?: string }>
  proofMode: string
  status: string
  reason: string
  requestedAt: string
  issuedAt: string | null
  expiresAt: string | null
  reviewNote: string | null
}

interface ProofArtifact {
  id: string
  grantId: string
  claimType: string
  outcome: string
  statement: string
  audienceAppId: string
  audienceAppName: string
  surface: string
  status: string
  issuedAt: string
}

interface AuditSummary {
  totalRequests: number
  activeGrants: number
  revokedGrants: number
  totalProofs: number
  activeProofs: number
}

// ─── Consent Audit Screen ──────────────────────────────────────────────────

export default function ConsentAuditScreen() {
  const t = useTheme()
  const { _ } = useLingui()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [grants, setGrants] = useState<Grant[]>([])
  const [proofs, setProofs] = useState<ProofArtifact[]>([])
  const [summary, setSummary] = useState<AuditSummary>({
    totalRequests: 0,
    activeGrants: 0,
    revokedGrants: 0,
    totalProofs: 0,
    activeProofs: 0,
  })

  const loadAudit = useCallback(async () => {
    try {
      const res = await m8Fetch('/ledger')
      if (!res.ok) {
        console.warn('[m8] Failed to load ledger:', res.status)
        return
      }
      const data = (await res.json()) as {
        ledger: LedgerEntry[]
        grants: Grant[]
        proofs: ProofArtifact[]
        summary: AuditSummary
      }
      setLedger(data.ledger)
      setGrants(data.grants)
      setProofs(data.proofs)
      setSummary(data.summary)
    } catch (err) {
      console.warn('[m8] Failed to load audit data:', err)
    }
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadAudit()
    setRefreshing(false)
  }, [loadAudit])

  useEffect(() => {
    let cancelled = false
    loadAudit().then(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [loadAudit])

  const handleRevoke = useCallback(
    async (grant: Grant) => {
      Alert.alert(
        _(msg`Revoke Grant`),
        _(msg`Are you sure you want to revoke access for ${grant.appName}?`),
        [
          { text: _(msg`Cancel`), style: 'cancel' },
          {
            text: _(msg`Revoke`),
            style: 'destructive',
            onPress: async () => {
              try {
                await postGrantRevoke(grant.id, 'User revoked from consent audit')
                await loadAudit()
              } catch (err) {
                Alert.alert(_(msg`Error`), _(msg`Failed to revoke grant`))
              }
            },
          },
        ]
      )
    },
    [_, loadAudit]
  )

  if (loading) {
    return (
      <View style={[styles.container, t.atoms.bg]}>
        <Text style={[styles.headerTitle, t.atoms.text]}>Consent Audit</Text>
        <Text style={[styles.loadingText, t.atoms.text_contrast_medium]}>
          Loading your disclosure history...
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, t.atoms.bg]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header */}
        <Text style={[styles.headerTitle, t.atoms.text]}>Consent Audit</Text>
        <Text style={[styles.headerSubtitle, t.atoms.text_contrast_medium]}>
          Every app that accessed your identity data
        </Text>

        {/* Summary Cards */}
        <View style={styles.metricsRow}>
          <SummaryCard
            value={summary.activeGrants}
            label={_(msg`Active Grants`)}
            color={t.palette.primary_500}
          />
          <SummaryCard
            value={summary.revokedGrants}
            label={_(msg`Revoked`)}
            color={t.palette.negative_400}
          />
          <SummaryCard
            value={summary.activeProofs}
            label={_(msg`Active Proofs`)}
            color={t.palette.positive_400}
          />
        </View>

        {/* Active Grants Section */}
        <Text style={[styles.sectionTitle, t.atoms.text]}>Active Grants</Text>
        {grants.filter((g) => g.status === 'approved').length === 0 ? (
          <Text style={[styles.emptyText, t.atoms.text_contrast_medium]}>
            No active grants. Apps will appear here when you approve access.
          </Text>
        ) : (
          grants
            .filter((g) => g.status === 'approved')
            .map((grant) => (
              <GrantCard
                key={grant.id}
                grant={grant}
                proofs={proofs.filter((p) => p.grantId === grant.id)}
                onRevoke={() => handleRevoke(grant)}
              />
            ))
        )}

        {/* Audit Timeline */}
        <Text style={[styles.sectionTitle, t.atoms.text]}>Audit Timeline</Text>
        {ledger.length === 0 ? (
          <Text style={[styles.emptyText, t.atoms.text_contrast_medium]}>
            No audit entries yet.
          </Text>
        ) : (
          ledger.map((entry) => (
            <LedgerEntryCard key={entry.id} entry={entry} />
          ))
        )}
      </ScrollView>
    </View>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function SummaryCard({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: string
}) {
  const t = useTheme()
  return (
    <View style={[styles.metricCard, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={[styles.metricLabel, t.atoms.text_contrast_medium]}>{label}</Text>
    </View>
  )
}

function GrantCard({
  grant,
  proofs,
  onRevoke,
}: {
  grant: Grant
  proofs: ProofArtifact[]
  onRevoke: () => void
}) {
  const t = useTheme()
  const {} = useLingui()

  return (
    <View style={[styles.card, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.cardTitle, t.atoms.text]}>{grant.appName}</Text>
          <Text style={[styles.cardSubtitle, t.atoms.text_contrast_medium]}>
            {grant.appKind} • {grant.surface}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: t.palette.primary_500 + '20' }]}>
          <Text style={[styles.badgeText, { color: t.palette.primary_500 }]}>Active</Text>
        </View>
      </View>

      <Text style={[styles.claimsLabel, t.atoms.text_contrast_medium]}>Requested claims:</Text>
      <View style={styles.claimsRow}>
        {grant.requestedClaims.map((claim, i) => (
          <View key={i} style={[styles.claimChip, { backgroundColor: t.palette.primary_500 + '15' }]}>
            <Text style={[styles.claimChipText, { color: t.palette.primary_500 }]}>
              {claim.type}
            </Text>
          </View>
        ))}
      </View>

      {proofs.length > 0 && (
        <>
          <Text style={[styles.claimsLabel, t.atoms.text_contrast_medium]}>Disclosed proofs:</Text>
          {proofs.map((proof) => (
            <View key={proof.id} style={styles.proofRow}>
              <Text style={[styles.proofText, t.atoms.text]}>
                {proof.claimType}: {proof.statement}
              </Text>
              <Text style={[styles.proofDate, t.atoms.text_contrast_medium]}>
                {new Date(proof.issuedAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </>
      )}

      <View style={styles.cardFooter}>
        <Text style={[styles.cardDate, t.atoms.text_contrast_medium]}>
          Granted: {new Date(grant.issuedAt ?? grant.requestedAt).toLocaleDateString()}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={_(msg`Revoke access for ${grant.appName}`)}
          accessibilityHint={_(msg`Revokes this app's access to your credential data`)}
          onPress={onRevoke}
          style={[styles.revokeBtn, { backgroundColor: t.palette.negative_400 + '15' }]}>
          <Text style={[styles.revokeBtnText, { color: t.palette.negative_400 }]}>
            Revoke
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function LedgerEntryCard({ entry }: { entry: LedgerEntry }) {
  const t = useTheme()

  const actionColors: Record<string, string> = {
    Requested: t.palette.contrast_400,
    Approved: t.palette.positive_400,
    Revoked: t.palette.negative_400,
  }

  return (
    <View style={[styles.timelineItem, t.atoms.bg_contrast_25, { borderColor: t.palette.contrast_100 }]}>
      <View style={[styles.timelineDot, { backgroundColor: actionColors[entry.action] ?? t.palette.contrast_400 }]} />
      <View style={styles.timelineContent}>
        <Text style={[styles.timelineAction, t.atoms.text]}>
          {entry.action} {entry.targetType}
        </Text>
        <Text style={[styles.timelineTarget, t.atoms.text_contrast_medium]}>
          {entry.targetId}
        </Text>
        {entry.detail.reason && (
          <Text style={[styles.timelineDetail, t.atoms.text_contrast_medium]}>
            Reason: {String(entry.detail.reason)}
          </Text>
        )}
        <Text style={[styles.timelineDate, t.atoms.text_contrast_medium]}>
          {new Date(entry.createdAt).toLocaleString()}
        </Text>
      </View>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 20,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  claimsLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  claimsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  claimChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  claimChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  proofRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  proofText: {
    fontSize: 12,
    flex: 1,
  },
  proofDate: {
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  cardDate: {
    fontSize: 11,
  },
  revokeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  revokeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timelineItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 10,
  },
  timelineContent: {
    flex: 1,
  },
  timelineAction: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineTarget: {
    fontSize: 12,
    marginTop: 2,
  },
  timelineDetail: {
    fontSize: 11,
    marginTop: 4,
  },
  timelineDate: {
    fontSize: 11,
    marginTop: 4,
  },
})
