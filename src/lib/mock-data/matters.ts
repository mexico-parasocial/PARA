import {type PolicyItem} from './types'

export const FEATURED_MATTERS: PolicyItem[] = [
  {
    id: 'm-feat-1',
    type: 'Matter',
    category: 'Law & Order',
    title: 'Judicial Reform Debate',
    promotedBy: 'Community',
    support: 78,
    color: '#FF2D55',
    verified: true,
  },
  {
    id: 'm-feat-2',
    type: 'Matter',
    category: 'Economy',
    title: 'Minimum Wage Increase Proposal',
    promotedBy: 'Party',
    mentions: 4200,
    color: '#FFD700',
    verified: true,
  },
]

export const COMMUNITY_MATTERS: PolicyItem[] = [
  {
    id: 'm-com-1',
    type: 'Matter',
    category: 'Public Services',
    title: 'Hospital Wait Times Crisis',
    promotedBy: 'Community',
    community: 'Center Left',
    support: 91,
    color: '#5AC8FA',
  },
  {
    id: 'm-com-2',
    type: 'Matter',
    category: 'Transport',
    title: 'Metro Line 12 Safety Concerns',
    promotedBy: 'Community',
    community: 'CDMX',
    support: 85,
    color: '#AF52DE',
    verified: true,
  },
  {
    id: 'm-com-3',
    type: 'Matter',
    category: 'Economy',
    title: 'Informal Economy Regulation',
    promotedBy: 'Community',
    community: 'Lib Left',
    support: 64,
    color: '#34C759',
  },
  {
    id: 'm-com-4',
    type: 'Matter',
    category: 'Law & Order',
    title: 'Forced Disappearances Investigation',
    promotedBy: 'Community',
    community: 'Auth Left',
    support: 88,
    color: '#F93A3A',
    verified: true,
  },
]

export const PARTY_MATTERS: PolicyItem[] = [
  {
    id: 'm-party-1',
    type: 'Matter',
    category: 'Foreign Policy',
    title: 'US-Mexico Border Treaty Renegotiation',
    promotedBy: 'Party',
    party: 'Morena',
    mentions: 6100,
    color: '#610200',
    verified: true,
  },
  {
    id: 'm-party-2',
    type: 'Matter',
    category: 'Welfare',
    title: 'Social Program Auditing Gaps',
    promotedBy: 'Party',
    party: 'PAN',
    mentions: 2800,
    color: '#004990',
  },
  {
    id: 'm-party-3',
    type: 'Matter',
    category: 'Economy',
    title: 'Pemex Financial Restructuring',
    promotedBy: 'Party',
    party: 'MC',
    mentions: 3900,
    color: '#FF8300',
    verified: true,
  },
  {
    id: 'm-party-4',
    type: 'Matter',
    category: 'Tax',
    title: 'Tax Revenue Distribution Reform',
    promotedBy: 'Party',
    party: 'PRI',
    mentions: 1800,
    color: '#CE1126',
  },
]

export const STATE_MATTERS: PolicyItem[] = [
  {
    id: 'm-state-1',
    type: 'Matter',
    category: 'Law & Order',
    title: 'Cartel Violence in Guanajuato',
    promotedBy: 'State',
    state: 'Guanajuato',
    support: 72,
    color: '#FF2D55',
  },
  {
    id: 'm-state-2',
    type: 'Matter',
    category: 'Public Services',
    title: 'Jalisco Drinking Water Contamination',
    promotedBy: 'State',
    state: 'Jalisco',
    support: 80,
    color: '#5856D6',
    verified: true,
  },
  {
    id: 'm-state-3',
    type: 'Matter',
    category: 'Transport',
    title: 'Oaxaca Rural Road Deterioration',
    promotedBy: 'State',
    state: 'Oaxaca',
    support: 67,
    color: '#FF9500',
  },
]

export const RECOMMENDED_MATTERS: PolicyItem[] = [
  {
    id: 'm-rec-1',
    type: 'Matter',
    category: 'Economy',
    title: 'Nearshoring Impact on Local Labor',
    promotedBy: 'Recommended',
    match: 92,
    color: '#5AC8FA',
  },
  {
    id: 'm-rec-2',
    type: 'Matter',
    category: 'Foreign Policy',
    title: 'USMCA Trade Compliance Review',
    promotedBy: 'Recommended',
    match: 85,
    color: '#007AFF',
  },
]

// Consolidate for lookups by ID
const ALL_MATTERS = [
  ...FEATURED_MATTERS,
  ...COMMUNITY_MATTERS,
  ...PARTY_MATTERS,
  ...STATE_MATTERS,
  ...RECOMMENDED_MATTERS,
]

export const MATTERS_BY_ID: Record<string, PolicyItem> = Object.fromEntries(
  ALL_MATTERS.map(m => [m.id, m]),
)
