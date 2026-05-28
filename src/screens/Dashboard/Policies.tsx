import {
  PolicyMatterDashboard,
  type PolicyMatterMode,
} from './PolicyMatterDashboard'

type PoliciesRoute = {
  params?: {mode?: PolicyMatterMode; filter?: string; category?: string}
}

export function PoliciesDashboard({route}: {route: PoliciesRoute}) {
  return <PolicyMatterDashboard route={route} forcedMode="Policies" />
}

export {PoliciesDashboard as PoliciesScreen}
