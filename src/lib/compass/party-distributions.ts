/**
 * Party Compass Distributions
 *
 * Mock data representing where users of each Mexican political party
 * typically fall on the 9-quadrant political compass.
 * Used in CompassScreen's "affiliate" mode to help users find their position.
 */

export type PartyCompassProfile = {
  id: string
  name: string
  color: string
  totalMembers: number
  /** Percentage distribution across 9th quadrant IDs. Values 0–100, need not sum to 100. */
  ninthDistribution: Record<string, number>
  /** Average influence score of party members */
  avgInfluence: number
  /** Typical political descriptors */
  descriptors: string[]
  /** Top communities this party's members participate in */
  topCommunities: string[]
}

export const PARTY_COMPASS_PROFILES: PartyCompassProfile[] = [
  {
    id: 'party-morena',
    name: 'Morena',
    color: '#8B0000',
    totalMembers: 2847,
    ninthDistribution: {
      'auth-left': 22,
      'center-left': 38,
      center: 18,
      'lib-left': 10,
      'auth-center': 6,
      'lib-center': 4,
      'auth-right': 2,
    },
    avgInfluence: 38,
    descriptors: ['Populist left', 'Nationalist', 'Social programs'],
    topCommunities: ['Movimiento Ciudadano', 'Izquierda MX', 'Soberanía'],
  },
  {
    id: 'party-pan',
    name: 'PAN',
    color: '#005EB8',
    totalMembers: 1934,
    ninthDistribution: {
      'auth-right': 28,
      'center-right': 34,
      center: 16,
      'lib-right': 12,
      'auth-center': 6,
      'lib-center': 4,
    },
    avgInfluence: 52,
    descriptors: ['Christian democracy', 'Conservative', 'Pro-business'],
    topCommunities: ['Democracia Cristiana', 'Libertad Económica', 'Valores'],
  },
  {
    id: 'party-pri',
    name: 'PRI',
    color: '#CC0000',
    totalMembers: 1562,
    ninthDistribution: {
      center: 32,
      'center-right': 24,
      'auth-center': 18,
      'center-left': 14,
      'auth-right': 8,
      'lib-center': 4,
    },
    avgInfluence: 61,
    descriptors: ['Institutionalist', 'Centrist', 'Pragmatic'],
    topCommunities: ['Instituciones', 'Gobernanza', 'Centro Político'],
  },
  {
    id: 'party-mc',
    name: 'MC',
    color: '#FF6600',
    totalMembers: 987,
    ninthDistribution: {
      center: 28,
      'lib-center': 22,
      'center-right': 18,
      'center-left': 16,
      'lib-right': 10,
      'lib-left': 6,
    },
    avgInfluence: 45,
    descriptors: ['Liberal', 'Progressive', 'Youth-led'],
    topCommunities: ['Jóvenes Políticos', 'Innovación', 'Futuro MX'],
  },
  {
    id: 'party-pt',
    name: 'PT',
    color: '#D92027',
    totalMembers: 743,
    ninthDistribution: {
      'auth-left': 42,
      'center-left': 30,
      'lib-left': 14,
      'auth-center': 10,
      center: 4,
    },
    avgInfluence: 29,
    descriptors: ['Worker-left', 'Radical', 'Union-aligned'],
    topCommunities: ['Sindicatos', 'Trabajadores', 'Justicia Social'],
  },
  {
    id: 'party-pvem',
    name: 'PVEM',
    color: '#00AA00',
    totalMembers: 521,
    ninthDistribution: {
      'center-left': 26,
      center: 24,
      'lib-left': 18,
      'lib-center': 16,
      'auth-left': 10,
      'center-right': 6,
    },
    avgInfluence: 33,
    descriptors: ['Green', 'Environmental', 'Social liberal'],
    topCommunities: ['Ecologistas', 'Cambio Climático', 'Sustentabilidad'],
  },
  {
    id: 'party-prd',
    name: 'PRD',
    color: '#FFCD00',
    totalMembers: 412,
    ninthDistribution: {
      'center-left': 30,
      'lib-left': 24,
      center: 18,
      'lib-center': 14,
      'auth-left': 10,
      'lib-right': 4,
    },
    avgInfluence: 41,
    descriptors: ['Social democratic', 'Progressive', 'Pluralist'],
    topCommunities: ['Pluralismo', 'Derechos Humanos', 'Socialdemocracia'],
  },
  {
    id: 'party-migala',
    name: 'Migala',
    color: '#6B21A8',
    totalMembers: 369,
    ninthDistribution: {
      'lib-left': 58,
      'center-left': 18,
      'lib-center': 12,
      'auth-left': 6,
      center: 4,
      'center-right': 2,
    },
    avgInfluence: 47,
    descriptors: ['Horizontalist', 'Ecological', 'Anti-capitalist'],
    topCommunities: ['Ciencia Tierra Libertad', 'Micelio', 'Comunes'],
  },
]

export const PARTY_COMPASS_PROFILE_BY_ID = Object.fromEntries(
  PARTY_COMPASS_PROFILES.map(p => [p.id, p]),
) as Record<string, PartyCompassProfile>

/** Get which parties have members in a given 9th quadrant. */
export function getPartiesInNinth(ninthId: string): PartyCompassProfile[] {
  return PARTY_COMPASS_PROFILES.filter(
    p => (p.ninthDistribution[ninthId] || 0) > 5,
  ).sort(
    (a, b) =>
      (b.ninthDistribution[ninthId] || 0) - (a.ninthDistribution[ninthId] || 0),
  )
}

/** Build a human-readable breakdown of parties in a ninth. */
export function formatNinthPartyBreakdown(
  ninthId: string,
): {party: PartyCompassProfile; share: number}[] {
  return PARTY_COMPASS_PROFILES.map(p => ({
    party: p,
    share: p.ninthDistribution[ninthId] || 0,
  }))
    .filter(x => x.share > 0)
    .sort((a, b) => b.share - a.share)
}

/** Get the predominant 9th compass ID for a given party (highest distribution). */
export function getPartyNinthId(partyId: string): string | null {
  const profile = PARTY_COMPASS_PROFILE_BY_ID[partyId]
  if (!profile) return null
  let bestId: string | null = null
  let bestScore = -1
  for (const [ninthId, score] of Object.entries(profile.ninthDistribution)) {
    if (score > bestScore) {
      bestScore = score
      bestId = ninthId
    }
  }
  return bestId
}
