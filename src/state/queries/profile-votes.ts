import {useQuery} from '@tanstack/react-query'

import {PARA_CIVIC_VOTE_COLLECTION} from '#/lib/api/para-lexicons'
import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'profile-votes'

export type ProfileVoteItem = {
  id: string
  uri: string
  cid: string
  subject: string
  subjectType?: string
  vote: string
  voteColor: 'positive' | 'negative' | 'warning' | 'neutral'
  date: string
  reason?: string
}

export const profileVotesQueryKey = (did: string) => [RQKEY_ROOT, did]

export function useProfileVotesQuery(did: string) {
  const agent = useAgent()

  return useQuery<ProfileVoteItem[]>({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(did),
    queryKey: profileVotesQueryKey(did),
    queryFn: async () => fetchProfileVotes({agent, did}),
  })
}

async function fetchProfileVotes({
  agent,
  did,
}: {
  agent: ReturnType<typeof useAgent>
  did: string
}): Promise<ProfileVoteItem[]> {
  const res = await agent.api.com.atproto.repo.listRecords({
    repo: did,
    collection: PARA_CIVIC_VOTE_COLLECTION,
    limit: 50,
    reverse: true,
  })

  if (!res.success) {
    throw new Error('Failed to list profile votes')
  }

  return res.data.records.map(record => {
    const value = record.value as Record<string, unknown>
    const subject = String(value?.subject ?? '')
    const signal =
      typeof value?.signal === 'number' ? (value.signal as number) : undefined
    const selectedOption =
      typeof value?.selectedOption === 'number'
        ? (value.selectedOption as number)
        : undefined

    let vote = 'Vote'
    let voteColor: ProfileVoteItem['voteColor'] = 'neutral'

    if (signal !== undefined) {
      if (signal <= -2) {
        vote = 'Strong Oppose'
        voteColor = 'negative'
      } else if (signal === -1) {
        vote = 'Oppose'
        voteColor = 'negative'
      } else if (signal === 0) {
        vote = 'Neutral'
        voteColor = 'warning'
      } else if (signal === 1) {
        vote = 'Support'
        voteColor = 'positive'
      } else {
        vote = 'Strong Support'
        voteColor = 'positive'
      }
    } else if (selectedOption !== undefined) {
      vote = `Option ${selectedOption + 1}`
      voteColor = 'positive'
    }

    return {
      id: record.uri,
      uri: record.uri,
      cid: record.cid,
      subject,
      subjectType: String(value?.subjectType ?? ''),
      vote,
      voteColor,
      date: String(value?.createdAt ?? ''),
      reason: String(value?.reason ?? ''),
    }
  })
}
