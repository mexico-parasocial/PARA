import {
  PolicyMatterDashboard,
  type PolicyMatterMode,
} from './PolicyMatterDashboard'

type MattersRoute = {
  params?: {mode?: PolicyMatterMode; filter?: string; category?: string}
}

export function MattersDashboard({route}: {route: MattersRoute}) {
  return <PolicyMatterDashboard route={route} forcedMode="Matters" />
}

export {MattersDashboard as MattersScreen}
