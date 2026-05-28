export type PartyFeedProfile = {
  id: string
  partyId: string
  name: string
  shortName: string
  filter: string
  color: string
  accentColor: string
  logo: string
  ninthId: string
  description: string
}

export const PARTY_FEED_PROFILES: PartyFeedProfile[] = [
  {
    id: 'morena',
    partyId: 'party-morena',
    name: 'Morena',
    shortName: 'Morena',
    filter: 'p/Morena',
    color: '#8B0000',
    accentColor: '#C73A3A',
    logo: 'M',
    ninthId: 'center-left',
    description:
      'Popular-left dispatches: social programs, sovereignty, labor, and the daily fight over the fourth transformation.',
  },
  {
    id: 'pan',
    partyId: 'party-pan',
    name: 'PAN',
    shortName: 'PAN',
    filter: 'p/PAN',
    color: '#005EB8',
    accentColor: '#54A6FF',
    logo: 'PAN',
    ninthId: 'center-right',
    description:
      'Civic-right signal: rule of law, institutions, business climate, security, and local government debates.',
  },
  {
    id: 'pri',
    partyId: 'party-pri',
    name: 'PRI',
    shortName: 'PRI',
    filter: 'p/PRI',
    color: '#CC0000',
    accentColor: '#4CAF50',
    logo: 'PRI',
    ninthId: 'center',
    description:
      'Institutional center feed: governors, territorial politics, public works, negotiation, and old-machine realism.',
  },
  {
    id: 'mc',
    partyId: 'party-mc',
    name: 'MC',
    shortName: 'MC',
    filter: 'p/MC',
    color: '#FF6600',
    accentColor: '#FFD166',
    logo: 'MC',
    ninthId: 'lib-center',
    description:
      'Urban-progressive current: federalism, mobility, climate, cities, youth politics, and anti-duopoly positioning.',
  },
  {
    id: 'pt',
    partyId: 'party-pt',
    name: 'PT',
    shortName: 'PT',
    filter: 'p/PT',
    color: '#D92027',
    accentColor: '#F7B32B',
    logo: 'PT',
    ninthId: 'auth-left',
    description:
      'Worker-left channel: labor power, social rights, anti-neoliberal arguments, and coalition pressure from the left.',
  },
  {
    id: 'pvem',
    partyId: 'party-pvem',
    name: 'PVEM',
    shortName: 'PVEM',
    filter: 'p/PVEM',
    color: '#00AA00',
    accentColor: '#9BE564',
    logo: 'V',
    ninthId: 'center-left',
    description:
      'Green-pragmatist watch: ecology, animal welfare, energy, local alliances, and environmental policy receipts.',
  },
  {
    id: 'prd',
    partyId: 'party-prd',
    name: 'PRD',
    shortName: 'PRD',
    filter: 'p/PRD',
    color: '#FFCD00',
    accentColor: '#7A4CC2',
    logo: 'PRD',
    ninthId: 'lib-left',
    description:
      'Pluralist-left archive: democratic reform, rights language, municipal organizing, and social-democratic memory.',
  },
  {
    id: 'migala',
    partyId: 'party-migala',
    name: 'Migala',
    shortName: 'Migala',
    filter: 'p/Migala',
    color: '#6B21A8',
    accentColor: '#F0D35A',
    logo: 'MI',
    ninthId: 'lib-left',
    description:
      'Ciencia, Tierra y Libertad: horizontal, anti-capitalist, ecological, feminist, indigenous, and radically curious.',
  },
]

export const PARTY_FEED_PROFILE_BY_ID = Object.fromEntries(
  PARTY_FEED_PROFILES.map(profile => [profile.id, profile]),
) as Record<string, PartyFeedProfile>

export function getPartyFeedProfile(id: string) {
  return PARTY_FEED_PROFILE_BY_ID[id.toLowerCase()] ?? null
}
