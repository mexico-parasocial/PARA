import {useCallback, useMemo} from 'react'
import {useInfiniteQuery, useQueryClient} from '@tanstack/react-query'

import {fetchProposedQuestions} from '#/lib/services/raq'
import {useAgent} from '#/state/session'
import {truncateAndInvalidate} from './util'

export const PROPOSED_QUESTIONS_QUERY_KEY = ['raq_proposed_questions']

// Adapter type that matches what the UI expects
export interface ProposedQuestionView {
  id: string
  creator: string
  text: string
  targetAxis?: string
  targetCommunity?: string
  upvotes: number
  downvotes: number
  isMainstream: boolean
  viewerHasUpvoted: boolean
  viewerHasDownvoted: boolean
  viewerAnswer: number
  createdAt?: string
}

export function useProposedQuestions(community?: string) {
  const agent = useAgent()
  const queryClient = useQueryClient()
  const did = agent.session?.did ?? ''
  const queryKey = useMemo(
    () => [...PROPOSED_QUESTIONS_QUERY_KEY, did, community],
    [did, community],
  )
  const refresh = useCallback(
    () => truncateAndInvalidate(queryClient, queryKey),
    [queryClient, queryKey],
  )

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page: {cursor?: string}) => page.cursor || undefined,
    queryFn: async ({pageParam}) => {
      const res = await fetchProposedQuestions(
        agent,
        agent.session?.did ?? '',
        {
          community,
          cursor: pageParam,
        },
      )
      // Transform proposal views into the shape the UI expects.
      const views: ProposedQuestionView[] = res.data.map(p => ({
        id: p.uri,
        creator: p.creator,
        text: p.text,
        targetAxis: p.targetAxis || undefined,
        targetCommunity: p.targetCommunity || undefined,
        upvotes: p.upvotes,
        downvotes: p.downvotes,
        isMainstream: false,
        viewerHasUpvoted: p.viewerUpvote,
        viewerHasDownvoted: p.viewerDownvote,
        viewerAnswer: p.viewerAnswer,
        createdAt: p.createdAt,
      }))
      return {questions: views, cursor: res.cursor}
    },
    staleTime: 1000 * 60 * 2,
  })

  return {
    ...query,
    refresh,
    data: query.data?.pages.flatMap(page => page.questions),
  }
}
