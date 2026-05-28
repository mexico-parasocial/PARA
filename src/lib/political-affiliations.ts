export type PoliticalAffiliationType = 'party' | 'ninth' | 'twentyFifth'

export type PoliticalAffiliation = {
  id: string
  type: PoliticalAffiliationType
  name: string
  color: string
}

const PARTY_AFFILIATIONS: PoliticalAffiliation[] = [
  {id: 'party-morena', type: 'party', name: 'Morena', color: '#8B0000'},
  {id: 'party-pan', type: 'party', name: 'PAN', color: '#005EB8'},
  {id: 'party-pri', type: 'party', name: 'PRI', color: '#CC0000'},
  {id: 'party-mc', type: 'party', name: 'MC', color: '#FF6600'},
  {id: 'party-pt', type: 'party', name: 'PT', color: '#D92027'},
  {id: 'party-pvem', type: 'party', name: 'PVEM', color: '#00AA00'},
  {id: 'party-prd', type: 'party', name: 'PRD', color: '#FFCD00'},
  {id: 'party-migala', type: 'party', name: 'Migala', color: '#6B21A8'},
]

const NINTHS_COLORS = {
  'Auth Left': '#F93A3A',
  'Auth Econocenter': '#FF3B30',
  'Auth Right': '#5856D6',
  'Center Left': '#5AC8FA',
  'Center Econocenter': '#FFCC00',
  'Center Right': '#007AFF',
  'Lib Left': '#34C759',
  'Lib Econocenter': '#30B0C7',
  'Lib Right': '#AF52DE',
} as const

export const NINTH_NAME_TO_COMPASS_ID: Record<string, string> = {
  'Auth Left': 'auth-left',
  'Auth Econocenter': 'auth-center',
  'Auth Right': 'auth-right',
  'Center Left': 'center-left',
  'Center Econocenter': 'center',
  'Center Right': 'center-right',
  'Lib Left': 'lib-left',
  'Lib Econocenter': 'lib-center',
  'Lib Right': 'lib-right',
}

export const COMPASS_ID_TO_NINTH_NAME: Record<string, string> =
  Object.fromEntries(
    Object.entries(NINTH_NAME_TO_COMPASS_ID).map(([name, id]) => [id, name]),
  )

const NINTH_AFFILIATIONS: PoliticalAffiliation[] = Object.entries(
  NINTHS_COLORS,
).map(([name, color]) => ({
  id: `ninth-${name.toLowerCase().replace(/\s+/g, '-')}`,
  type: 'ninth',
  name,
  color,
}))

const TWENTY_FIFTH_ROW_LABELS = [
  'Auth',
  'Lean Auth',
  'Center',
  'Lean Lib',
  'Lib',
] as const

const TWENTY_FIFTH_COLUMN_LABELS = [
  'Left',
  'Lean Left',
  'Center',
  'Lean Right',
  'Right',
] as const

const BASE_COLORS = [
  ['#efb9bb', '#cda7d8', '#99d0ea'],
  ['#d8d9be', '#efe7d6', '#bfd7e8'],
  ['#c7e4c2', '#dfe498', '#f6efb3'],
] as const

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (value: number) =>
    Math.round(Math.max(0, Math.min(255, value)))
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function mixColors(left: string, right: string, ratio: number) {
  const start = hexToRgb(left)
  const end = hexToRgb(right)
  return rgbToHex(
    start.r + (end.r - start.r) * ratio,
    start.g + (end.g - start.g) * ratio,
    start.b + (end.b - start.b) * ratio,
  )
}

function getTwentyFifthName(row: number, col: number) {
  const rowLabel = TWENTY_FIFTH_ROW_LABELS[row]
  const colLabel = TWENTY_FIFTH_COLUMN_LABELS[col]

  if (rowLabel === 'Center' && colLabel === 'Center') {
    return 'Center'
  }
  if (rowLabel === 'Center') {
    return colLabel
  }
  if (colLabel === 'Center') {
    return rowLabel
  }
  return `${rowLabel} ${colLabel}`
}

function buildTwentyFifthAffiliations(): PoliticalAffiliation[] {
  const items: PoliticalAffiliation[] = []

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const rowPosition = row / 2
      const colPosition = col / 2
      const rowLow = Math.floor(rowPosition)
      const rowHigh = Math.ceil(rowPosition)
      const colLow = Math.floor(colPosition)
      const colHigh = Math.ceil(colPosition)
      const rowRatio = rowPosition - rowLow
      const colRatio = colPosition - colLow

      const topLeft = BASE_COLORS[rowLow][colLow]
      const topRight = BASE_COLORS[rowLow][colHigh]
      const bottomLeft = BASE_COLORS[rowHigh][colLow]
      const bottomRight = BASE_COLORS[rowHigh][colHigh]
      const topBlend = mixColors(topLeft, topRight, colRatio)
      const bottomBlend = mixColors(bottomLeft, bottomRight, colRatio)

      items.push({
        id: `twenty-fifth-${row}-${col}`,
        type: 'twentyFifth',
        name: getTwentyFifthName(row, col),
        color: mixColors(topBlend, bottomBlend, rowRatio),
      })
    }
  }

  return items
}

const TWENTY_FIFTH_AFFILIATIONS = buildTwentyFifthAffiliations()

export const POLITICAL_AFFILIATION_OPTIONS = {
  party: PARTY_AFFILIATIONS,
  ninth: NINTH_AFFILIATIONS,
  twentyFifth: TWENTY_FIFTH_AFFILIATIONS,
} satisfies Record<PoliticalAffiliationType, PoliticalAffiliation[]>

export const POLITICAL_AFFILIATION_TYPE_LABELS: Record<
  PoliticalAffiliationType,
  string
> = {
  party: 'Party',
  ninth: '9th',
  twentyFifth: '25th',
}

const PREFERRED_PRIMARY_ORDER: PoliticalAffiliationType[] = [
  'party',
  'ninth',
  'twentyFifth',
]

export function inferPoliticalAffiliation(
  value: string,
): PoliticalAffiliation | null {
  const normalized = value.trim().toLowerCase()
  for (const options of Object.values(POLITICAL_AFFILIATION_OPTIONS)) {
    const match = options.find(
      option => option.name.toLowerCase() === normalized,
    )
    if (match) return match
  }
  if (!normalized) return null
  return {
    id: `custom-${normalized.replace(/\s+/g, '-')}`,
    type: 'party',
    name: value.trim(),
    color: '#888888',
  }
}

export function normalizePoliticalAffiliation(
  value: unknown,
): PoliticalAffiliation | null {
  if (typeof value === 'string') {
    return inferPoliticalAffiliation(value)
  }
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<PoliticalAffiliation>
  if (typeof candidate.name !== 'string') {
    return null
  }

  const inferred = inferPoliticalAffiliation(candidate.name)
  if (!inferred) return null
  const type: PoliticalAffiliationType =
    candidate.type === 'party' ||
    candidate.type === 'ninth' ||
    candidate.type === 'twentyFifth'
      ? candidate.type
      : inferred.type

  return {
    ...inferred,
    type,
    color: candidate.color ?? inferred.color,
    id: candidate.id ?? inferred.id,
  }
}

export function upsertPoliticalAffiliation(
  existing: PoliticalAffiliation[],
  next: PoliticalAffiliation,
) {
  const filtered = existing.filter(item => item.type !== next.type)
  return [...filtered, next].sort(
    (a, b) =>
      PREFERRED_PRIMARY_ORDER.indexOf(a.type) -
      PREFERRED_PRIMARY_ORDER.indexOf(b.type),
  )
}

export function normalizePoliticalAffiliations(
  values: unknown[],
): PoliticalAffiliation[] {
  return values.reduce<PoliticalAffiliation[]>((acc, value) => {
    const normalized = normalizePoliticalAffiliation(value)
    if (!normalized) return acc
    return upsertPoliticalAffiliation(acc, normalized)
  }, [])
}

export function getPrimaryPoliticalAffiliation(
  affiliations: PoliticalAffiliation[],
) {
  for (const type of PREFERRED_PRIMARY_ORDER) {
    const match = affiliations.find(item => item.type === type)
    if (match) return match
  }
  return null
}
