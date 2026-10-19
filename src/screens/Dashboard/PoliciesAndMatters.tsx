import {PoliciesScreen} from '#/screens/Policies/PoliciesScreen'
import {
  PolicyMatterDashboard,
  type PolicyMatterMode,
} from './PolicyMatterDashboard'

type PoliciesDashboardRoute = {
  params?: {mode?: PolicyMatterMode; filter?: string; category?: string}
}

/** Matters are still debates; policies are voted on from -3 to +3. */
export function PoliciesDashboard({route}: {route: PoliciesDashboardRoute}) {
  if (route.params?.mode === 'Matters') {
    return <PolicyMatterDashboard route={route} forcedMode="Matters" />
  }
  return <PoliciesScreen />
}
