import {useMutation, useQueryClient} from '@tanstack/react-query'

import {
  submitAxisVote,
  submitOpenQuestion,
  submitProposalAnswer,
  submitProposalVote,
  submitProposedQuestion,
} from '#/lib/services/raq'
import {
  RAQ_AXIS_VOTES_QUERY_KEY,
  RAQ_PROPOSED_QUESTIONS_QUERY_KEY,
} from '#/state/queries/raq'
import {
  OPEN_QUESTIONS_QUERY_KEY,
} from '#/state/queries/useOpenQuestions'
import {useAgent} from '#/state/session'

// ------------------------------------------------------------------
// Open Question (creates a post with #?OpenQuestion tag)
// ------------------------------------------------------------------

export function useSubmitOpenQuestionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return useMutation({
    mutationFn: async (text: string) => {
      await submitOpenQuestion(agent, text)
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: OPEN_QUESTIONS_QUERY_KEY})
    },
  })
}

// ------------------------------------------------------------------
// Proposed Question (creates com.para.raq.proposal record)
// ------------------------------------------------------------------

export function useSubmitProposedQuestionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()

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
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: RAQ_PROPOSED_QUESTIONS_QUERY_KEY(agent.assertDid),
      })
    },
  })
}

// ------------------------------------------------------------------
// Axis Vote (creates com.para.raq.axisVote record)
// ------------------------------------------------------------------

export function useVoteOnCommunityAxisMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return useMutation({
    mutationFn: async ({axisId, value}: {axisId: string; value: number}) => {
      await submitAxisVote(agent, axisId, value)
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: RAQ_AXIS_VOTES_QUERY_KEY(agent.assertDid),
      })
    },
  })
}

// ------------------------------------------------------------------
// Vote on proposed question (com.para.raq.proposalVote record)
// ------------------------------------------------------------------

export function useVoteOnProposedQuestionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return useMutation({
    mutationFn: async ({
      uri,
      direction,
    }: {
      uri: string
      direction: 'up' | 'down'
    }) => {
      const value = direction === 'up' ? 1 : -1
      await submitProposalVote(agent, uri, value)
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['raq_proposed_questions']})
    },
  })
}

// ------------------------------------------------------------------
// Answer a proposed question (com.para.raq.proposalAnswer record)
// ------------------------------------------------------------------

export function useAnswerProposedQuestionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return useMutation({
    mutationFn: async ({uri, value}: {uri: string; value: number}) => {
      await submitProposalAnswer(agent, uri, value)
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: ['raq_proposed_questions']})
    },
  })
}
