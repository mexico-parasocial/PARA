/**
 * XPCurseado Custom Tag Schema
 *
 * Format: |[modifier]#[type]
 * - | = Standard namespace prefix
 * - || = Official/elevated namespace
 * - ? = Question type
 * - ! = Announcement type
 *
 * Examples:
 * - |#Matter - Standard matter post
 * - ||#Policy - Official policy post
 * - |#?OpenQuestion - Open question (RAQ)
 * - |#!RAQ - RAQ statement
 */

export const TAG_PREFIX = '|#'
export const TAG_PREFIX_OFFICIAL = '||#'

export const TAG_TYPES = {
  MATTER: 'Matter',
  POLICY: 'Policy',
  OPEN_QUESTION: '?OpenQuestion',
  RAQ: '!RAQ',
} as const

export const TAG_LABELS = {
  [TAG_TYPES.MATTER]: 'Matter',
  [TAG_TYPES.POLICY]: 'Policy',
  [TAG_TYPES.OPEN_QUESTION]: 'Open Question',
  [TAG_TYPES.RAQ]: 'RAQ',
} as const

// Post Type definitions for the unified tag sheet
export const POST_TYPES = {
  NONE: {id: 'none', label: 'Ninguna', tag: null, color: '#6B7280'},
  MEME: {id: 'meme', label: 'Meme', tag: '#Meme', color: '#B45309'}, // Muted Amber
  RAQ: {id: 'raq', label: 'RAQ', tag: '|#!RAQ', color: '#B91C1C'}, // Muted Red
  OPEN_QUESTION: {
    id: 'open_question',
    label: 'Pregunta Abierta',
    tag: '|#?OpenQuestion',
    color: '#1D4ED8',
  }, // Muted Blue
  META: {id: 'meta', label: 'META', tag: '#META', color: '#4B5563'}, // Neutral Gray
  COMPETITION: {
    id: 'competition',
    label: 'Competition Submission',
    tag: '#Competition',
    color: '#111827',
  }, // Very Dark Gray
  FAKE_ARTICLE: {
    id: 'fake_article',
    label: 'FAKE ARTICLE/TWEET/TEXT',
    tag: '#FakeArticle',
    color: '#991B1B',
  }, // Dark Red
} as const

export type PostType = (typeof POST_TYPES)[keyof typeof POST_TYPES]
export type PostFlair = (typeof POST_FLAIRS)[keyof typeof POST_FLAIRS]

export type UserFlair = {
  id: string
  label: string
  color: string
}

export const USER_FLAIRS = {
  CENTRISM: {id: 'centrism', label: 'Centrism', color: '#FFCC00'},
  AUTH_LEFT: {id: 'auth_left', label: 'Auth Left', color: '#F93A3A'},
  LIB_LEFT: {id: 'lib_left', label: 'Lib Left', color: '#34C759'},
  CENTER_LEFT: {id: 'center_left', label: 'Center Left', color: '#5AC8FA'},
  AUTH_CENTER: {id: 'auth_center', label: 'Auth Econocenter', color: '#FF3B30'},
  LIB_CENTER: {id: 'lib_center', label: 'Lib Econocenter', color: '#30B0C7'},
  CENTER_RIGHT: {id: 'center_right', label: 'Center Right', color: '#007AFF'},
  LIB_RIGHT: {id: 'lib_right', label: 'Lib Right', color: '#AF52DE'},
  AUTH_RIGHT: {id: 'auth_right', label: 'Auth Right', color: '#5856D6'},
} as const

// Map from political-affiliation ninth IDs to USER_FLAIRS entries
export const NINTH_ID_TO_USER_FLAIR: Record<string, UserFlair> = {
  'ninth-auth-left': USER_FLAIRS.AUTH_LEFT,
  'ninth-auth-econocenter': USER_FLAIRS.AUTH_CENTER,
  'ninth-auth-right': USER_FLAIRS.AUTH_RIGHT,
  'ninth-center-left': USER_FLAIRS.CENTER_LEFT,
  'ninth-center-econocenter': USER_FLAIRS.CENTRISM,
  'ninth-center-right': USER_FLAIRS.CENTER_RIGHT,
  'ninth-lib-left': USER_FLAIRS.LIB_LEFT,
  'ninth-lib-econocenter': USER_FLAIRS.LIB_CENTER,
  'ninth-lib-right': USER_FLAIRS.LIB_RIGHT,
}

// Organized Flair Groups
export const POST_FLAIRS = {
  // --- POLICY FLAIRS ---
  // 1. SERVICIOS PÚBLICOS
  cheques_escolares: {
    id: 'policy_cheques_escolares',
    label: 'Cheques escolares',
    tag: '||#ChequesEscolares',
    color: '#007AFF',
  },
  ley_de_aborto: {
    id: 'policy_ley_de_aborto',
    label: 'Ley de aborto',
    tag: '||#LeyDeAborto',
    color: '#007AFF',
  },
  educacion_laica: {
    id: 'policy_educacion_laica',
    label: 'Educación laica',
    tag: '||#EducacionLaica',
    color: '#007AFF',
  },
  empresa_publica_agua: {
    id: 'policy_empresa_publica_agua',
    label: 'Empresa pública de agua',
    tag: '||#EmpresaPublicaDeAgua',
    color: '#007AFF',
  },
  servicios_publicos_salud: {
    id: 'policy_servicios_publicos_salud',
    label: 'Servicios públicos de salud',
    tag: '||#ServiciosPublicosDeSalud',
    color: '#007AFF',
  },
  escuelas_publicas: {
    id: 'policy_escuelas_publicas',
    label: 'Escuelas públicas',
    tag: '||#EscuelasPublicas',
    color: '#007AFF',
  },
  fondo_adaptacion_climatico: {
    id: 'policy_fondo_adaptacion_climatico',
    label: 'Fondo de adaptación al cambio climático',
    tag: '||#FondoDeAdaptacionAlCambioClimatico',
    color: '#007AFF',
  },
  subvencion_fomento_artes: {
    id: 'policy_subvencion_fomento_artes',
    label: 'Subvención para el fomento de artes',
    tag: '||#SubvencionParaElFomentoDeArtes',
    color: '#007AFF',
  },
  financiacion_ciencia: {
    id: 'policy_financiacion_ciencia',
    label: 'Financiación de la ciencia',
    tag: '||#FinanciacionDeLaCiencia',
    color: '#007AFF',
  },
  tratamiento_drogadiccion: {
    id: 'policy_tratamiento_drogadiccion',
    label: 'Plan de tratamiento sobre la drogadicción',
    tag: '||#PlanDeTratamientoSobreLaDrogadiccion',
    color: '#007AFF',
  },
  medios_publicos: {
    id: 'policy_medios_publicos',
    label: 'Medios públicos, publicidad política',
    tag: '||#MediosPublicosPublicidadPolitica',
    color: '#007AFF',
  },
  educacion_selectiva: {
    id: 'policy_educacion_selectiva',
    label: 'Educación selectiva',
    tag: '||#EducacionSelectiva',
    color: '#007AFF',
  },
  limite_mandatos: {
    id: 'policy_limite_mandatos',
    label: 'Límite de mandatos',
    tag: '||#LimiteDeMandatos',
    color: '#007AFF',
  },
  comedores_escolares: {
    id: 'policy_comedores_escolares',
    label: 'Comedores escolares gratuitos',
    tag: '||#ComedoresEscolaresGratuitos',
    color: '#007AFF',
  },
  agencia_seguridad_alimentaria: {
    id: 'policy_agencia_seguridad_alimentaria',
    label: 'Agencia de seguridad alimentaria y drogas',
    tag: '||#AgenciaDeSeguridadAlimentariaYDrogas',
    color: '#007AFF',
  },
  consejos_juveniles: {
    id: 'policy_consejos_juveniles',
    label: 'Consejos juveniles',
    tag: '||#ConsejosJuveniles',
    color: '#007AFF',
  },
  fundacion_justicia_social: {
    id: 'policy_fundacion_justicia_social',
    label: 'Fundación por la justicia social',
    tag: '||#FundacionPorLaJusticiaSocial',
    color: '#007AFF',
  },
  prohibir_sanidad_privada: {
    id: 'policy_prohibir_sanidad_privada',
    label: 'Prohibir la sanidad privada',
    tag: '||#ProhibirLaSanidadPrivada',
    color: '#007AFF',
  },
  prohibicion_educacion_privada: {
    id: 'policy_prohibicion_educacion_privada',
    label: 'Prohibición de la educación privada',
    tag: '||#ProhibicionDeLaEducacionPrivada',
    color: '#007AFF',
  },
  subvencion_transporte_escolar: {
    id: 'policy_subvencion_transporte_escolar',
    label: 'Subvención del transporte escolar',
    tag: '||#SubvencionDelTransporteEscolar',
    color: '#007AFF',
  },
  subvencion_biocarburantes: {
    id: 'policy_subvencion_biocarburantes',
    label: 'Subvención a los biocarburantes',
    tag: '||#SubvencionALosBiocarburantes',
    color: '#007AFF',
  },
  transporte_publico_pol: {
    id: 'policy_transporte_publico_pol',
    label: 'Transporte público',
    tag: '||#TransportePublico',
    color: '#007AFF',
  },

  // 2. HACIENDA
  impuesto_ventas: {
    id: 'policy_impuesto_ventas',
    label: 'Impuesto sobre las ventas',
    tag: '||#ImpuestoSobreLasVentas',
    color: '#34C759',
  },
  impuesto_tabaco: {
    id: 'policy_impuesto_tabaco',
    label: 'Impuesto sobre el tabaco',
    tag: '||#ImpuestoSobreElTabaco',
    color: '#34C759',
  },
  impuesto_bienes_inmuebles: {
    id: 'policy_impuesto_bienes_inmuebles',
    label: 'Impuesto sobre bienes e inmuebles',
    tag: '||#ImpuestoSobreBienesEInmuebles',
    color: '#34C759',
  },
  deduccion_matrimonio: {
    id: 'policy_deduccion_matrimonio',
    label: 'Deducción por matrimonio',
    tag: '||#DeduccionPorMatrimonio',
    color: '#34C759',
  },
  impuesto_hidrocarburos: {
    id: 'policy_impuesto_hidrocarburos',
    label: 'Impuesto sobre los hidrocarburos',
    tag: '||#ImpuestoSobreLosHidrocarburos',
    color: '#34C759',
  },
  impuesto_renta: {
    id: 'policy_impuesto_renta',
    label: 'Impuesto sobre la renta',
    tag: '||#ImpuestoSobreLaRenta',
    color: '#34C759',
  },
  impuesto_comida_basura: {
    id: 'policy_impuesto_comida_basura',
    label: 'Impuesto a la comida basura',
    tag: '||#ImpuestoALaComidaBasura',
    color: '#34C759',
  },
  impuesto_plastico: {
    id: 'policy_impuesto_plastico',
    label: 'Impuesto al plástico',
    tag: '||#ImpuestoAlPlastico',
    color: '#34C759',
  },
  impuestos_alcohol: {
    id: 'policy_impuestos_alcohol',
    label: 'Impuestos sobre el alcohol',
    tag: '||#ImpuestosSobreElAlcohol',
    color: '#34C759',
  },
  impuesto_propiedad_vehiculo: {
    id: 'policy_impuesto_propiedad_vehiculo',
    label: 'Impuesto de propiedad de vehículo privado',
    tag: '||#ImpuestoDePropiedadDeVehiculoPrivado',
    color: '#34C759',
  },
  impuesto_ganancias_capital: {
    id: 'policy_impuesto_ganancias_capital',
    label: 'Impuesto sobre las ganancias del capital',
    tag: '||#ImpuestoSobreLasGananciasDelCapital',
    color: '#34C759',
  },

  // 3. ECONOMÍA
  edad_jubilacion: {
    id: 'policy_edad_jubilacion',
    label: 'Edad de jubilación',
    tag: '||#EdadDeJubilacion',
    color: '#FF9500',
  },
  ayudas_innovacion: {
    id: 'policy_ayudas_innovacion',
    label: 'Ayudas a la innovación',
    tag: '||#AyudasALaInnovacion',
    color: '#FF9500',
  },
  regulacion_huelga: {
    id: 'policy_regulacion_huelga',
    label: 'Regulación del derecho de huelga',
    tag: '||#RegulacionDelDerechoDeHuelga',
    color: '#FF9500',
  },
  subvenciones_agricolas: {
    id: 'policy_subvenciones_agricolas',
    label: 'Subvenciones agrícolas',
    tag: '||#SubvencionesAgricolas',
    color: '#FF9500',
  },
  subvencion_energias_renovables: {
    id: 'policy_subvencion_energias_renovables',
    label: 'Subvención de energías renovables',
    tag: '||#SubvencionDeEnergiasRenovables',
    color: '#FF9500',
  },
  salario_minimo: {
    id: 'policy_salario_minimo',
    label: 'Salario mínimo',
    tag: '||#SalarioMinimo',
    color: '#FF9500',
  },
  derechos_consumidor: {
    id: 'policy_derechos_consumidor',
    label: 'Derechos del consumidor',
    tag: '||#DerechosDelConsumidor',
    color: '#FF9500',
  },
  empresa_publica_electricidad: {
    id: 'policy_empresa_publica_electricidad',
    label: 'Empresa pública de electricidad',
    tag: '||#EmpresaPublicaDeElectricidad',
    color: '#FF9500',
  },
  fision_nuclear: {
    id: 'policy_fision_nuclear',
    label: 'Fisión nuclear',
    tag: '||#FisionNuclear',
    color: '#FF9500',
  },
  controles_contaminacion: {
    id: 'policy_controles_contaminacion',
    label: 'Controles de contaminación',
    tag: '||#ControlesDeContaminacion',
    color: '#FF9500',
  },
  ley_competencia: {
    id: 'policy_ley_competencia',
    label: 'Ley de competencia',
    tag: '||#LeyDeCompetencia',
    color: '#FF9500',
  },
  ley_riesgos_laborales: {
    id: 'policy_ley_riesgos_laborales',
    label: 'Ley de prevención de riesgos laborales',
    tag: '||#LeyDePrevencionDeRiesgosLaborales',
    color: '#FF9500',
  },

  // 4. ASUNTOS SOCIALES
  prestacion_desempleo: {
    id: 'policy_prestacion_desempleo',
    label: 'Prestación por desempleo',
    tag: '||#PrestacionPorDesempleo',
    color: '#AF52DE',
  },
  vivienda_publica: {
    id: 'policy_vivienda_publica',
    label: 'Vivienda pública',
    tag: '||#ViviendaPublica',
    color: '#AF52DE',
  },
  regulacion_alquiler: {
    id: 'policy_regulacion_alquiler',
    label: 'Regulación del alquiler',
    tag: '||#RegulacionDelAlquiler',
    color: '#AF52DE',
  },
  prestacion_jubilacion: {
    id: 'policy_prestacion_jubilacion',
    label: 'Prestación por jubilación',
    tag: '||#PrestacionPorJubilacion',
    color: '#AF52DE',
  },
  prestacion_nacimiento: {
    id: 'policy_prestacion_nacimiento',
    label: 'Prestación por nacimiento',
    tag: '||#PrestacionPorNacimiento',
    color: '#AF52DE',
  },
  prestacion_discapacidad: {
    id: 'policy_prestacion_discapacidad',
    label: 'Prestación por discapacidad',
    tag: '||#PrestacionPorDiscapacidad',
    color: '#AF52DE',
  },
  planificacion_familiar: {
    id: 'policy_planificacion_familiar',
    label: 'Planificación familiar',
    tag: '||#PlanificacionFamiliar',
    color: '#AF52DE',
  },
  asistentes_sociales: {
    id: 'policy_asistentes_sociales',
    label: 'Asistentes sociales',
    tag: '||#AsistentesSociales',
    color: '#AF52DE',
  },
  ingreso_minimo: {
    id: 'policy_ingreso_minimo',
    label: 'Ingreso minimo universal',
    tag: '||#IngresoMinimoUniversal',
    color: '#AF52DE',
  },
  prohibir_segunda_vivienda: {
    id: 'policy_prohibir_segunda_vivienda',
    label: 'Prohibir segunda vivienda en propiedad',
    tag: '||#ProhibirSegundaViviendaEnPropiedad',
    color: '#AF52DE',
  },
  trabajo_obligatorio_desempleados: {
    id: 'policy_trabajo_obligatorio_desempleados',
    label: 'Trabajo obligatorio para desempleados',
    tag: '||#TrabajoObligatorioParaDesempleados',
    color: '#AF52DE',
  },
  politica_hijo_unico: {
    id: 'policy_politica_hijo_unico',
    label: 'Politica de hijo único',
    tag: '||#PoliticaDeHijoUnico',
    color: '#AF52DE',
  },

  // 5. ASUNTOS EXTERIORES
  gasto_militar: {
    id: 'policy_gasto_militar',
    label: 'Gasto militar',
    tag: '||#GastoMilitar',
    color: '#5856D6',
  },
  asilo_refugiados: {
    id: 'policy_asilo_refugiados',
    label: 'Asilo de refugiados',
    tag: '||#AsiloDeRefugiados',
    color: '#5856D6',
  },
  reglas_inmigracion: {
    id: 'policy_reglas_inmigracion',
    label: 'Reglas de inmigración',
    tag: '||#ReglasDeInmigracion',
    color: '#5856D6',
  },
  controles_fronterizos: {
    id: 'policy_controles_fronterizos',
    label: 'Controles fronterizos',
    tag: '||#ControlesFronterizos',
    color: '#5856D6',
  },
  venta_permisos_ciudadania: {
    id: 'policy_venta_permisos_ciudadania',
    label: 'Venta de permisos de ciudadania',
    tag: '||#VentaDePermisosDeCiudadania',
    color: '#5856D6',
  },

  // 6. INTERIOR
  ley_discriminacion_racial: {
    id: 'policy_ley_discriminacion_racial',
    label: 'Ley contra la discriminación racial',
    tag: '||#LeyContraLaDiscriminacionRacial',
    color: '#FF3B30',
  },
  edad_minima_votar: {
    id: 'policy_edad_minima_votar',
    label: 'Edad mínima para votar',
    tag: '||#EdadMinimaParaVotar',
    color: '#FF3B30',
  },
  regimen_carcelario: {
    id: 'policy_regimen_carcelario',
    label: 'Régimen carcelario',
    tag: '||#RegimenCarcelario',
    color: '#FF3B30',
  },
  legalizacion_drogas: {
    id: 'policy_legalizacion_drogas',
    label: 'Legalización de las drogas',
    tag: '||#LegalizacionDeLasDrogas',
    color: '#FF3B30',
  },
  pena_muerte: {
    id: 'policy_pena_muerte',
    label: 'Pena de muerte',
    tag: '||#PenaDeMuerte',
    color: '#FF3B30',
  },
  camaras_corporales: {
    id: 'policy_camaras_corporales',
    label: 'Cámaras corporales',
    tag: '||#CamarasCorporales',
    color: '#FF3B30',
  },
  ley_alcohol: {
    id: 'policy_ley_alcohol',
    label: 'Ley del alcohol',
    tag: '||#LeyDelAlcohol',
    color: '#FF3B30',
  },
  policia_comunitaria: {
    id: 'policy_policia_comunitaria',
    label: 'Policia comunitaria',
    tag: '||#PoliciaComunitaria',
    color: '#FF3B30',
  },
  cambio_genero: {
    id: 'policy_cambio_genero',
    label: 'Cambio de género',
    tag: '||#CambioDeGenero',
    color: '#FF3B30',
  },
  jurados_populares: {
    id: 'policy_jurados_populares',
    label: 'Jurados populares',
    tag: '||#JuradosPopulares',
    color: '#FF3B30',
  },
  ley_armas_fuego: {
    id: 'policy_ley_armas_fuego',
    label: 'Ley de armas de fuego',
    tag: '||#LeyDeArmasDeFuego',
    color: '#FF3B30',
  },
  ley_discriminacion_genero: {
    id: 'policy_ley_discriminacion_genero',
    label: 'Ley contra la discriminación de género',
    tag: '||#LeyContraLaDiscriminacionDeGenero',
    color: '#FF3B30',
  },
  libertad_prensa: {
    id: 'policy_libertad_prensa',
    label: 'Libertad de prensa',
    tag: '||#LibertadDePrensa',
    color: '#FF3B30',
  },
  policias_armados: {
    id: 'policy_policias_armados',
    label: 'Policías armados',
    tag: '||#PoliciasArmados',
    color: '#FF3B30',
  },
  radares_trafico: {
    id: 'policy_radares_trafico',
    label: 'Radares de tráfico',
    tag: '||#RadaresDeTrafico',
    color: '#FF3B30',
  },
  matrimonio_gay: {
    id: 'policy_matrimonio_gay',
    label: 'Matrimonio gay',
    tag: '||#MatrimonioGay',
    color: '#FF3B30',
  },
  servicios_inteligencia: {
    id: 'policy_servicios_inteligencia',
    label: 'Servicios de inteligencia',
    tag: '||#ServiciosDeInteligencia',
    color: '#FF3B30',
  },
  restringir_publicidad_electoral: {
    id: 'policy_restringir_publicidad_electoral',
    label: 'Restringir publicidad electoral',
    tag: '||#RestringirPublicidadElectoral',
    color: '#FF3B30',
  },
  videovigilancia: {
    id: 'policy_videovigilancia',
    label: 'Videovigilancia',
    tag: '||#Videovigilancia',
    color: '#FF3B30',
  },

  // --- MATTER FLAIRS ---
  // 1. SERVICIOS PÚBLICOS
  demanda_salud: {
    id: 'matter_demanda_salud',
    label: 'Demanda por salud',
    tag: '|#DemandaPorSalud',
    color: '#5AC8FA',
  },
  industria_hidrica: {
    id: 'matter_industria_hidrica',
    label: 'Industria hídrica',
    tag: '|#IndustriaHidrica',
    color: '#5AC8FA',
  },
  estabilidad: {
    id: 'matter_estabilidad',
    label: 'Estabilidad',
    tag: '|#Estabilidad',
    color: '#5AC8FA',
  },
  esperanza_vida: {
    id: 'matter_esperanza_vida',
    label: 'Esperanza de vida',
    tag: '|#EsperanzaDeVida',
    color: '#5AC8FA',
  },
  subvenciones_viajes_bus: {
    id: 'matter_subvenciones_viajes_bus',
    label: 'Subvenciones de viajes en bus',
    tag: '|#SubvencionesDeViajesEnBus',
    color: '#5AC8FA',
  },
  sanidad: {
    id: 'matter_sanidad',
    label: 'Sanidad',
    tag: '|#Sanidad',
    color: '#5AC8FA',
  },
  sanidad_privada: {
    id: 'matter_sanidad_privada',
    label: 'Sanidad privada',
    tag: '|#SanidadPrivada',
    color: '#5AC8FA',
  },
  educacion: {
    id: 'matter_educacion',
    label: 'Educación',
    tag: '|#Educacion',
    color: '#5AC8FA',
  },
  educacion_privada: {
    id: 'matter_educacion_privada',
    label: 'Educación privada',
    tag: '|#EducacionPrivada',
    color: '#5AC8FA',
  },
  transicion_coche_electrico: {
    id: 'matter_transicion_coche_electrico',
    label: 'Transición al coche eléctrico',
    tag: '|#TransiciónAlCocheElectrico',
    color: '#5AC8FA',
  },
  uso_coche: {
    id: 'matter_uso_coche',
    label: 'Uso del coche',
    tag: '|#UsoDelCoche',
    color: '#5AC8FA',
  },
  uso_autobus: {
    id: 'matter_uso_autobus',
    label: 'Uso del autobús',
    tag: '|#UsoDelAutobus',
    color: '#5AC8FA',
  },
  precio_petroleo: {
    id: 'matter_precio_petroleo',
    label: 'Precio del petróleo',
    tag: '|#PrecioDelPetroleo',
    color: '#5AC8FA',
  },
  congestion_trafico: {
    id: 'matter_congestion_trafico',
    label: 'Congestión de tráfico',
    tag: '|#CongestionDeTrafico',
    color: '#5AC8FA',
  },
  transporte_aereo: {
    id: 'matter_transporte_aereo',
    label: 'Transporte aéreo',
    tag: '|#TransporteAereo',
    color: '#5AC8FA',
  },
  transporte_publico_matter: {
    id: 'matter_transporte_publico_matter',
    label: 'Transporte público',
    tag: '|#TransportePublico',
    color: '#5AC8FA',
  },
  uso_tren: {
    id: 'matter_uso_tren',
    label: 'Uso del tren',
    tag: '|#UsoDelTren',
    color: '#5AC8FA',
  },
  carril_bus: {
    id: 'matter_carril_bus',
    label: 'Carril bus',
    tag: '|#CarrilBus',
    color: '#5AC8FA',
  },

  // 2. HACIENDA
  exencion_tributaria_caridad: {
    id: 'matter_exencion_tributaria_caridad',
    label: 'Exención tributaria sobre la caridad',
    tag: '|#ExenciónTributariaSobreLaCaridad',
    color: '#4CD964',
  },
  impuesto_automatizacion: {
    id: 'matter_impuesto_automatizacion',
    label: 'Impuesto por automatización',
    tag: '|#ImpuestoPorAutomatización',
    color: '#4CD964',
  },
  impuesto_religioso: {
    id: 'matter_impuesto_religioso',
    label: 'Impuesto religioso',
    tag: '|#ImpuestoReligioso',
    color: '#4CD964',
  },
  prohibicion_criptomonedas: {
    id: 'matter_prohibicion_criptomonedas',
    label: 'Prohibición de criptomonedas',
    tag: '|#ProhibiciónDeCriptoMonedas',
    color: '#4CD964',
  },
  impuesto_viajeros_habituales: {
    id: 'matter_impuesto_viajeros_habituales',
    label: 'Impuesto sobre viajeros habituales',
    tag: '|#ImpuestoSobreViajerosHabituales',
    color: '#4CD964',
  },
  transparencia_fiscal: {
    id: 'matter_transparencia_fiscal',
    label: 'Transparencia fiscal',
    tag: '|#TransparenciaFiscal',
    color: '#4CD964',
  },
  impuesto_servicios_digitales: {
    id: 'matter_impuesto_servicios_digitales',
    label: 'Impuesto a servicios digitales',
    tag: '|#ImpuestoAServiciosDigitales',
    color: '#4CD964',
  },

  // 3. ECONOMÍA
  eficiencia_energetica: {
    id: 'matter_eficiencia_energetica',
    label: 'Eficiencia energética',
    tag: '|#EficienciaEnergetica',
    color: '#FFCC00',
  },
  automatizacion_industrial: {
    id: 'matter_automatizacion_industrial',
    label: 'Automatización industrial',
    tag: '|#AutomatizacionIndustrial',
    color: '#FFCC00',
  },
  industria_telecomunicaciones: {
    id: 'matter_industria_telecomunicaciones',
    label: 'Industria de telecomunicaciones',
    tag: '|#IndustriaDeTelecomunicaciones',
    color: '#FFCC00',
  },
  industria_energetica: {
    id: 'matter_industria_energetica',
    label: 'Industria energética',
    tag: '|#IndustriaEnergetica',
    color: '#FFCC00',
  },
  programa_espacial: {
    id: 'matter_programa_espacial',
    label: 'Programa espacial',
    tag: '|#ProgramaEspacial',
    color: '#FFCC00',
  },
  relevancia_moneda: {
    id: 'matter_relevancia_moneda',
    label: 'Relevancia de moneda',
    tag: '|#RelevanciaDeMoneda',
    color: '#FFCC00',
  },
  inflacion: {
    id: 'matter_inflacion',
    label: 'Inflación',
    tag: '|#Inflacion',
    color: '#FFCC00',
  },
  salarios_matter: {
    id: 'matter_salarios_matter',
    label: 'Salarios',
    tag: '|#Salarios',
    color: '#FFCC00',
  },
  adopcion_criptomoneda: {
    id: 'matter_adopcion_criptomoneda',
    label: 'Adopción de criptomoneda',
    tag: '|#AdopcionDeCriptomoneda',
    color: '#FFCC00',
  },
  rentas_bajas: {
    id: 'matter_rentas_bajas',
    label: 'Rentas bajas',
    tag: '|#RentasBajas',
    color: '#FFCC00',
  },
  rentas_medias: {
    id: 'matter_rentas_medias',
    label: 'Rentas medias',
    tag: '|#RentasMedias',
    color: '#FFCC00',
  },
  subvencion_granjas_verticales: {
    id: 'matter_subvencion_granjas_verticales',
    label: 'Subvención de granjas verticales',
    tag: '|#SubvenciónDeGranjasVerticales',
    color: '#FFCC00',
  },
  rentas_altas: {
    id: 'matter_rentas_altas',
    label: 'Rentas altas',
    tag: '|#RentasAltas',
    color: '#FFCC00',
  },
  fomento_electronica_sostenible: {
    id: 'matter_fomento_electronica_sostenible',
    label: 'Fomento de electrónica sostenible',
    tag: '|#FomentoDeElectrónicaSostenible',
    color: '#FFCC00',
  },
  emisiones_co2: {
    id: 'matter_emisiones_co2',
    label: 'Emisiones de CO2',
    tag: '|#EmisionesCO2',
    color: '#FFCC00',
  },
  productividad: {
    id: 'matter_productividad',
    label: 'Productividad',
    tag: '|#Productividad',
    color: '#FFCC00',
  },
  semana_laboral: {
    id: 'matter_semana_laboral',
    label: 'Semana laboral',
    tag: '|#SemanaLaboral',
    color: '#FFCC00',
  },
  pib: {id: 'matter_pib', label: 'PIB', tag: '|#PIB', color: '#FFCC00'},
  jornada_laboral: {
    id: 'matter_jornada_laboral',
    label: 'Jornada laboral',
    tag: '|#JornadaLaboral',
    color: '#FFCC00',
  },
  desempleo: {
    id: 'matter_desempleo',
    label: 'Desempleo',
    tag: '|#Desempleo',
    color: '#FFCC00',
  },
  tecnologia: {
    id: 'matter_tecnologia',
    label: 'Tecnología',
    tag: '|#Tecnologia',
    color: '#FFCC00',
  },
  turismo: {
    id: 'matter_turismo',
    label: 'Turismo',
    tag: '|#Turismo',
    color: '#FFCC00',
  },

  // 4. ASUNTOS SOCIALES
  vivienda_privada: {
    id: 'matter_vivienda_privada',
    label: 'Vivienda privada',
    tag: '|#ViviendaPrivada',
    color: '#BF5AF2',
  },
  pobreza: {
    id: 'matter_pobreza',
    label: 'Pobreza',
    tag: '|#Pobreza',
    color: '#BF5AF2',
  },
  igualdad: {
    id: 'matter_igualdad',
    label: 'Igualdad',
    tag: '|#Igualdad',
    color: '#BF5AF2',
  },
  igualdad_genero: {
    id: 'matter_igualdad_genero',
    label: 'Igualdad de género',
    tag: '|#IgualdadDeGenero',
    color: '#BF5AF2',
  },
  democracia: {
    id: 'matter_democracia',
    label: 'Democracia',
    tag: '|#Democracia',
    color: '#BF5AF2',
  },
  consumo_tabaco: {
    id: 'matter_consumo_tabaco',
    label: 'Consumo de tabaco',
    tag: '|#ConsumoDeTabaco',
    color: '#BF5AF2',
  },
  consumo_alcohol: {
    id: 'matter_consumo_alcohol',
    label: 'Consumo de alcohol',
    tag: '|#ConsumoDeAlcohol',
    color: '#BF5AF2',
  },
  consumo_azucar: {
    id: 'matter_consumo_azucar',
    label: 'Consumo de azúcar',
    tag: '|#ConsumoDeAzucar',
    color: '#BF5AF2',
  },
  pensiones_privadas: {
    id: 'matter_pensiones_privadas',
    label: 'Pensiones privadas',
    tag: '|#PensionesPrivadas',
    color: '#BF5AF2',
  },
  dietas_plantas: {
    id: 'matter_dietas_plantas',
    label: 'Dietas basadas en plantas',
    tag: '|#DietasBasadasEnPlantas',
    color: '#BF5AF2',
  },
  beneficiencia: {
    id: 'matter_beneficiencia',
    label: 'Beneficencia',
    tag: '|#Beneficiencia',
    color: '#BF5AF2',
  },
  desarrollo_humano: {
    id: 'matter_desarrollo_humano',
    label: 'Desarrollo humano',
    tag: '|#DesarrolloHumano',
    color: '#BF5AF2',
  },
  cupones_comida: {
    id: 'matter_cupones_comida',
    label: 'Cupones de comida',
    tag: '|#CuponesDeComida',
    color: '#BF5AF2',
  },

  // 5. ASUNTOS EXTERIORES
  comercio_internacional: {
    id: 'matter_comercio_internacional',
    label: 'Comercio internacional',
    tag: '|#ComercioInternacional',
    color: '#5856D6',
  },
  relaciones_internacionales: {
    id: 'matter_relaciones_internacionales',
    label: 'Relaciones internacionales',
    tag: '|#RelacionesInternacionales',
    color: '#5856D6',
  },
  tensiones_raciales: {
    id: 'matter_tensiones_raciales',
    label: 'Tensiones raciales',
    tag: '|#TensionesRaciales',
    color: '#5856D6',
  },
  demanda_migratoria: {
    id: 'matter_demanda_migratoria',
    label: 'Demanda migratoria',
    tag: '|#DemandaMigratoria',
    color: '#5856D6',
  },
  inmigracion_ilegal: {
    id: 'matter_inmigracion_ilegal',
    label: 'Inmigración ilegal',
    tag: '|#InmigraciónIlegal',
    color: '#5856D6',
  },
  emigracion: {
    id: 'matter_emigracion',
    label: 'Emigración',
    tag: '|#Emigración',
    color: '#5856D6',
  },
  ayuda_extranjera: {
    id: 'matter_ayuda_extranjera',
    label: 'Ayuda extranjera',
    tag: '|#AyudaExtranjera',
    color: '#5856D6',
  },
  inmigracion: {
    id: 'matter_inmigracion',
    label: 'Inmigración',
    tag: '|#Inmigración',
    color: '#5856D6',
  },

  // 6. INTERIOR
  alcoholismo: {
    id: 'matter_alcoholismo',
    label: 'Alcoholismo',
    tag: '|#Alcoholismo',
    color: '#FF3B30',
  },
  conducta_antisocial: {
    id: 'matter_conducta_antisocial',
    label: 'Conducta antisocial',
    tag: '|#ConductaAntisocial',
    color: '#FF3B30',
  },
  delitos_violencia: {
    id: 'matter_delitos_violencia',
    label: 'Delitos con violencia',
    tag: '|#DelitosConViolencia',
    color: '#FF3B30',
  },
  delincuencia: {
    id: 'matter_delincuencia',
    label: 'Delincuencia',
    tag: '|#Delincuencia',
    color: '#FF3B30',
  },
  sobrepoblacion_carcelaria: {
    id: 'matter_sobrepoblacion_carcelaria',
    label: 'Sobrepoblación carcelaria',
    tag: '|#SobrepoblacionCarcelaria',
    color: '#FF3B30',
  },
  corrupcion: {
    id: 'matter_corrupcion',
    label: 'Corrupción',
    tag: '|#Corrupción',
    color: '#FF3B30',
  },
  religion_estado: {
    id: 'matter_religion_estado',
    label: 'Religión de estado',
    tag: '|#ReligiónDeEstado',
    color: '#FF3B30',
  },
  lobismo: {
    id: 'matter_lobismo',
    label: 'Lobismo',
    tag: '|#LimitarDonacionesEmpresariales',
    color: '#FF3B30',
  },
} as const

// Group for UI Display
// Group for UI Display
export const FLAIR_GROUPS = {
  POLICY: {
    '1. SERVICIOS PÚBLICOS': [
      POST_FLAIRS.cheques_escolares,
      POST_FLAIRS.ley_de_aborto,
      POST_FLAIRS.educacion_laica,
      POST_FLAIRS.empresa_publica_agua,
      POST_FLAIRS.servicios_publicos_salud,
      POST_FLAIRS.escuelas_publicas,
      POST_FLAIRS.fondo_adaptacion_climatico,
      POST_FLAIRS.subvencion_fomento_artes,
      POST_FLAIRS.financiacion_ciencia,
      POST_FLAIRS.tratamiento_drogadiccion,
      POST_FLAIRS.medios_publicos,
      POST_FLAIRS.educacion_selectiva,
      POST_FLAIRS.limite_mandatos,
      POST_FLAIRS.comedores_escolares,
      POST_FLAIRS.agencia_seguridad_alimentaria,
      POST_FLAIRS.consejos_juveniles,
      POST_FLAIRS.fundacion_justicia_social,
      POST_FLAIRS.prohibir_sanidad_privada,
      POST_FLAIRS.prohibicion_educacion_privada,
      POST_FLAIRS.subvencion_transporte_escolar,
      POST_FLAIRS.subvencion_biocarburantes,
      POST_FLAIRS.transporte_publico_pol,
    ],
    '2. HACIENDA': [
      POST_FLAIRS.impuesto_ventas,
      POST_FLAIRS.impuesto_tabaco,
      POST_FLAIRS.impuesto_bienes_inmuebles,
      POST_FLAIRS.deduccion_matrimonio,
      POST_FLAIRS.impuesto_hidrocarburos,
      POST_FLAIRS.impuesto_renta,
      POST_FLAIRS.impuesto_comida_basura,
      POST_FLAIRS.impuesto_plastico,
      POST_FLAIRS.impuestos_alcohol,
      POST_FLAIRS.impuesto_propiedad_vehiculo,
      POST_FLAIRS.impuesto_ganancias_capital,
    ],
    '3. ECONOMÍA': [
      POST_FLAIRS.edad_jubilacion,
      POST_FLAIRS.ayudas_innovacion,
      POST_FLAIRS.regulacion_huelga,
      POST_FLAIRS.subvenciones_agricolas,
      POST_FLAIRS.subvencion_energias_renovables,
      POST_FLAIRS.salario_minimo,
      POST_FLAIRS.derechos_consumidor,
      POST_FLAIRS.empresa_publica_electricidad,
      POST_FLAIRS.fision_nuclear,
      POST_FLAIRS.controles_contaminacion,
      POST_FLAIRS.ley_competencia,
      POST_FLAIRS.ley_riesgos_laborales,
    ],
    '4. ASUNTOS SOCIALES': [
      POST_FLAIRS.prestacion_desempleo,
      POST_FLAIRS.vivienda_publica,
      POST_FLAIRS.regulacion_alquiler,
      POST_FLAIRS.prestacion_jubilacion,
      POST_FLAIRS.prestacion_nacimiento,
      POST_FLAIRS.prestacion_discapacidad,
      POST_FLAIRS.planificacion_familiar,
      POST_FLAIRS.asistentes_sociales,
      POST_FLAIRS.ingreso_minimo,
      POST_FLAIRS.prohibir_segunda_vivienda,
      POST_FLAIRS.trabajo_obligatorio_desempleados,
      POST_FLAIRS.politica_hijo_unico,
    ],
    '5. ASUNTOS EXTERIORES': [
      POST_FLAIRS.gasto_militar,
      POST_FLAIRS.asilo_refugiados,
      POST_FLAIRS.reglas_inmigracion,
      POST_FLAIRS.controles_fronterizos,
      POST_FLAIRS.venta_permisos_ciudadania,
    ],
    '6. INTERIOR': [
      POST_FLAIRS.ley_discriminacion_racial,
      POST_FLAIRS.edad_minima_votar,
      POST_FLAIRS.regimen_carcelario,
      POST_FLAIRS.legalizacion_drogas,
      POST_FLAIRS.pena_muerte,
      POST_FLAIRS.camaras_corporales,
      POST_FLAIRS.ley_alcohol,
      POST_FLAIRS.policia_comunitaria,
      POST_FLAIRS.cambio_genero,
      POST_FLAIRS.jurados_populares,
      POST_FLAIRS.ley_armas_fuego,
      POST_FLAIRS.ley_discriminacion_genero,
      POST_FLAIRS.libertad_prensa,
      POST_FLAIRS.policias_armados,
      POST_FLAIRS.radares_trafico,
      POST_FLAIRS.matrimonio_gay,
      POST_FLAIRS.servicios_inteligencia,
      POST_FLAIRS.restringir_publicidad_electoral,
      POST_FLAIRS.videovigilancia,
    ],
  },
  MATTER: {
    '1. SERVICIOS PÚBLICOS': [
      POST_FLAIRS.demanda_salud,
      POST_FLAIRS.industria_hidrica,
      POST_FLAIRS.estabilidad,
      POST_FLAIRS.esperanza_vida,
      POST_FLAIRS.subvenciones_viajes_bus,
      POST_FLAIRS.sanidad,
      POST_FLAIRS.sanidad_privada,
      POST_FLAIRS.educacion,
      POST_FLAIRS.educacion_privada,
      POST_FLAIRS.transicion_coche_electrico,
      POST_FLAIRS.uso_coche,
      POST_FLAIRS.uso_autobus,
      POST_FLAIRS.precio_petroleo,
      POST_FLAIRS.congestion_trafico,
      POST_FLAIRS.transporte_aereo,
      POST_FLAIRS.transporte_publico_matter,
      POST_FLAIRS.uso_tren,
      POST_FLAIRS.carril_bus,
    ],
    '2. HACIENDA': [
      POST_FLAIRS.exencion_tributaria_caridad,
      POST_FLAIRS.impuesto_automatizacion,
      POST_FLAIRS.impuesto_religioso,
      POST_FLAIRS.prohibicion_criptomonedas,
      POST_FLAIRS.impuesto_viajeros_habituales,
      POST_FLAIRS.transparencia_fiscal,
      POST_FLAIRS.impuesto_servicios_digitales,
    ],
    '3. ECONOMÍA': [
      POST_FLAIRS.eficiencia_energetica,
      POST_FLAIRS.automatizacion_industrial,
      POST_FLAIRS.industria_telecomunicaciones,
      POST_FLAIRS.industria_energetica,
      POST_FLAIRS.programa_espacial,
      POST_FLAIRS.relevancia_moneda,
      POST_FLAIRS.inflacion,
      POST_FLAIRS.salarios_matter,
      POST_FLAIRS.adopcion_criptomoneda,
      POST_FLAIRS.rentas_bajas,
      POST_FLAIRS.rentas_medias,
      POST_FLAIRS.subvencion_granjas_verticales,
      POST_FLAIRS.rentas_altas,
      POST_FLAIRS.fomento_electronica_sostenible,
      POST_FLAIRS.emisiones_co2,
      POST_FLAIRS.productividad,
      POST_FLAIRS.semana_laboral,
      POST_FLAIRS.pib,
      POST_FLAIRS.jornada_laboral,
      POST_FLAIRS.desempleo,
      POST_FLAIRS.tecnologia,
      POST_FLAIRS.turismo,
    ],
    '4. ASUNTOS SOCIALES': [
      POST_FLAIRS.vivienda_privada,
      POST_FLAIRS.pobreza,
      POST_FLAIRS.igualdad,
      POST_FLAIRS.igualdad_genero,
      POST_FLAIRS.democracia,
      POST_FLAIRS.consumo_tabaco,
      POST_FLAIRS.consumo_alcohol,
      POST_FLAIRS.consumo_azucar,
      POST_FLAIRS.pensiones_privadas,
      POST_FLAIRS.dietas_plantas,
      POST_FLAIRS.beneficiencia,
      POST_FLAIRS.desarrollo_humano,
      POST_FLAIRS.cupones_comida,
    ],
    '5. ASUNTOS EXTERIORES': [
      POST_FLAIRS.comercio_internacional,
      POST_FLAIRS.relaciones_internacionales,
      POST_FLAIRS.tensiones_raciales,
      POST_FLAIRS.demanda_migratoria,
      POST_FLAIRS.inmigracion_ilegal,
      POST_FLAIRS.emigracion,
      POST_FLAIRS.ayuda_extranjera,
      POST_FLAIRS.inmigracion,
    ],
    '6. INTERIOR': [
      POST_FLAIRS.alcoholismo,
      POST_FLAIRS.conducta_antisocial,
      POST_FLAIRS.delitos_violencia,
      POST_FLAIRS.delincuencia,
      POST_FLAIRS.sobrepoblacion_carcelaria,
      POST_FLAIRS.corrupcion,
      POST_FLAIRS.religion_estado,
      POST_FLAIRS.lobismo,
    ],
  },
}

// Matter/Policy type tags for structured posts
export const MATTER_POLICY_TAGS = {
  official_matter: {
    tag: '||#Matter',
    label: 'Official Matter',
    isOfficial: true,
  },
  nonofficial_matter: {
    tag: '|#Matter',
    label: 'Nonofficial Matter',
    isOfficial: false,
  },
  official_policy: {
    tag: '||#Policy',
    label: 'Official Policy',
    isOfficial: true,
  },
  nonofficial_policy: {
    tag: '|#Policy',
    label: 'Nonofficial Policy',
    isOfficial: false,
  },
} as const

/**
 * Build a full tag string for a given type
 */
export function buildTag(
  type: keyof typeof TAG_TYPES,
  isOfficial = false,
): string {
  const prefix = isOfficial ? TAG_PREFIX_OFFICIAL : TAG_PREFIX
  return `${prefix}${TAG_TYPES[type]}`
}

/**
 * Parse a tag string to extract type and official status
 */
export function parseTag(tag: string): {
  type: string | null
  isOfficial: boolean
} {
  if (tag.startsWith(TAG_PREFIX_OFFICIAL)) {
    return {
      type: tag.slice(TAG_PREFIX_OFFICIAL.length),
      isOfficial: true,
    }
  }
  if (tag.startsWith(TAG_PREFIX)) {
    return {
      type: tag.slice(TAG_PREFIX.length),
      isOfficial: false,
    }
  }
  return {type: null, isOfficial: false}
}

/**
 * Check if text contains an Open Question tag
 */
export function hasOpenQuestionTag(text: string): boolean {
  return text.includes(buildTag('OPEN_QUESTION'))
}

/**
 * Get the search query for Open Questions
 */
export function getOpenQuestionSearchQuery(): string {
  return buildTag('OPEN_QUESTION')
}
