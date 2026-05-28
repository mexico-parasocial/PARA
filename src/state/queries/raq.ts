import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  type ParaRaqAssessmentRecord,
} from '#/lib/api/para-lexicons'
import {
  fetchAxisVotes,
  fetchCommunityAlignment,
  fetchProposedQuestions,
  fetchUserAlignment,
  publishRaqAssessment,
  submitAxisVote,
  submitProposedQuestion,
} from '#/lib/services/raq'
import {useAgent} from '#/state/session'

// ------------------------------------------------------------------
// Query Keys
// ------------------------------------------------------------------

export const RAQ_USER_ALIGNMENT_QUERY_KEY = (did: string) => [
  'raq',
  'user-alignment',
  did,
]

export const RAQ_COMMUNITY_ALIGNMENT_QUERY_KEY = (community: string) => [
  'raq',
  'community-alignment',
  community,
]

export const RAQ_PROPOSED_QUESTIONS_QUERY_KEY = (did: string) => [
  'raq',
  'proposed-questions',
  did,
]

export const RAQ_AXIS_VOTES_QUERY_KEY = (did: string) => [
  'raq',
  'axis-votes',
  did,
]

// ------------------------------------------------------------------
// Queries
// ------------------------------------------------------------------

export function useUserAlignment(did: string | undefined) {
  const agent = useAgent()

  return useQuery({
    queryKey: RAQ_USER_ALIGNMENT_QUERY_KEY(did || ''),
    queryFn: async () => {
      if (!did) throw new Error('DID required')
      return fetchUserAlignment(agent, did)
    },
    enabled: Boolean(did),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCommunityAlignment(community: string | undefined) {
  const agent = useAgent()

  return useQuery({
    queryKey: RAQ_COMMUNITY_ALIGNMENT_QUERY_KEY(community || ''),
    queryFn: async () => {
      if (!community) throw new Error('Community required')
      return fetchCommunityAlignment(agent, community)
    },
    enabled: Boolean(community),
    staleTime: 1000 * 60 * 5,
  })
}

export function useProposedQuestions(did: string | undefined) {
  const agent = useAgent()

  return useQuery({
    queryKey: RAQ_PROPOSED_QUESTIONS_QUERY_KEY(did || ''),
    queryFn: async () => {
      if (!did) throw new Error('DID required')
      const res = await fetchProposedQuestions(agent, did)
      return res.data
    },
    enabled: Boolean(did),
    staleTime: 1000 * 60 * 2,
  })
}

export function useAxisVotes(did: string | undefined) {
  const agent = useAgent()

  return useQuery({
    queryKey: RAQ_AXIS_VOTES_QUERY_KEY(did || ''),
    queryFn: async () => {
      if (!did) throw new Error('DID required')
      const res = await fetchAxisVotes(agent, did)
      return res.data
    },
    enabled: Boolean(did),
    staleTime: 1000 * 60 * 2,
  })
}

// ------------------------------------------------------------------
// Mutations
// ------------------------------------------------------------------

export function usePublishRaqAssessmentMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (assessment: ParaRaqAssessmentRecord) => {
      await publishRaqAssessment(agent, assessment)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: RAQ_USER_ALIGNMENT_QUERY_KEY(agent.assertDid),
      })
    },
  })
}

export function useSubmitProposedQuestionMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      text,
      targetAxis,
      targetCommunity,
    }: {
      text: string
      targetAxis?: string
      targetCommunity?: string
    }) => {
      await submitProposedQuestion(agent, text, targetAxis, targetCommunity)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: RAQ_PROPOSED_QUESTIONS_QUERY_KEY(agent.assertDid),
      })
    },
  })
}

export function useSubmitAxisVoteMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({axisId, value}: {axisId: string; value: number}) => {
      await submitAxisVote(agent, axisId, value)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: RAQ_AXIS_VOTES_QUERY_KEY(agent.assertDid),
      })
    },
  })
}
