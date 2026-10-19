import {useCallback, useEffect, useState} from 'react'
import {ActivityIndicator, RefreshControl, View} from 'react-native'
import {type I18n} from '@lingui/core'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {m8Fetch} from '#/lib/im8/api'
import {INE_INTEGRATION_APPROVED} from '#/lib/im8/ine'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {
  Card,
  EmptyNoteText,
  formatDate,
  Pill,
  type PillTone,
  SectionHeading,
} from './components/IdentityPrimitives'

// Shape returned by mubEZ `GET /v1/issuers` (M8TrustedIssuer in
// mubEZ/src/types/index.ts).
interface M8Issuer {
  did: string
  keyId: string
  name: string
  country: string
  status: 'active' | 'previous' | 'suspended' | 'revoked' | 'expired'
  notAfter?: string
  allowedElements: string[]
}

/**
 * Read-only view of the issuer keys m8 publishes. Which issuers are trusted is
 * decided by m8, not by this device.
 */
export default function TrustedIssuersScreen() {
  const {_} = useLingui()
  const [issuers, setIssuers] = useState<M8Issuer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await m8Fetch('/issuers')
      if (!res.ok) throw new Error(`Issuers failed (${res.status})`)
      setIssuers((await res.json()) as M8Issuer[])
      setLoadError(false)
    } catch (err) {
      console.warn('[m8] Failed to load issuers:', err)
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

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
      <SectionHeading
        title={_(msg`Issuer keys`)}
        detail={_(
          msg`The keys m8 publishes for signing identity credentials. m8 decides which issuers are trusted; this list is read-only.`,
        )}
      />
      {!INE_INTEGRATION_APPROVED && (
        <Card>
          <Text style={[a.text_sm, a.leading_snug]}>
            <Trans>
              INE integration is pending approval. Until it lands, no credential
              here comes from the INE, even where the issuer name says so.
            </Trans>
          </Text>
        </Card>
      )}

      {loadError ? (
        <Card>
          <Text style={[a.text_sm]}>
            <Trans>Could not load issuers from m8.</Trans>
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
      ) : issuers.length === 0 ? (
        <EmptyNoteText>
          <Trans>m8 has not published any issuer keys.</Trans>
        </EmptyNoteText>
      ) : (
        issuers.map(issuer => (
          <IssuerCard key={`${issuer.did}#${issuer.keyId}`} issuer={issuer} />
        ))
      )}
      <View style={[a.pb_lg]} />
    </Layout.Content>
  )
}

function IssuerCard({issuer}: {issuer: M8Issuer}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const status = issuerStatus(i18n, issuer.status)
  const validUntil = formatDate(i18n, issuer.notAfter)

  return (
    <Card>
      <View style={[a.flex_row, a.align_start, a.justify_between, a.gap_sm]}>
        <View style={[a.flex_1, a.gap_2xs]}>
          <Text style={[a.text_md, a.font_semi_bold, t.atoms.text]}>
            {issuer.name}
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {issuer.country}
          </Text>
        </View>
        <Pill label={status.label} tone={status.tone} />
      </View>
      <Text
        style={[a.text_xs, t.atoms.text_contrast_medium]}
        numberOfLines={1}
        selectable>
        {issuer.did}
      </Text>
      <Text
        style={[a.text_xs, t.atoms.text_contrast_medium]}
        numberOfLines={1}
        selectable>
        {_(msg`Key ${issuer.keyId}`)}
      </Text>
      {validUntil ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {_(msg`Valid until ${validUntil}`)}
        </Text>
      ) : null}
      <Text style={[a.text_xs, a.font_semi_bold, a.pt_xs, t.atoms.text]}>
        <Trans>Can sign</Trans>
      </Text>
      <View style={[a.flex_row, a.flex_wrap, a.gap_xs]}>
        {issuer.allowedElements.map(element => (
          <Pill
            key={element}
            label={elementLabel(i18n, element)}
            tone="neutral"
          />
        ))}
      </View>
    </Card>
  )
}

function issuerStatus(
  i18n: I18n,
  status: M8Issuer['status'],
): {label: string; tone: PillTone} {
  switch (status) {
    case 'active':
      return {label: i18n._(msg`Active`), tone: 'positive'}
    case 'previous':
      return {label: i18n._(msg`Previous key`), tone: 'neutral'}
    case 'suspended':
      return {label: i18n._(msg`Suspended`), tone: 'warning'}
    case 'revoked':
      return {label: i18n._(msg`Revoked`), tone: 'negative'}
    case 'expired':
      return {label: i18n._(msg`Expired`), tone: 'neutral'}
    default:
      return {label: status, tone: 'neutral'}
  }
}

// Identity elements from mubEZ (M8IdentityElementId).
function elementLabel(i18n: I18n, element: string) {
  switch (element) {
    case 'age_over_18':
      return i18n._(msg`Age over 18`)
    case 'age_over_21':
      return i18n._(msg`Age over 21`)
    case 'citizenship':
      return i18n._(msg`Citizenship`)
    case 'district_hash':
      return i18n._(msg`District (hashed)`)
    case 'curp_hash':
      return i18n._(msg`CURP (hashed)`)
    default:
      return element
  }
}
