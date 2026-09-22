import {type AtUriString} from '@atproto/syntax'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {PARA_OPEN_QUESTION_VOTE_COLLECTION} from '#/lib/api/para-lexicons'
import {getOpenQuestionSearchQuery} from '#/lib/tags'
import {useAgent} from '#/state/session'
import {app, com} from '#/lexicons'

export const OPEN_QUESTIONS_QUERY_KEY = ['open-questions']
export const OPEN_QUESTION_THREAD_QUERY_KEY = ['open-question-thread']

export type OpenQuestionThreadPost = {
  uri: string
  cid: string
  author: string
  text: string
  createdAt: string
  replyRoot?: string
  replyParent?: string
  langs?: string[]
  tags?: string[]
  flairs?: string[]
  postType?: string
}

export type OpenQuestionThreadReply = {
  uri: string
  cid: string
  author: string
  text: string
  createdAt: string
  voteScore: number
  viewerVote?: -1 | 0 | 1
  replies?: OpenQuestionThreadReply[]
}

export type OpenQuestionThread = {
  post: OpenQuestionThreadPost
  replies: OpenQuestionThreadReply[]
}

/**
 * Query hook to fetch Open Question posts from the network
 * Uses the |#?OpenQuestion tag to identify posts
 */
export function useOpenQuestions() {
  const agent = useAgent()

  return useQuery({
    queryKey: OPEN_QUESTIONS_QUERY_KEY,
    queryFn: async () => {
      const searchQuery = getOpenQuestionSearchQuery()

      try {
        const result = await agent.appviewClient.call(
          app.bsky.feed.searchPostsV2,
          {
            query: searchQuery,
            limit: 50,
            sort: 'recent',
          },
        )

        return result.posts || []
      } catch (error) {
        console.warn('Failed to search for Open Questions:', error)
        throw error
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  })
}

export function useOpenQuestionThread(uri: string) {
  const agent = useAgent()

  return useQuery({
    queryKey: [...OPEN_QUESTION_THREAD_QUERY_KEY, uri],
    queryFn: async () => {
      const result = await agent.appviewClient.call(
        com.para.civic.getOpenQuestionThread,
        {uri: uri as AtUriString, depth: 6},
      )
      return result as OpenQuestionThread
    },
    enabled: Boolean(uri),
    staleTime: 1000 * 60,
  })
}

export function useOpenQuestionVoteMutation(questionUri: string) {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      subject,
      value,
    }: {
      subject: string
      value: -1 | 0 | 1
    }) => {
      if (!agent.session) throw new Error('Not logged in')
      // A public reaction: the score is only displayed and ranks nothing, so it
      // asks m8 for no proof, and the PDS refuses one that carries it (OD-7 §5h).
      return agent.pdsClient.call(com.atproto.repo.createRecord, {
        repo: agent.session.did,
        collection: PARA_OPEN_QUESTION_VOTE_COLLECTION,
        record: {
          subject,
          value,
          createdAt: new Date().toISOString(),
        },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...OPEN_QUESTION_THREAD_QUERY_KEY, questionUri],
      })
    },
  })
}
