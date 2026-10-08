import {useCallback, useEffect, useMemo, useState} from 'react'
import {ActivityIndicator, RefreshControl, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {m8Fetch} from '#/lib/im8'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {
  Card,
  EmptyNoteText,
  formatDateTime,
  SectionHeading,
} from './components/IdentityPrimitives'

// Shapes returned by mubEZ `GET /v1/ledger` (app/controllers/ledger_controller.ts).

interface LedgerEntry {
  id: number
  action: string
  targetType: string
  targetId: string
  detail: Record<string, unknown>
  createdAt: string
}

interface LedgerGrant {
  id: string
  appName: string
}

interface AuditSummary {
  totalRequests: number
  activeGrants: number
  revokedGrants: number
  totalProofs: number
  activeProofs: number
}

const EMPTY_SUMMARY: AuditSummary = {
  totalRequests: 0,
  activeGrants: 0,
  revokedGrants: 0,
  totalProofs: 0,
  activeProofs: 0,
}

/**
 * The m8 ledger for this session: every grant request, approval, revocation
 * and verification m8 recorded, newest first. Read-only; grants are revoked
 * from the Wallet tab.
 */
export default function ConsentAuditScreen() {
  const {_} = useLingui()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [grants, setGrants] = useState<LedgerGrant[]>([])
  const [summary, setSummary] = useState<AuditSummary>(EMPTY_SUMMARY)

  const loadAudit = useCallback(async () => {
    try {
      const res = await m8Fetch('/ledger')
      if (!res.ok) throw new Error(`Ledger failed (${res.status})`)
      const data = (await res.json()) as {
        ledger: LedgerEntry[]
        grants: LedgerGrant[]
        summary: AuditSummary
      }
      setLedger(data.ledger)
      setGrants(data.grants)
      setSummary(data.summary)
      setLoadError(false)
    } catch (err) {
      console.warn('[m8] Failed to load audit data:', err)
      setLoadError(true)
    }
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadAudit()
    setRefreshing(false)
  }, [loadAudit])

  useEffect(() => {
    let cancelled = false
    void loadAudit().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [loadAudit])

  const appNameByGrant = useMemo(
    () => new Map(grants.map(g => [g.id, g.appName])),
    [grants],
  )

  if (loading) {
    return (
      <View style={[a.flex_1, a.align_center, a.justify_center, a.p_xl]}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <Layout.Content
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void onRefresh()
          }}
        />
      }
      contentContainerStyle={[a.p_lg, a.gap_md]}>
      {loadError ? (
        <Card>
          <Text style={[a.text_sm]}>
            <Trans>Could not load your activity from m8.</Trans>
          </Text>
          <Button
            label={_(msg`Try again`)}
            size="small"
            variant="solid"
            color="secondary"
            style={[a.self_start]}
            onPress={() => {
              void onRefresh()
            }}>
            <ButtonText>
              <Trans>Try again</Trans>
            </ButtonText>
          </Button>
        </Card>
      ) : null}

      <View style={[a.flex_row, a.gap_sm]}>
        <Metric value={summary.activeGrants} label={_(msg`Active grants`)} />
        <Metric value={summary.revokedGrants} label={_(msg`Revoked`)} />
        <Metric value={summary.activeProofs} label={_(msg`Active proofs`)} />
      </View>

      <SectionHeading
        title={_(msg`Activity`)}
        detail={_(
          msg`Everything m8 recorded about your grants and proofs, newest first.`,
        )}
      />
      {ledger.length === 0 ? (
        <EmptyNoteText>
          <Trans>No activity yet.</Trans>
        </EmptyNoteText>
      ) : (
        ledger.map(entry => (
          <LedgerRow
            key={entry.id}
            entry={entry}
            appName={
              entry.targetType === 'grant'
                ? appNameByGrant.get(entry.targetId)
                : undefined
            }
          />
        ))
      )}
      <View style={[a.pb_lg]} />
    </Layout.Content>
  )
}

function Metric({value, label}: {value: number; label: string}) {
  const t = useTheme()
  return (
    <Card style={[a.flex_1, a.align_center, a.gap_2xs]}>
      <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>{value}</Text>
      <Text
        style={[a.text_xs, a.text_center, t.atoms.text_contrast_medium]}
        numberOfLines={2}>
        {label}
      </Text>
    </Card>
  )
}

function LedgerRow({
  entry,
  appName,
}: {
  entry: LedgerEntry
  appName: string | undefined
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const reason =
    typeof entry.detail.reason === 'string' ? entry.detail.reason : null
  const dotColor =
    entry.action === 'Approved'
      ? t.palette.positive_500
      : entry.action === 'Revoked'
        ? t.palette.negative_500
        : t.palette.contrast_400

  return (
    <View
      style={[
        a.flex_row,
        a.gap_sm,
        a.py_sm,
        a.border_b,
        t.atoms.border_contrast_low,
      ]}>
      <View
        style={[
          a.rounded_full,
          a.mt_xs,
          {width: 8, height: 8, backgroundColor: dotColor},
        ]}
      />
      <View style={[a.flex_1, a.gap_2xs]}>
        {/* action and target type are recorded by m8 as written; not localized here */}
        <Text style={[a.text_sm, a.font_semi_bold, t.atoms.text]}>
          {entry.action} · {entry.targetType}
        </Text>
        <Text
          style={[a.text_xs, t.atoms.text_contrast_medium]}
          numberOfLines={1}>
          {appName ?? entry.targetId}
        </Text>
        {reason ? (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {_(msg`Reason: ${reason}`)}
          </Text>
        ) : null}
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {formatDateTime(i18n, entry.createdAt)}
        </Text>
      </View>
    </View>
  )
}
