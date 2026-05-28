import {useQuery} from '@tanstack/react-query'

import {fetchProposedQuestions} from '#/lib/services/raq'
import {useAgent} from '#/state/session'

export const PROPOSED_QUESTIONS_QUERY_KEY = ['raq_proposed_questions']

// Adapter type that matches what the UI expects
export interface ProposedQuestionView {
  id: string
  text: string
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

  return useQuery({
    queryKey: [...PROPOSED_QUESTIONS_QUERY_KEY, community],
    queryFn: async () => {
      const res = await fetchProposedQuestions(agent, agent.assertDid, {
        community,
      })
      // Transform proposal views into the shape the UI expects.
      const views: ProposedQuestionView[] = res.data.map(p => ({
        id: p.uri,
        text: p.text,
        targetCommunity: p.targetCommunity || undefined,
        upvotes: p.upvotes,
        downvotes: p.downvotes,
        isMainstream: false,
        viewerHasUpvoted: p.viewerUpvote,
        viewerHasDownvoted: p.viewerDownvote,
        viewerAnswer: p.viewerAnswer,
        createdAt: p.createdAt,
      }))
      return views
    },
    staleTime: 1000 * 60 * 2,
  })
}
