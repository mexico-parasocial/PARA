import {useState} from 'react'
import {RefreshControl, ScrollView, StyleSheet, View} from 'react-native'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'
import {type RouteProp, useNavigation, useRoute} from '@react-navigation/native'

import {
  type CommonNavigatorParams,
  type PlatformNavigationProp as NavigationProp,
} from '#/lib/routes/types'
import {useCommunityAlignment} from '#/state/queries/raq'
import {
  type ProposedQuestionView,
  useProposedQuestions,
} from '#/state/queries/useProposedQuestions'
import {AddRAQDialog} from '#/screens/RAQ/components/AddRAQDialog'
import {AxisAlignmentCard} from '#/screens/RAQ/components/AxisAlignmentCard'
import {ProposalCard} from '#/screens/RAQ/components/ProposalCard'
import {QueryStatus} from '#/screens/RAQ/components/QueryStatus'
import {axisTitle} from '#/screens/RAQ/raq-utils'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as SegmentedControl from '#/components/forms/SegmentedControl'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

type ProposalSort = 'top' | 'new'

const ALL_AXES = 'all'

function sortProposals(proposals: ProposedQuestionView[], sort: ProposalSort) {
  return [...proposals].sort((x, y) => {
    if (sort === 'top') {
      const diff = y.upvotes - y.downvotes - (x.upvotes - x.downvotes)
      if (diff !== 0) return diff
    }
    return (y.createdAt ?? '').localeCompare(x.createdAt ?? '')
  })
}

export function CommunityRAQScreen() {
  const t = useTheme()
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<RouteProp<CommonNavigatorParams, 'CommunityRAQ'>>()
  const {communityId, communityName} = route.params
  const add = Dialog.useDialogControl()
  const alignment = useCommunityAlignment(communityId)
  const proposals = useProposedQuestions(communityId)
  const [sort, setSort] = useState<ProposalSort>('top')
  const [axisFilter, setAxisFilter] = useState(ALL_AXES)

  const loaded = proposals.data ?? []
  const axisIds = Array.from(
    new Set(loaded.flatMap(p => (p.targetAxis ? [p.targetAxis] : []))),
  )
  // A filter whose proposals were all removed on refresh falls back to all.
  const activeAxis = axisIds.includes(axisFilter) ? axisFilter : ALL_AXES
  const visible = sortProposals(
    activeAxis === ALL_AXES
      ? loaded
      : loaded.filter(p => p.targetAxis === activeAxis),
    sort,
  )
  const participantCount = alignment.data?.participantCount

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>{communityName} RAQ</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Button
          label={l`Add a question`}
          size="small"
          color="primary"
          onPress={() => add.open()}>
          <ButtonText>
            <Trans>Add</Trans>
          </ButtonText>
        </Button>
      </Layout.Header.Outer>
      <Layout.Center style={styles.center}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={alignment.isRefetching || proposals.isRefetching}
              onRefresh={() => {
                void alignment.refetch()
                void proposals.refresh()
              }}
            />
          }>
          <View style={[a.gap_xs]}>
            <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
              <Trans>Community alignment on official axes</Trans>
            </Text>
            {participantCount !== undefined && (
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                {plural(participantCount, {
                  one: '# participant',
                  other: '# participants',
                })}
              </Text>
            )}
          </View>
          <QueryStatus
            loading={alignment.isLoading}
            error={alignment.isError}
            empty={!alignment.data?.axes.length}
            emptyMessageText={
              <Trans>No published community alignment yet</Trans>
            }
            retry={alignment.refetch}
            refreshing={alignment.isRefetching}
          />
          {alignment.data?.axes.map(axis => (
            <AxisAlignmentCard
              key={axis.axisId}
              title={axis.axisTitle}
              score={axis.score}
              label={axis.label}
              labelLow={axis.labelLow}
              labelHigh={axis.labelHigh}
            />
          ))}

          <View style={[a.gap_xs, a.mt_md]}>
            <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
              <Trans>Unofficial appends (proposals)</Trans>
            </Text>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>
                A vote shows support; it does not make a question official.
              </Trans>
            </Text>
          </View>
          {loaded.length > 0 && (
            <SegmentedControl.Root
              type="radio"
              size="small"
              label={l`Sort proposals`}
              value={sort}
              onChange={setSort}>
              <SegmentedControl.Item value="top" label={l`Top`}>
                <SegmentedControl.ItemText>
                  <Trans>Top</Trans>
                </SegmentedControl.ItemText>
              </SegmentedControl.Item>
              <SegmentedControl.Item value="new" label={l`Newest`}>
                <SegmentedControl.ItemText>
                  <Trans>Newest</Trans>
                </SegmentedControl.ItemText>
              </SegmentedControl.Item>
            </SegmentedControl.Root>
          )}
          {axisIds.length > 1 && (
            <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
              {[ALL_AXES, ...axisIds].map(id => (
                <Button
                  key={id}
                  label={id === ALL_AXES ? l`All axes` : axisTitle(id)}
                  size="small"
                  color={id === activeAxis ? 'primary' : 'secondary'}
                  onPress={() => setAxisFilter(id)}>
                  <ButtonText>
                    {id === ALL_AXES ? l`All axes` : axisTitle(id)}
                  </ButtonText>
                </Button>
              ))}
            </View>
          )}
          <QueryStatus
            loading={proposals.isLoading}
            error={proposals.isError}
            empty={!visible.length}
            emptyMessageText={
              loaded.length ? (
                <Trans>No proposed RAQs on this axis yet</Trans>
              ) : (
                <Trans>No proposed RAQs yet</Trans>
              )
            }
            retry={proposals.refresh}
            refreshing={proposals.isRefetching}
          />
          {visible.map(proposal => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
          {proposals.hasNextPage && (
            <Button
              label={l`Load more`}
              size="large"
              color="secondary"
              disabled={proposals.isFetching}
              onPress={() => void proposals.fetchNextPage()}>
              <ButtonText>
                <Trans>Load more</Trans>
              </ButtonText>
            </Button>
          )}
          <Button
            label={l`Browse public open questions`}
            onPress={() => navigation.navigate('OpenQuestionsList')}
            size="large"
            color="secondary">
            <ButtonText>
              <Trans>Browse public open questions</Trans>
            </ButtonText>
          </Button>
        </ScrollView>
      </Layout.Center>
      <AddRAQDialog
        control={add}
        targetCommunity={communityId}
        communityName={communityName}
      />
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  center: {flex: 1},
  container: {flex: 1},
  contentContainer: {padding: 16, paddingBottom: 100, gap: 16},
})
