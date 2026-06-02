import {useMemo} from 'react'

import {useAnalytics} from '#/analytics'
import {Features} from '#/analytics/features'

export function usePajareoEnabled(): boolean {
  const ax = useAnalytics()
  return useMemo(
    () => ax.features.enabled(Features.PajareoEnable),
    [ax.features],
  )
}
