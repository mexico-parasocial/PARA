import {useMemo, useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {useQuery} from '@tanstack/react-query'

import {fromCabildeoRouteParam} from '#/lib/cabildeo-client'
import {getCabildeoPhaseMeta} from '#/lib/cabildeo-display'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
  type PlatformNavigationProp as NavigationProp,
} from '#/lib/routes/types'
import {useCabildeoQuery} from '#/state/queries/cabildeo'
import {useAgent} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as SegmentedControl from '#/components/forms/SegmentedControl'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {ParticipationBar} from './components'
import {fetchLegacyProposal, getProposalKind} from './proposal-detail-data'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'ProposalDetail'>
type DetailTab = 'vote' | 'deliberate' | 'delegate' | 'tally'

function useLegacyProposalQuery(uri: string, enabled: boolean) {
  const agent = useAgent()
  return useQuery({
    queryKey: ['legacy-proposal', uri],
    enabled,
    staleTime: 30_000,
    queryFn: () => fetchLegacyProposal(agent, uri),
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

export function ProposalDetailScreen({route}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const uri = useMemo(() => {
    try {
      return fromCabildeoRouteParam(route.params.proposalUri)
    } catch {
      return ''
    }
  }, [route.params.proposalUri])
  const proposalKind = getProposalKind(uri)
  const isCabildeo = proposalKind === 'cabildeo'
  const isLegacy = proposalKind === 'legacy'
  const cabildeo = useCabildeoQuery(isCabildeo ? uri : undefined)
  const proposal = useLegacyProposalQuery(uri, isLegacy)
  const [activeTab, setActiveTab] = useState<DetailTab>('vote')
  const liveCabildeo = cabildeo.data
  const liveProposal = proposal.data
  const title = liveCabildeo?.title ?? liveProposal?.title
  const description = liveCabildeo?.description ?? liveProposal?.body
  const community = liveCabildeo?.community ?? liveProposal?.community
  const loading = isCabildeo
    ? cabildeo.isPending
    : isLegacy
      ? proposal.isPending
      : false
  const loadError = isCabildeo
    ? cabildeo.isError
    : isLegacy
      ? proposal.isError
      : false
  const refresh = isCabildeo ? cabildeo.refetch : proposal.refetch
  const refreshing = isCabildeo ? cabildeo.isFetching : proposal.isFetching
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
                  {isCabildeo ? community : _(msg`Earlier community proposal`)}
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
              {liveCabildeo ? (
                <>
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
                            <Text
                              style={[a.font_semi_bold, t.atoms.text]}
                              emoji>
                              {option.label}
                            </Text>
                            {option.description ? (
                              <Text
                                style={[
                                  a.text_sm,
                                  t.atoms.text_contrast_medium,
                                ]}
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
                    </View>
                  ) : null}
                  {activeTab === 'deliberate' ? (
                    <View style={a.gap_md}>
                      <SectionTitleText>
                        <Trans>Deliberation</Trans>
                      </SectionTitleText>
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
                    </View>
                  ) : null}
                  {activeTab === 'delegate' ? (
                    <View style={a.gap_md}>
                      <SectionTitleText>
                        <Trans>Delegation</Trans>
                      </SectionTitleText>
                      <>
                        {liveCabildeo.userContext?.hasDelegatedTo ? (
                          <StateCard
                            title={_(msg`You have an active delegation`)}
                            message={liveCabildeo.userContext.hasDelegatedTo}
                          />
                        ) : null}
                        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                          <Trans>
                            Review candidates, scope, and the public record
                            before delegating.
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
                    </View>
                  ) : null}
                  {activeTab === 'tally' ? (
                    <View style={a.gap_md}>
                      <SectionTitleText>
                        <Trans>Tally and audit</Trans>
                      </SectionTitleText>
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
                                  liveCabildeo.options[item.optionIndex]
                                    ?.label ||
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
                    </View>
                  ) : null}
                </>
              ) : (
                <StateCard
                  title={_(msg`This proposal is read-only`)}
                  message={_(
                    msg`Proposals, arguments and decisions now happen in cabildeos. This older record has no voting or discussion.`,
                  )}
                />
              )}
            </>
          )}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}
