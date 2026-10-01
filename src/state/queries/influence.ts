import {useCallback} from 'react'
import {type AtIdentifierString} from '@atproto/syntax'
import {upsertProfile} from '@bsky/sdk'
import {useFocusEffect} from '@react-navigation/native'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {until} from '#/lib/async/until'
import {useAgent, useSession} from '#/state/session'
import {com} from '#/lexicons'

export const INFLUENCE_QUERY_KEY = ['influence']
export const influenceQueryKey = (did: string, viewer: string) => [
  ...INFLUENCE_QUERY_KEY,
  did,
  viewer,
]

export function useInfluenceQuery(did: string | undefined) {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const query = useQuery({
    queryKey: influenceQueryKey(did ?? '', currentAccount?.did ?? ''),
    enabled: !!did,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: ({signal}) =>
      agent.appviewClient.call(
        com.para.actor.getProfileStats,
        {actor: did! as AtIdentifierString},
        {signal},
      ),
  })
  const {refetch} = query
  useFocusEffect(
    useCallback(() => {
      if (did) void refetch()
    }, [did, refetch]),
  )
  return query
}

export function useInfluenceVisibilityMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (revealInfluence: boolean) => {
      if (!currentAccount) throw new Error('Not signed in')
      await agent.pdsClient.call(upsertProfile, existing => ({
        ...existing,
        revealInfluence,
      }))
      // Wait for AppView to index the preference before refreshing its readers.
      const indexed = await until(
        10,
        500,
        result => result?.influenceVisible === revealInfluence,
        () =>
          agent.appviewClient.call(com.para.actor.getProfileStats, {
            actor: currentAccount.did as AtIdentifierString,
          }),
      )
      return {did: currentAccount.did, revealInfluence, indexed}
    },
    onSuccess: ({did, revealInfluence, indexed}) => {
      queryClient.setQueryData<com.para.actor.getProfileStats.$OutputBody>(
        influenceQueryKey(did, did),
        previous =>
          previous && {...previous, influenceVisible: revealInfluence},
      )
      void queryClient.invalidateQueries({
        queryKey: INFLUENCE_QUERY_KEY,
        refetchType: indexed ? 'active' : 'none',
      })
    },
  })
}
