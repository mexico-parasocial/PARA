import {useMemo} from 'react'

import {useAlphaAccessQuery} from '#/state/queries/alpha'

export function useAlphaAccess() {
  const {data, isLoading} = useAlphaAccessQuery()

  return useMemo(
    () => ({
      hasAccess: data?.hasAccess ?? false,
      state: data?.state,
      waitlistPosition: data?.waitlistPosition,
      isLoading,
    }),
    [data?.hasAccess, data?.state, data?.waitlistPosition, isLoading],
  )
}
