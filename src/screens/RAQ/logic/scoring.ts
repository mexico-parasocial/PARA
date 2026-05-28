/**
 * RAQ Scoring Logic
 *
 * Dimensions:
 * 1.  Economy (Axes 1-4)
 * 2.  Governance (Axes 5, 6, 12)
 * 3.  Social/Cultural (Axes 7, 8, 11)
 * 4.  Identity (Axes 9, 10)
 *
 * The scoring engine compares the user's 12-axis vector against fixed
 * "Ideology Archetypes" and selects the one with the smallest Euclidean distance.
 */

export interface AxisResult {
  id: string
  title: string
  score: number // 0-100
  label: string
  labelLow: string
  labelHigh: string
  rawScore: number
}

export function calculateRAQResults(
  answers: Record<string, number>,
  axes: {
    id: string
    title: string
    labelLow: string
    labelHigh: string
    data: {id: string}[]
  }[],
): AxisResult[] {
  return axes.map(axis => {
    let rawScore = 0
    axis.data.forEach(q => {
      rawScore += answers[q.id] || 0
    })
    const maxRaw = axis.data.length * 3
    const span = maxRaw * 2
    const normalizedScore = ((rawScore + maxRaw) / span) * 100
    return {
      id: axis.id,
      title: axis.title,
      score: Math.round(normalizedScore),
      label: normalizedScore > 50 ? axis.labelHigh : axis.labelLow,
      labelLow: axis.labelLow,
      labelHigh: axis.labelHigh,
      rawScore,
    }
  })
}

export interface IdeologyArchetype {
  name: string
  description: string
  vector: number[] // 12 values (0-100)
}

export const IDEOLOGIES: IdeologyArchetype[] = [
  {
    name: 'Socialist Technocrat',
    description:
      'You believe in a highly planned economy with a focus on equality, led by competent institutions and expert-led governance to ensure collective well-being.',
    vector: [85, 90, 80, 95, 70, 40, 50, 80, 80, 75, 85, 20], // 0-100 on each axis
  },
  {
    name: 'Libertarian Municipalist',
    description:
      'You advocate for common ownership and direct democratic control of resources, with a strong emphasis on individual liberty and horizontal power structures.',
    vector: [70, 85, 95, 90, 20, 95, 90, 90, 85, 80, 90, 95],
  },
  {
    name: 'Classical Liberal',
    description:
      'You favor market-driven coordination, private property, and limited state interference, believing that individual initiative and representative democracy best preserve freedom.',
    vector: [15, 20, 10, 20, 30, 40, 85, 40, 70, 60, 40, 50],
  },
  {
    name: 'National Conservative',
    description:
      'You prioritize social order, traditional values, and national sovereignty, favoring stable institutions and a strong sense of shared national heritage.',
    vector: [40, 30, 20, 30, 85, 30, 25, 15, 20, 15, 20, 30],
  },
  {
    name: 'Technocratic Liberal',
    description:
      'You believe in a market economy guided by expert oversight, pragmatism over ideology, and stable institutional governance for incremental progress.',
    vector: [45, 40, 30, 50, 60, 30, 60, 65, 75, 70, 60, 15],
  },
  {
    name: 'Democratic Socialist',
    description:
      'You advocate for significant economic redistribution and public services, achieved through robust democratic participation and a reform-oriented state.',
    vector: [80, 85, 70, 90, 50, 80, 75, 80, 85, 80, 85, 75],
  },
  {
    name: 'Anarcho-Capitalist',
    description:
      'You believe in absolute private property rights and the replacement of all state functions with private, market-based competition and individual sovereignty.',
    vector: [10, 10, 5, 10, 5, 20, 95, 20, 60, 40, 30, 95],
  },
  {
    name: 'Social Democrat',
    description:
      'You favor a strong welfare state and market regulation within a representative democratic framework, balancing economic efficiency with social equity.',
    vector: [60, 70, 40, 80, 50, 60, 70, 70, 80, 75, 70, 50],
  },
  {
    name: 'Green Progressive',
    description:
      'Your focus is on ecological sustainability, social justice, and global solidarity, advocating for decentralized democratic control and deep structural reform.',
    vector: [75, 80, 85, 85, 40, 90, 80, 90, 85, 95, 95, 85],
  },
]

// Colors must match the canonical compass palette — import from compassColors
import {NINTH_NAME_TO_COMPASS_COLOR} from '#/lib/compass/compassColors'
export const NINTHS_COLORS = NINTH_NAME_TO_COMPASS_COLOR

export function calculateCompassXY(userVector: number[]): {
  x: number
  y: number
} {
  // X-Axis (Economic): Left/Market
  // Left: Planning (1), Equality (2), Common (3), Collective (4)
  // Scoring: labelHigh is generally "Left" in these.
  const leftScore =
    (userVector[0] + userVector[1] + userVector[2] + userVector[3]) / 4
  const x = (leftScore - 50) / 50 // -1 (Right/Market) to 1 (Left/Planning)

  // Y-Axis (Authority): Auth/Lib
  // Auth: Strong State (5). Lib: Liberty (7), Egalitarian (8), Popular (12)
  const authScore = userVector[4]
  const libScore = (userVector[6] + userVector[7] + userVector[11]) / 3
  const y = (authScore - libScore) / 100 // approximation

  return {x: -x, y} // Invert X for traditional Right/Positive, Left/Negative
}

export function getNinth(x: number, y: number): string {
  const getPos = (val: number) =>
    val > 0.33 ? 'Auth' : val < -0.33 ? 'Lib' : 'Center'
  const getSide = (val: number) =>
    val > 0.33 ? 'Right' : val < -0.33 ? 'Left' : 'Econocenter'

  const pos = getPos(y)
  const side = getSide(x)

  if (pos === 'Center' && side === 'Econocenter') return 'Center Econocenter'
  return `${pos} ${side}`
}

export function calculateIdeology(userVector: number[]): {
  primary: IdeologyArchetype
  secondary: IdeologyArchetype
} {
  const sorted = IDEOLOGIES.map(ideo => {
    let distance = 0
    for (let i = 0; i < 12; i++) {
      distance += Math.pow(userVector[i] - ideo.vector[i], 2)
    }
    return {...ideo, distance: Math.sqrt(distance)}
  }).sort((a, b) => a.distance - b.distance)

  return {primary: sorted[0], secondary: sorted[1]}
}

export function getAxisLabels(axisId: string, score: number): string {
  // Logic to return descriptive labels based on score ranges (0-20, 21-40, etc.)
  // e.g. "Extreme Planning" vs "Planned" vs "Mixed" vs "Market"
  return score > 80
    ? 'Ultra'
    : score > 60
      ? 'Strong'
      : score > 40
        ? 'Moderate'
        : score > 20
          ? 'Weak'
          : 'Inverse'
}

/**
 * Mexican Political Party Profiles (12-axis vectors)
 *
 * Axes:
 * 1. Economic Coordination (Planning vs Market)
 * 2. Economic Distribution (Equality vs Merit)
 * 3. Property & Commons (Common vs Private)
 * 4. Labor & Welfare (Collective vs Individual)
 * 5. State Authority (Strong vs Limited)
 * 6. Democratic Structure (Direct vs Representative)
 * 7. Civil Liberties (Liberty vs Order)
 * 8. Cultural Order (Egalitarian vs Traditional)
 * 9. National Identity (Civic vs Ethnic)
 * 10. Global Relations (Cosmopolitan vs Nationalist)
 * 11. Progress & Change (Reform vs Conservatism)
 * 12. Power Legitimation (Popular vs Elite)
 */
export interface PartyProfile {
  id: string
  name: string
  fullName: string
  color: string
  vector: number[]
}

export const PARTY_PROFILES: PartyProfile[] = [
  {
    id: 'morena',
    name: 'Morena',
    fullName: 'Movimiento Regeneración Nacional',
    color: '#610200',
    // Left-populist: strong state, welfare, nationalism, anti-elite rhetoric
    vector: [75, 80, 65, 85, 75, 70, 50, 60, 55, 40, 80, 90],
  },
  {
    id: 'pan',
    name: 'PAN',
    fullName: 'Partido Acción Nacional',
    color: '#004990',
    // Center-right: market-friendly, traditional values, pro-business
    vector: [25, 30, 20, 25, 55, 35, 50, 30, 60, 55, 35, 35],
  },
  {
    id: 'pri',
    name: 'PRI',
    fullName: 'Partido Revolucionario Institucional',
    color: '#CE1126',
    // Pragmatic center: historically statist, now centrist-technocratic
    vector: [55, 50, 45, 55, 70, 40, 40, 45, 50, 50, 45, 30],
  },
  {
    id: 'pvem',
    name: 'PVEM',
    fullName: 'Partido Verde Ecologista de México',
    color: '#50B747',
    // Green-pragmatist: environmental focus, politically flexible
    vector: [50, 55, 60, 50, 50, 50, 55, 60, 60, 60, 55, 50],
  },
  {
    id: 'pt',
    name: 'PT',
    fullName: 'Partido del Trabajo',
    color: '#D92027',
    // Socialist-left: strong welfare, worker-focused, anti-neoliberal
    vector: [85, 90, 75, 90, 65, 75, 60, 65, 55, 45, 85, 85],
  },
  {
    id: 'mc',
    name: 'MC',
    fullName: 'Movimiento Ciudadano',
    color: '#FF8300',
    // Center-liberal: pro-market, urban progressive, civil liberties
    vector: [35, 40, 35, 40, 35, 60, 75, 70, 75, 65, 65, 60],
  },
  {
    id: 'migala',
    name: 'Migala',
    fullName: 'Proyecto Migala',
    color: '#6B21A8',
    // Libertarian-left: commons, direct democracy, civil liberties, ecology
    vector: [90, 92, 88, 86, 20, 95, 92, 90, 78, 82, 90, 88],
  },
]

export interface PartyMatch {
  party: PartyProfile
  matchPercent: number
  distance: number
}

export function calculatePartyMatches(userVector: number[]): PartyMatch[] {
  const maxDistance = Math.sqrt(12 * 100 * 100) // theoretical max distance

  return PARTY_PROFILES.map(party => {
    let distance = 0
    for (let i = 0; i < 12; i++) {
      distance += Math.pow(userVector[i] - party.vector[i], 2)
    }
    const euclidean = Math.sqrt(distance)
    const matchPercent = Math.round((1 - euclidean / maxDistance) * 100)
    return {party, matchPercent, distance: euclidean}
  }).sort((a, b) => a.distance - b.distance)
}
