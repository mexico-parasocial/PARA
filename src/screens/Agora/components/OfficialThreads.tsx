import {useEffect, useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {type PlatformNavigationProp} from '#/lib/routes/types'
import {
  type CommunityWikiPageView,
  useCommunityOrganizers,
  useCommunityWikiPagesQuery,
} from '#/state/queries/community-activities'
import {
  type CommunityBoardView,
  useCommunityTreeDirectoryQuery,
} from '#/state/queries/community-boards'
import {useSession} from '#/state/session'
import {usePoliticalAffiliation} from '#/state/shell/political-affiliation'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Pin_Stroke2_Corner0_Rounded as PinIcon} from '#/components/icons/Pin'
import {Loader} from '#/components/Loader'
import {H2, Text} from '#/components/Typography'
import {CommunityPicker} from '#/features/communityCivicTree/components/CommunityPicker'
import {selectMyCommunityBoards} from '../../Communities/myCommunitySelection'
import {OfficialThreadPollDialog} from './OfficialThreadPollDialog'
import {OfficialThreadPollSummary} from './OfficialThreadPollSummary'
import {useOfficialThreadVotingQueue} from './useOfficialThreadVotingQueue'

export function OfficialThreads() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<PlatformNavigationProp>()
  const {currentAccount} = useSession()
  const {affiliations, isLoading: affiliationsLoading} =
    usePoliticalAffiliation()
  const [selection, setSelection] = useState<{did?: string; uri: string}>()
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetching,
    fetchNextPage,
    refetch,
  } = useCommunityTreeDirectoryQuery()

  useEffect(() => {
    if (currentAccount && hasNextPage && !isFetching && !isError) {
      void fetchNextPage()
    }
  }, [currentAccount, hasNextPage, isFetching, isError, fetchNextPage])

  const boards = data?.pages.flatMap(page => page.boards) ?? []
  const myBoards = new Map(
    selectMyCommunityBoards(boards, affiliations).map(board => [
      board.uri,
      board,
    ]),
  )
  for (const board of boards) {
    if (
      board.viewerMembershipState === 'active' ||
      board.creatorDid === currentAccount?.did
    ) {
      myBoards.set(board.uri, board)
    }
  }
  const communities = [...myBoards.values()]
  const community =
    (selection?.did === currentAccount?.did && selection
      ? myBoards.get(selection.uri)
      : undefined) ?? communities[0]

  return (
    <View style={a.gap_md}>
      <View style={a.gap_xs}>
        <H2 style={[a.text_2xl, a.font_bold]}>
          <Trans>Official threads</Trans>
        </H2>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>Discussions pinned by your community’s organizers.</Trans>
        </Text>
      </View>
      {!currentAccount ? (
        <Text style={t.atoms.text_contrast_medium}>
          <Trans>Sign in to see your communities’ official threads.</Trans>
        </Text>
      ) : isError ? (
        <Retry
          message={_(msg`Could not load your communities.`)}
          onPress={() => void (hasNextPage ? fetchNextPage() : refetch())}
        />
      ) : isLoading || affiliationsLoading || hasNextPage ? (
        <Loader />
      ) : community ? (
        <>
          <CommunityPicker
            boards={communities}
            selectedUri={community.uri}
            onSelect={uri => setSelection({did: currentAccount.did, uri})}
          />
          <ThreadList key={community.uri} community={community} />
        </>
      ) : (
        <View style={[a.gap_sm, a.align_start]}>
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>Join a community to see its official threads here.</Trans>
          </Text>
          <Button
            label={_(msg`Explore communities`)}
            size="small"
            color="secondary"
            onPress={() => navigation.navigate('CommunityDirectory')}>
            <ButtonText>
              <Trans>Explore communities</Trans>
            </ButtonText>
          </Button>
        </View>
      )}
    </View>
  )
}

function ThreadList({community}: {community: CommunityBoardView}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const navigation = useNavigation<PlatformNavigationProp>()
  const params = {
    communityUri: community.uri,
    communityName: community.name,
    communityId: community.communityId,
  }
  const {canOrganize} = useCommunityOrganizers(params)
  const pages = useCommunityWikiPagesQuery(params)
  const pollControl = Dialog.useDialogControl()
  const [pollPage, setPollPage] = useState<CommunityWikiPageView>()
  useEffect(() => {
    if (pollPage) pollControl.open()
  }, [pollPage, pollControl])
  const [publishedPolls, setPublishedPolls] = useState<Record<string, string>>(
    {},
  )
  const threads = (pages.data ?? []).flatMap(page => {
    const {record} = page
    if (record.kind !== 'megathread' || !record.pinned || !record.threadUri) {
      return []
    }
    return [page]
  })

  const [needsVote, setNeedsVote] = useState(false)
  const {queue, checking, unknown} = useOfficialThreadVotingQueue(
    threads,
    needsVote,
    community.viewerMembershipState === 'active',
  )
  const visible = needsVote ? queue : threads

  return (
    <View
      style={[
        a.border,
        a.rounded_md,
        a.overflow_hidden,
        t.atoms.border_contrast_low,
      ]}>
      <View
        style={[
          a.flex_row,
          a.align_center,
          a.justify_between,
          a.gap_sm,
          a.p_md,
          t.atoms.bg_contrast_25,
        ]}>
        <Text style={[a.flex_1, a.font_semi_bold]} emoji>
          {community.name}
        </Text>
        {canOrganize ? (
          <Button
            label={_(msg`Pin a discussion`)}
            size="small"
            color="primary_subtle"
            onPress={() =>
              navigation.navigate('CommunityWikiPage', {
                ...params,
                kind: 'megathread',
                officialThread: true,
              })
            }>
            <ButtonText>
              <Trans>Pin a discussion</Trans>
            </ButtonText>
          </Button>
        ) : null}
      </View>
      <View style={[a.flex_row, a.gap_sm, a.p_md]}>
        <Button
          label={_(msg`All threads`)}
          size="small"
          color={needsVote ? 'secondary' : 'primary_subtle'}
          onPress={() => setNeedsVote(false)}>
          <ButtonText>
            <Trans>All threads</Trans>
          </ButtonText>
        </Button>
        <Button
          label={_(msg`Needs your vote`)}
          size="small"
          color={needsVote ? 'primary_subtle' : 'secondary'}
          onPress={() => setNeedsVote(true)}>
          <ButtonText>
            <Trans>Needs your vote</Trans>
          </ButtonText>
        </Button>
      </View>
      {needsVote && unknown ? (
        <Text style={a.p_md}>
          <Trans>Eligibility could not be confirmed for some polls.</Trans>
        </Text>
      ) : null}
      {pages.isLoading || (needsVote && checking && !visible.length) ? (
        <View style={[a.p_lg, a.align_center]}>
          <Loader />
        </View>
      ) : pages.isError ? (
        <View style={a.p_lg}>
          <Retry
            message={_(msg`Could not load official threads.`)}
            onPress={() => void pages.refetch()}
          />
        </View>
      ) : visible.length === 0 ? (
        <Text style={[a.p_lg, t.atoms.text_contrast_medium]}>
          {needsVote ? (
            <Trans>No polls awaiting your vote.</Trans>
          ) : (
            <Trans>No discussions have been pinned here yet.</Trans>
          )}
        </Text>
      ) : (
        visible.map(page => {
          const {uri, record} = page
          const pollUri = record.pollUri ?? publishedPolls[record.slug]
          return (
            <View key={uri} style={[a.border_t, t.atoms.border_contrast_low]}>
              <View style={[a.flex_row, a.align_center]}>
                <Button
                  onPress={() =>
                    navigation.navigate('CommunityWikiPage', {
                      ...params,
                      slug: record.slug,
                      agoraThread: true,
                    })
                  }
                  label={record.title}
                  shape="rectangular"
                  variant="ghost"
                  style={[
                    a.flex_1,
                    a.flex_row,
                    a.align_start,
                    a.gap_md,
                    a.p_md,
                  ]}>
                  <PinIcon size="md" style={t.atoms.text_contrast_medium} />
                  <View style={[a.flex_1, a.gap_xs]}>
                    <Text
                      style={[a.text_md, a.font_semi_bold]}
                      numberOfLines={2}
                      emoji>
                      {record.title}
                    </Text>
                    {record.body.trim() ? (
                      <Text
                        style={t.atoms.text_contrast_medium}
                        numberOfLines={2}
                        emoji>
                        {record.body}
                      </Text>
                    ) : null}
                    <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                      <Trans>Pinned</Trans> ·{' '}
                      {i18n.date(new Date(record.updatedAt), {
                        dateStyle: 'medium',
                      })}
                    </Text>
                  </View>
                </Button>
                {canOrganize || pollUri ? (
                  <View style={[a.pr_md, a.gap_xs]}>
                    {pollUri ? (
                      <Button
                        label={_(msg`Open poll`)}
                        size="tiny"
                        color="primary_subtle"
                        onPress={() =>
                          navigation.navigate('CabildeoDetail', {
                            cabildeoUri: pollUri,
                          })
                        }>
                        <ButtonText>
                          <Trans>Open poll</Trans>
                        </ButtonText>
                      </Button>
                    ) : canOrganize ? (
                      <Button
                        label={_(msg`Add a poll`)}
                        size="tiny"
                        color="primary_subtle"
                        onPress={() => setPollPage(page)}>
                        <ButtonText>
                          <Trans>Add a poll</Trans>
                        </ButtonText>
                      </Button>
                    ) : null}
                    {canOrganize ? (
                      <Button
                        label={_(msg`Manage pin: ${record.title}`)}
                        size="tiny"
                        color="secondary"
                        onPress={() =>
                          navigation.navigate('CommunityWikiPage', {
                            ...params,
                            slug: record.slug,
                          })
                        }>
                        <ButtonText>
                          <Trans>Manage</Trans>
                        </ButtonText>
                      </Button>
                    ) : null}
                  </View>
                ) : null}
              </View>
              {pollUri ? (
                <OfficialThreadPollSummary
                  key={pollUri}
                  uri={pollUri}
                  communityUri={community.uri}
                  slug={record.slug}
                  canOrganize={canOrganize}
                />
              ) : null}
            </View>
          )
        })
      )}
      {canOrganize && pollPage ? (
        <OfficialThreadPollDialog
          key={pollPage.uri}
          control={pollControl}
          page={pollPage}
          communityName={community.name}
          onClose={() => setPollPage(undefined)}
          onPublished={pollUri =>
            setPublishedPolls(previous => ({
              ...previous,
              [pollPage.record.slug]: pollUri,
            }))
          }
        />
      ) : null}
    </View>
  )
}

function Retry({message, onPress}: {message: string; onPress: () => void}) {
  const {_} = useLingui()
  return (
    <View style={[a.gap_sm, a.align_start]}>
      <Text>{message}</Text>
      <Button
        label={_(msg`Retry`)}
        size="small"
        color="secondary"
        onPress={onPress}>
        <ButtonText>
          <Trans>Retry</Trans>
        </ButtonText>
      </Button>
    </View>
  )
}
