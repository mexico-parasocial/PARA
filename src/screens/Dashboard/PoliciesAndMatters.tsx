import {
  PolicyMatterDashboard,
  type PolicyMatterMode,
} from './PolicyMatterDashboard'

type PoliciesDashboardRoute = {
  params?: {mode?: PolicyMatterMode; filter?: string; category?: string}
}

export function PoliciesDashboard({route}: {route: PoliciesDashboardRoute}) {
  return <PolicyMatterDashboard route={route} />
}
