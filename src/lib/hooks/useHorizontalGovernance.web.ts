import {useMemo} from 'react'

import {useAnalytics} from '#/analytics'
import {Features} from '#/analytics/features'

export function useHorizontalGovernanceEnabled(): boolean {
  const ax = useAnalytics()
  return useMemo(
    () => ax.features.enabled(Features.HorizontalGovernanceEnable),
    [ax.features],
  )
}
