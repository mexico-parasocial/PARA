/**
 * Mock Cabildeo data for development / preview.
 *
 * These are returned by useCabildeosQuery when the backend endpoint is
 * unavailable (e.g. dev-env not running, migrations missing, etc.) so the
 * Cabildeo screens never show a blank slate during active development.
 */

import {type CabildeoPositionRecord} from '#/lib/api/para-lexicons'
import {type CabildeoView} from '#/lib/cabildeo-client'

export const MOCK_CABILDEO_VIEWS: CabildeoView[] = [
  {
    uri: 'at://did:plc:alice/com.para.civic.cabildeo/centro-cultural',
    title: 'Centro Cultural Independiente Roma',
    description:
      'Propuesta para convertir un edificio histórico abandonado en un centro cultural autogestionado con talleres, galería y café comunitario.',
    createdAt: new Date(Date.now() - 14 * 864e5).toISOString(),
    author: 'did:plc:alice',
    community: 'Roma Norte',
    flairs: ['||#PresupuestoParticipativo', '|#Cultura'],
    region: 'Ciudad de México',
    geo: {latE7: 194194000, lngE7: -991655000},
    options: [
      {label: 'Autogestión total', description: 'Cooperativa ciudadana'},
      {
        label: 'Convenio público-privado',
        description: 'Alcaldía aporta espacio',
      },
      {label: 'Venta a desarrollador', description: 'Liberar espacio'},
    ],
    phase: 'voting',
    phaseDeadline: new Date(Date.now() + 7 * 864e5).toISOString(),
    optionSummary: [
      {optionIndex: 0, label: 'Autogestión total', votes: 142, positions: 38},
      {
        optionIndex: 1,
        label: 'Convenio público-privado',
        votes: 89,
        positions: 27,
      },
      {optionIndex: 2, label: 'Venta a desarrollador', votes: 12, positions: 5},
    ],
    positionCounts: {
      total: 70,
      for: 45,
      against: 18,
      amendment: 7,
      byOption: [
        {optionIndex: 0, label: 'Autogestión total', votes: 142, positions: 38},
        {
          optionIndex: 1,
          label: 'Convenio público-privado',
          votes: 89,
          positions: 27,
        },
        {
          optionIndex: 2,
          label: 'Venta a desarrollador',
          votes: 12,
          positions: 5,
        },
      ],
    },
    voteTotals: {total: 243, direct: 198, delegated: 45},
    minQuorum: 15,
    userContext: {
      viewerVoteOption: 0,
      viewerVoteIsDirect: true,
    },
  },
  {
    uri: 'at://did:plc:bob/com.para.civic.cabildeo/ciclovia',
    title: 'Ciclovía Metropolitana Conectada',
    description:
      'Diseño de una red ciclista de 45 km que conecte la periferia norte con centros de trabajo, escuelas y mercados.',
    createdAt: new Date(Date.now() - 21 * 864e5).toISOString(),
    author: 'did:plc:bob',
    community: 'Movilidad CDMX',
    flairs: ['||#MovilidadActiva', '|#Ciclovia'],
    region: 'Jalisco',
    geo: {latE7: 206767000, lngE7: -1033475000},
    options: [
      {label: 'Construir red completa', description: '45 km en 24 meses'},
      {label: 'Construir tramo piloto', description: '8 km zona universitaria'},
      {
        label: 'Ampliar ciclovías existentes',
        description: 'Sin carriles protegidos',
      },
    ],
    phase: 'deliberating',
    phaseDeadline: new Date(Date.now() + 14 * 864e5).toISOString(),
    optionSummary: [
      {
        optionIndex: 0,
        label: 'Construir red completa',
        votes: 67,
        positions: 22,
      },
      {
        optionIndex: 1,
        label: 'Construir tramo piloto',
        votes: 54,
        positions: 18,
      },
      {optionIndex: 2, label: 'Ampliar existentes', votes: 31, positions: 12},
    ],
    positionCounts: {
      total: 52,
      for: 30,
      against: 15,
      amendment: 7,
      byOption: [
        {
          optionIndex: 0,
          label: 'Construir red completa',
          votes: 67,
          positions: 22,
        },
        {
          optionIndex: 1,
          label: 'Construir tramo piloto',
          votes: 54,
          positions: 18,
        },
        {optionIndex: 2, label: 'Ampliar existentes', votes: 31, positions: 12},
      ],
    },
    voteTotals: {total: 152, direct: 120, delegated: 32},
    minQuorum: 15,
    userContext: {
      viewerVoteOption: 1,
      viewerVoteIsDirect: false,
      hasDelegatedTo: 'did:plc:delegate1',
    },
  },
  {
    uri: 'at://did:plc:carla/com.para.civic.cabildeo/becas',
    title: 'Becas de Excelencia Ampliadas',
    description:
      'Ampliación del programa de becas para estudiantes de escuelas públicas en zonas rurales y marginadas.',
    createdAt: new Date(Date.now() - 10 * 864e5).toISOString(),
    author: 'did:plc:carla',
    community: 'Educación Laica',
    flairs: ['||#EducacionLaica', '|#Becas'],
    region: 'Nuevo León',
    geo: {latE7: 256866000, lngE7: -1003161000},
    options: [
      {label: 'Ampliación total inmediata', description: '25,000 becas'},
      {label: 'Fase escalonada', description: '15,000 año 1, 25,000 año 2'},
      {label: 'Mantener cobertura actual', description: 'Enfocar en calidad'},
    ],
    phase: 'open',
    phaseDeadline: new Date(Date.now() + 21 * 864e5).toISOString(),
    optionSummary: [
      {optionIndex: 0, label: 'Ampliación total', votes: 203, positions: 45},
      {optionIndex: 1, label: 'Fase escalonada', votes: 178, positions: 38},
      {optionIndex: 2, label: 'Mantener actual', votes: 34, positions: 9},
    ],
    positionCounts: {
      total: 92,
      for: 62,
      against: 21,
      amendment: 9,
      byOption: [
        {optionIndex: 0, label: 'Ampliación total', votes: 203, positions: 45},
        {optionIndex: 1, label: 'Fase escalonada', votes: 178, positions: 38},
        {optionIndex: 2, label: 'Mantener actual', votes: 34, positions: 9},
      ],
    },
    voteTotals: {total: 415, direct: 350, delegated: 65},
    minQuorum: 20,
  },
  {
    uri: 'at://did:plc:dan/com.para.civic.cabildeo/reforestacion',
    title: 'Reforestación Urbana Masiva',
    description:
      'Plantar 100,000 árboles nativos en zonas urbanas de alta densidad para reducir islas de calor.',
    createdAt: new Date(Date.now() - 5 * 864e5).toISOString(),
    author: 'did:plc:dan',
    community: 'Medio Ambiente',
    flairs: ['||#MedioAmbiente', '|#Reforestacion'],
    region: 'Puebla',
    geo: {latE7: 190433000, lngE7: -979220000},
    options: [
      {label: '100,000 árboles', description: '18 meses, $120M MXN'},
      {
        label: '50,000 + mantenimiento',
        description: 'Priorizar zonas críticas',
      },
      {label: 'Adopción vecinal', description: 'Vecinos plantan y cuidan'},
    ],
    phase: 'voting',
    phaseDeadline: new Date(Date.now() + 5 * 864e5).toISOString(),
    optionSummary: [
      {optionIndex: 0, label: '100,000 árboles', votes: 312, positions: 67},
      {
        optionIndex: 1,
        label: '50,000 + mantenimiento',
        votes: 198,
        positions: 41,
      },
      {optionIndex: 2, label: 'Adopción vecinal', votes: 87, positions: 22},
    ],
    positionCounts: {
      total: 130,
      for: 95,
      against: 22,
      amendment: 13,
      byOption: [
        {optionIndex: 0, label: '100,000 árboles', votes: 312, positions: 67},
        {
          optionIndex: 1,
          label: '50,000 + mantenimiento',
          votes: 198,
          positions: 41,
        },
        {optionIndex: 2, label: 'Adopción vecinal', votes: 87, positions: 22},
      ],
    },
    voteTotals: {total: 597, direct: 480, delegated: 117},
    minQuorum: 12,
    userContext: {
      viewerVoteOption: 0,
      viewerVoteIsDirect: true,
    },
  },
  {
    uri: 'at://did:plc:eva/com.para.civic.cabildeo/salario-minimo',
    title: 'Salario Mínimo Digno 2026',
    description:
      'Propuesta para incrementar el salario mínimo a $12,000 mensuales con prestaciones completas.',
    createdAt: new Date(Date.now() - 30 * 864e5).toISOString(),
    author: 'did:plc:eva',
    community: 'Derechos Laborales',
    flairs: ['||#DerechosLaborales', '|#SalarioMinimo'],
    region: 'Yucatán',
    geo: {latE7: 209660000, lngE7: -893730000},
    options: [
      {label: 'Aumento inmediato a $12,000', description: '6 meses'},
      {
        label: 'Escalón progresivo',
        description: '$10,500 en 2026, $12,000 en 2027',
      },
      {label: 'Bonificación productividad', description: 'Bono escalonado'},
    ],
    phase: 'resolved',
    phaseDeadline: new Date(Date.now() - 2 * 864e5).toISOString(),
    optionSummary: [
      {optionIndex: 0, label: 'Aumento inmediato', votes: 890, positions: 145},
      {optionIndex: 1, label: 'Escalón progresivo', votes: 678, positions: 112},
      {optionIndex: 2, label: 'Bonificación', votes: 234, positions: 48},
    ],
    positionCounts: {
      total: 305,
      for: 210,
      against: 65,
      amendment: 30,
      byOption: [
        {
          optionIndex: 0,
          label: 'Aumento inmediato',
          votes: 890,
          positions: 145,
        },
        {
          optionIndex: 1,
          label: 'Escalón progresivo',
          votes: 678,
          positions: 112,
        },
        {optionIndex: 2, label: 'Bonificación', votes: 234, positions: 48},
      ],
    },
    voteTotals: {total: 1802, direct: 1450, delegated: 352},
    outcome: {
      winningOption: 0,
      totalParticipants: 1802,
      directVoters: 1450,
      delegatedVoters: 352,
      effectiveTotalPower: 1802,
      breakdown: [
        {optionIndex: 0, label: 'Aumento inmediato', effectiveVotes: 890},
        {optionIndex: 1, label: 'Escalón progresivo', effectiveVotes: 678},
        {optionIndex: 2, label: 'Bonificación', effectiveVotes: 234},
      ],
    },
    minQuorum: 25,
    userContext: {
      viewerVoteOption: 2,
      viewerVoteIsDirect: true,
    },
  },
  {
    uri: 'at://did:plc:fernando/com.para.civic.cabildeo/contratos-abiertos',
    title: 'Plataforma de Contratos Abiertos',
    description:
      'Sistema público de seguimiento en tiempo real de todos los contratos gubernamentales.',
    createdAt: new Date(Date.now() - 18 * 864e5).toISOString(),
    author: 'did:plc:fernando',
    community: 'Transparencia',
    flairs: ['||#Transparencia', '|#Anticorrupcion'],
    region: 'Querétaro',
    geo: {latE7: 205880000, lngE7: -1003900000},
    options: [
      {label: 'Implementación total', description: 'Todos los contratos'},
      {label: 'Fase federal primero', description: 'Solo federales 2 años'},
      {label: 'Auditoría externa', description: '3 firmas internacionales'},
    ],
    phase: 'deliberating',
    phaseDeadline: new Date(Date.now() + 10 * 864e5).toISOString(),
    optionSummary: [
      {
        optionIndex: 0,
        label: 'Implementación total',
        votes: 445,
        positions: 89,
      },
      {optionIndex: 1, label: 'Fase federal', votes: 312, positions: 67},
      {optionIndex: 2, label: 'Auditoría externa', votes: 156, positions: 34},
    ],
    positionCounts: {
      total: 190,
      for: 130,
      against: 42,
      amendment: 18,
      byOption: [
        {
          optionIndex: 0,
          label: 'Implementación total',
          votes: 445,
          positions: 89,
        },
        {optionIndex: 1, label: 'Fase federal', votes: 312, positions: 67},
        {optionIndex: 2, label: 'Auditoría externa', votes: 156, positions: 34},
      ],
    },
    voteTotals: {total: 913, direct: 720, delegated: 193},
    minQuorum: 15,
  },
  {
    uri: 'at://did:plc:alice/com.para.civic.cabildeo/parques',
    title: 'Renovación de Parques Públicos del Centro',
    description:
      'Propuesta para renovar 12 parques públicos del centro histórico con mobiliario urbano accesible.',
    createdAt: new Date(Date.now() - 8 * 864e5).toISOString(),
    author: 'did:plc:alice',
    community: 'Roma Norte',
    flairs: ['||#PresupuestoParticipativo', '|#EspacioPublico'],
    region: 'Oaxaca',
    geo: {latE7: 170660000, lngE7: -967250000},
    options: [
      {
        label: 'Aprobar presupuesto completo',
        description: '12 parques, 18 meses',
      },
      {label: 'Aprobar fase piloto', description: '4 parques, 6 meses'},
      {label: 'Rechazar y reponer', description: 'Esperar dictamen ambiental'},
    ],
    phase: 'voting',
    phaseDeadline: new Date(Date.now() + 4 * 864e5).toISOString(),
    optionSummary: [
      {
        optionIndex: 0,
        label: 'Presupuesto completo',
        votes: 178,
        positions: 42,
      },
      {optionIndex: 1, label: 'Fase piloto', votes: 134, positions: 35},
      {optionIndex: 2, label: 'Rechazar', votes: 45, positions: 12},
    ],
    positionCounts: {
      total: 89,
      for: 58,
      against: 22,
      amendment: 9,
      byOption: [
        {
          optionIndex: 0,
          label: 'Presupuesto completo',
          votes: 178,
          positions: 42,
        },
        {optionIndex: 1, label: 'Fase piloto', votes: 134, positions: 35},
        {optionIndex: 2, label: 'Rechazar', votes: 45, positions: 12},
      ],
    },
    voteTotals: {total: 357, direct: 290, delegated: 67},
    minQuorum: 10,
  },
  {
    uri: 'at://did:plc:olivia/com.para.civic.cabildeo/murales',
    title: 'Muros Urbanos de Arte Comunitario',
    description:
      'Programa de 50 murales monumentales en muros de infraestructura urbana realizados por colectivos locales.',
    createdAt: new Date(Date.now() - 12 * 864e5).toISOString(),
    author: 'did:plc:olivia',
    community: 'Roma Norte',
    flairs: ['||#Cultura', '|#ArteUrbano'],
    region: 'Baja California',
    geo: {latE7: 325140000, lngE7: -1170300000},
    options: [
      {
        label: '50 murales en 12 meses',
        description: '$25M MXN, concurso abierto',
      },
      {label: '25 murales + galerías', description: 'Arte itinerante'},
      {
        label: 'Residencias artísticas',
        description: 'Nacionales e internacionales',
      },
    ],
    phase: 'voting',
    phaseDeadline: new Date(Date.now() + 6 * 864e5).toISOString(),
    optionSummary: [
      {optionIndex: 0, label: '50 murales', votes: 98, positions: 28},
      {optionIndex: 1, label: '25 + galerías', votes: 76, positions: 22},
      {optionIndex: 2, label: 'Residencias', votes: 45, positions: 14},
    ],
    positionCounts: {
      total: 64,
      for: 48,
      against: 10,
      amendment: 6,
      byOption: [
        {optionIndex: 0, label: '50 murales', votes: 98, positions: 28},
        {optionIndex: 1, label: '25 + galerías', votes: 76, positions: 22},
        {optionIndex: 2, label: 'Residencias', votes: 45, positions: 14},
      ],
    },
    voteTotals: {total: 219, direct: 180, delegated: 39},
    minQuorum: 8,
  },
]

export const MOCK_CABILDEO_POSITIONS_BY_URI: Record<
  string,
  CabildeoPositionRecord[]
> = Object.fromEntries(
  MOCK_CABILDEO_VIEWS.map((cabildeo, index) => [
    cabildeo.uri,
    buildMockPositions(cabildeo, index),
  ]),
)

function buildMockPositions(
  cabildeo: CabildeoView,
  seed: number,
): CabildeoPositionRecord[] {
  const createdAt = new Date(
    Date.now() - (seed + 1) * 36e5,
  ).toISOString()
  return [
    {
      cabildeo: cabildeo.uri,
      stance: 'for',
      optionIndex: 0,
      text: `Apoyo ${cabildeo.options[0]?.label || 'la opción principal'} porque atiende el problema con una ruta verificable y medible para la comunidad.`,
      createdAt,
      compassQuadrant: 'center-left',
    },
    {
      cabildeo: cabildeo.uri,
      stance: 'amendment',
      optionIndex: cabildeo.options[1] ? 1 : undefined,
      text: `La propuesta necesita hitos públicos, presupuesto abierto y una revisión trimestral antes de ampliar el alcance.`,
      createdAt: new Date(Date.now() - (seed + 2) * 36e5).toISOString(),
      compassQuadrant: 'center',
    },
    {
      cabildeo: cabildeo.uri,
      stance: 'against',
      optionIndex: cabildeo.options[2] ? 2 : undefined,
      text: `Me preocupa que esta ruta concentre demasiada ejecución sin garantías suficientes para quienes quedan fuera del primer despliegue.`,
      createdAt: new Date(Date.now() - (seed + 3) * 36e5).toISOString(),
      compassQuadrant: 'lib-center',
    },
  ]
}
