import {useMemo} from 'react'

import {useServiceConfigQuery} from '#/state/queries/service-config'

export function useAppConfig() {
  const {data} = useServiceConfigQuery()

  return useMemo(() => {
    return {
      liveNow: {
        allow: [] as string[],
        exceptions: (data?.liveNow ?? []).map(item => ({
          did: item.did,
          allow: item.domains,
        })),
      },
    }
  }, [data?.liveNow])
}
