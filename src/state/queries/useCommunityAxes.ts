import {useQuery} from '@tanstack/react-query'

import {fetchAxisVotes} from '#/lib/services/raq'
import {useAgent} from '#/state/session'

export const COMMUNITY_AXES_QUERY_KEY = ['raq_community_axes']

// Adapter type that matches what the UI expects
export interface CommunityAxisView {
  id: string
  name: string
  description: string
  color: string
  votes: number
  author?: string
  viewerHasVoted: boolean
}

export function useCommunityAxes() {
  const agent = useAgent()

  return useQuery({
    queryKey: COMMUNITY_AXES_QUERY_KEY,
    queryFn: async () => {
      const res = await fetchAxisVotes(agent, agent.assertDid)
      // Transform axis votes into community axis views
      // NOTE: axis names are not stored on-chain; we use axisId as the name
      // for now. A proper axis definition record type should be added later.
      const views: CommunityAxisView[] = res.data.map(vote => ({
        id: vote.axisId,
        name: vote.axisId,
        description: '',
        color: '#3b82f6',
        votes: 1,
        viewerHasVoted: true,
      }))
      return views
    },
    staleTime: 1000 * 60 * 2,
  })
}
