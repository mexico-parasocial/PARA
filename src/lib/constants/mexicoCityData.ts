export interface CityData {
  name: string
  population: string
  dominantParty: string
  governing_mayor: string
}

export const MEXICO_CITY_DATA: Record<string, CityData[]> = {
  Aguascalientes: [
    {
      name: 'Aguascalientes',
      population: '934,000',
      dominantParty: 'PAN',
      governing_mayor: 'Leonardo Montañez',
    },
    {
      name: 'Jesús María',
      population: '130,000',
      dominantParty: 'PAN',
      governing_mayor: 'Antonio Arámbula',
    },
  ],
  'Baja California': [
    {
      name: 'Tijuana',
      population: '1,922,000',
      dominantParty: 'Morena',
      governing_mayor: 'Montserrat Caballero',
    },
    {
      name: 'Mexicali',
      population: '1,049,000',
      dominantParty: 'Morena',
      governing_mayor: 'Norma Bustamante',
    },
    {
      name: 'Ensenada',
      population: '443,000',
      dominantParty: 'Morena',
      governing_mayor: 'Armando Ayala',
    },
  ],
  'Baja California Sur': [
    {
      name: 'La Paz',
      population: '250,000',
      dominantParty: 'Morena',
      governing_mayor: 'Milena Quiroga',
    },
    {
      name: 'Los Cabos',
      population: '351,000',
      dominantParty: 'Morena',
      governing_mayor: 'Oscar Leggs',
    },
  ],
  Campeche: [
    {
      name: 'Campeche',
      population: '294,000',
      dominantParty: 'Morena',
      governing_mayor: 'Biby Rabelo',
    },
    {
      name: 'Ciudad del Carmen',
      population: '191,000',
      dominantParty: 'Morena',
      governing_mayor: 'Pablo Gutiérrez',
    },
  ],
  Chiapas: [
    {
      name: 'Tuxtla Gutiérrez',
      population: '604,000',
      dominantParty: 'Morena',
      governing_mayor: 'Carlos Morales',
    },
    {
      name: 'Tapachula',
      population: '353,000',
      dominantParty: 'Morena',
      governing_mayor: 'Rosa Urbina',
    },
  ],
  Chihuahua: [
    {
      name: 'Ciudad Juárez',
      population: '1,512,000',
      dominantParty: 'Morena',
      governing_mayor: 'Cruz Pérez Cuéllar',
    },
    {
      name: 'Chihuahua',
      population: '937,000',
      dominantParty: 'PAN',
      governing_mayor: 'Marco Bonilla',
    },
  ],
  Coahuila: [
    {
      name: 'Saltillo',
      population: '879,000',
      dominantParty: 'PRI',
      governing_mayor: 'José María Fraustro',
    },
    {
      name: 'Torreón',
      population: '720,000',
      dominantParty: 'PRI',
      governing_mayor: 'Román Cepeda',
    },
  ],
  Colima: [
    {
      name: 'Colima',
      population: '157,000',
      dominantParty: 'PRI',
      governing_mayor: 'Margarita Moreno',
    },
    {
      name: 'Manzanillo',
      population: '191,000',
      dominantParty: 'Morena',
      governing_mayor: 'Griselda Martínez',
    },
  ],
  'Distrito Federal': [
    {
      name: 'Iztapalapa',
      population: '1,835,000',
      dominantParty: 'Morena',
      governing_mayor: 'Clara Brugada',
    },
    {
      name: 'Gustavo A. Madero',
      population: '1,173,000',
      dominantParty: 'Morena',
      governing_mayor: 'Francisco Chíguil',
    },
    {
      name: 'Benito Juárez',
      population: '434,000',
      dominantParty: 'PAN',
      governing_mayor: 'Santiago Taboada',
    },
  ],
  Durango: [
    {
      name: 'Durango',
      population: '688,000',
      dominantParty: 'PAN',
      governing_mayor: 'José Antonio Ochoa',
    },
    {
      name: 'Gómez Palacio',
      population: '372,000',
      dominantParty: 'PRI',
      governing_mayor: 'Leticia Herrera',
    },
  ],
  Guanajuato: [
    {
      name: 'León',
      population: '1,721,000',
      dominantParty: 'PAN',
      governing_mayor: 'Alejandra Gutiérrez',
    },
    {
      name: 'Irapuato',
      population: '592,000',
      dominantParty: 'PAN',
      governing_mayor: 'Lorena Alfaro',
    },
    {
      name: 'Celaya',
      population: '521,000',
      dominantParty: 'PAN',
      governing_mayor: 'Javier Mendoza',
    },
  ],
  Guerrero: [
    {
      name: 'Acapulco',
      population: '779,000',
      dominantParty: 'Morena',
      governing_mayor: 'Abelina López',
    },
    {
      name: 'Chilpancingo',
      population: '283,000',
      dominantParty: 'Morena',
      governing_mayor: 'Norma Otilia Hernández',
    },
  ],
  Hidalgo: [
    {
      name: 'Pachuca',
      population: '314,000',
      dominantParty: 'PRI',
      governing_mayor: 'Sergio Baños',
    },
    {
      name: 'Tulancingo',
      population: '168,000',
      dominantParty: 'PRI',
      governing_mayor: 'Jorge Márquez',
    },
  ],
  Jalisco: [
    {
      name: 'Guadalajara',
      population: '1,385,000',
      dominantParty: 'MC',
      governing_mayor: 'Pablo Lemus',
    },
    {
      name: 'Zapopan',
      population: '1,476,000',
      dominantParty: 'MC',
      governing_mayor: 'Juan José Frangie',
    },
    {
      name: 'Tlaquepaque',
      population: '687,000',
      dominantParty: 'MC',
      governing_mayor: 'Citlalli Amaya',
    },
  ],
  México: [
    {
      name: 'Ecatepec',
      population: '1,645,000',
      dominantParty: 'Morena',
      governing_mayor: 'Fernando Vilchis',
    },
    {
      name: 'Nezahualcóyotl',
      population: '1,077,000',
      dominantParty: 'Morena',
      governing_mayor: 'Adolfo Cerqueda',
    },
    {
      name: 'Toluca',
      population: '910,000',
      dominantParty: 'PRI',
      governing_mayor: 'Raymundo Martínez',
    },
  ],
  Michoacán: [
    {
      name: 'Morelia',
      population: '849,000',
      dominantParty: 'PAN',
      governing_mayor: 'Alfonso Martínez',
    },
    {
      name: 'Uruapan',
      population: '356,000',
      dominantParty: 'Morena',
      governing_mayor: 'Ignacio Campos',
    },
  ],
  Morelos: [
    {
      name: 'Cuernavaca',
      population: '378,000',
      dominantParty: 'PAN',
      governing_mayor: 'José Luis Urióstegui',
    },
    {
      name: 'Jiutepec',
      population: '215,000',
      dominantParty: 'Morena',
      governing_mayor: 'Rafael Reyes',
    },
  ],
  Nayarit: [
    {
      name: 'Tepic',
      population: '425,000',
      dominantParty: 'Morena',
      governing_mayor: 'Geraldine Ponce',
    },
    {
      name: 'Bahía de Banderas',
      population: '187,000',
      dominantParty: 'Morena',
      governing_mayor: 'Mirtha Villalvazo',
    },
  ],
  'Nuevo León': [
    {
      name: 'Monterrey',
      population: '1,142,000',
      dominantParty: 'MC',
      governing_mayor: 'Luis Donaldo Colosio',
    },
    {
      name: 'Apodaca',
      population: '656,000',
      dominantParty: 'PRI',
      governing_mayor: 'César Garza',
    },
    {
      name: 'Guadalupe',
      population: '643,000',
      dominantParty: 'PRI',
      governing_mayor: 'Cristina Díaz',
    },
  ],
  Oaxaca: [
    {
      name: 'Oaxaca de Juárez',
      population: '270,000',
      dominantParty: 'Morena',
      governing_mayor: 'Francisco Martínez',
    },
    {
      name: 'Tuxtepec',
      population: '159,000',
      dominantParty: 'Morena',
      governing_mayor: 'Irineo Molina',
    },
  ],
  Puebla: [
    {
      name: 'Puebla',
      population: '1,692,000',
      dominantParty: 'PAN',
      governing_mayor: 'Eduardo Rivera',
    },
    {
      name: 'Tehuacán',
      population: '327,000',
      dominantParty: 'Morena',
      governing_mayor: 'Pedro Tepole',
    },
  ],
  Querétaro: [
    {
      name: 'Querétaro',
      population: '1,049,000',
      dominantParty: 'PAN',
      governing_mayor: 'Luis Nava',
    },
    {
      name: 'San Juan del Río',
      population: '297,000',
      dominantParty: 'PAN',
      governing_mayor: 'Roberto Cabrera',
    },
  ],
  'Quintana Roo': [
    {
      name: 'Cancún (Benito Juárez)',
      population: '911,000',
      dominantParty: 'Morena',
      governing_mayor: 'Ana Patricia Peralta',
    },
    {
      name: 'Playa del Carmen (Solidaridad)',
      population: '333,000',
      dominantParty: 'PAN',
      governing_mayor: 'Lili Campos',
    },
  ],
  'San Luis Potosí': [
    {
      name: 'San Luis Potosí',
      population: '911,000',
      dominantParty: 'PRI',
      governing_mayor: 'Enrique Galindo',
    },
    {
      name: 'Soledad de Graciano Sánchez',
      population: '332,000',
      dominantParty: 'PVEM',
      governing_mayor: 'Leonor Noyola',
    },
  ],
  Sinaloa: [
    {
      name: 'Culiacán',
      population: '1,003,000',
      dominantParty: 'Morena',
      governing_mayor: 'Juan de Dios Gámez',
    },
    {
      name: 'Mazatlán',
      population: '501,000',
      dominantParty: 'Morena',
      governing_mayor: 'Edgar González',
    },
  ],
  Sonora: [
    {
      name: 'Hermosillo',
      population: '936,000',
      dominantParty: 'PAN',
      governing_mayor: 'Antonio Astiazarán',
    },
    {
      name: 'Ciudad Obregón (Cajeme)',
      population: '436,000',
      dominantParty: 'Morena',
      governing_mayor: 'Javier Lamarque',
    },
  ],
  Tabasco: [
    {
      name: 'Villahermosa (Centro)',
      population: '683,000',
      dominantParty: 'Morena',
      governing_mayor: 'Yolanda Osuna',
    },
    {
      name: 'Cárdenas',
      population: '243,000',
      dominantParty: 'Morena',
      governing_mayor: 'María Esther Zapata',
    },
  ],
  Tamaulipas: [
    {
      name: 'Reynosa',
      population: '704,000',
      dominantParty: 'Morena',
      governing_mayor: 'Carlos Peña',
    },
    {
      name: 'Matamoros',
      population: '541,000',
      dominantParty: 'Morena',
      governing_mayor: 'Mario López',
    },
    {
      name: 'Nuevo Laredo',
      population: '425,000',
      dominantParty: 'Morena',
      governing_mayor: 'Carmen Lilia Canturosas',
    },
  ],
  Tlaxcala: [
    {
      name: 'Tlaxcala',
      population: '100,000',
      dominantParty: 'Morena',
      governing_mayor: 'Jorge Corichi',
    },
    {
      name: 'Apizaco',
      population: '80,000',
      dominantParty: 'PAN',
      governing_mayor: 'Pablo Badillo',
    },
  ],
  Veracruz: [
    {
      name: 'Veracruz',
      population: '607,000',
      dominantParty: 'PAN',
      governing_mayor: 'Patricia Lobeira',
    },
    {
      name: 'Xalapa',
      population: '488,000',
      dominantParty: 'Morena',
      governing_mayor: 'Ricardo Ahued',
    },
    {
      name: 'Coatzacoalcos',
      population: '310,000',
      dominantParty: 'Morena',
      governing_mayor: 'Amado Cruz',
    },
  ],
  Yucatán: [
    {
      name: 'Mérida',
      population: '995,000',
      dominantParty: 'PAN',
      governing_mayor: 'Renán Barrera',
    },
    {
      name: 'Kanasín',
      population: '141,000',
      dominantParty: 'PAN',
      governing_mayor: 'Edwin Bojórquez',
    },
  ],
  Zacatecas: [
    {
      name: 'Zacatecas',
      population: '149,000',
      dominantParty: 'PVEM',
      governing_mayor: 'Jorge Miranda',
    },
    {
      name: 'Fresnillo',
      population: '240,000',
      dominantParty: 'Morena',
      governing_mayor: 'Saúl Monreal',
    },
  ],
}
