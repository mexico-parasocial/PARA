import {normalizeMexicoStateName} from '#/lib/constants/mexico'

export type CityCoordinate = {
  latitude: number
  longitude: number
}

function normalizeCityName(cityName: string) {
  return cityName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export const MEXICO_CITY_COORDINATES: Record<
  string,
  Record<string, CityCoordinate>
> = {
  Aguascalientes: {
    Aguascalientes: {latitude: 21.88234, longitude: -102.28259},
    'Jesús María': {latitude: 21.96111, longitude: -102.34333},
  },
  'Baja California': {
    Tijuana: {latitude: 32.5027, longitude: -117.00371},
    Mexicali: {latitude: 32.62781, longitude: -115.45446},
    Ensenada: {latitude: 31.87149, longitude: -116.60071},
  },
  'Baja California Sur': {
    'La Paz': {latitude: 24.14231, longitude: -110.31316},
    'Los Cabos': {latitude: 23.15185, longitude: -109.72104},
  },
  Campeche: {
    Campeche: {latitude: 19.84386, longitude: -90.52554},
    'Ciudad del Carmen': {latitude: 18.64592, longitude: -91.82991},
  },
  Chiapas: {
    'Tuxtla Gutiérrez': {latitude: 16.75973, longitude: -93.11308},
    Tapachula: {latitude: 14.90385, longitude: -92.25749},
  },
  Chihuahua: {
    'Ciudad Juárez': {latitude: 31.72024, longitude: -106.46084},
    Chihuahua: {latitude: 28.63528, longitude: -106.08889},
  },
  Coahuila: {
    Saltillo: {latitude: 25.42321, longitude: -101.0053},
    Torreón: {latitude: 25.54389, longitude: -103.41898},
  },
  Colima: {
    Colima: {latitude: 19.24997, longitude: -103.72714},
    Manzanillo: {latitude: 19.11695, longitude: -104.34214},
  },
  'Distrito Federal': {
    Iztapalapa: {latitude: 19.35529, longitude: -99.06224},
    'Benito Juárez': {latitude: 19.3984, longitude: -99.15766},
    'Gustavo A. Madero': {latitude: 19.48279, longitude: -99.11336},
  },
  Durango: {
    Durango: {latitude: 24.02032, longitude: -104.65756},
    'Gómez Palacio': {latitude: 25.56985, longitude: -103.49588},
  },
  Guanajuato: {
    León: {latitude: 21.12908, longitude: -101.67374},
    Irapuato: {latitude: 20.67675, longitude: -101.35628},
    Celaya: {latitude: 20.52353, longitude: -100.8157},
  },
  Guerrero: {
    Chilpancingo: {latitude: 17.5506, longitude: -99.50578},
    Acapulco: {latitude: 16.86805, longitude: -99.89402},
  },
  Hidalgo: {
    Pachuca: {latitude: 20.11697, longitude: -98.73329},
    Tulancingo: {latitude: 20.08355, longitude: -98.36288},
  },
  Jalisco: {
    Guadalajara: {latitude: 20.66682, longitude: -103.39182},
    Zapopan: {latitude: 20.72356, longitude: -103.38479},
    Tlaquepaque: {latitude: 20.64091, longitude: -103.29327},
  },
  México: {
    Ecatepec: {latitude: 19.60492, longitude: -99.06064},
    Nezahualcóyotl: {latitude: 19.38763, longitude: -98.99264},
    Toluca: {latitude: 19.28786, longitude: -99.65324},
  },
  Michoacán: {
    Morelia: {latitude: 19.70078, longitude: -101.18443},
    Uruapan: {latitude: 19.41116, longitude: -102.05644},
  },
  Morelos: {
    Cuernavaca: {latitude: 18.9261, longitude: -99.23075},
    Jiutepec: {latitude: 18.88139, longitude: -99.17778},
  },
  Nayarit: {
    Tepic: {latitude: 21.50951, longitude: -104.89569},
    'Bahía de Banderas': {latitude: 20.8279, longitude: -105.31808},
  },
  'Nuevo León': {
    Monterrey: {latitude: 25.67507, longitude: -100.31847},
    Apodaca: {latitude: 25.78195, longitude: -100.18839},
    Guadalupe: {latitude: 25.67678, longitude: -100.25646},
  },
  Oaxaca: {
    'Oaxaca de Juárez': {latitude: 17.06542, longitude: -96.72365},
    Tuxtepec: {latitude: 18.0883, longitude: -96.12535},
  },
  Puebla: {
    Puebla: {latitude: 19.03793, longitude: -98.20346},
    Tehuacán: {latitude: 18.46422, longitude: -97.39735},
  },
  Querétaro: {
    'San Juan del Río': {latitude: 20.38886, longitude: -99.99577},
    Querétaro: {latitude: 20.5923, longitude: -100.39174},
  },
  'Quintana Roo': {
    'Cancún (Benito Juárez)': {latitude: 21.17429, longitude: -86.84656},
    'Playa del Carmen (Solidaridad)': {latitude: 20.6274, longitude: -87.07987},
  },
  'San Luis Potosí': {
    'San Luis Potosí': {latitude: 22.14982, longitude: -100.97916},
    'Soledad de Graciano Sánchez': {latitude: 22.18912, longitude: -100.93792},
  },
  Sinaloa: {
    Culiacán: {latitude: 24.79032, longitude: -107.38782},
    Mazatlán: {latitude: 23.2329, longitude: -106.4062},
  },
  Sonora: {
    Hermosillo: {latitude: 29.1026, longitude: -110.97732},
    'Ciudad Obregón (Cajeme)': {latitude: 27.48642, longitude: -109.94083},
  },
  Tabasco: {
    'Villahermosa (Centro)': {latitude: 17.98689, longitude: -92.93028},
    Cárdenas: {latitude: 18.00135, longitude: -93.37559},
  },
  Tamaulipas: {
    Reynosa: {latitude: 26.08061, longitude: -98.28835},
    'Nuevo Laredo': {latitude: 27.47629, longitude: -99.51639},
    Matamoros: {latitude: 25.88102, longitude: -97.50649},
  },
  Tlaxcala: {
    Tlaxcala: {latitude: 19.31905, longitude: -98.19982},
    Apizaco: {latitude: 19.41333, longitude: -98.14358},
  },
  Veracruz: {
    Veracruz: {latitude: 19.18095, longitude: -96.1429},
    Xalapa: {latitude: 19.53124, longitude: -96.91589},
    Coatzacoalcos: {latitude: 18.14905, longitude: -94.4447},
  },
  Yucatán: {
    Mérida: {latitude: 20.97537, longitude: -89.61696},
    Kanasín: {latitude: 20.93482, longitude: -89.55871},
  },
  Zacatecas: {
    Zacatecas: {latitude: 22.76843, longitude: -102.58141},
    Fresnillo: {latitude: 23.18126, longitude: -102.87136},
  },
}

const CITY_COORDINATES_INDEX = new Map(
  Object.entries(MEXICO_CITY_COORDINATES).map(([stateName, cities]) => [
    normalizeMexicoStateName(stateName),
    new Map(
      Object.entries(cities).map(([cityName, coordinate]) => [
        normalizeCityName(cityName),
        coordinate,
      ]),
    ),
  ]),
)

export function getCityCoordinate(stateName: string, cityName: string) {
  return (
    CITY_COORDINATES_INDEX.get(normalizeMexicoStateName(stateName))?.get(
      normalizeCityName(cityName),
    ) || null
  )
}

export function getCitiesWithCoordinatesForState<T extends {name: string}>(
  stateName: string,
  cities: T[],
): Array<T & {coordinate: CityCoordinate}> {
  return cities.flatMap(city => {
    const coordinate = getCityCoordinate(stateName, city.name)
    return coordinate ? [{...city, coordinate}] : []
  })
}
