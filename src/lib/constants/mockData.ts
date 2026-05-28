/**
 * Mock data for PARA application screens
 * Extracted from screen files to improve maintainability and declutter components.
 */

import {
  type CabildeoPositionRecord,
  type CabildeoRecord,
} from '#/lib/api/para-lexicons'
import {districtKeyFor} from '#/lib/constants/electoralDistrictsData'

export type PolicyItem = {
  id: string
  title: string
  vote: 'For' | 'Against'
  communityVote: 'For' | 'Against' | 'Split'
  status: 'Passed' | 'Pending' | 'Rejected'
}

export type CategoryData = {
  title: string
  items: string[]
  policies?: PolicyItem[]
}

export type CommunityData = {
  communityId: string
  communityName: string
  name: string
  members: string
  desc: string
  color: string
  directoryGroup: 'civic' | 'political'
  subtitle?: string
  eyebrow?: string
  region?: string
  accent?: string
}

export type DistrictScopedCabildeoRecord = CabildeoRecord & {
  districtKeys?: string[]
}

export type DistrictRaqRecord = {
  id: string
  title: string
  summary: string
  stateName: string
  districtKeys: string[]
  updatedAt: string
  status: 'Open' | 'Draft'
}

export const VOTED_POLICIES: CategoryData[] = [
  {
    title: 'Public Services',
    items: ['Universal Healthcare', 'Education Reform'],
    policies: [
      {
        id: '1',
        title: 'Universal Healthcare v2',
        vote: 'For',
        communityVote: 'For',
        status: 'Passed',
      },
      {
        id: '2',
        title: 'Education Reform Bill',
        vote: 'For',
        communityVote: 'Against',
        status: 'Pending',
      },
      {
        id: '3',
        title: 'Public Transport Expansion',
        vote: 'Against',
        communityVote: 'Against',
        status: 'Rejected',
      },
    ],
  },
  {
    title: 'Security',
    items: ['Police Funding', 'Cybersecurity Act'],
    policies: [
      {
        id: '4',
        title: 'Police Funding Increase',
        vote: 'Against',
        communityVote: 'For',
        status: 'Passed',
      },
      {
        id: '5',
        title: 'Cybersecurity Act',
        vote: 'For',
        communityVote: 'For',
        status: 'Pending',
      },
    ],
  },
  {
    title: 'Economy',
    items: ['Tax Cuts', 'Small Business Grant'],
    policies: [
      {
        id: '6',
        title: 'Tax Cuts for SMEs',
        vote: 'For',
        communityVote: 'Split',
        status: 'Pending',
      },
    ],
  },
  {
    title: 'Environment',
    items: ['Carbon Tax', 'Plastic Ban'],
    policies: [
      {
        id: '7',
        title: 'Carbon Tax Implementation',
        vote: 'Against',
        communityVote: 'For',
        status: 'Passed',
      },
    ],
  },
]

export const MATTER_CATEGORIES = [
  {
    title: 'Public Services',
    items: ['#Demand for healthcare', '#Water industry', '#Stability'],
  },
  {
    title: 'Finance',
    items: ['#TaxExemptionOnCharity', '#AutomationTax'],
  },
  {
    title: 'Economy',
    items: [
      '#EnergyEfficiency',
      '#IndustrialAutomation',
      '#Telecommunications Industry',
    ],
  },
  {
    title: 'Social Issues',
    items: ['#Private Housing', '#Poverty', '#Equality'],
  },
]

export const COMMUNITY_DATA: CommunityData[] = [
  {
    communityId: 'mx-jalisco',
    communityName: 'p/Jalisco',
    name: 'Jalisco',
    members: '184k',
    desc: 'Agua, coordinación metropolitana y agenda pública estatal.',
    color: '#0F766E',
    directoryGroup: 'civic',
    subtitle: 'Gestión hídrica y coordinación metropolitana',
    eyebrow: 'Civic Territory',
    region: 'Jalisco',
    accent: '#14B8A6',
  },
  {
    communityId: 'mx-cdmx',
    communityName: 'p/CDMX',
    name: 'CDMX',
    members: '263k',
    desc: 'Movilidad, vivienda y gobierno urbano para la capital.',
    color: '#0F172A',
    directoryGroup: 'civic',
    subtitle: 'Movilidad y vida pública de la capital',
    eyebrow: 'Civic Territory',
    region: 'CDMX',
    accent: '#38BDF8',
  },
  {
    communityId: 'mx-oaxaca',
    communityName: 'p/Oaxaca',
    name: 'Oaxaca',
    members: '92k',
    desc: 'Territorio, medio ambiente y coordinación intermunicipal.',
    color: '#9A3412',
    directoryGroup: 'civic',
    subtitle: 'Territorio y gobernanza ambiental',
    eyebrow: 'Civic Territory',
    region: 'Oaxaca',
    accent: '#FB923C',
  },
  {
    communityId: 'mx-nuevoleon',
    communityName: 'p/NuevoLeon',
    name: 'Nuevo León',
    members: '151k',
    desc: 'Vivienda, industria y crecimiento metropolitano del norte.',
    color: '#1D4ED8',
    directoryGroup: 'civic',
    subtitle: 'Vivienda e impulso metropolitano',
    eyebrow: 'Civic Territory',
    region: 'Nuevo León',
    accent: '#60A5FA',
  },
  {
    communityId: 'pan',
    communityName: 'p/PAN',
    name: 'PAN',
    members: '1.2M',
    desc: 'Centro-derecha con red territorial y agenda institucional.',
    color: '#003087',
    directoryGroup: 'political',
    subtitle: 'Democracia cristiana y agenda institucional',
    eyebrow: 'Party',
    accent: '#3B82F6',
  },
  {
    communityId: 'morena',
    communityName: 'p/Morena',
    name: 'Morena',
    members: '2.8M',
    desc: 'Mayoría nacional con conversación soberanista y social.',
    color: '#8B1538',
    directoryGroup: 'political',
    subtitle: 'Movimiento gobernante y soberanía social',
    eyebrow: 'Party',
    accent: '#E11D48',
  },
  {
    communityId: 'mc',
    communityName: 'p/MC',
    name: 'MC',
    members: '456k',
    desc: 'Liberal progresista, ciudadanía y política urbana.',
    color: '#FF6B00',
    directoryGroup: 'political',
    subtitle: 'Ciudadanía, innovación y política urbana',
    eyebrow: 'Party',
    accent: '#FB923C',
  },
  {
    communityId: 'pri',
    communityName: 'p/PRI',
    name: 'PRI',
    members: '890k',
    desc: 'Centro institucional con estructura histórica nacional.',
    color: '#00923F',
    directoryGroup: 'political',
    subtitle: 'Estructura histórica e institucional',
    eyebrow: 'Party',
    accent: '#22C55E',
  },
  {
    communityId: 'pvem',
    communityName: 'p/PVEM',
    name: 'PVEM',
    members: '178k',
    desc: 'Organización ecologista enfocada en agenda ambiental.',
    color: '#228B22',
    directoryGroup: 'political',
    subtitle: 'Agenda verde y sustentabilidad',
    eyebrow: 'Party',
    accent: '#4ADE80',
  },
  {
    communityId: 'libertarios-mx',
    communityName: 'p/Libertarios MX',
    name: 'Libertarios MX',
    members: '89k',
    desc: 'Mercado libre, derechos civiles y liberalismo clásico.',
    color: '#FF9500',
    directoryGroup: 'political',
    subtitle: 'Liberalismo clásico y mercado libre',
    eyebrow: 'Party',
    accent: '#F59E0B',
  },
]

export const VS_MOCK_COMPARISONS = [
  {
    id: 'c1',
    party: 'p/\nIzquierda\nAuth',
    partyColor: '#F5A9B8',
    votes: 123,
    avg: -2.4,
    against: 0.3,
    neutral: 1.2,
    score: -2.4,
    barValue: 0.2,
    approvalRate: 0.75,
    voterRate: 0.45,
    status: 'APPROVE',
    statusColor: '#474652',
    voterStatus: 'VOTER',
    trendApprove: '+5%',
    trendApproveColor: '#34C759',
    trendVoter: '▼-0.15%',
    trendVoterColor: '#FF3B30',
  },
  {
    id: 'c2',
    party: 'p/\nMC',
    partyColor: '#FAD7A0',
    votes: 171,
    avg: -2.4,
    against: 2.0,
    neutral: 1.2,
    score: 0.15,
    barValue: 0.6,
    approvalRate: 0.85,
    voterRate: 0.6,
    status: 'APPROVE',
    statusColor: '#474652',
    voterStatus: 'VOTER',
    trendApprove: '+5%',
    trendApproveColor: '#34C759',
    trendVoter: '-0.15%',
    trendVoterColor: '#FF3B30',
  },
  {
    id: 'c3',
    party: 'p/\nDerecha\nLibertaria',
    partyColor: '#F9E79F',
    votes: 143,
    avg: -2.4,
    against: 0.3,
    neutral: 1.2,
    score: 0.15,
    barValue: 0.4,
    approvalRate: 0.65,
    voterRate: 0.3,
    status: 'APPROVE',
    statusColor: '#474652',
    voterStatus: 'VOTER',
    trendApprove: '+5%',
    trendApproveColor: '#34C759',
    trendVoter: '-0.15%',
    trendVoterColor: '#FF3B30',
  },
  {
    id: 'c4',
    party: 'p/\nDerecha\nAutoritaria',
    partyColor: '#AED6F1',
    votes: 563,
    avg: -2.4,
    against: 0.6,
    neutral: 1.2,
    score: 0.15,
    barValue: 0.7,
    approvalRate: 0.9,
    voterRate: 0.8,
    status: 'APPROVE',
    statusColor: '#474652',
    voterStatus: 'VOTER',
    trendApprove: '+5%',
    trendApproveColor: '#34C759',
    trendVoter: '-0.15%',
  },
]

import {type DiscourseTopology} from '#/lib/api/para-lexicons'

export const MOCK_DISCOURSE_TOPOLOGY: DiscourseTopology = {
  ideologicalCentroid: {x: -120, y: 340},
  ideologicalSpread: 62,
  crossCompassEngagement: 38,
  positionDensity: {
    'auth-left': 12,
    'auth-center': 18,
    'auth-right': 8,
    'center-left': 22,
    'center': 15,
    'center-right': 10,
    'lib-left': 8,
    'lib-center': 4,
    'lib-right': 3,
  },
  contestedAxes: [
    {
      axisId: 'env_pol',
      axisTitle: 'Environmental Policy',
      labelLow: 'Anthropocentric',
      labelHigh: 'Ecocentric',
      discourseScore: 72,
      engagementCount: 156,
    },
    {
      axisId: 'state_auth',
      axisTitle: 'State Authority',
      labelLow: 'Limited',
      labelHigh: 'Strong',
      discourseScore: 58,
      engagementCount: 134,
    },
    {
      axisId: 'eco_coord',
      axisTitle: 'Economic Coordination',
      labelLow: 'Market',
      labelHigh: 'Planning',
      discourseScore: 41,
      engagementCount: 112,
    },
    {
      axisId: 'dem_struc',
      axisTitle: 'Democratic Structure',
      labelLow: 'Representative',
      labelHigh: 'Direct',
      discourseScore: 65,
      engagementCount: 98,
    },
  ],
  argumentBalance: {
    claims: 45,
    evidence: 23,
    questions: 18,
    rebuttals: 14,
  },
  bridgeOpportunities: [
    {
      description:
        'Both center-left and center-right participants are discussing water infrastructure, but not engaging with each other. A shared proposal on desalination pilot programs could bridge this gap.',
      topicOverlap: ['Water', 'Infrastructure', 'Pilot Programs'],
      positionsInvolved: ['center-left', 'center-right'],
    },
    {
      description:
        'Lib-left and auth-center voices both reference the same INE transparency report but draw opposite conclusions. A moderated deliberation thread could surface shared premises.',
      topicOverlap: ['INE', 'Transparency', 'Electoral Reform'],
      positionsInvolved: ['lib-left', 'auth-center'],
    },
  ],
  proposalVelocity: {
    proposed: 3,
    deliberating: 7,
    voting: 2,
    resolved: 4,
  },
}

export const DISCOURSE_FLUX_TAGS = [
  'Fiscal Prudence',
  'Digital Sovereignty',
  'Urban Resilience',
  'Recursive Equity',
  'Heuristic Governance',
]

export const CATEGORIES = [
  'All',
  'Safety',
  'Economy',
  'Health',
  'Edu',
  'Environment',
  'Rights',
  'Infra',
]

// ─── Cabildeo Mock Data ──────────────────────────────────────────────────────

export const MOCK_CABILDEOS: DistrictScopedCabildeoRecord[] = [
  {
    title:
      '¿Debe Jalisco priorizar la desalinización sobre la conservación de acuíferos?',
    description:
      'El Lago de Chapala ha bajado 2m en los últimos 3 años. Hay dos propuestas principales.',
    createdAt: '2026-03-15T14:00:00Z',
    author: 'did:plc:jalisco-user-1',
    community: 'p/Jalisco',
    communities: ['p/CDMX', 'p/NuevoLeon'],
    flairs: ['policy_water_management', 'matter_water_scarcity'],
    region: 'Jalisco',
    districtKeys: [
      districtKeyFor('Jalisco', 4),
      districtKeyFor('Jalisco', 7),
      districtKeyFor('Jalisco', 10),
    ],
    options: [
      {
        label: 'Desalinización',
        description:
          'Construir 2 plantas desalinizadoras en la costa del Pacífico.',
      },
      {
        label: 'Conservación de Acuíferos',
        description: 'Regulación estricta + restauración de humedales.',
      },
      {
        label: 'Modelo Híbrido',
        description: 'Planta piloto + moratoria inmediata de nuevos pozos.',
      },
    ],
    phase: 'voting',
    phaseDeadline: '2026-03-20T00:00:00Z',
    userContext: {
      hasDelegatedTo: 'did:plc:delegado-1',
      delegateVoteEvent: {
        optionIndex: 2,
        votedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      },
    },
  },
  {
    title:
      '¿Reformar el transporte público de la CDMX con sistema BRT o ampliar el Metro?',
    description:
      'La saturación del transporte público en CDMX requiere acción inmediata. Dos modelos compiten.',
    createdAt: '2026-03-10T10:00:00Z',
    author: 'did:plc:cdmx-user-1',
    community: 'p/CDMX',
    flairs: ['policy_public_transit'],
    region: 'CDMX',
    districtKeys: [
      districtKeyFor('Ciudad de México', 7),
      districtKeyFor('Ciudad de México', 12),
      districtKeyFor('Ciudad de México', 24),
    ],
    geoRestricted: true,
    options: [
      {
        label: 'Sistema BRT',
        description: 'Red de Metrobús extendida a 12 nuevas líneas.',
      },
      {
        label: 'Ampliación Metro',
        description: 'Líneas 13 y 14 del Metro subterráneo.',
      },
    ],
    phase: 'deliberating',
    phaseDeadline: '2026-03-18T00:00:00Z',
  },
  {
    title:
      '¿Debe Oaxaca prohibir la minería a cielo abierto en territorios indígenas?',
    description:
      'Comunidades indígenas exigen protección territorial. Empresas mineras argumentan desarrollo económico.',
    createdAt: '2026-02-28T08:00:00Z',
    author: 'did:plc:oaxaca-user-1',
    community: 'p/Oaxaca',
    communities: ['p/Chiapas', 'p/Guerrero'],
    flairs: ['matter_indigenous_rights', 'policy_mining_regulation'],
    region: 'Oaxaca',
    districtKeys: [districtKeyFor('Oaxaca', 2), districtKeyFor('Oaxaca', 7)],
    options: [
      {
        label: 'Prohibición total',
        description: 'Cero minería en territorios reconocidos.',
      },
      {
        label: 'Regulación con consulta',
        description: 'Minería solo con consentimiento comunitario.',
      },
      {
        label: 'Moratoria temporal',
        description: 'Pausa de 5 años para evaluar impacto ambiental.',
      },
    ],
    phase: 'resolved',
    outcome: {
      winningOption: 1,
      totalParticipants: 1247,
      directVoters: 982,
      delegatedVoters: 265,
      effectiveTotalPower: 1098.3,
      breakdown: [
        {optionIndex: 0, label: 'Prohibición total', effectiveVotes: 312.1},
        {
          optionIndex: 1,
          label: 'Regulación con consulta',
          effectiveVotes: 498.7,
        },
        {optionIndex: 2, label: 'Moratoria temporal', effectiveVotes: 287.5},
      ],
      communityBreakdown: [
        {community: 'p/Oaxaca', dominantOption: 0, participation: '89%'},
        {community: 'p/Chiapas', dominantOption: 1, participation: '62%'},
        {community: 'p/Guerrero', dominantOption: 1, participation: '41%'},
      ],
    },
  },
]

export const MOCK_DISTRICT_RAQS: DistrictRaqRecord[] = [
  {
    id: 'raq-jalisco-7-water-board',
    title: '¿Cómo debería integrarse el consejo de agua metropolitano?',
    summary:
      'Vecinos de Guadalajara y Zapopan están discutiendo si el consejo debe reservar asientos fijos para comités barriales.',
    stateName: 'Jalisco',
    districtKeys: [districtKeyFor('Jalisco', 7)],
    updatedAt: '2026-03-21T12:00:00Z',
    status: 'Open',
  },
  {
    id: 'raq-jalisco-10-riverfront',
    title: '¿Qué prioridad debe tener la rehabilitación del Río Santiago?',
    summary:
      'Se están comparando tres enfoques: monitoreo ciudadano, remediación industrial y presupuesto metropolitano de emergencia.',
    stateName: 'Jalisco',
    districtKeys: [districtKeyFor('Jalisco', 10)],
    updatedAt: '2026-03-18T09:30:00Z',
    status: 'Open',
  },
  {
    id: 'raq-cdmx-12-housing',
    title: '¿Qué regla de vivienda asequible debe exigirse en corredores BRT?',
    summary:
      'Activistas de vivienda y movilidad están proponiendo mínimos obligatorios de vivienda asequible por proyecto.',
    stateName: 'Ciudad de México',
    districtKeys: [districtKeyFor('Ciudad de México', 12)],
    updatedAt: '2026-03-23T18:10:00Z',
    status: 'Open',
  },
  {
    id: 'raq-oaxaca-2-land-rights',
    title:
      '¿Cómo debería verificarse el consentimiento comunitario en proyectos extractivos?',
    summary:
      'Organizaciones territoriales proponen observadores independientes, actas públicas y vetos vinculantes.',
    stateName: 'Oaxaca',
    districtKeys: [districtKeyFor('Oaxaca', 2), districtKeyFor('Oaxaca', 7)],
    updatedAt: '2026-03-11T16:45:00Z',
    status: 'Draft',
  },
]

export const MOCK_CABILDEO_POSITIONS: CabildeoPositionRecord[] = [
  {
    cabildeo: 'at://did:plc:jalisco-user-1/com.para.civic.cabildeo/1',
    stance: 'for',
    optionIndex: 0,
    text: 'La conservación lleva décadas fallando. Chapala sigue bajando. Necesitamos una solución que no dependa de lluvias que ya no llegan.',
    createdAt: '2026-03-16T09:30:00Z',
    compassQuadrant: 'lib-left',
    constructivenessScore: 0.82,
  },
  {
    cabildeo: 'at://did:plc:jalisco-user-1/com.para.civic.cabildeo/1',
    stance: 'against',
    optionIndex: 0,
    text: 'La desalinización tiene un costo energético enorme. Es más práctico restaurar los ecosistemas existentes.',
    createdAt: '2026-03-16T10:15:00Z',
    compassQuadrant: 'auth-left',
    constructivenessScore: 0.88,
  },
  {
    cabildeo: 'at://did:plc:jalisco-user-1/com.para.civic.cabildeo/1',
    stance: 'amendment',
    optionIndex: 2,
    text: 'El modelo híbrido debería incluir un fondo comunitario para que los ejidos afectados tengan compensación directa.',
    createdAt: '2026-03-16T11:15:00Z',
    compassQuadrant: 'center',
    constructivenessScore: 0.95,
  },
  {
    cabildeo: 'at://did:plc:jalisco-user-1/com.para.civic.cabildeo/1',
    stance: 'for',
    optionIndex: 2,
    text: 'No necesitamos todo o nada. Un piloto nos dará datos reales para decidir mejor.',
    createdAt: '2026-03-16T14:00:00Z',
    compassQuadrant: 'lib-center',
    constructivenessScore: 0.75,
  },
  {
    cabildeo: 'at://did:plc:jalisco-user-1/com.para.civic.cabildeo/1',
    stance: 'against',
    optionIndex: 0,
    text: 'Eso es una estupidez monumental de los políticos que solo quieren robar presupuesto.',
    createdAt: '2026-03-16T15:00:00Z',
    compassQuadrant: 'auth-right',
    constructivenessScore: 0.15,
  },
]

export const STATE_DEMOGRAPHICS: Record<
  string,
  {
    dominantParty: string
    leadingCommunity: string
    approval: string
    active: string
  }
> = {
  Jalisco: {
    dominantParty: 'MC',
    leadingCommunity: 'p/Jalisco',
    approval: '58%',
    active: '840K',
  },
  CDMX: {
    dominantParty: 'Morena',
    leadingCommunity: 'p/CDMX',
    approval: '62%',
    active: '2.1M',
  },
  'Ciudad de México': {
    dominantParty: 'Morena',
    leadingCommunity: 'p/CDMX',
    approval: '62%',
    active: '2.1M',
  },
  'Distrito Federal': {
    dominantParty: 'Morena',
    leadingCommunity: 'p/CDMX',
    approval: '62%',
    active: '2.1M',
  },
  'Estado de México': {
    dominantParty: 'Morena',
    leadingCommunity: 'p/Edomex',
    approval: '54%',
    active: '1.6M',
  },
  México: {
    dominantParty: 'Morena',
    leadingCommunity: 'p/Edomex',
    approval: '54%',
    active: '1.6M',
  },
  'Nuevo León': {
    dominantParty: 'MC',
    leadingCommunity: 'p/NuevoLeon',
    approval: '51%',
    active: '920K',
  },
  Oaxaca: {
    dominantParty: 'Morena',
    leadingCommunity: 'p/Oaxaca',
    approval: '68%',
    active: '410K',
  },
  default: {
    dominantParty: 'Morena',
    leadingCommunity: 'p/Mexico',
    approval: '42%',
    active: '1.2M',
  },
}
