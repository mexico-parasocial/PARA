import {useEffect, useMemo, useRef, useState} from 'react'
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {type CabildeoPartyVoteSummary} from '#/lib/api/cabildeo'
import {
  type CabildeoOption,
  type CabildeoPhase,
} from '#/lib/api/para-lexicons'
import {fromCabildeoRouteParam} from '#/lib/cabildeo-client'
import {REPRESENTATIVES} from '#/lib/mock-data'
import {
  evaluateCabildeoAccess,
  getAccessTierLabel,
  hasOfficialScope,
} from '#/lib/official-civic-accounts'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
  type NavigationProp,
} from '#/lib/routes/types'
import {usePartyLobbyingBriefingPacksQuery} from '#/state/queries/briefing-packs'
import {
  useCabildeoPositionsQuery,
  useCabildeoQuery,
  useCabildeosQuery,
  useDelegationCandidatesQuery,
  useVoteMutation,
} from '#/state/queries/cabildeo'
import {
  useCreateSortitionRunMutation,
  useSortitionRunQuery,
} from '#/state/queries/matrix'
import {
  useOfficialCabildeoSignaturesQuery,
  useSignOfficialCabildeoMutation,
  useViewerOfficialAccountsQuery,
} from '#/state/queries/official-civic-accounts'
import {
  useCreateRepresentativeNominationMutation,
  useRepresentativeNominationsQuery,
} from '#/state/queries/representative-participation'
import {useSession} from '#/state/session'
import {SortitionAssemblyView} from '#/screens/Data/components/SortitionAssemblyView'
import {SortitionProofList} from '#/screens/Data/components/SortitionProofList'
import {
  type SortitionStatus,
  SortitionStatusCard,
} from '#/screens/Data/components/SortitionStatusCard'
import {useTheme} from '#/alf'
import {useDialogControl} from '#/components/Dialog'
import {SortitionConfigDialog} from '#/components/dialogs/SortitionConfigDialog'
import * as Layout from '#/components/Layout'
import {ListMaybePlaceholder} from '#/components/Lists'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {WebScrollControls} from '#/components/WebScrollControls'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'CabildeoDetail'>

function RelatedCabildeos({
  currentUri,
  community,
}: {
  currentUri: string
  community: string
}) {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const {data: allCabildeos = []} = useCabildeosQuery()

  const related = allCabildeos.filter(
    c => c.uri !== currentUri && c.community === community,
  )

  if (related.length === 0) return null

  return (
    <View style={{marginTop: 24, marginBottom: 16}}>
      <Text
        style={[
          styles.sectionTitle,
          t.atoms.text,
          {marginBottom: 12, fontSize: 16},
        ]}>
        <Trans>More in {community}</Trans>
      </Text>
      <View style={{gap: 10}}>
        {related.slice(0, 3).map(c => {
          const phaseMeta = getPhaseMeta(t)[c.phase]

          return (
            <TouchableOpacity
              accessibilityRole="button"
              key={c.uri}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('CabildeoDetail', {cabildeoUri: c.uri})
              }
              style={[
                {
                  padding: 14,
                  borderRadius: 14,
                  borderLeftWidth: 3,
                  borderLeftColor: phaseMeta.color,
                },
                t.atoms.bg_contrast_25,
              ]}>
              <Text style={[t.atoms.text, {fontSize: 14, fontWeight: '700'}]}>
                {c.title}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 6,
                }}>
                <View
                  style={{
                    backgroundColor: phaseMeta.color + '18',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}>
                  <Text
                    style={{
                      color: phaseMeta.color,
                      fontSize: 10,
                      fontWeight: '800',
                    }}>
                    {phaseMeta.label}
                  </Text>
                </View>
                <Text style={[t.atoms.text_contrast_medium, {fontSize: 11}]}>
                  🗳️ {c.voteTotals.total} · 🗣️ {c.positionCounts.total}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function RelatedBriefingPacks({cabildeoUri}: {cabildeoUri: string}) {
  const t = useTheme()
  const {data: packs = []} = usePartyLobbyingBriefingPacksQuery({
    cabildeoUri,
    status: 'published',
  })

  if (packs.length === 0) return null

  return (
    <View style={{marginTop: 24, marginBottom: 16}}>
      <Text
        style={[
          styles.sectionTitle,
          t.atoms.text,
          {marginBottom: 12, fontSize: 16},
        ]}>
        <Trans>Party Lobbying Briefing Packs</Trans>
      </Text>
      <View style={{gap: 10}}>
        {packs.slice(0, 4).map(pack => (
          <TouchableOpacity
            accessibilityRole="button"
            key={pack.uri}
            activeOpacity={0.8}
            onPress={() => {
              if (pack.obsidianExportUri) {
                Linking.openURL(pack.obsidianExportUri).catch(() => {})
              }
            }}
            style={[
              styles.briefingPackCard,
              t.atoms.bg_contrast_25,
              {borderColor: t.palette.contrast_100},
            ]}>
            <Text style={[styles.briefingPackParty, t.atoms.text]}>
              {pack.party}
            </Text>
            <Text style={[styles.briefingPackTitle, t.atoms.text]}>
              {pack.title}
            </Text>
            <Text
              style={[styles.briefingPackSummary, t.atoms.text_contrast_medium]}
              numberOfLines={2}>
              {pack.summary}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const PHASE_ORDER: CabildeoPhase[] = [
  'draft',
  'open',
  'deliberating',
  'voting',
  'resolved',
]

function getPhaseMeta(
  t: ReturnType<typeof useTheme>,
): Record<CabildeoPhase, {label: string; icon: string; color: string}> {
  return {
    draft: {label: 'Draft', icon: '📝', color: t.palette.contrast_400},
    open: {label: 'Open', icon: '📖', color: t.palette.primary_500},
    deliberating: {label: 'Deliberating', icon: '🗣️', color: t.palette.yellow},
    voting: {label: 'Voting', icon: '🗳️', color: t.palette.positive_500},
    resolved: {label: 'Resolved', icon: '✅', color: t.palette.primary_500},
  }
}

function getStanceColors(
  t: ReturnType<typeof useTheme>,
): Record<string, {bg: string; fg: string; label: string}> {
  return {
    for: {
      bg: t.palette.positive_500 + '20',
      fg: t.palette.positive_500,
      label: 'A favor',
    },
    against: {
      bg: t.palette.negative_500 + '20',
      fg: t.palette.negative_500,
      label: 'En contra',
    },
    amendment: {
      bg: t.palette.yellow + '20',
      fg: t.palette.yellow,
      label: 'Enmienda',
    },
  }
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function PartyVoteSummary({
  summary,
  options,
}: {
  summary: CabildeoPartyVoteSummary[]
  options: CabildeoOption[]
}) {
  const t = useTheme()
  const total = summary.reduce((sum, item) => sum + item.total, 0)

  return (
    <View style={[styles.partySummaryCard, t.atoms.bg_contrast_25]}>
      <Text style={[styles.partySummaryTitle, t.atoms.text]}>
        <Trans>Party activity</Trans>
      </Text>
      <Text style={[styles.partySummarySub, t.atoms.text_contrast_medium]}>
        <Trans>Names are hidden for this cabildeo.</Trans>
      </Text>
      <View style={{gap: 10, marginTop: 12}}>
        {summary.map(item => {
          const share = total > 0 ? (item.total / total) * 100 : 0
          return (
            <View key={item.party} style={styles.partySummaryRow}>
              <View style={{flex: 1}}>
                <View style={styles.partySummaryHeader}>
                  <Text style={[styles.partySummaryParty, t.atoms.text]}>
                    {item.party}
                  </Text>
                  <Text
                    style={[
                      styles.partySummaryCount,
                      t.atoms.text_contrast_medium,
                    ]}>
                    {item.total} votes
                  </Text>
                </View>
                <View
                  style={[
                    styles.partySummaryTrack,
                    {backgroundColor: t.palette.contrast_100},
                  ]}>
                  <View
                    style={[
                      styles.partySummaryFill,
                      {
                        width: `${share}%`,
                        backgroundColor: t.palette.primary_500,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.partySummaryOptions,
                    t.atoms.text_contrast_medium,
                  ]}>
                  {item.byOption
                    .map((count, index) =>
                      count > 0
                        ? `${options[index]?.label ?? `Option ${index + 1}`}: ${count}`
                        : '',
                    )
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function DelegationImpactCalculator({
  delegateDid,
  cabildeoUri,
}: {
  delegateDid: string
  cabildeoUri: string
}) {
  const t = useTheme()
  const {data: candidates = []} = useDelegationCandidatesQuery({cabildeoUri})
  const delegate = candidates.find(c => c.did === delegateDid)

  if (!delegate) return null

  const N = Math.max(1, delegate.activeDelegationCount)
  // Current delegated weight share: total power (sqrt(N)) / total people (N)
  const delegatedWeight = Math.sqrt(N) / N
  const directWeight = 1.0
  const gain = directWeight - delegatedWeight
  const multiplier = (directWeight / delegatedWeight).toFixed(1)

  return (
    <View
      style={[
        styles.impactCalculator,
        {
          backgroundColor: t.palette.primary_500 + '08',
          borderColor: t.palette.primary_500 + '20',
        },
      ]}>
      <Text style={[styles.impactTitle, {color: t.palette.primary_500}]}>
        📊 Impacto del Voto Directo
      </Text>
      <View style={styles.impactMathRow}>
        <View style={styles.impactMathItem}>
          <Text style={[styles.impactMathLabel, t.atoms.text_contrast_medium]}>
            Delegado (√N)
          </Text>
          <Text style={[styles.impactMathValue, t.atoms.text]}>
            {delegatedWeight.toFixed(2)}
          </Text>
        </View>
        <Text style={[styles.impactMathOp, t.atoms.text_contrast_medium]}>
          →
        </Text>
        <View style={styles.impactMathItem}>
          <Text style={[styles.impactMathLabel, t.atoms.text_contrast_medium]}>
            Directo
          </Text>
          <Text
            style={[
              styles.impactMathValue,
              {color: t.palette.positive_500, fontWeight: '900'},
            ]}>
            {directWeight.toFixed(2)}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.impactResult,
          {backgroundColor: t.palette.positive_500 + '15'},
        ]}>
        <Text
          style={[styles.impactResultText, {color: t.palette.positive_500}]}>
          <Trans>Your vote will have</Trans>{' '}
          <Text style={{fontWeight: '900'}}>
            {multiplier} <Trans>times</Trans>
          </Text>{' '}
          <Trans>more weight</Trans>
          si votas directamente (+{gain.toFixed(2)} de poder).
        </Text>
      </View>

      <Text style={[styles.impactFootnote, t.atoms.text_contrast_medium]}>
        Basado en {N} personas delegando a{' '}
        {delegate.displayName || 'este usuario'}.
      </Text>
    </View>
  )
}

function AccessTierPill({label, value}: {label: string; value: string}) {
  const t = useTheme()
  return (
    <View style={[styles.accessTierPill, t.atoms.bg_contrast_50]}>
      <Text style={[styles.accessTierLabel, t.atoms.text_contrast_medium]}>
        {label}
      </Text>
      <Text style={[styles.accessTierValue, t.atoms.text]}>{value}</Text>
    </View>
  )
}

export function CabildeoDetailScreen({route}: Props) {
  const t = useTheme()
  const {i18n} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {currentAccount} = useSession()
  const cabildeoUri = fromCabildeoRouteParam(route.params.cabildeoUri)
  const {
    data: cabildeo = null,
    isFetched: isCabildeoFetched,
    isFetching: isFetchingCabildeo,
    isLoading: isCabildeoLoading,
    isError: isCabildeoError,
    refetch: refetchCabildeo,
  } = useCabildeoQuery(cabildeoUri)
  const {
    data: allPositions = [],
    isFetched: isPositionsFetched,
    isFetching: isFetchingPositions,
    isLoading: isPositionsLoading,
    isError: isPositionsError,
    refetch: refetchPositions,
  } = useCabildeoPositionsQuery(cabildeo?.uri)

  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  // Use cabildeo.options directly; no local duplication needed.
  // Consensus synthesizer state removed — pending real backend implementation
  const [hasDismissedGracePeriod, setHasDismissedGracePeriod] = useState(false)
  const sortitionControl = useDialogControl()
  const [mountedAt] = useState(() => Date.now())
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [positionFilter, setPositionFilter] = useState<
    'all' | 'for' | 'against' | 'amendment'
  >('all')
  const delegateEvent = cabildeo?.userContext?.delegateVoteEvent
  const {mutate: vote, isPending: isVoting} = useVoteMutation()
  const sortitionRunQuery = useSortitionRunQuery(
    cabildeo?.uri,
    currentAccount?.did,
  )
  const createSortitionRun = useCreateSortitionRunMutation()
  const {data: viewerOfficialAccounts = []} = useViewerOfficialAccountsQuery(
    REPRESENTATIVES,
    currentAccount?.did,
  )
  const officialSignaturesQuery = useOfficialCabildeoSignaturesQuery(
    cabildeo?.uri,
  )
  const signOfficialCabildeo = useSignOfficialCabildeoMutation()

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!cabildeo) {
      setSelectedOption(null)
      setHasVoted(false)
      setHasDismissedGracePeriod(false)
      setPositionFilter('all')
      return
    }
    setSelectedOption(cabildeo.userContext?.viewerVoteOption ?? null)
    setHasVoted(typeof cabildeo.userContext?.viewerVoteOption === 'number')
    setHasDismissedGracePeriod(false)
    setPositionFilter('all')
  }, [cabildeo?.uri])

  // Calculate 24h grace period remaining time
  const gracePeriodRemainingMs = useMemo(() => {
    if (!delegateEvent?.votedAt) return 0
    const votedTime = new Date(delegateEvent.votedAt).getTime()
    const expiryTime = votedTime + 24 * 60 * 60 * 1000 // 24 hours
    return Math.max(0, expiryTime - mountedAt)
  }, [delegateEvent, mountedAt])

  const hoursRemaining = Math.floor(gracePeriodRemainingMs / (1000 * 60 * 60))
  const minutesRemaining = Math.floor(
    (gracePeriodRemainingMs % (1000 * 60 * 60)) / (1000 * 60),
  )

  const isGracePeriodActive =
    gracePeriodRemainingMs > 0 && !hasVoted && !hasDismissedGracePeriod

  const viewerHasVoted =
    typeof cabildeo?.userContext?.viewerVoteOption === 'number'
  const voteEditCreatedAtMs = cabildeo?.userContext?.viewerVoteCreatedAt
    ? new Date(cabildeo.userContext.viewerVoteCreatedAt).getTime()
    : 0
  const voteEditDeadlineMs = Number.isFinite(voteEditCreatedAtMs)
    ? voteEditCreatedAtMs + 5 * 60 * 1000
    : 0
  const voteEditRemainingMs = Math.max(0, voteEditDeadlineMs - nowMs)
  const canEditVote = viewerHasVoted && voteEditRemainingMs > 0
  const voteEditRemainingLabel = formatRemaining(voteEditRemainingMs)
  const shouldRevealVoteResults = Boolean(cabildeo?.outcome) || viewerHasVoted
  const partyVoteSummary = cabildeo?.partyVoteSummary ?? []

  const positions = useMemo(() => {
    const all = allPositions
    if (positionFilter === 'all') return all
    return all.filter(p => p.stance === positionFilter)
  }, [allPositions, positionFilter])

  if (
    !cabildeo &&
    (isCabildeoLoading || !isCabildeoFetched || isCabildeoError)
  ) {
    return (
      <Layout.Screen testID="cabildeoDetailScreen">
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Lobbying</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <ListMaybePlaceholder
          isLoading={isCabildeoLoading || !isCabildeoFetched}
          isError={isCabildeoError}
          onRetry={refetchCabildeo}
          emptyType="page"
          emptyMessage="Estamos cargando el cabildeo seleccionado."
        />
      </Layout.Screen>
    )
  }

  if (!cabildeo) {
    return (
      <Layout.Screen testID="cabildeoDetailScreen">
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Lobbying</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <ListMaybePlaceholder
          isLoading={false}
          isError={false}
          emptyType="page"
          emptyTitle="Cabildeo no disponible"
          emptyMessage={i18n._(
            msg`This cabildeo is no longer available or was deleted.`,
          )}
        />
      </Layout.Screen>
    )
  }

  const viewerOfficialControllers = viewerOfficialAccounts
    .map(account => account.viewerController)
    .filter(controller => Boolean(controller))
  const viewAccess = evaluateCabildeoAccess({
    tier: cabildeo.minimumViewTier ?? 'public',
    viewerDid: currentAccount?.did,
    officialControllers: viewerOfficialControllers,
  })
  const participationAccess = evaluateCabildeoAccess({
    tier: cabildeo.minimumParticipationTier ?? 'signed_in',
    viewerDid: currentAccount?.did,
    officialControllers: viewerOfficialControllers,
  })
  const officialSigner = viewerOfficialAccounts.find(account =>
    hasOfficialScope(account.viewerController, 'official.cabildeo.sign'),
  )
  const officialSignatures = officialSignaturesQuery.data ?? []

  const phase = getPhaseMeta(t)[cabildeo.phase]

  if (!viewAccess.allowed) {
    return (
      <Layout.Screen testID="cabildeoDetailScreen">
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Lobbying</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <ListMaybePlaceholder
          isLoading={false}
          isError={false}
          emptyType="page"
          emptyTitle="Cabildeo restringido"
          emptyMessage={`Este cabildeo requiere ${getAccessTierLabel(
            cabildeo.minimumViewTier,
          )} para verlo.`}
        />
      </Layout.Screen>
    )
  }

  const isMultiCommunity =
    Boolean(cabildeo.communities?.length) && cabildeo.communities!.length > 0
  const sortitionRun = sortitionRunQuery.data?.run ?? null
  const sortitionStatus: SortitionStatus = sortitionRun
    ? sortitionRun.status === 'active'
      ? 'active'
      : sortitionRun.status === 'scheduled'
        ? 'pending'
        : 'none'
    : 'none'

  const phaseIndex = PHASE_ORDER.indexOf(cabildeo.phase)

  const handleVote = () => {
    if (selectedOption === null || !cabildeoUri) return
    if (!participationAccess.allowed) {
      Toast.show(i18n._(msg`No tienes el tier requerido para participar.`))
      return
    }
    if (cabildeo?.phase !== 'voting') {
      Toast.show(i18n._(msg`Voting is not open for this proposal.`))
      return
    }
    vote(
      {cabildeoUri, selectedOption, isDirect: true},
      {
        onSuccess: () => {
          setHasVoted(true)
          Toast.show(i18n._(msg`Vote registered`))
        },
        onError: err => {
          const message =
            err instanceof Error && err.message.includes('VoteEditWindowExpired')
              ? i18n._(msg`Vote edit window has expired`)
              : i18n._(
                  msg`Could not register vote. ${err instanceof Error ? err.message : 'Try again.'}`,
                )
          Toast.show(
            message,
          )
        },
      },
    )
  }

  const handleConfigureSortition = (config: {
    size: number
    filter: 'all' | 'verified' | 'senior'
    roundOffset: number
  }) => {
    if (!cabildeo?.uri || !currentAccount?.did) return
    createSortitionRun.mutate(
      {
        cabildeoUri: cabildeo.uri,
        communityUri: cabildeo.community,
        createdByDid: currentAccount.did,
        assemblySize: config.size,
        eligibilityFilter: config.filter,
        roundOffset: config.roundOffset,
      },
      {
        onSuccess: () => {
          void sortitionRunQuery.refetch()
          Toast.show(i18n._(msg`Sorteo programado con Drand`))
        },
        onError: err => {
          Toast.show(
            err instanceof Error
              ? err.message
              : i18n._(msg`No se pudo programar el sorteo.`),
          )
        },
      },
    )
  }

  const handleConfirmDelegateVote = () => {
    if (!delegateEvent || !cabildeoUri) return
    if (!participationAccess.allowed) {
      Toast.show(i18n._(msg`No tienes el tier requerido para participar.`))
      return
    }
    if (cabildeo?.phase !== 'voting') {
      Toast.show(i18n._(msg`Voting is not open for this proposal.`))
      return
    }
    setSelectedOption(delegateEvent.optionIndex)
    vote(
      {
        cabildeoUri,
        selectedOption: delegateEvent.optionIndex,
        isDirect: false,
      },
      {
        onSuccess: () => {
          setHasVoted(true)
          Toast.show(i18n._(msg`Delegated vote confirmed`))
        },
        onError: err => {
          Toast.show(
            i18n._(
              msg`Could not confirm vote. ${err instanceof Error ? err.message : 'Try again.'}`,
            ),
          )
        },
      },
    )
  }

  const handleOverrideVoteStart = () => {
    setHasDismissedGracePeriod(true) // Dismiss the banner
    // Keep user in voting phase so they can pick a new option and hit main vote button
  }

  const handleOfficialSignature = () => {
    if (!officialSigner || !cabildeo?.uri) return
    signOfficialCabildeo.mutate(
      {
        account: officialSigner,
        controllerDid: officialSigner.viewerController?.controllerDid || '',
        cabildeoUri: cabildeo.uri,
        summary: `${officialSigner.name} registra postura oficial sobre este cabildeo.`,
      },
      {
        onSuccess: () => {
          void officialSignaturesQuery.refetch()
          Toast.show(i18n._(msg`Postura oficial firmada`))
        },
        onError: err => {
          Toast.show(
            err instanceof Error
              ? err.message
              : i18n._(msg`No se pudo firmar la postura oficial.`),
          )
        },
      },
    )
  }

  return (
    <Layout.Screen testID="cabildeoDetailScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Lobbying</Trans>
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>
            {phase.icon} {phase.label}
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isFetchingCabildeo || isFetchingPositions}
            onRefresh={() => {
              refetchCabildeo()
              refetchPositions()
            }}
            tintColor={t.palette.primary_500}
          />
        }>
        <Layout.Center style={styles.center}>
          {/* ─── Phase Timeline ─── */}
          <View style={[styles.timeline, t.atoms.bg_contrast_25]}>
            {PHASE_ORDER.map((p, i) => {
              const meta = getPhaseMeta(t)[p]
              const isActive = i === phaseIndex
              const isPast = i < phaseIndex

              return (
                <View key={p} style={styles.timelineStep}>
                  <View
                    style={[
                      styles.timelineDot,
                      {
                        backgroundColor: isActive
                          ? meta.color
                          : isPast
                            ? meta.color + '60'
                            : t.palette.contrast_100,
                      },
                    ]}>
                    {isActive && (
                      <View
                        style={[
                          styles.timelinePulse,
                          {backgroundColor: meta.color + '30'},
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.timelineLabel,
                      {
                        color: isActive
                          ? meta.color
                          : isPast
                            ? t.palette.contrast_500
                            : t.palette.contrast_200,
                        fontWeight: isActive ? '900' : '600',
                      },
                    ]}>
                    {meta.label}
                  </Text>
                  {i < PHASE_ORDER.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        {
                          backgroundColor: isPast
                            ? meta.color + '40'
                            : t.palette.contrast_100,
                        },
                      ]}
                    />
                  )}
                </View>
              )
            })}
          </View>

          {/* ─── Title & Description ─── */}
          <Text style={[styles.title, t.atoms.text]}>{cabildeo.title}</Text>
          <Text style={[styles.desc, t.atoms.text_contrast_medium]}>
            {cabildeo.description}
          </Text>

          <View
            style={[
              styles.accessTierCard,
              t.atoms.bg_contrast_25,
              t.atoms.border_contrast_low,
            ]}>
            <View style={styles.accessTierRow}>
              <AccessTierPill
                label="Ver"
                value={getAccessTierLabel(cabildeo.minimumViewTier)}
              />
              <AccessTierPill
                label="Participar"
                value={getAccessTierLabel(cabildeo.minimumParticipationTier)}
              />
            </View>
            {!participationAccess.allowed && (
              <Text style={[styles.accessTierNotice, t.atoms.text_contrast_medium]}>
                <Trans>
                  Puedes leer este cabildeo, pero necesitas el tier requerido
                  para votar, delegar o publicar posición.
                </Trans>
              </Text>
            )}
          </View>

          {/* ─── Community Tags ─── */}
          <View style={styles.communityRow}>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('CommunityProfile', {
                  communityId: cabildeo.community,
                  communityName: cabildeo.community,
                })
              }
              style={[
                styles.communityPill,
                {backgroundColor: t.palette.primary_500 + '20'},
              ]}>
              <Text
                style={[
                  styles.communityPillText,
                  {color: t.palette.primary_500},
                ]}>
                {cabildeo.community} →
              </Text>
            </TouchableOpacity>
            {cabildeo.communities?.map((c, i) => (
              <View
                key={i}
                style={[
                  styles.communityPill,
                  {backgroundColor: t.palette.yellow + '20'},
                ]}>
                <Text
                  style={[styles.communityPillText, {color: t.palette.yellow}]}>
                  {c}
                </Text>
              </View>
            ))}
            {isMultiCommunity && (
              <View
                style={[
                  styles.communityPill,
                  {backgroundColor: t.palette.primary_500 + '15'},
                ]}>
                <Text
                  style={[
                    styles.communityPillText,
                    {color: t.palette.primary_500},
                  ]}>
                  <Trans>√ Quadratic</Trans>
                </Text>
              </View>
            )}
            {cabildeo.geoRestricted && (
              <View
                style={[
                  styles.communityPill,
                  {backgroundColor: t.palette.negative_500 + '15'},
                ]}>
                <Text
                  style={[
                    styles.communityPillText,
                    {color: t.palette.negative_500},
                  ]}>
                  🔒 Solo {cabildeo.region}
                </Text>
              </View>
            )}
          </View>

          <SortitionStatusCard
            status={sortitionStatus}
            run={sortitionRun}
            selected={sortitionRunQuery.data?.selected ?? []}
            viewerCandidate={sortitionRunQuery.data?.viewerCandidate ?? null}
            canConfigure={Boolean(currentAccount?.did) && !sortitionRun}
            onConfigure={() => sortitionControl.open()}
          />

          {/* ─── Deadline ─── */}
          {cabildeo.phaseDeadline && (
            <View
              style={[styles.deadlineBar, {borderColor: phase.color + '30'}]}>
              <Text
                style={[styles.deadlineLabel, t.atoms.text_contrast_medium]}>
                <Trans>Phase closes:</Trans>
              </Text>
              <Text style={[styles.deadlineValue, {color: phase.color}]}>
                {i18n.date(new Date(cabildeo.phaseDeadline), {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}

          {/* ─── Options / Voting ─── */}
          <Text style={[styles.sectionTitle, t.atoms.text]}>
            <Trans>Options</Trans>
          </Text>

          {cabildeo.options.map((opt, i) => {
            const isSelected = selectedOption === i
            const isWinner = cabildeo.outcome?.winningOption === i

            // Calculate real-time bar width if voted or resolved
            let barWidth = 0
            let displayVotes = 0
            const showTally = shouldRevealVoteResults

            if (showTally) {
              if (cabildeo.outcome) {
                // Resolved phase
                const total = cabildeo.outcome.effectiveTotalPower
                displayVotes =
                  cabildeo.outcome.breakdown.find(b => b.optionIndex === i)
                    ?.effectiveVotes ?? 0
                barWidth = total > 0 ? (displayVotes / total) * 100 : 0
              } else {
                // Real-time voting phase
                const total = cabildeo.voteTotals.total
                displayVotes =
                  cabildeo.optionSummary.find(s => s.optionIndex === i)
                    ?.votes ?? 0
                barWidth = total > 0 ? (displayVotes / total) * 100 : 0
              }
            }

            return (
              <TouchableOpacity
                accessibilityRole="button"
                key={i}
                activeOpacity={0.8}
                onPress={() => {
                  if (
                    cabildeo.phase === 'voting' &&
                    !hasVoted &&
                    participationAccess.allowed
                  ) {
                    setSelectedOption(i)
                  }
                }}
                style={[
                  styles.optionCard,
                  t.atoms.bg_contrast_25,
                  isSelected && {
                    borderColor: t.palette.primary_500,
                    borderWidth: 2,
                  },
                  isWinner && {
                    borderColor: t.palette.positive_500,
                    borderWidth: 2,
                  },
                ]}>
                {/* Result bar background */}
                {showTally && (
                  <View
                    style={[
                      styles.resultBar,
                      {
                        width: `${barWidth}%`,
                        backgroundColor: isWinner
                          ? t.palette.positive_500 + '20'
                          : t.palette.primary_500 + '10',
                      },
                    ]}
                  />
                )}

                <View style={styles.optionContent}>
                  <View style={styles.optionHeader}>
                    {/* Selection indicator */}
                    {cabildeo.phase === 'voting' && (
                      <View
                        style={[
                          styles.radioOuter,
                          {
                            borderColor: isSelected
                              ? t.palette.primary_500
                              : t.palette.contrast_200,
                          },
                        ]}>
                        {isSelected && (
                          <View
                            style={[
                              styles.radioInner,
                              {backgroundColor: t.palette.primary_500},
                            ]}
                          />
                        )}
                      </View>
                    )}

                    {isWinner && <Text style={styles.winnerBadge}>🏆</Text>}

                    <View style={{flex: 1}}>
                      <View
                        style={{flexDirection: 'row', alignItems: 'center'}}>
                        {opt.isConsensus && (
                          <Text
                            style={{
                              color: t.palette.primary_500,
                              fontSize: 16,
                              marginRight: 4,
                            }}>
                            ✨{' '}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.optionLabel,
                            t.atoms.text,
                            opt.isConsensus && {color: t.palette.primary_500},
                          ]}
                          numberOfLines={2}>
                          {opt.label}
                        </Text>
                      </View>
                      {opt.description && (
                        <Text
                          style={[
                            styles.optionDesc,
                            t.atoms.text_contrast_medium,
                          ]}>
                          {opt.description}
                        </Text>
                      )}
                    </View>

                    {/* Vote percentage */}
                    {showTally && (
                      <View style={{alignItems: 'flex-end'}}>
                        <Text
                          style={[
                            styles.votePercent,
                            {
                              color: isWinner
                                ? t.palette.positive_500
                                : t.palette.contrast_500,
                            },
                          ]}>
                          {barWidth.toFixed(1)}%
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: t.palette.contrast_400,
                            marginTop: 2,
                          }}>
                          <Trans>{displayVotes} votes</Trans>
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}

          {shouldRevealVoteResults &&
            cabildeo.voteVisibility === 'party_only' &&
            partyVoteSummary.length > 0 && (
              <PartyVoteSummary
                summary={partyVoteSummary}
                options={cabildeo.options}
              />
            )}

          {sortitionRun && (
            <>
              <SortitionAssemblyView
                run={sortitionRun}
                viewerCandidate={sortitionRunQuery.data?.viewerCandidate}
              />
              <SortitionProofList
                run={sortitionRun}
                selected={sortitionRunQuery.data?.selected ?? []}
                viewerCandidate={sortitionRunQuery.data?.viewerCandidate}
              />
            </>
          )}

          <View
            style={[
              styles.officialSignatureSection,
              t.atoms.bg_contrast_25,
              t.atoms.border_contrast_low,
            ]}>
            <View style={styles.officialSignatureHeader}>
              <View style={{flex: 1}}>
                <Text style={[styles.officialSignatureTitle, t.atoms.text]}>
                  <Trans>Posturas oficiales</Trans>
                </Text>
                <Text
                  style={[
                    styles.officialSignatureSub,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>
                    Firmas emitidas por cuentas cívicas oficiales, con
                    controlador privado-auditable.
                  </Trans>
                </Text>
              </View>
              {officialSigner && (
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={handleOfficialSignature}
                  disabled={signOfficialCabildeo.isPending}
                  style={[
                    styles.officialSignatureButton,
                    {backgroundColor: t.palette.primary_500},
                    signOfficialCabildeo.isPending && {opacity: 0.65},
                  ]}>
                  <Text style={styles.officialSignatureButtonText}>
                    <Trans>Firmar</Trans>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {officialSignatures.length > 0 ? (
              officialSignatures.map(signature => (
                <View
                  key={signature.id}
                  style={[styles.officialSignatureItem, t.atoms.bg_contrast_50]}>
                  <Text style={[styles.officialSignatureEntity, t.atoms.text]}>
                    {signature.entityName ?? signature.entityId}
                  </Text>
                  <Text
                    style={[
                      styles.officialSignatureSummary,
                      t.atoms.text_contrast_medium,
                    ]}>
                    {signature.summary}
                  </Text>
                  <Text
                    style={[
                      styles.officialSignatureAudit,
                      t.atoms.text_contrast_medium,
                    ]}>
                    #{signature.controllerHash.slice(-8)}
                  </Text>
                </View>
              ))
            ) : (
              <Text
                style={[
                  styles.officialSignatureEmpty,
                  t.atoms.text_contrast_medium,
                ]}>
                <Trans>Aún no hay postura oficial firmada.</Trans>
              </Text>
            )}
          </View>

          {/* ─── Consensus Synthesizer (AI Mediation) ─── */}
          {/* TODO: Implement real AI consensus synthesis backend */}

          {/* Grace Period Notification Banner */}
          {isGracePeriodActive && delegateEvent && (
            <View
              style={[
                styles.gracePeriodBanner,
                {
                  borderColor: t.palette.primary_500 + '40',
                  backgroundColor: t.palette.primary_500 + '10',
                },
              ]}>
              <View style={styles.gracePeriodHeader}>
                <Text style={styles.gracePeriodTitle}>
                  🔔 <Trans>Your delegate has voted</Trans>
                </Text>
                <Text
                  style={[
                    styles.gracePeriodTime,
                    {color: t.palette.primary_500},
                  ]}>
                  <Trans>
                    {hoursRemaining}h {minutesRemaining}m remaining
                  </Trans>
                </Text>
              </View>
              <Text style={[styles.gracePeriodDesc, t.atoms.text]}>
                <Trans>Your delegate voted for:</Trans>
                {'\n'}
                <Text style={{fontWeight: '900'}}>
                  {cabildeo.options[delegateEvent.optionIndex]?.label}
                </Text>
              </Text>

              <View style={styles.gracePeriodActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={i18n._(msg`Confirm delegated vote`)}
                  accessibilityHint={i18n._(msg`Accepts your delegate's vote as your own`)}
                  onPress={handleConfirmDelegateVote}
                  disabled={isVoting}
                  style={[
                    styles.graceBtn,
                    {backgroundColor: t.palette.primary_500},
                    isVoting && {opacity: 0.6},
                  ]}>
                  <Text
                    style={[
                      styles.graceBtnText,
                      {color: t.palette.contrast_100},
                    ]}>
                    {isVoting
                      ? i18n._(msg`Confirming...`)
                      : i18n._(msg`Confirm (Weight 1.0)`)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={i18n._(msg`Override delegate vote`)}
                  accessibilityHint={i18n._(msg`Opens interface to cast your own vote instead of delegate's`)}
                  onPress={handleOverrideVoteStart}
                  style={[
                    styles.graceBtn,
                    {borderWidth: 1, borderColor: t.palette.primary_500},
                  ]}>
                  <Text
                    style={[
                      styles.graceBtnText,
                      {color: t.palette.primary_500},
                    ]}>
                    <Trans>Change vote</Trans>
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setHasDismissedGracePeriod(true)}
                style={styles.graceLinkBtn}>
                <Text
                  style={[styles.graceLinkText, t.atoms.text_contrast_medium]}>
                  <Trans>Leave as is (Weight √N)</Trans>
                </Text>
              </TouchableOpacity>

              <DelegationImpactCalculator
                delegateDid={cabildeo.userContext?.hasDelegatedTo || ''}
                cabildeoUri={cabildeoUri}
              />
            </View>
          )}

          {/* Geo-restriction notice */}
          {cabildeo.geoRestricted && cabildeo.phase === 'voting' && (
            <View
              style={[
                styles.geoRestrictionBanner,
                {borderColor: t.palette.negative_500 + '30'},
              ]}>
              <Text
                style={[
                  styles.geoRestrictionText,
                  {color: t.palette.negative_500},
                ]}>
                🔒 <Trans>Only residents of {cabildeo.region} can vote</Trans>
              </Text>
              <Text
                style={[
                  styles.geoRestrictionSub,
                  t.atoms.text_contrast_medium,
                ]}>
                <Trans>Your verified region must match {cabildeo.region}</Trans>
              </Text>
            </View>
          )}

          {/* Vote Button */}
          {cabildeo.phase === 'voting' &&
            !hasVoted &&
            participationAccess.allowed && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={i18n._(msg`Cast your vote`)}
              accessibilityHint={i18n._(
                msg`Confirms your vote for the selected option`,
              )}
              onPress={handleVote}
              disabled={selectedOption === null || isVoting}
              style={[
                styles.voteButton,
                {
                  backgroundColor:
                    selectedOption !== null && !isVoting
                      ? t.palette.primary_500
                      : t.palette.contrast_200,
                },
              ]}>
              <Text
                style={[
                  styles.voteButtonText,
                  {color: t.palette.contrast_100},
                ]}>
                {isVoting
                  ? i18n._(msg`⏳ Voting...`)
                  : i18n._(msg`🗳️ Vote directly`)}
              </Text>
              <Text
                style={[
                  styles.voteButtonSub,
                  {color: t.palette.contrast_100 + '90'},
                ]}>
                <Trans>Weight: 1.0 (direct vote)</Trans>
              </Text>
            </TouchableOpacity>
          )}

          {hasVoted && (
            <View
              style={[
                styles.votedConfirmation,
                {borderColor: t.palette.positive_500 + '40'},
              ]}>
              <Text style={[styles.votedText, {color: t.palette.positive_500}]}>
                ✅ <Trans>Your vote has been registered</Trans>
              </Text>
              <Text style={[styles.votedSub, t.atoms.text_contrast_medium]}>
                <Trans>Effective weight: 1.0 (direct vote)</Trans>
              </Text>
              {cabildeo.phase === 'voting' && participationAccess.allowed && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={i18n._(msg`Change your vote`)}
                  accessibilityHint={i18n._(msg`Allows selecting a different option`)}
                  onPress={() => {
                    if (!canEditVote) {
                      Toast.show(i18n._(msg`Vote edit window has expired`))
                      return
                    }
                    setHasVoted(false)
                  }}
                  disabled={!canEditVote}
                  style={[
                    styles.changeVoteBtn,
                    {
                      borderColor: canEditVote
                        ? t.palette.primary_500
                        : t.palette.contrast_300,
                    },
                    !canEditVote && {opacity: 0.55},
                  ]}>
                  <Text
                    style={[
                      styles.changeVoteText,
                      {
                        color: canEditVote
                          ? t.palette.primary_500
                          : t.palette.contrast_500,
                      },
                    ]}>
                    {canEditVote
                      ? i18n._(msg`Change vote (${voteEditRemainingLabel})`)
                      : i18n._(msg`Edit window closed`)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Delegate Button */}
          {cabildeo.phase === 'voting' &&
            !hasVoted &&
            participationAccess.allowed && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => navigation.navigate('DelegateVote', {cabildeoUri})}
              style={[styles.delegateButton, t.atoms.bg_contrast_25]}>
              <Text style={[styles.delegateText, t.atoms.text]}>
                🤝 <Trans>Delegate my vote</Trans>
              </Text>
              <Text style={[styles.delegateSub, t.atoms.text_contrast_medium]}>
                <Trans>
                  Your representative will vote for you (√N weighting)
                </Trans>
              </Text>
            </TouchableOpacity>
          )}

          {/* ─── Outcome Details ─── */}
          {cabildeo.outcome && (
            <View style={[styles.outcomeSection, t.atoms.bg_contrast_25]}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                <Trans>Final Result</Trans>
              </Text>

              <View style={styles.outcomeGrid}>
                <View style={styles.outcomeMetric}>
                  <Text style={[styles.outcomeValue, t.atoms.text]}>
                    {cabildeo.outcome.totalParticipants}
                  </Text>
                  <Text
                    style={[
                      styles.outcomeMetricLabel,
                      t.atoms.text_contrast_medium,
                    ]}>
                    <Trans>Participants</Trans>
                  </Text>
                </View>
                <View style={styles.outcomeMetric}>
                  <Text style={[styles.outcomeValue, t.atoms.text]}>
                    {cabildeo.outcome.directVoters}
                  </Text>
                  <Text
                    style={[
                      styles.outcomeMetricLabel,
                      t.atoms.text_contrast_medium,
                    ]}>
                    <Trans>Direct</Trans>
                  </Text>
                </View>
                <View style={styles.outcomeMetric}>
                  <Text style={[styles.outcomeValue, t.atoms.text]}>
                    {cabildeo.outcome.delegatedVoters}
                  </Text>
                  <Text
                    style={[
                      styles.outcomeMetricLabel,
                      t.atoms.text_contrast_medium,
                    ]}>
                    <Trans>Delegated</Trans>
                  </Text>
                </View>
                <View style={styles.outcomeMetric}>
                  <Text
                    style={[
                      styles.outcomeValue,
                      {color: t.palette.primary_500},
                    ]}>
                    {cabildeo.outcome.effectiveTotalPower.toFixed(1)}
                  </Text>
                  <Text
                    style={[
                      styles.outcomeMetricLabel,
                      t.atoms.text_contrast_medium,
                    ]}>
                    Poder √
                  </Text>
                </View>
              </View>

              {/* Community Breakdown */}
              {cabildeo.outcome.communityBreakdown && (
                <>
                  <Text
                    style={[
                      styles.subsectionTitle,
                      t.atoms.text_contrast_medium,
                    ]}>
                    Desglose por comunidad
                  </Text>
                  {cabildeo.outcome.communityBreakdown.map((cb, i) => (
                    <View key={i} style={styles.communityBreakdownRow}>
                      <Text style={[styles.cbCommunity, t.atoms.text]}>
                        {cb.community}
                      </Text>
                      <Text
                        style={[
                          styles.cbOption,
                          {color: t.palette.primary_500},
                        ]}>
                        {cabildeo.options[cb.dominantOption]?.label}
                      </Text>
                      <Text
                        style={[
                          styles.cbParticipation,
                          t.atoms.text_contrast_medium,
                        ]}>
                        {cb.participation}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {cabildeo.phase === 'resolved' && (
            <CabildeoNominationSection cabildeoUri={cabildeo.uri} />
          )}

          {/* ─── Positions / Deliberation ─── */}
          <View
            style={[styles.posHeaderRow, {marginTop: 24, marginBottom: 14}]}>
            <Text
              style={[styles.sectionTitle, t.atoms.text, {marginBottom: 0}]}>
              Posiciones
            </Text>
            {cabildeo.phase !== 'resolved' && participationAccess.allowed && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate('CreatePosition', {
                    cabildeoUri: cabildeo.uri,
                  })
                }
                style={[
                  styles.addPosBtn,
                  {borderColor: t.palette.primary_500},
                ]}>
                <Text
                  style={[styles.addPosText, {color: t.palette.primary_500}]}>
                  <Trans>+ Position</Trans>
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Position Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.positionFilters}>
            {(
              [
                {key: 'all', label: 'Todas'},
                {key: 'for', label: '✅ A favor'},
                {key: 'against', label: '❌ En contra'},
                {key: 'amendment', label: '📝 Enmiendas'},
              ] as const
            ).map(f => (
              <TouchableOpacity
                accessibilityRole="button"
                key={f.key}
                onPress={() => setPositionFilter(f.key)}
                style={[
                  styles.posFilterPill,
                  positionFilter === f.key
                    ? {backgroundColor: t.palette.primary_500}
                    : t.atoms.bg_contrast_25,
                ]}>
                <Text
                  style={[
                    styles.posFilterText,
                    positionFilter === f.key
                      ? {color: t.palette.contrast_100}
                      : t.atoms.text_contrast_medium,
                  ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Position Cards */}
          <View style={styles.positionList}>
            {!positions.length ? (
              <ListMaybePlaceholder
                isLoading={isPositionsLoading || !isPositionsFetched}
                isError={isPositionsError}
                onRetry={refetchPositions}
                emptyType="results"
                emptyMessage={i18n._(msg`No positions published yet.`)}
              />
            ) : (
              positions.map((pos, i) => {
                const stanceStyle = getStanceColors(t)[pos.stance]
                const score = pos.constructivenessScore ?? 1.0
                const isLowQuality = score <= 0.3
                const isHighQuality = score >= 0.8

                return (
                  <View
                    key={`${pos.cabildeo}-${pos.createdAt}-${i}`}
                    style={[
                      styles.positionCard,
                      t.atoms.bg_contrast_25,
                      isLowQuality && {opacity: 0.5},
                    ]}>
                    <View style={styles.positionHeader}>
                      <View
                        style={[
                          styles.stanceBadge,
                          {backgroundColor: stanceStyle.bg},
                        ]}>
                        <Text
                          style={[
                            styles.stanceBadgeText,
                            {color: stanceStyle.fg},
                          ]}>
                          {stanceStyle.label}
                        </Text>
                      </View>
                      {pos.optionIndex !== undefined && (
                        <Text
                          style={[
                            styles.posOptionRef,
                            t.atoms.text_contrast_medium,
                          ]}>
                          → {cabildeo.options[pos.optionIndex]?.label}
                        </Text>
                      )}

                      <View style={{flex: 1}} />

                      {/* Constructiveness Badge */}
                      <View
                        style={[
                          styles.constructivenessBadge,
                          isHighQuality
                            ? {
                                backgroundColor: t.palette.positive_500 + '20',
                                borderColor: t.palette.positive_500 + '40',
                              }
                            : isLowQuality
                              ? {
                                  backgroundColor:
                                    t.palette.negative_500 + '20',
                                  borderColor: t.palette.negative_500 + '40',
                                }
                              : {
                                  backgroundColor: t.palette.contrast_50,
                                  borderColor: t.palette.contrast_200,
                                },
                        ]}>
                        <Text
                          style={[
                            styles.constructivenessBadgeText,
                            isHighQuality
                              ? {color: t.palette.positive_500}
                              : isLowQuality
                                ? {color: t.palette.negative_500}
                                : t.atoms.text_contrast_medium,
                          ]}>
                          {isHighQuality ? '✨' : isLowQuality ? '⚠️' : '📊'}{' '}
                          {Math.round(score * 100)}%
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.positionText, t.atoms.text]}>
                      {isLowQuality
                        ? 'Este comentario ha sido marcado como poco constructivo por la comunidad.'
                        : pos.text}
                    </Text>

                    {isLowQuality && (
                      <Text
                        style={[
                          styles.lowQualityReason,
                          {color: t.palette.negative_500},
                        ]}>
                        Score de constructividad demasiado bajo para ser
                        <Trans>included in the AI synthesis.</Trans>
                      </Text>
                    )}

                    <View style={styles.positionFooter}>
                      {pos.compassQuadrant && (
                        <View
                          style={[
                            styles.compassTag,
                            {backgroundColor: t.palette.contrast_50},
                          ]}>
                          <Text
                            style={[
                              styles.compassTagText,
                              t.atoms.text_contrast_medium,
                            ]}>
                            🧭 {pos.compassQuadrant}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={[
                          styles.positionTime,
                          t.atoms.text_contrast_medium,
                        ]}>
                        {new Date(pos.createdAt).toLocaleString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                )
              })
            )}
          </View>

          {/* ─── Related Cabildeos ─── */}
          <RelatedCabildeos
            currentUri={cabildeo.uri}
            community={cabildeo.community}
          />
          <RelatedBriefingPacks cabildeoUri={cabildeo.uri} />
        </Layout.Center>
      </ScrollView>
      <SortitionConfigDialog
        control={sortitionControl}
        communityUri={cabildeo.community}
        onConfirm={handleConfigureSortition}
        isSubmitting={createSortitionRun.isPending}
      />
    </Layout.Screen>
  )
}

function CabildeoNominationSection({cabildeoUri}: {cabildeoUri: string}) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const {data: nominations = []} = useRepresentativeNominationsQuery(
    cabildeoUri,
    currentAccount?.did,
  )
  const createNomination = useCreateRepresentativeNominationMutation()
  const scrollViewRef = useRef<ScrollView>(null)

  const [handle, setHandle] = useState('')
  const [role, setRole] = useState<'organize' | 'finance' | 'execute' | null>(
    null,
  )

  const handleNominate = () => {
    if (!handle.trim() || !role || !currentAccount?.did) return
    createNomination.mutate(
      {
        representativeId: cabildeoUri,
        mode: 'public',
        nominatorDid: currentAccount.did,
        nomineeHandle: handle.trim(),
        reason:
          role === 'organize'
            ? 'Organizar'
            : role === 'finance'
              ? 'Financiar'
              : 'Ejecutar',
      },
      {
        onSuccess: () => {
          setHandle('')
          setRole(null)
          Toast.show(_(msg`Nominación enviada`))
        },
      },
    )
  }

  return (
    <View style={[styles.nominationSection, t.atoms.bg_contrast_25]}>
      <Text style={[styles.sectionTitle, t.atoms.text, {marginBottom: 6}]}>
        <Trans>Nominaciones para ejecución</Trans>
      </Text>
      <Text style={[styles.nominationDesc, t.atoms.text_contrast_medium]}>
        <Trans>
          El cabildeo ha sido resuelto. Propón a personas u organizaciones para
          llevar a cabo la solución.
        </Trans>
      </Text>

      <View style={styles.nominateForm}>
        <TextInput
          accessibilityLabel="Text input field"
          accessibilityHint="Enter a person or organization to nominate"
          style={[
            styles.nominateInput,
            t.atoms.bg_contrast_50,
            t.atoms.text,
            {borderColor: t.palette.contrast_200},
          ]}
          placeholder={_(msg`Handle (ej. @usuario.para.social)`)}
          placeholderTextColor={t.palette.contrast_400}
          value={handle}
          onChangeText={setHandle}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.roleButtons}>
          {(['organize', 'finance', 'execute'] as const).map(r => (
            <TouchableOpacity
              accessibilityRole="button"
              key={r}
              onPress={() => setRole(r)}
              style={[
                styles.roleBtn,
                role === r
                  ? {backgroundColor: t.palette.primary_500}
                  : t.atoms.bg_contrast_50,
              ]}>
              <Text
                style={[
                  styles.roleBtnText,
                  role === r
                    ? {color: t.palette.contrast_100}
                    : t.atoms.text_contrast_medium,
                ]}>
                {r === 'organize'
                  ? 'Organizar'
                  : r === 'finance'
                    ? 'Financiar'
                    : 'Ejecutar'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={!handle.trim() || !role || createNomination.isPending}
          onPress={handleNominate}
          style={[
            styles.submitNominationBtn,
            !handle.trim() || !role
              ? {backgroundColor: t.palette.contrast_200}
              : {backgroundColor: t.palette.primary_500},
          ]}>
          <Text
            style={[
              styles.submitNominationText,
              {color: t.palette.contrast_100},
            ]}>
            {createNomination.isPending ? 'Enviando...' : 'Nominar'}
          </Text>
        </TouchableOpacity>
      </View>

      {nominations.length > 0 && (
        <View style={{position: 'relative', marginTop: 20}}>
          <WebScrollControls scrollViewRef={scrollViewRef} />
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.nominationsList}>
            {nominations.map(nom => (
              <View
                key={nom.id}
                style={[styles.nominationCard, t.atoms.bg_contrast_50]}>
                <Text style={[styles.nomineeName, t.atoms.text]}>
                  {nom.nomineeHandle}
                </Text>
                <View style={styles.roleTagGroup}>
                  <View
                    style={[
                      styles.roleTag,
                      {backgroundColor: t.palette.primary_500 + '20'},
                    ]}>
                    <Text
                      style={[
                        styles.roleTagText,
                        {color: t.palette.primary_500},
                      ]}>
                      {nom.reason}
                    </Text>
                  </View>
                  <Text
                    style={[styles.supportCount, t.atoms.text_contrast_medium]}>
                    {nom.supportCount} apoyos
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingBottom: 60},
  center: {paddingHorizontal: 16, paddingTop: 8},

  // Timeline
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelinePulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  timelineLabel: {fontSize: 9, textAlign: 'center'},
  timelineLine: {
    position: 'absolute',
    height: 2,
    width: '100%',
    top: 6,
    left: '50%',
  },

  // Content
  title: {fontSize: 20, fontWeight: '900', lineHeight: 26, marginBottom: 8},
  desc: {fontSize: 14, lineHeight: 20, marginBottom: 16},
  accessTierCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  accessTierRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accessTierPill: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
  },
  accessTierLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  accessTierValue: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 3,
  },
  accessTierNotice: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },

  communityRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  communityPill: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8},
  communityPillText: {fontSize: 12, fontWeight: '800'},
  briefingPackCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 5,
  },
  briefingPackParty: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  briefingPackTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  briefingPackSummary: {
    fontSize: 12,
    lineHeight: 17,
  },

  deadlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  deadlineLabel: {fontSize: 12, fontWeight: '600'},
  deadlineValue: {fontSize: 14, fontWeight: '800'},

  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 14,
    opacity: 0.7,
  },
  posHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addPosBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  addPosText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Options
  optionCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  resultBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
  },
  optionContent: {position: 'relative', zIndex: 1},
  optionHeader: {flexDirection: 'row', alignItems: 'center', gap: 10},
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {width: 12, height: 12, borderRadius: 6},
  winnerBadge: {fontSize: 20},
  optionLabel: {fontSize: 16, fontWeight: '800'},
  optionDesc: {fontSize: 12, marginTop: 2, lineHeight: 16},
  votePercent: {fontSize: 18, fontWeight: '900'},
  partySummaryCard: {
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  partySummaryTitle: {fontSize: 15, fontWeight: '900'},
  partySummarySub: {fontSize: 12, marginTop: 3, lineHeight: 16},
  partySummaryRow: {
    gap: 8,
  },
  partySummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  partySummaryParty: {fontSize: 13, fontWeight: '900'},
  partySummaryCount: {fontSize: 12, fontWeight: '700'},
  partySummaryTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  partySummaryFill: {
    height: 6,
    borderRadius: 3,
  },
  partySummaryOptions: {fontSize: 11, marginTop: 6, lineHeight: 15},

  // Vote button
  voteButton: {
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  voteButtonText: {fontSize: 17, fontWeight: '900'},
  voteButtonSub: {fontSize: 12, marginTop: 6, fontWeight: '500'},
  votedConfirmation: {
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 20,
    marginBottom: 12,
  },
  votedText: {fontSize: 17, fontWeight: '800'},
  votedSub: {fontSize: 13, marginTop: 4, fontWeight: '500'},
  changeVoteBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeVoteText: {fontSize: 12, fontWeight: '700'},

  // Grace Period Banner
  gracePeriodBanner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    marginTop: 8,
  },
  gracePeriodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gracePeriodTitle: {fontSize: 16, fontWeight: '900'},
  gracePeriodTime: {fontSize: 12, fontWeight: '800'},
  gracePeriodDesc: {fontSize: 14, lineHeight: 20, marginBottom: 16},
  gracePeriodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  graceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graceBtnText: {fontSize: 13, fontWeight: '800'},
  graceLinkBtn: {
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
  },
  graceLinkText: {fontSize: 13, textDecorationLine: 'underline'},

  delegateButton: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  delegateText: {fontSize: 15, fontWeight: '800'},
  delegateSub: {fontSize: 12, marginTop: 6, fontWeight: '500'},

  officialSignatureSection: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  officialSignatureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  officialSignatureTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  officialSignatureSub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  officialSignatureButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  officialSignatureButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '900',
  },
  officialSignatureItem: {
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  officialSignatureEntity: {
    fontSize: 14,
    fontWeight: '900',
  },
  officialSignatureSummary: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  officialSignatureAudit: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 6,
  },
  officialSignatureEmpty: {
    fontSize: 12,
    lineHeight: 17,
  },

  // Outcome
  outcomeSection: {
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  outcomeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  outcomeMetric: {
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
    padding: 12,
  },
  outcomeValue: {fontSize: 22, fontWeight: '900'},
  outcomeMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },

  subsectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  communityBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  cbCommunity: {fontSize: 13, fontWeight: '800', width: 80},
  cbOption: {fontSize: 12, fontWeight: '700', flex: 1},
  cbParticipation: {fontSize: 12, fontWeight: '600'},

  // Positions
  positionFilters: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 12,
  },
  posFilterPill: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16},
  posFilterText: {fontSize: 12, fontWeight: '700'},

  positionList: {gap: 10},
  positionCard: {
    borderRadius: 14,
    padding: 14,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  stanceBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6},
  stanceBadgeText: {fontSize: 10, fontWeight: '900'},
  posOptionRef: {fontSize: 11, fontWeight: '600'},
  constructivenessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  constructivenessBadgeText: {fontSize: 10, fontWeight: '800'},
  compassTag: {paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4},
  compassTagText: {fontSize: 10, fontWeight: '600'},
  positionText: {fontSize: 14, lineHeight: 20, marginBottom: 6},
  lowQualityReason: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: 6,
  },
  positionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  positionTime: {fontSize: 11},

  // Geo restriction
  geoRestrictionBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center' as const,
    marginTop: 6,
    marginBottom: 8,
  },
  geoRestrictionText: {fontSize: 14, fontWeight: '800' as const},
  geoRestrictionSub: {fontSize: 11, marginTop: 2, textAlign: 'center' as const},

  // Consensus Synthesizer
  synthesizerCard: {
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
  },
  synthesizerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  synthesizerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  synthesizerDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  synthesizerBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  synthesizerBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  impactCalculator: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  impactTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  impactMathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  impactMathItem: {
    alignItems: 'center',
  },
  impactMathLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  impactMathValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  impactMathOp: {
    fontSize: 18,
    fontWeight: '300',
  },
  impactResult: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  impactResultText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  impactFootnote: {
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Nomination
  nominationSection: {
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  nominationDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  nominateForm: {
    gap: 12,
  },
  nominateInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  submitNominationBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 4,
  },
  submitNominationText: {
    fontSize: 14,
    fontWeight: '900',
  },
  nominationsList: {
    gap: 8,
  },
  nominationCard: {
    padding: 12,
    borderRadius: 10,
    width: 220,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
  },
  nomineeName: {
    fontSize: 14,
    fontWeight: '900',
  },
  roleTagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  supportCount: {
    fontSize: 12,
    fontWeight: '600',
  },
})
