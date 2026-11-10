import {useCallback} from 'react'
import {useFocusEffect} from '@react-navigation/native'
import {useQueries, useQuery, useQueryClient} from '@tanstack/react-query'

import {fetchCabildeo} from '#/lib/api/cabildeo'
import {getCivicVoteEligibility} from '#/lib/im8'
import {type CommunityWikiPageView} from '#/state/queries/community-activities'
import {useAgent} from '#/state/session'

export function useOfficialThreadVotingQueue(
  threads: CommunityWikiPageView[],
  enabled: boolean,
  activeMember: boolean,
) {
  const agent = useAgent()
  const client = useQueryClient()
  const did = agent.session?.did
  const active = enabled && activeMember && Boolean(did)
  const identity = useQuery({
    queryKey: ['agora-vote-identity', did],
    enabled: active,
    queryFn: () => getCivicVoteEligibility(did ?? ''),
  })
  const polls = useQueries({
    queries: threads.map(({record}) => ({
      queryKey: ['agora-vote-queue', did, record.pollUri],
      enabled: active && identity.data === true && Boolean(record.pollUri),
      queryFn: () => fetchCabildeo(agent, record.pollUri ?? ''),
      refetchInterval: 30_000,
    })),
  })
  useFocusEffect(
    useCallback(() => {
      if (active) {
        void client.invalidateQueries({queryKey: ['agora-vote-queue', did]})
        void client.invalidateQueries({queryKey: ['agora-vote-identity', did]})
      }
    }, [active, client, did]),
  )
  const now = Date.now()
  const eligible = identity.data === true && active
  const queue = eligible
    ? threads
        .flatMap((thread, index) => {
          const poll = polls[index]?.data
          const deadline = Date.parse(poll?.phaseDeadline ?? '')
          if (
            poll?.phase !== 'voting' ||
            poll.minimumViewTier !== 'public' ||
            poll.minimumParticipationTier !== 'signed_in' ||
            poll.viewerContext?.canCastCabildeoVote !== true ||
            poll.geoRestricted ||
            !(deadline > now) ||
            typeof poll.viewerContext?.currentVoteOption === 'number'
          )
            return []
          return [{thread, deadline}]
        })
        .sort((left, right) => left.deadline - right.deadline)
        .map(({thread}) => thread)
    : []
  return {
    queue,
    checking:
      active &&
      (identity.isFetching ||
        polls.some(poll => poll.isFetching && !poll.data)),
    unknown:
      active &&
      (identity.isError ||
        identity.data === null ||
        polls.some(
          poll =>
            poll.isError ||
            (poll.data?.phase === 'voting' &&
              poll.data.viewerContext?.canCastCabildeoVote === undefined),
        )),
  }
}
