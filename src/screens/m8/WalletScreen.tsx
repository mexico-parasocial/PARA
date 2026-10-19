import {useCallback, useEffect, useState} from 'react'
import {ActivityIndicator, Alert, RefreshControl, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  getGrants,
  postGrantRevoke,
  type ProofBrokerGrant,
  type ProofBrokerProofArtifact,
} from '#/lib/im8'
import {INE_INTEGRATION_APPROVED} from '#/lib/im8/ine'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {
  Card,
  claimLabel,
  EmptyNoteText,
  formatDate,
  grantStatus,
  Pill,
  proofOutcome,
  proofStatus,
  SectionHeading,
} from './components/IdentityPrimitives'

/**
 * What the m8 broker (mubEZ `GET /v1/grants`) holds for this session: the
 * proof receipts it issued and the app grants they belong to. PARA holds no
 * credentials and no holder key — those live in the iM8 wallet (mubEZ CD-14),
 * which is also where grants are requested and approved.
 */
export default function WalletScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const [grants, setGrants] = useState<ProofBrokerGrant[]>([])
  const [proofs, setProofs] = useState<ProofBrokerProofArtifact[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getGrants()
      setGrants(data.grants)
      setProofs(data.proofs)
      setLoadError(false)
    } catch (err) {
      console.warn('[m8] Failed to load grants:', err)
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

  const revoke = useCallback(
    (grant: ProofBrokerGrant) => {
      Alert.alert(
        _(msg`Revoke access?`),
        _(
          msg`${grant.appName} will lose access, and m8 marks the proofs issued for it as revoked. This cannot be undone.`,
        ),
        [
          {text: _(msg`Cancel`), style: 'cancel'},
          {
            text: _(msg`Revoke`),
            style: 'destructive',
            onPress: () => {
              void (async () => {
                setRevokingId(grant.id)
                try {
                  await postGrantRevoke(grant.id, 'Revoked from PARA wallet')
                  await load()
                } catch (err) {
                  console.warn('[m8] Failed to revoke grant:', err)
                  Alert.alert(
                    _(msg`Could not revoke access`),
                    _(msg`Nothing was changed. Please try again.`),
                  )
                } finally {
                  setRevokingId(null)
                }
              })()
            },
          },
        ],
      )
    },
    [_, load],
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
      <Card>
        <Text style={[a.text_md, a.font_semi_bold, t.atoms.text]}>
          <Trans>Your credentials live in iM8</Trans>
        </Text>
        <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>
            PARA does not hold your credentials or your keys. The iM8 wallet
            holds them, asks you before an app gets a proof, and shares
            credentials. A shared credential includes your account DID and every
            fact in it, and apps can link repeat shares. It is not anonymous.
          </Trans>
        </Text>
        {!INE_INTEGRATION_APPROVED && (
          <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
            <Trans>
              INE credentials are not issued yet: INE integration is pending
              approval.
            </Trans>
          </Text>
        )}
      </Card>

      {loadError ? (
        <Card>
          <Text style={[a.text_sm, t.atoms.text]}>
            <Trans>Could not load your grants from m8.</Trans>
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

      <SectionHeading
        title={_(msg`Proof receipts`)}
        detail={_(msg`Proofs m8 issued to apps you approved.`)}
      />
      {proofs.length === 0 ? (
        <EmptyNoteText>
          <Trans>No receipts yet.</Trans>
        </EmptyNoteText>
      ) : (
        proofs.map(proof => <ProofReceipt key={proof.id} proof={proof} />)
      )}

      <SectionHeading
        title={_(msg`App grants`)}
        detail={_(msg`Every permission you have given stays visible here.`)}
      />
      {grants.length === 0 ? (
        <EmptyNoteText>
          <Trans>
            No grants yet. Apps appear here after you approve them in iM8.
          </Trans>
        </EmptyNoteText>
      ) : (
        grants.map(grant => (
          <GrantCard
            key={grant.id}
            grant={grant}
            revoking={revokingId === grant.id}
            onRevoke={() => revoke(grant)}
          />
        ))
      )}
      {/* keeps the last card clear of the pull-to-refresh bounce */}
      <View style={[a.pb_lg]} />
    </Layout.Content>
  )
}

function ProofReceipt({proof}: {proof: ProofBrokerProofArtifact}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const status = proofStatus(i18n, proof.status)
  const issued = formatDate(i18n, proof.issuedAt)
  const expires = formatDate(i18n, proof.expiresAt)

  return (
    <Card>
      <View style={[a.flex_row, a.align_start, a.justify_between, a.gap_sm]}>
        <Text style={[a.flex_1, a.text_md, a.font_semi_bold, t.atoms.text]}>
          {claimLabel(i18n, proof.claimType)}
        </Text>
        <Pill label={status.label} tone={status.tone} />
      </View>
      <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
        {proof.statement}
      </Text>
      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
        {_(msg`Result: ${proofOutcome(i18n, proof.outcome)}`)}
        {' · '}
        {_(msg`Shared with ${proof.audienceAppName}`)}
      </Text>
      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
        {issued ? _(msg`Issued ${issued}`) : null}
        {issued && expires ? ' · ' : null}
        {expires ? _(msg`Expires ${expires}`) : null}
      </Text>
    </Card>
  )
}

function GrantCard({
  grant,
  revoking,
  onRevoke,
}: {
  grant: ProofBrokerGrant
  revoking: boolean
  onRevoke: () => void
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const status = grantStatus(i18n, grant.status)
  const granted = formatDate(i18n, grant.issuedAt)
  const expires = formatDate(i18n, grant.expiresAt)

  return (
    <Card>
      <View style={[a.flex_row, a.align_start, a.justify_between, a.gap_sm]}>
        <View style={[a.flex_1, a.gap_2xs]}>
          <Text style={[a.text_md, a.font_semi_bold, t.atoms.text]}>
            {grant.appName}
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {grant.appKind}
          </Text>
        </View>
        <Pill label={status.label} tone={status.tone} />
      </View>
      {grant.reason ? (
        <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
          {grant.reason}
        </Text>
      ) : null}
      <View style={[a.flex_row, a.flex_wrap, a.gap_xs]}>
        {grant.requestedClaims.map(claim => (
          <Pill
            key={`${claim.type}:${claim.requestedValue ?? ''}`}
            label={
              claim.requestedValue
                ? `${claimLabel(i18n, claim.type)}: ${claim.requestedValue}`
                : claimLabel(i18n, claim.type)
            }
            tone="neutral"
          />
        ))}
      </View>
      {granted || expires ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {granted ? _(msg`Granted ${granted}`) : null}
          {granted && expires ? ' · ' : null}
          {expires ? _(msg`Expires ${expires}`) : null}
        </Text>
      ) : null}
      {grant.status === 'pending' ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>Waiting for your approval in iM8.</Trans>
        </Text>
      ) : null}
      {grant.status === 'approved' ? (
        <Button
          label={_(msg`Revoke access for ${grant.appName}`)}
          size="small"
          variant="solid"
          color="negative_subtle"
          disabled={revoking}
          style={[a.self_start, a.mt_xs]}
          onPress={onRevoke}>
          <ButtonText>
            {revoking ? <Trans>Revoking…</Trans> : <Trans>Revoke access</Trans>}
          </ButtonText>
        </Button>
      ) : null}
    </Card>
  )
}
