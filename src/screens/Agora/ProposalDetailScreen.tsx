import {useCallback, useMemo, useState} from 'react'
import {Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
  type NavigationProp,
} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as SegmentedControl from '#/components/forms/SegmentedControl'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {
  CommunityChip,
  EmptyState,
  ParticipationBar,
  PhaseBadge,
  ShadowTallyChart,
  SignalBadge,
  VoteComposer,
} from './components'

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<CommonNavigatorParams, 'ProposalDetail'>

type DetailTab = 'vote' | 'deliberate' | 'delegate' | 'tally'

interface Proposal {
  uri: string
  title: string
  community: string
  communityColor: string
  signal: number
  voteCount: number
  intensityCount: number
  delegationCount: number
  flatAvg: number
  sqrtNAvg: number
  correlationAvg: number
  maxWeightRatio: string
  effectiveParticipants: string
  phase: 'open' | 'closing' | 'closed'
  closesAt: string
  yourSignal?: number
  yourUnits?: number
  delegateVote?: {
    delegateHandle: string
    signal: number
    units: number
  }
}

interface DeliberationStatement {
  uri: string
  body: string
  stance: 'for' | 'against' | 'neutral'
  agreeCount: number
  disagreeCount: number
  passCount: number
  yourVote?: 'agree' | 'disagree' | 'pass'
}

interface Delegation {
  uri: string
  delegate: string
  delegateRole?: string
  scope: string
  scopeMode: 'community' | 'topic' | 'proposal' | 'all'
  active: boolean
}

interface AuditEntry {
  uri: string
  actor: string
  action: string
  timestamp: string
}

// ─── Mock Data (TODO: wire to qvl hooks) ─────────────────────────────────────

const MOCK_PROPOSALS: Proposal[] = [
  {
    uri: 'at://did:web:local/proposal/1',
    title: 'Community solar panel installation on municipal rooftops',
    community: 'Green District Council',
    communityColor: '#059669',
    signal: 2,
    voteCount: 147,
    intensityCount: 89,
    delegationCount: 34,
    flatAvg: 1.34,
    sqrtNAvg: 1.12,
    correlationAvg: 0.98,
    maxWeightRatio: '0.18',
    effectiveParticipants: '78.4',
    phase: 'open',
    closesAt: '2026-05-12T00:00:00Z',
    yourSignal: 2,
    yourUnits: 4,
    delegateVote: {
      delegateHandle: '@green.rep',
      signal: 2,
      units: 4,
    },
  },
  {
    uri: 'at://did:web:local/proposal/2',
    title: 'Reduce bike lane budget by 40% to fund road repairs',
    community: 'Transport Committee',
    communityColor: '#2563EB',
    signal: -1,
    voteCount: 203,
    intensityCount: 156,
    delegationCount: 67,
    flatAvg: -0.42,
    sqrtNAvg: -0.18,
    correlationAvg: -0.15,
    maxWeightRatio: '0.31',
    effectiveParticipants: '45.2',
    phase: 'closing',
    closesAt: '2026-05-07T00:00:00Z',
    yourSignal: -2,
    yourUnits: 9,
    delegateVote: {
      delegateHandle: '@transit.watch',
      signal: -1,
      units: 4,
    },
  },
  {
    uri: 'at://did:web:local/proposal/3',
    title: 'Establish a participatory budgeting process for neighborhood parks',
    community: 'Parks & Recreation',
    communityColor: '#7C3AED',
    signal: 1,
    voteCount: 89,
    intensityCount: 45,
    delegationCount: 12,
    flatAvg: 0.87,
    sqrtNAvg: 0.64,
    correlationAvg: 0.58,
    maxWeightRatio: '0.22',
    effectiveParticipants: '62.1',
    phase: 'open',
    closesAt: '2026-05-15T00:00:00Z',
  },
]

const MOCK_DELIBERATIONS: DeliberationStatement[] = [
  {
    uri: 'at://did:web:local/delib/1',
    body: 'Solar panels reduce long-term energy costs and create local green jobs.',
    stance: 'for',
    agreeCount: 89,
    disagreeCount: 12,
    passCount: 8,
    yourVote: 'agree',
  },
  {
    uri: 'at://did:web:local/delib/2',
    body: 'The upfront capital requirement could strain the municipal budget for 3 years.',
    stance: 'against',
    agreeCount: 34,
    disagreeCount: 67,
    passCount: 15,
    yourVote: 'agree',
  },
  {
    uri: 'at://did:web:local/delib/3',
    body: 'Maintenance contracts should be awarded locally, not to national chains.',
    stance: 'for',
    agreeCount: 112,
    disagreeCount: 4,
    passCount: 3,
  },
  {
    uri: 'at://did:web:local/delib/4',
    body: 'There is insufficient data on roof load capacity for older buildings.',
    stance: 'neutral',
    agreeCount: 45,
    disagreeCount: 23,
    passCount: 31,
    yourVote: 'pass',
  },
  {
    uri: 'at://did:web:local/delib/5',
    body: 'Neighboring districts have seen 20% energy savings after similar installations.',
    stance: 'for',
    agreeCount: 156,
    disagreeCount: 8,
    passCount: 2,
    yourVote: 'agree',
  },
]

const MOCK_DELEGATIONS: Delegation[] = [
  {
    uri: 'at://did:web:local/deleg/1',
    delegate: '@green.rep',
    delegateRole: 'representative',
    scope: 'Green District Council',
    scopeMode: 'community',
    active: true,
  },
  {
    uri: 'at://did:web:local/deleg/2',
    delegate: '@transit.watch',
    delegateRole: 'representative',
    scope: 'All communities',
    scopeMode: 'all',
    active: true,
  },
  {
    uri: 'at://did:web:local/deleg/3',
    delegate: '@old.delegate',
    delegateRole: 'representative',
    scope: 'Parks & Recreation',
    scopeMode: 'community',
    active: false,
  },
]

const MOCK_AUDIT: AuditEntry[] = [
  {
    uri: 'at://did:web:local/audit/1',
    actor: '@green.rep',
    action: 'delegated vote +2 (4 units)',
    timestamp: '2026-05-05T14:32:00Z',
  },
  {
    uri: 'at://did:web:local/audit/2',
    actor: '@you',
    action: 'direct vote +2 (4 units)',
    timestamp: '2026-05-04T09:15:00Z',
  },
  {
    uri: 'at://did:web:local/audit/3',
    actor: '@neighbor.anna',
    action: 'direct vote +1 (2 units)',
    timestamp: '2026-05-03T18:45:00Z',
  },
  {
    uri: 'at://did:web:local/audit/4',
    actor: '@local.biz',
    action: 'direct vote -1 (1 unit)',
    timestamp: '2026-05-02T11:20:00Z',
  },
  {
    uri: 'at://did:web:local/audit/5',
    actor: '@civic.league',
    action: 'delegated vote +3 (9 units)',
    timestamp: '2026-05-01T08:00:00Z',
  },
]

// Vote distribution histogram mock data
const MOCK_VOTE_DISTRIBUTION: Record<number, number> = {
  [-3]: 12,
  [-2]: 18,
  [-1]: 34,
  [0]: 8,
  [1]: 45,
  [2]: 67,
  [3]: 23,
}

function findProposalByUri(uri: string): Proposal | undefined {
  return MOCK_PROPOSALS.find(p => p.uri === uri)
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function StanceBadge({stance}: {stance: 'for' | 'against' | 'neutral'}) {
  const t = useTheme()
  const {_} = useLingui()

  const config = useMemo(() => {
    switch (stance) {
      case 'for':
        return {
          bg: t.palette.positive_500 + '26',
          color: t.palette.positive_500,
          label: _(msg`For`),
        }
      case 'against':
        return {
          bg: t.palette.negative_500 + '26',
          color: t.palette.negative_500,
          label: _(msg`Against`),
        }
      case 'neutral':
        return {
          bg: t.atoms.bg_contrast_100.backgroundColor,
          color: t.atoms.text_contrast_medium.color,
          label: _(msg`Neutral`),
        }
    }
  }, [stance, t, _])

  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.justify_center,
        a.rounded_full,
        {
          height: 20,
          paddingHorizontal: 8,
          backgroundColor: config.bg,
        },
      ]}>
      <Text
        style={[
          a.font_semi_bold,
          {
            fontSize: 10,
            lineHeight: 20,
            letterSpacing: 0.5,
            color: config.color,
          },
        ]}>
        {config.label}
      </Text>
    </View>
  )
}

function StatementCard({
  statement,
  onVote,
}: {
  statement: DeliberationStatement
  onVote: (uri: string, vote: 'agree' | 'disagree' | 'pass') => void
}) {
  const t = useTheme()
  const total =
    statement.agreeCount + statement.disagreeCount + statement.passCount
  const agreePct = total > 0 ? (statement.agreeCount / total) * 100 : 0
  const disagreePct = total > 0 ? (statement.disagreeCount / total) * 100 : 0

  return (
    <View
      style={[
        a.rounded_md,
        a.border,
        a.p_md,
        a.gap_sm,
        t.atoms.bg,
        t.atoms.border_contrast_low,
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_sm]}>
        <StanceBadge stance={statement.stance} />
      </View>

      <Text style={[a.text_sm, a.leading_snug, t.atoms.text]}>
        {statement.body}
      </Text>

      {/* Vote bar */}
      <View style={[a.flex_row, a.gap_xs, a.mt_xs]}>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>Agree</Trans> {statement.agreeCount}
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>|</Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>Disagree</Trans> {statement.disagreeCount}
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>|</Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>Pass</Trans> {statement.passCount}
        </Text>
      </View>

      {/* Sentiment bar */}
      <View
        style={[
          a.w_full,
          a.rounded_full,
          a.overflow_hidden,
          {
            height: 4,
            flexDirection: 'row',
          },
        ]}>
        <View
          style={[
            a.h_full,
            {
              width: `${agreePct}%`,
              backgroundColor: t.palette.positive_500,
            },
          ]}
        />
        <View
          style={[
            a.h_full,
            {
              width: `${disagreePct}%`,
              backgroundColor: t.palette.negative_500,
            },
          ]}
        />
      </View>

      {/* Vote pills */}
      <View style={[a.flex_row, a.gap_sm, a.mt_xs]}>
        {(['agree', 'disagree', 'pass'] as const).map(vote => {
          const isActive = statement.yourVote === vote
          const colors = {
            agree: {
              bg: t.palette.positive_500,
              text: '#fff',
            },
            disagree: {
              bg: t.palette.negative_500,
              text: '#fff',
            },
            pass: {
              bg: t.atoms.bg_contrast_100.backgroundColor,
              text: t.atoms.text_contrast_medium.color,
            },
          }
          return (
            <Pressable accessibilityRole="button"
              key={vote}
              onPress={() => onVote(statement.uri, vote)}
              style={[
                a.flex_1,
                a.align_center,
                a.justify_center,
                a.rounded_md,
                {
                  paddingVertical: 6,
                  backgroundColor: isActive
                    ? colors[vote].bg
                    : t.atoms.bg_contrast_100.backgroundColor,
                },
              ]}>
              <Text
                style={[
                  a.font_medium,
                  a.text_xs,
                  {
                    color: isActive
                      ? colors[vote].text
                      : t.atoms.text_contrast_medium.color,
                  },
                ]}>
                {vote === 'agree' && <Trans>Agree</Trans>}
                {vote === 'disagree' && <Trans>Disagree</Trans>}
                {vote === 'pass' && <Trans>Pass</Trans>}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function DelegationCard({
  delegation,
  onRevoke,
}: {
  delegation: Delegation
  onRevoke: (uri: string) => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  return (
    <View
      style={[
        a.rounded_md,
        a.border,
        a.p_md,
        a.gap_xs,
        t.atoms.bg,
        t.atoms.border_contrast_low,
      ]}>
      <View style={[a.flex_row, a.align_center, a.justify_between]}>
        <Text style={[a.font_semi_bold, a.text_sm, t.atoms.text]}>
          {delegation.delegate}
        </Text>
        <View
          style={[
            a.rounded_full,
            a.px_sm,
            a.py_xs,
            {
              backgroundColor: delegation.active
                ? t.palette.positive_500 + '26'
                : t.palette.negative_500 + '26',
            },
          ]}>
          <Text
            style={[
              a.font_semi_bold,
              {
                fontSize: 10,
                color: delegation.active
                  ? t.palette.positive_500
                  : t.palette.negative_500,
              },
            ]}>
            {delegation.active ? _(msg`Active`) : _(msg`Revoked`)}
          </Text>
        </View>
      </View>

      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
        {delegation.delegateRole}
      </Text>

      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
        {delegation.scope}
      </Text>

      {delegation.active && (
        <View style={[a.mt_xs]}>
          <Button
            variant="outline"
            color="secondary"
            size="small"
            label={_(msg`Revoke delegation`)}
            onPress={() => onRevoke(delegation.uri)}>
            <ButtonText>
              <Trans>Revoke delegation</Trans>
            </ButtonText>
          </Button>
        </View>
      )}
    </View>
  )
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  const t = useTheme()

  return (
    <View
      style={[
        a.flex_1,
        a.rounded_md,
        a.p_md,
        a.align_center,
        a.gap_xs,
        {
          backgroundColor: t.atoms.bg_contrast_100.backgroundColor,
          minWidth: 120,
        },
      ]}>
      <Text style={[a.font_bold, a.text_lg, {color}]}>{value}</Text>
      <Text
        style={[
          a.text_xs,
          a.text_center,
          t.atoms.text_contrast_medium,
          {
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          },
        ]}>
        {label}
      </Text>
    </View>
  )
}

function VoteDistributionHistogram({
  distribution,
}: {
  distribution: Record<number, number>
}) {
  const t = useTheme()
  const maxCount = Math.max(...Object.values(distribution), 1)
  const signals = [-3, -2, -1, 0, 1, 2, 3]

  return (
    <View style={[a.gap_sm]}>
      <Text style={[a.font_medium, a.text_sm, t.atoms.text]}>
        <Trans>Vote Distribution</Trans>
      </Text>
      <View style={[a.flex_row, a.align_end, a.justify_between, {height: 100}]}>
        {signals.map(signal => {
          const count = distribution[signal] ?? 0
          const heightPct = (count / maxCount) * 100
          const color =
            signal > 0
              ? t.palette.positive_500
              : signal < 0
                ? t.palette.negative_500
                : t.palette.yellow

          return (
            <View key={signal} style={[a.align_center, a.gap_xs, {flex: 1}]}>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {count}
              </Text>
              <View
                style={[
                  a.rounded_md,
                  {
                    width: 24,
                    height: `${heightPct}%`,
                    backgroundColor: color,
                    minHeight: 2,
                  },
                ]}
              />
              <Text style={[a.text_xs, a.font_medium, t.atoms.text]}>
                {signal > 0 ? `+${signal}` : signal}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function AuditAccordion({proposal}: {proposal: Proposal}) {
  const t = useTheme()
  const {_} = useLingui()
  const [expanded, setExpanded] = useState(false)
  const navigation = useNavigation<NavigationProp>()

  const latestEntries = MOCK_AUDIT.slice(0, 3)

  return (
    <View
      style={[
        a.rounded_md,
        a.border,
        a.mt_xl,
        t.atoms.bg,
        t.atoms.border_contrast_low,
      ]}>
      <Pressable accessibilityRole="button"
        onPress={() => setExpanded(!expanded)}
        style={[a.flex_row, a.align_center, a.justify_between, a.p_md]}>
        <Text style={[a.font_semi_bold, a.text_sm, t.atoms.text]}>
          <Trans>Audit Trail</Trans>
        </Text>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={[a.p_md, a.pt_0, a.gap_sm]}>
          <View style={[a.flex_row, a.gap_lg]}>
            <View style={[a.gap_xs]}>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                <Trans>Votes</Trans>
              </Text>
              <Text style={[a.font_semi_bold, a.text_sm, t.atoms.text]}>
                {proposal.voteCount}
              </Text>
            </View>
            <View style={[a.gap_xs]}>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                <Trans>Intensity</Trans>
              </Text>
              <Text style={[a.font_semi_bold, a.text_sm, t.atoms.text]}>
                {proposal.intensityCount}
              </Text>
            </View>
            <View style={[a.gap_xs]}>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                <Trans>Delegations</Trans>
              </Text>
              <Text style={[a.font_semi_bold, a.text_sm, t.atoms.text]}>
                {proposal.delegationCount}
              </Text>
            </View>
          </View>

          <View style={[a.gap_xs, a.mt_xs]}>
            {latestEntries.map(entry => (
              <View
                key={entry.uri}
                style={[a.flex_row, a.align_center, a.gap_sm]}>
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  {new Date(entry.timestamp).toLocaleDateString()}
                </Text>
                <Text style={[a.text_xs, t.atoms.text]}>{entry.actor}</Text>
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  {entry.action}
                </Text>
              </View>
            ))}
          </View>

          <Button
            variant="ghost"
            color="primary"
            size="small"
            label={_(msg`View full audit trail`)}
            onPress={() => {
              // TODO: wire to audit view navigation
              navigation.navigate('NotFound')
            }}>
            <ButtonText>
              <Trans>View full audit trail</Trans>
            </ButtonText>
          </Button>
        </View>
      )}
    </View>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function ProposalDetailScreen({route}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const [activeTab, setActiveTab] = useState<DetailTab>('vote')
  const [deliberationSort, setDeliberationSort] = useState<
    'consensus' | 'recent'
  >('consensus')

  const proposal = useMemo(() => {
    return findProposalByUri(route.params.proposalUri)
  }, [route.params.proposalUri])

  const hasVoted = proposal?.yourSignal !== undefined
  const creditsSpent = proposal?.yourUnits
    ? proposal.yourUnits * proposal.yourUnits
    : 0

  const activeDelegations = useMemo(
    () => MOCK_DELEGATIONS.filter(d => d.active),
    [],
  )

  const sortedDeliberations = useMemo(() => {
    const sorted = [...MOCK_DELIBERATIONS]
    if (deliberationSort === 'consensus') {
      sorted.sort((a, b) => {
        const aTotal = a.agreeCount + a.disagreeCount + a.passCount
        const bTotal = b.agreeCount + b.disagreeCount + b.passCount
        const aAgreePct = aTotal > 0 ? a.agreeCount / aTotal : 0
        const bAgreePct = bTotal > 0 ? b.agreeCount / bTotal : 0
        return bAgreePct - aAgreePct
      })
    }
    return sorted
  }, [deliberationSort])

  const tabLabel = useCallback(
    (tab: DetailTab): string => {
      switch (tab) {
        case 'vote':
          return _(msg`Vote`)
        case 'deliberate':
          return _(msg`Deliberate`)
        case 'delegate':
          return _(msg`Delegate`)
        case 'tally':
          return _(msg`Tally`)
      }
    },
    [_],
  )

  if (!proposal) {
    return (
      <Layout.Screen>
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Proposal</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <Layout.Content>
          <EmptyState
            icon="📭"
            title={_(msg`Proposal not found`)}
            message={_(
              msg`The proposal you are looking for does not exist or has been removed.`,
            )}
          />
        </Layout.Content>
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen>
      {/* Header */}
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Proposal</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <Layout.Content>
        {/* Top Banner Section */}
        <View
          style={[
            a.p_lg,
            a.gap_md,
            {
              backgroundColor: proposal.communityColor + '1A',
            },
          ]}>
          <CommunityChip
            name={proposal.community}
            color={proposal.communityColor}
          />

          <Text
            style={[
              a.font_bold,
              {
                fontSize: 20,
                lineHeight: 26,
                color: t.atoms.text.color,
              },
            ]}>
            {proposal.title}
          </Text>

          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <PhaseBadge phase={proposal.phase} closesAt={proposal.closesAt} />
          </View>

          <View style={[a.gap_xs]}>
            <View style={[a.flex_row, a.align_center, a.justify_between]}>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                <Trans>Quorum</Trans>: {proposal.voteCount}/200{' '}
                <Trans>votes</Trans>
              </Text>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {Math.round((proposal.voteCount / 200) * 100)}%
              </Text>
            </View>
            <ParticipationBar current={proposal.voteCount} target={200} />
          </View>
        </View>

        {/* Tab Bar */}
        <View style={[a.p_md, a.pb_0]}>
          <SegmentedControl.Root
            label={_(msg`Proposal tabs`)}
            type="tabs"
            value={activeTab}
            onChange={v => setActiveTab(v as DetailTab)}>
            <SegmentedControl.Item value="vote" label={tabLabel('vote')}>
              <SegmentedControl.ItemText>
                {tabLabel('vote')}
              </SegmentedControl.ItemText>
            </SegmentedControl.Item>
            <SegmentedControl.Item
              value="deliberate"
              label={tabLabel('deliberate')}>
              <SegmentedControl.ItemText>
                {tabLabel('deliberate')}
              </SegmentedControl.ItemText>
            </SegmentedControl.Item>
            <SegmentedControl.Item
              value="delegate"
              label={tabLabel('delegate')}>
              <SegmentedControl.ItemText>
                {tabLabel('delegate')}
              </SegmentedControl.ItemText>
            </SegmentedControl.Item>
            <SegmentedControl.Item value="tally" label={tabLabel('tally')}>
              <SegmentedControl.ItemText>
                {tabLabel('tally')}
              </SegmentedControl.ItemText>
            </SegmentedControl.Item>
          </SegmentedControl.Root>
        </View>

        {/* Tab Content */}
        <View style={[a.p_md, a.gap_lg]}>
          {activeTab === 'vote' && (
            <View style={[a.gap_lg]}>
              {/* Your Current Vote */}
              {hasVoted && (
                <View
                  style={[
                    a.align_center,
                    a.gap_md,
                    a.p_lg,
                    a.rounded_md,
                    {
                      backgroundColor: t.atoms.bg_contrast_100.backgroundColor,
                    },
                  ]}>
                  <SignalBadge
                    signal={proposal.yourSignal ?? 0}
                    size="lg"
                    showLabel
                  />
                  <Text style={[a.text_center, a.text_sm, t.atoms.text]}>
                    {_(msg`You voted ${(proposal.yourSignal! > 0 ? '+' : '') + String(proposal.yourSignal)} with ${String(proposal.yourUnits ?? 0)} intensity units`)}
                  </Text>
                  <Text
                    style={[
                      a.text_center,
                      a.text_xs,
                      t.atoms.text_contrast_medium,
                    ]}>
                    {creditsSpent} <Trans>credits spent</Trans>
                  </Text>
                </View>
              )}

              {/* Delegate Preview */}
              {proposal.delegateVote && !hasVoted && (
                <View
                  style={[
                    a.p_lg,
                    a.rounded_md,
                    a.border,
                    {
                      backgroundColor: t.palette.primary_500 + '0D',
                      borderColor: t.palette.primary_500 + '26',
                    },
                  ]}>
                  <View style={[a.flex_row, a.align_center, a.gap_sm, a.mb_sm]}>
                    <Text style={{fontSize: 18}}>🔗</Text>
                    <Text style={[a.font_semi_bold, a.text_sm, t.atoms.text]}>
                      <Trans>Your delegate voted</Trans>
                    </Text>
                  </View>
                  <View style={[a.flex_row, a.align_center, a.gap_md]}>
                    <SignalBadge
                      signal={proposal.delegateVote.signal}
                      size="md"
                      showLabel
                    />
                    <View style={[a.flex_1]}>
                      <Text style={[a.text_sm, t.atoms.text]}>
                        {proposal.delegateVote.delegateHandle}{' '}
                        <Text style={t.atoms.text_contrast_medium}>
                          <Trans>
                            voted {proposal.delegateVote.signal > 0 ? '+' : ''}
                            {proposal.delegateVote.signal} (
                            {proposal.delegateVote.units} units)
                          </Trans>
                        </Text>
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[a.text_xs, a.mt_sm, t.atoms.text_contrast_medium]}>
                    <Trans>
                      Cast the same vote below, or choose your own signal to
                      override.
                    </Trans>
                  </Text>
                </View>
              )}

              {/* Vote Composer */}
              <View
                style={[
                  a.p_lg,
                  a.rounded_md,
                  a.border,
                  t.atoms.bg,
                  t.atoms.border_contrast_low,
                ]}>
                <Text
                  style={[a.font_semi_bold, a.text_sm, a.mb_md, t.atoms.text]}>
                  <Trans>Cast your vote</Trans>
                </Text>
                <VoteComposer
                  initialSignal={proposal.yourSignal ?? 0}
                  initialUnits={proposal.yourUnits ?? 1}
                  onCast={() => {
                    // TODO: wire to qvl hooks
                  }}
                />
              </View>

              {/* Delegation Notice */}
              {activeDelegations.length > 0 && (
                <View
                  style={[
                    a.p_lg,
                    a.rounded_md,
                    a.border,
                    {
                      backgroundColor: t.palette.primary_500 + '0D',
                      borderColor: t.palette.primary_500 + '26',
                    },
                  ]}>
                  <Text style={[a.text_sm, t.atoms.text]}>
                    {_(msg`Your vote is delegated to ${activeDelegations[0].delegate} for ${activeDelegations[0].scope}`)}
                  </Text>
                  <View style={[a.mt_sm]}>
                    <Button
                      variant="ghost"
                      color="primary"
                      size="small"
                      label={_(msg`Revoke delegation`)}
                      onPress={() => {
                        // TODO: wire to qvl hooks
                      }}>
                      <ButtonText>
                        <Trans>Revoke delegation</Trans>
                      </ButtonText>
                    </Button>
                  </View>
                </View>
              )}
            </View>
          )}

          {activeTab === 'deliberate' && (
            <View style={[a.gap_lg]}>
              {/* Header row */}
              <View style={[a.flex_row, a.align_center, a.justify_between]}>
                <Text style={[a.font_semi_bold, a.text_sm, t.atoms.text]}>
                  {MOCK_DELIBERATIONS.length} <Trans>Statements</Trans>
                </Text>
                <View style={[a.flex_row, a.gap_xs]}>
                  <Pressable accessibilityRole="button"
                    onPress={() => setDeliberationSort('consensus')}
                    style={[
                      a.px_sm,
                      a.py_xs,
                      a.rounded_md,
                      {
                        backgroundColor:
                          deliberationSort === 'consensus'
                            ? t.atoms.bg_contrast_100.backgroundColor
                            : 'transparent',
                      },
                    ]}>
                    <Text
                      style={[
                        a.text_xs,
                        deliberationSort === 'consensus'
                          ? t.atoms.text
                          : t.atoms.text_contrast_medium,
                      ]}>
                      <Trans>Consensus</Trans>
                    </Text>
                  </Pressable>
                  <Pressable accessibilityRole="button"
                    onPress={() => setDeliberationSort('recent')}
                    style={[
                      a.px_sm,
                      a.py_xs,
                      a.rounded_md,
                      {
                        backgroundColor:
                          deliberationSort === 'recent'
                            ? t.atoms.bg_contrast_100.backgroundColor
                            : 'transparent',
                      },
                    ]}>
                    <Text
                      style={[
                        a.text_xs,
                        deliberationSort === 'recent'
                          ? t.atoms.text
                          : t.atoms.text_contrast_medium,
                      ]}>
                      <Trans>Recent</Trans>
                    </Text>
                  </Pressable>
                </View>
              </View>

              <Button
                variant="outline"
                color="primary"
                size="small"
                label={_(msg`Add Statement`)}
                onPress={() => {
                  // TODO: wire to qvl hooks
                }}>
                <ButtonText>
                  <Trans>Add Statement</Trans>
                </ButtonText>
              </Button>

              {/* Statements */}
              {sortedDeliberations.map(statement => (
                <StatementCard
                  key={statement.uri}
                  statement={statement}
                  onVote={() => {
                    // TODO: wire to qvl hooks
                  }}
                />
              ))}
            </View>
          )}

          {activeTab === 'delegate' && (
            <View style={[a.gap_lg]}>
              {/* Active Delegations */}
              <Text style={[a.font_semi_bold, a.text_sm, t.atoms.text]}>
                <Trans>Active Delegations</Trans>
              </Text>
              {MOCK_DELEGATIONS.filter(d => d.active).length === 0 ? (
                <EmptyState
                  icon="🤝"
                  title={_(msg`No active delegations`)}
                  message={_(
                    msg`You have not delegated your vote for this proposal.`,
                  )}
                />
              ) : (
                MOCK_DELEGATIONS.filter(d => d.active).map(delegation => (
                  <DelegationCard
                    key={delegation.uri}
                    delegation={delegation}
                    onRevoke={() => {
                      // TODO: wire to qvl hooks
                    }}
                  />
                ))
              )}

              {/* Create Delegation */}
              <View
                style={[
                  a.p_lg,
                  a.rounded_md,
                  a.border,
                  a.gap_md,
                  t.atoms.bg,
                  t.atoms.border_contrast_low,
                ]}>
                <Text style={[a.font_semi_bold, a.text_sm, t.atoms.text]}>
                  <Trans>Create Delegation</Trans>
                </Text>

                <View
                  style={[
                    a.rounded_md,
                    a.border,
                    a.px_md,
                    a.py_sm,
                    t.atoms.bg_contrast_25,
                    t.atoms.border_contrast_low,
                  ]}>
                  <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                    <Trans>Search delegate...</Trans>
                  </Text>
                </View>

                <View
                  style={[
                    a.rounded_md,
                    a.border,
                    a.px_md,
                    a.py_sm,
                    t.atoms.bg_contrast_25,
                    t.atoms.border_contrast_low,
                  ]}>
                  <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                    <Trans>Select scope...</Trans>
                  </Text>
                </View>

                <Button
                  variant="solid"
                  color="primary"
                  size="small"
                  label={_(msg`Delegate`)}
                  onPress={() => {
                    // TODO: wire to qvl hooks
                  }}>
                  <ButtonText>
                    <Trans>Delegate</Trans>
                  </ButtonText>
                </Button>
              </View>
            </View>
          )}

          {activeTab === 'tally' && (
            <View style={[a.gap_lg]}>
              {/* Shadow Tally Chart */}
              <View
                style={[
                  a.p_lg,
                  a.rounded_md,
                  a.border,
                  a.gap_md,
                  t.atoms.bg,
                  t.atoms.border_contrast_low,
                ]}>
                <Text style={[a.font_semi_bold, a.text_sm, t.atoms.text]}>
                  <Trans>Shadow Tally Comparison</Trans>
                </Text>
                <ShadowTallyChart
                  flat={proposal.flatAvg}
                  sqrtN={proposal.sqrtNAvg}
                  correlation={proposal.correlationAvg}
                />
              </View>

              {/* Metrics Grid */}
              <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
                <MetricCard
                  label={_(msg`Max Weight Ratio`)}
                  value={`${Math.round(Number(proposal.maxWeightRatio) * 100)}%`}
                  color={t.palette.yellow}
                />
                <MetricCard
                  label={_(msg`Effective Participants`)}
                  value={proposal.effectiveParticipants}
                  color={t.palette.positive_500}
                />
                <MetricCard
                  label={_(msg`Direct Vote %`)}
                  value={`${Math.round(Number(proposal.maxWeightRatio) * 100)}%`}
                  color={t.palette.primary_500}
                />
                <MetricCard
                  label={_(msg`Revocation Rate`)}
                  value="2.1%"
                  color={t.palette.negative_500}
                />
              </View>

              {/* Vote Distribution */}
              <View
                style={[
                  a.p_lg,
                  a.rounded_md,
                  a.border,
                  t.atoms.bg,
                  t.atoms.border_contrast_low,
                ]}>
                <VoteDistributionHistogram
                  distribution={MOCK_VOTE_DISTRIBUTION}
                />
              </View>

              {/* Shadow Mode Disclaimer */}
              <View
                style={[
                  a.p_md,
                  a.rounded_md,
                  {
                    backgroundColor: t.palette.primary_500 + '0D',
                  },
                ]}>
                <Text
                  style={[
                    a.text_xs,
                    a.text_center,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>
                    Flat tally is binding. √n and Correlation tallies are
                    advisory only.
                  </Trans>
                </Text>
              </View>
            </View>
          )}

          {/* Audit Section (all tabs) */}
          <AuditAccordion proposal={proposal} />
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}
