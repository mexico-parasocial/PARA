export const MEXICAN_STATES = [
  'All',
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
]

export function normalizeMexicoStateName(stateName: string): string {
  const normalized = stateName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

  if (
    normalized === 'ciudad de mexico' ||
    normalized === 'distrito federal' ||
    normalized === 'cdmx'
  ) {
    return 'cdmx'
  }

  if (normalized === 'estado de mexico' || normalized === 'mexico') {
    return 'estado-de-mexico'
  }

  return normalized
}

export const MOCK_MUNICIPALITIES: Record<string, string[]> = {
  All: ['All'],
  Jalisco: [
    'All',
    'Guadalajara',
    'Zapopan',
    'Tlaquepaque',
    'Tlajomulco',
    'Puerto Vallarta',
  ],
  'Ciudad de México': [
    'All',
    'Iztapalapa',
    'Coyoacán',
    'Benito Juárez',
    'Cuauhtémoc',
    'Miguel Hidalgo',
  ],
  'Nuevo León': [
    'All',
    'Monterrey',
    'San Pedro Garza García',
    'Santa Catarina',
    'Guadalupe',
    'Apodaca',
  ],
  'Estado de México': [
    'All',
    'Ecatepec',
    'Nezahualcóyotl',
    'Toluca',
    'Naucalpan',
    'Tlalnepantripa',
  ],
  Veracruz: [
    'All',
    'Veracruz',
    'Xalapa',
    'Coatzacoalcos',
    'Boca del Río',
    'Minatitlán',
  ],
}

export type Representative = {
  id: string
  name: string
  handle: string
  type: 'Party' | 'Community'
  affiliate: string
  category: string
  state: string
  municipality: string
  avatarColor: string
}

export const MOCK_REPS: Representative[] = [
  {
    id: '1',
    name: 'Dr. Alejandro G.',
    handle: '@agomez',
    type: 'Party',
    affiliate: 'Official Party A',
    category: 'Senator',
    state: 'Jalisco',
    municipality: 'Guadalajara',
    avatarColor: '#007AFF',
  },
  {
    id: '10',
    name: 'Lic. Claudia S.',
    handle: '@claudias',
    type: 'Party',
    affiliate: 'Official Party A',
    category: 'President',
    state: 'All',
    municipality: 'All',
    avatarColor: '#5856D6',
  },
  {
    id: '2',
    name: 'Mtra. Sofía L.',
    handle: '@sofial',
    type: 'Party',
    affiliate: 'Official Party B',
    category: 'Federal Deputy',
    state: 'Jalisco',
    municipality: 'Guadalajara',
    avatarColor: '#34C759',
  },
  {
    id: '3',
    name: 'Carlos R.',
    handle: '@carlosr',
    type: 'Community',
    affiliate: 'Vecinos Unidos',
    category: 'City Council',
    state: 'Jalisco',
    municipality: 'Guadalajara',
    avatarColor: '#FF9500',
  },
  {
    id: '4',
    name: 'Laura M.',
    handle: '@lauram',
    type: 'Community',
    affiliate: 'Tech Hub',
    category: 'Congress',
    state: 'Ciudad de México',
    municipality: 'Coyoacán',
    avatarColor: '#AF52DE',
  },
  {
    id: '5',
    name: 'Roberto P.',
    handle: '@robertop',
    type: 'Party',
    affiliate: 'Official Party A',
    category: 'Senator',
    state: 'Nuevo León',
    municipality: 'Monterrey',
    avatarColor: '#FF3B30',
  },
  {
    id: '6',
    name: 'Eduardo S.',
    handle: '@eduardos',
    type: 'Community',
    affiliate: 'Civic Watch',
    category: 'Governor',
    state: 'Jalisco',
    municipality: 'Zapopan',
    avatarColor: '#5856D6',
  },
  {
    id: '7',
    name: 'Lic. Martha Q.',
    handle: '@marthaq',
    type: 'Party',
    affiliate: 'Official Party C',
    category: 'State Deputy',
    state: 'Jalisco',
    municipality: 'All',
    avatarColor: '#FF2D55',
  },
  {
    id: '8',
    name: 'Ing. Jose N.',
    handle: '@josen',
    type: 'Community',
    affiliate: 'San Pedro Activo',
    category: 'City Council',
    state: 'Nuevo León',
    municipality: 'San Pedro Garza García',
    avatarColor: '#5AC8FA',
  },
  {
    id: '9',
    name: 'Dra. Elena V.',
    handle: '@elenav',
    type: 'Party',
    affiliate: 'Official Party B',
    category: 'Syndic',
    state: 'Veracruz',
    municipality: 'Veracruz',
    avatarColor: '#FFCC00',
  },
]
