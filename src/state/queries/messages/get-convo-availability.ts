import {useQuery} from '@tanstack/react-query'

import {useAgent} from '#/state/session'
import {STALE} from '..'
import {getAgentDmServiceHeaders} from './utils/dm-service'

const RQKEY_ROOT = 'convo-availability'
export const RQKEY = (did: string) => [RQKEY_ROOT, did]

export function useGetConvoAvailabilityQuery(
  did: string,
  {enabled = true}: {enabled?: boolean} = {},
) {
  const agent = useAgent()

  return useQuery({
    queryKey: RQKEY(did),
    queryFn: async () => {
      const {data} = await agent.chat.bsky.convo.getConvoAvailability(
        {members: [did]},
        {headers: getAgentDmServiceHeaders(agent)},
      )

      return data
    },
    staleTime: STALE.INFINITY,
    enabled,
  })
}
