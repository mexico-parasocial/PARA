import {useMemo, useState} from 'react'
import {Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {useQuery} from '@tanstack/react-query'

import {fromCabildeoRouteParam} from '#/lib/cabildeo-client'
import {getCabildeoPhaseMeta} from '#/lib/cabildeo-display'
import {isQvlUnavailable} from '#/lib/qvl-status'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
  type NavigationProp,
} from '#/lib/routes/types'
import {useCabildeoQuery} from '#/state/queries/cabildeo'
import {
  type QvlDeliberation,
  useCastDeliberationVoteMutation,
  useQvlAuditTrailQuery,
  useQvlDelegationsQuery,
  useQvlDeliberationsQuery,
  useQvlTallySimulationQuery,
} from '#/state/queries/qvl'
import {useAgent, useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as SegmentedControl from '#/components/forms/SegmentedControl'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {ParticipationBar, QuadraticTallyPanel} from './components'
import {fetchQvlProposal, getProposalKind} from './proposal-detail-data'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'ProposalDetail'>
type DetailTab = 'vote' | 'deliberate' | 'delegate' | 'tally'

function useQvlProposalQuery(uri: string, enabled: boolean) {
  const agent = useAgent()
  return useQuery({
    queryKey: ['qvl', 'proposal', uri],
    enabled,
    staleTime: 30_000,
    queryFn: () => fetchQvlProposal(agent, uri),
  })
}

function StateCard({
  title,
  message,
  onRetry,
  actionLabel,
  retrying = false,
}: {
  title: string
  message?: string
  onRetry?: () => void
  actionLabel?: string
  retrying?: boolean
}) {
  const t = useTheme()
  const {_} = useLingui()
  return (
    <View
      style={[
        a.p_lg,
        a.rounded_md,
        a.border,
        a.gap_sm,
        t.atoms.bg,
        t.atoms.border_contrast_low,
      ]}>
      <Text style={[a.font_semi_bold, a.text_md, t.atoms.text]}>{title}</Text>
      {message ? (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>{message}</Text>
      ) : null}
      {onRetry ? (
        <Button
          label={actionLabel ?? _(msg`Retry`)}
          onPress={onRetry}
          disabled={retrying}
          size="small"
          color="secondary"
          variant="outline">
          <ButtonText>{actionLabel ?? <Trans>Retry</Trans>}</ButtonText>
        </Button>
      ) : null}
    </View>
  )
}

function SectionTitleText({children}: {children: React.ReactNode}) {
  const t = useTheme()
  return <Text style={[a.font_bold, a.text_lg, t.atoms.text]}>{children}</Text>
}

function StatementCard({
  statement,
  onTakeSide,
  disabled,
}: {
  statement: QvlDeliberation
  onTakeSide: (uri: string, direction: 'agree' | 'disagree' | 'pass') => void
  disabled: boolean
}) {
  const t = useTheme()
  const {_} = useLingui()
  return (
    <View
      style={[
        a.p_md,
        a.rounded_md,
        a.border,
        a.gap_sm,
        t.atoms.bg,
        t.atoms.border_contrast_low,
      ]}>
      <Text style={[a.text_sm, t.atoms.text]} emoji>
        {statement.body}
      </Text>
      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
        {statement.agreeCount} <Trans>agree</Trans> · {statement.disagreeCount}{' '}
        <Trans>disagree</Trans> · {statement.passCount} <Trans>pass</Trans>
      </Text>
      <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
        {(['agree', 'disagree', 'pass'] as const).map(direction => (
          <Button
            key={direction}
            label={
              direction === 'agree'
                ? _(msg`Agree`)
                : direction === 'disagree'
                  ? _(msg`Disagree`)
                  : _(msg`Pass`)
            }
            onPress={() => onTakeSide(statement.uri, direction)}
            disabled={disabled || Boolean(statement.viewerDirection)}
            size="small"
            color={
              statement.viewerDirection === direction ? 'primary' : 'secondary'
            }
            variant="outline">
            <ButtonText>
              {direction === 'agree' ? (
                <Trans>Agree</Trans>
              ) : direction === 'disagree' ? (
                <Trans>Disagree</Trans>
              ) : (
                <Trans>Pass</Trans>
              )}
            </ButtonText>
          </Button>
        ))}
      </View>
      {statement.viewerDirection ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>Your position has been recorded.</Trans>
        </Text>
      ) : null}
    </View>
  )
}

export function ProposalDetailScreen({route}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {currentAccount} = useSession()
  const uri = useMemo(() => {
    try {
      return fromCabildeoRouteParam(route.params.proposalUri)
    } catch {
      return ''
    }
  }, [route.params.proposalUri])
  const proposalKind = getProposalKind(uri)
  const isCabildeo = proposalKind === 'cabildeo'
  const isQvl = proposalKind === 'qvl'
  const cabildeo = useCabildeoQuery(isCabildeo ? uri : undefined)
  const proposal = useQvlProposalQuery(uri, isQvl)
  const deliberations = useQvlDeliberationsQuery(uri, isQvl)
  const tally = useQvlTallySimulationQuery(uri, isQvl)
  const audit = useQvlAuditTrailQuery(uri, isQvl)
  const delegations = useQvlDelegationsQuery({
    delegator: currentAccount?.did,
    enabled: isQvl && Boolean(currentAccount?.did),
  })
  const takeSide = useCastDeliberationVoteMutation()
  const [activeTab, setActiveTab] = useState<DetailTab>('vote')
  const [deliberationSort, setDeliberationSort] = useState<
    'consensus' | 'recent'
  >('consensus')
  const liveCabildeo = cabildeo.data
  const liveProposal = proposal.data
  const title = liveCabildeo?.title ?? liveProposal?.title
  const description = liveCabildeo?.description ?? liveProposal?.body
  const community = liveCabildeo?.community ?? liveProposal?.community
  const loading = isCabildeo
    ? cabildeo.isPending
    : isQvl
      ? proposal.isPending
      : false
  const loadError = isCabildeo
    ? cabildeo.isError
    : isQvl
      ? proposal.isError
      : false
  const refresh = isCabildeo ? cabildeo.refetch : proposal.refetch
  const refreshing = isCabildeo ? cabildeo.isFetching : proposal.isFetching
  const sortedDeliberations = useMemo(() => {
    const items = [...(deliberations.data ?? [])]
    if (deliberationSort === 'consensus') {
      items.sort((left, right) => {
        const leftTotal = left.agreeCount + left.disagreeCount + left.passCount
        const rightTotal =
          right.agreeCount + right.disagreeCount + right.passCount
        const leftRatio = leftTotal ? left.agreeCount / leftTotal : 0
        const rightRatio = rightTotal ? right.agreeCount / rightTotal : 0
        return rightRatio - leftRatio || rightTotal - leftTotal
      })
    } else {
      items.sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )
    }
    return items
  }, [deliberations.data, deliberationSort])
  const activeDelegations = (delegations.data ?? []).filter(item => {
    if (
      item.revokedAt ||
      (item.expiresAt && Date.parse(item.expiresAt) <= Date.now())
    )
      return false
    return (
      (item.scope.mode === 'proposal' && item.scope.proposal === uri) ||
      (item.scope.mode === 'community' && item.scope.community === community)
    )
  })
  const tabLabel = (tab: DetailTab) => {
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
  }

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
        <View style={[a.p_md, a.gap_lg]}>
          {loading ? (
            <View style={[a.py_2xl, a.align_center]}>
              <Loader size="lg" />
            </View>
          ) : loadError ? (
            <StateCard
              title={_(msg`Could not load this proposal`)}
              message={_(msg`Check your connection and try again.`)}
              onRetry={() => void refresh()}
              retrying={refreshing}
            />
          ) : !title ? (
            <StateCard
              title={_(msg`Proposal not found`)}
              message={_(
                msg`This proposal may have been removed or its address is invalid.`,
              )}
            />
          ) : (
            <>
              <View
                style={[
                  a.p_lg,
                  a.rounded_md,
                  a.gap_md,
                  t.atoms.bg_contrast_25,
                ]}>
                <Text
                  style={[
                    a.text_xs,
                    a.font_semi_bold,
                    t.atoms.text_contrast_medium,
                  ]}
                  emoji>
                  {isCabildeo ? community : _(msg`Community proposal`)}
                </Text>
                <Text style={[a.font_bold, a.text_xl, t.atoms.text]} emoji>
                  {title}
                </Text>
                {description ? (
                  <Text style={[a.text_sm, t.atoms.text_contrast_high]} emoji>
                    {description}
                  </Text>
                ) : null}
                {liveCabildeo ? (
                  <>
                    <Text
                      style={[
                        a.text_sm,
                        a.font_semi_bold,
                        {color: getCabildeoPhaseMeta(liveCabildeo.phase).color},
                      ]}>
                      {getCabildeoPhaseMeta(liveCabildeo.phase).label}
                    </Text>
                    <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                      {liveCabildeo.voteTotals.total} <Trans>votes</Trans> ·{' '}
                      {liveCabildeo.positionCounts.total}{' '}
                      <Trans>arguments</Trans>
                      {liveCabildeo.minQuorum
                        ? ` · ${liveCabildeo.minQuorum} ${_(msg`needed for quorum`)}`
                        : ''}
                    </Text>
                    {liveCabildeo.minQuorum ? (
                      <ParticipationBar
                        current={liveCabildeo.voteTotals.total}
                        target={liveCabildeo.minQuorum}
                      />
                    ) : null}
                  </>
                ) : null}
              </View>
              <SegmentedControl.Root
                label={_(msg`Proposal sections`)}
                type="tabs"
                value={activeTab}
                onChange={value => setActiveTab(value)}>
                {(['vote', 'deliberate', 'delegate', 'tally'] as const).map(
                  tab => (
                    <SegmentedControl.Item
                      key={tab}
                      value={tab}
                      label={tabLabel(tab)}>
                      <SegmentedControl.ItemText>
                        {tabLabel(tab)}
                      </SegmentedControl.ItemText>
                    </SegmentedControl.Item>
                  ),
                )}
              </SegmentedControl.Root>
              {activeTab === 'vote' ? (
                <View style={a.gap_md}>
                  <SectionTitleText>
                    <Trans>Voting</Trans>
                  </SectionTitleText>
                  {liveCabildeo ? (
                    <>
                      {typeof liveCabildeo.userContext?.viewerVoteOption ===
                      'number' ? (
                        <StateCard
                          title={_(msg`Your vote is registered`)}
                          message={
                            liveCabildeo.options[
                              liveCabildeo.userContext.viewerVoteOption
                            ]?.label
                          }
                        />
                      ) : null}
                      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                        <Trans>
                          Choose an option and review the voting rules in the
                          civic ballot.
                        </Trans>
                      </Text>
                      {liveCabildeo.options.map((option, index) => (
                        <View
                          key={index}
                          style={[
                            a.p_md,
                            a.rounded_md,
                            a.border,
                            t.atoms.border_contrast_low,
                          ]}>
                          <Text style={[a.font_semi_bold, t.atoms.text]} emoji>
                            {option.label}
                          </Text>
                          {option.description ? (
                            <Text
                              style={[a.text_sm, t.atoms.text_contrast_medium]}
                              emoji>
                              {option.description}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                      <Button
                        label={
                          liveCabildeo.phase === 'voting'
                            ? _(msg`Open civic ballot`)
                            : _(msg`Open civic detail`)
                        }
                        onPress={() =>
                          navigation.navigate('CabildeoDetail', {
                            cabildeoUri: uri,
                          })
                        }
                        size="small"
                        color="primary"
                        variant="solid">
                        <ButtonText>
                          {liveCabildeo.phase === 'voting' ? (
                            <Trans>Open civic ballot</Trans>
                          ) : (
                            <Trans>Open civic detail</Trans>
                          )}
                        </ButtonText>
                      </Button>
                    </>
                  ) : (
                    <StateCard
                      title={_(
                        msg`Secure voting is not available for this proposal`,
                      )}
                      message={_(
                        msg`You can read the proposal and its discussion while secure ballot submission is being developed.`,
                      )}
                    />
                  )}
                </View>
              ) : null}
              {activeTab === 'deliberate' ? (
                <View style={a.gap_md}>
                  <SectionTitleText>
                    <Trans>Deliberation</Trans>
                  </SectionTitleText>
                  {isQvl ? (
                    <>
                      <View style={[a.flex_row, a.gap_sm]}>
                        {(['consensus', 'recent'] as const).map(sort => (
                          <Pressable
                            key={sort}
                            accessibilityRole="button"
                            accessibilityState={{
                              selected: deliberationSort === sort,
                            }}
                            accessibilityLabel={
                              sort === 'consensus'
                                ? _(msg`Sort by agreement`)
                                : _(msg`Sort by recent`)
                            }
                            accessibilityHint={_(
                              msg`Changes the order of statements`,
                            )}
                            onPress={() => setDeliberationSort(sort)}
                            style={[
                              a.px_md,
                              a.py_sm,
                              a.rounded_md,
                              deliberationSort === sort
                                ? t.atoms.bg_contrast_100
                                : t.atoms.bg_contrast_25,
                            ]}>
                            <Text style={t.atoms.text}>
                              {sort === 'consensus' ? (
                                <Trans>Consensus</Trans>
                              ) : (
                                <Trans>Recent</Trans>
                              )}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      {deliberations.isPending ? (
                        <Loader size="lg" />
                      ) : deliberations.isError ? (
                        <StateCard
                          title={_(msg`Could not load statements`)}
                          message={_(msg`Try again to see the discussion.`)}
                          onRetry={() => void deliberations.refetch()}
                          retrying={deliberations.isFetching}
                        />
                      ) : sortedDeliberations.length ? (
                        sortedDeliberations.map(statement => (
                          <StatementCard
                            key={statement.uri}
                            statement={statement}
                            disabled={takeSide.isPending}
                            onTakeSide={(statementUri, direction) =>
                              takeSide.mutate(
                                {deliberation: statementUri, direction},
                                {
                                  onError: () =>
                                    Toast.show(
                                      _(msg`Could not record your position.`),
                                    ),
                                },
                              )
                            }
                          />
                        ))
                      ) : (
                        <StateCard
                          title={_(msg`No statements yet`)}
                          message={_(msg`The discussion has not started.`)}
                        />
                      )}
                    </>
                  ) : (
                    <StateCard
                      title={_(msg`Discussion is in the civic record`)}
                      message={_(
                        msg`Open the civic detail to read arguments and evidence.`,
                      )}
                      actionLabel={_(msg`Open civic detail`)}
                      onRetry={() =>
                        navigation.navigate('CabildeoDetail', {
                          cabildeoUri: uri,
                        })
                      }
                    />
                  )}
                </View>
              ) : null}
              {activeTab === 'delegate' ? (
                <View style={a.gap_md}>
                  <SectionTitleText>
                    <Trans>Delegation</Trans>
                  </SectionTitleText>
                  {liveCabildeo ? (
                    <>
                      {liveCabildeo.userContext?.hasDelegatedTo ? (
                        <StateCard
                          title={_(msg`You have an active delegation`)}
                          message={liveCabildeo.userContext.hasDelegatedTo}
                        />
                      ) : null}
                      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                        <Trans>
                          Review candidates, scope, and the public record before
                          delegating.
                        </Trans>
                      </Text>
                      <Button
                        label={_(msg`Manage civic delegation`)}
                        onPress={() =>
                          navigation.navigate('DelegateVote', {
                            cabildeoUri: uri,
                          })
                        }
                        size="small"
                        color="primary"
                        variant="solid">
                        <ButtonText>
                          <Trans>Manage civic delegation</Trans>
                        </ButtonText>
                      </Button>
                    </>
                  ) : !currentAccount?.did ? (
                    <StateCard
                      title={_(msg`Sign in to see your delegations`)}
                    />
                  ) : delegations.isPending ? (
                    <Loader size="lg" />
                  ) : delegations.isError ? (
                    <StateCard
                      title={_(msg`Could not load delegations`)}
                      onRetry={() => void delegations.refetch()}
                      retrying={delegations.isFetching}
                    />
                  ) : (
                    <>
                      <StateCard
                        title={_(
                          msg`Delegation changes are not available here`,
                        )}
                        message={_(
                          msg`You can review existing delegations, but this proposal does not support the civic delegation flow.`,
                        )}
                      />
                      {activeDelegations.length ? (
                        activeDelegations.map(item => (
                          <View
                            key={item.uri}
                            style={[
                              a.p_md,
                              a.rounded_md,
                              a.border,
                              a.gap_xs,
                              t.atoms.border_contrast_low,
                            ]}>
                            <Text style={[a.font_semi_bold, t.atoms.text]}>
                              {item.delegate}
                            </Text>
                            <Text
                              style={[a.text_xs, t.atoms.text_contrast_medium]}>
                              {item.scope.mode === 'proposal'
                                ? _(msg`Proposal delegation`)
                                : _(msg`Community delegation`)}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <StateCard
                          title={_(msg`No active delegations`)}
                          message={_(
                            msg`No delegation is recorded for your account in this scope.`,
                          )}
                        />
                      )}
                    </>
                  )}
                </View>
              ) : null}
              {activeTab === 'tally' ? (
                <View style={a.gap_md}>
                  <SectionTitleText>
                    <Trans>Tally and audit</Trans>
                  </SectionTitleText>
                  {liveCabildeo ? (
                    <>
                      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                        <Trans>
                          These counts come from the civic proposal record.
                        </Trans>
                      </Text>
                      <Text style={[a.text_sm, t.atoms.text]}>
                        {liveCabildeo.voteTotals.total} <Trans>votes</Trans> ·{' '}
                        {liveCabildeo.voteTotals.delegated}{' '}
                        <Trans>delegated</Trans>
                      </Text>
                      {liveCabildeo.optionSummary.length ? (
                        liveCabildeo.optionSummary.map((item, index) => (
                          <View
                            key={index}
                            style={[
                              a.p_md,
                              a.rounded_md,
                              a.border,
                              t.atoms.border_contrast_low,
                            ]}>
                            <Text style={t.atoms.text} emoji>
                              {item.label ||
                                liveCabildeo.options[item.optionIndex]?.label ||
                                String(index + 1)}
                            </Text>
                            <Text style={t.atoms.text_contrast_medium}>
                              {item.votes} {_(msg`votes`)} · {item.positions}{' '}
                              {_(msg`arguments`)}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <StateCard title={_(msg`No tally available yet`)} />
                      )}
                      <StateCard
                        title={_(
                          msg`Detailed audit is not available for this civic proposal`,
                        )}
                      />
                    </>
                  ) : (
                    <>
                      <QuadraticTallyPanel proposalUri={uri} />
                      {tally.data?.flat.breakdown?.length ? (
                        <View
                          style={[
                            a.p_md,
                            a.rounded_md,
                            a.border,
                            a.gap_sm,
                            t.atoms.border_contrast_low,
                          ]}>
                          <Text style={[a.font_semi_bold, t.atoms.text]}>
                            <Trans>Signal distribution</Trans>
                          </Text>
                          {tally.data.flat.breakdown.map(({signal, count}) => (
                            <Text key={signal} style={t.atoms.text}>
                              {signal > 0 ? `+${signal}` : signal}: {count}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                      {audit.isPending ? (
                        <Loader size="lg" />
                      ) : audit.isError ? (
                        <StateCard
                          title={
                            isQvlUnavailable(audit.error)
                              ? _(msg`Audit is not available yet`)
                              : _(msg`Could not load audit`)
                          }
                          onRetry={
                            isQvlUnavailable(audit.error)
                              ? undefined
                              : () => void audit.refetch()
                          }
                          retrying={audit.isFetching}
                        />
                      ) : audit.data ? (
                        <View
                          style={[
                            a.p_md,
                            a.rounded_md,
                            a.border,
                            a.gap_sm,
                            t.atoms.border_contrast_low,
                          ]}>
                          <Text style={[a.font_semi_bold, t.atoms.text]}>
                            <Trans>Audit summary</Trans>
                          </Text>
                          <Text style={t.atoms.text}>
                            {audit.data.votes.length} <Trans>votes</Trans> ·{' '}
                            {audit.data.intensities.length}{' '}
                            <Trans>intensity records</Trans> ·{' '}
                            {audit.data.delegations.length}{' '}
                            <Trans>delegations</Trans>
                          </Text>
                          {audit.data.tallies.flat.steps.map((step, index) => (
                            <Text
                              key={index}
                              style={[a.text_xs, t.atoms.text_contrast_medium]}>
                              {step.description}: {step.value}
                            </Text>
                          ))}
                        </View>
                      ) : (
                        <StateCard title={_(msg`No audit available yet`)} />
                      )}
                    </>
                  )}
                </View>
              ) : null}
            </>
          )}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}
