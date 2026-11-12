import {TID} from '@atproto/common-web'
import {AtUri} from '@atproto/syntax'
import {useMutation, useQueryClient} from '@tanstack/react-query'

import {
  type CabildeoRecord,
  PARA_CABILDEO_COLLECTION,
  PARA_COMMUNITY_WIKI_PAGE_COLLECTION,
} from '#/lib/api/para-lexicons'
import {cabildeosQueryKey} from '#/state/queries/cabildeo'
import {
  communityWikiPagesQueryKey,
  type CommunityWikiPageView,
} from '#/state/queries/community-activities'
import {useAgent} from '#/state/session'
import {com} from '#/lexicons'

export function useCreateOfficialThreadPollMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      page,
      communityName,
      question,
      answers,
    }: {
      page: CommunityWikiPageView
      communityName: string
      question: string
      answers: string[]
    }) => {
      const did = agent.session?.did
      if (!did) throw new Error('Sign in to add a poll.')
      const {record} = page
      if (
        record.kind !== 'megathread' ||
        !record.pinned ||
        !record.threadUri ||
        record.pollUri
      ) {
        throw new Error('This thread cannot accept a new poll.')
      }
      const {cid: swapCommit} = await agent.pdsClient.call(
        com.atproto.sync.getLatestCommit,
        {did},
      )
      const ownPage = page.authorDid === did
      const pageRkey = ownPage ? new AtUri(page.uri).rkey : TID.nextStr()
      if (ownPage) {
        const current = await agent.pdsClient.call(com.atproto.repo.getRecord, {
          repo: did,
          collection: PARA_COMMUNITY_WIKI_PAGE_COLLECTION,
          rkey: pageRkey,
        })
        if (current.cid !== page.cid) {
          throw new Error('The thread changed. Refresh Agora and try again.')
        }
      }
      const pollRkey = TID.nextStr()
      const pollUri = `at://${did}/${PARA_CABILDEO_COLLECTION}/${pollRkey}`
      const now = new Date().toISOString()
      const poll = {
        author: did,
        createdAt: now,
        title: question,
        description: question,
        community: communityName,
        kind: 'activity',
        phase: 'voting',
        options: answers.map(label => ({label, description: ''})),
        minimumViewTier: 'public',
        minimumParticipationTier: 'signed_in',
        voteVisibility: 'public',
      } satisfies CabildeoRecord
      // The poll and its thread reference are published in the same repo commit.
      await agent.pdsClient.call(com.atproto.repo.applyWrites, {
        repo: did,
        swapCommit,
        writes: [
          {
            $type: 'com.atproto.repo.applyWrites#create',
            collection: PARA_CABILDEO_COLLECTION,
            rkey: pollRkey,
            value: {$type: PARA_CABILDEO_COLLECTION, ...poll},
          },
          {
            $type: ownPage
              ? 'com.atproto.repo.applyWrites#update'
              : 'com.atproto.repo.applyWrites#create',
            collection: PARA_COMMUNITY_WIKI_PAGE_COLLECTION,
            rkey: pageRkey,
            value: {
              ...record,
              $type: PARA_COMMUNITY_WIKI_PAGE_COLLECTION,
              pollUri,
              createdBy: did,
              createdAt: ownPage ? record.createdAt : now,
              updatedAt: now,
            },
          },
        ],
      })
      return pollUri
    },
    onSuccess: (_pollUri, {page}) => {
      void queryClient.invalidateQueries({
        queryKey: communityWikiPagesQueryKey(page.record.communityUri),
      })
      void queryClient.invalidateQueries({queryKey: cabildeosQueryKey})
    },
  })
}
