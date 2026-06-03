import {type RepresentativeItem} from '#/lib/mock-data'
import {REPRESENTATIVES} from '#/lib/mock-data'

export type RepresentativeNominationMode = 'public' | 'private'
export type RepresentativeNominationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'

export type RepresentativePajareoEntryType =
  | 'firma'
  | 'pregunta'
  | 'señal'
  | 'testimonio'

export type RepresentativePajareoSubjectKind =
  | 'person'
  | 'institution'
  | 'person_in_institution'

export type RepresentativePajareoJurisdictionLevel =
  | 'zone'
  | 'state'
  | 'nation'
  | 'representative_area'

export type RepresentativePajareoSubject = {
  kind: RepresentativePajareoSubjectKind
  personId: string | null
  personName: string | null
  institutionId: string | null
  institutionName: string | null
}

export type RepresentativePajareoJurisdiction = {
  level: RepresentativePajareoJurisdictionLevel
  label: string
}

export type RepresentativePajareoEntryStatus = 'visible' | 'removed'

export type RepresentativeNomination = {
  id: string
  representativeId: string
  mode: RepresentativeNominationMode
  nomineeHandle?: string
  nomineeDid?: string
  communityUri?: string
  nominatorDid: string
  reason: string
  supportCount: number
  status: RepresentativeNominationStatus
  createdAt: string
}

export type RepresentativePajareoEntry = {
  id: string
  representativeId: string
  subject?: RepresentativePajareoSubject
  jurisdiction?: RepresentativePajareoJurisdiction
  type: RepresentativePajareoEntryType
  body: string
  anonymousDisplayArea: string
  supportCount: number
  reportCount?: number
  responseCount?: number
  questionAnswered: boolean
  officialResponse?: RepresentativePajareoOfficialResponse
  responses?: RepresentativePajareoResponse[]
  status: RepresentativePajareoEntryStatus
  createdAt: string
  updatedAt?: string
}

export type RepresentativePajareoOfficialResponse = {
  id: string
  entryId: string
  representativeId: string
  entityId: string
  entityName: string
  body: string
  controllerHash: string
  createdAt: string
}

export type RepresentativePajareoResponse = {
  id: string
  entryId: string
  representativeId: string
  kind: 'public' | 'official'
  responderDid: string
  responderDisplayName: string | null
  entityId: string | null
  entityName: string | null
  body: string
  controllerHash: string | null
  createdAt: string
}

export type RepresentativeAreaEligibility = {
  representativeId: string
  viewerDid?: string
  eligible: boolean
  reason:
    | 'eligible'
    | 'missing_session'
    | 'representative_not_verified'
    | 'outside_area'
  areaLabel: string
}

export type RepresentativeParticipationIndex = {
  nominationsByRepresentative: Record<string, RepresentativeNomination[]>
  pajareoByRepresentative: Record<string, RepresentativePajareoEntry[]>
}

type CreateNominationInput = {
  representativeId: string
  mode: RepresentativeNominationMode
  nominatorDid: string
  nomineeHandle?: string
  nomineeDid?: string
  communityUri?: string
  reason: string
}

type CreatePajareoEntryInput = {
  representativeId: string
  viewerDid: string
  type: RepresentativePajareoEntryType
  body: string
}

type CreateOfficialPajareoResponseInput = {
  representativeId: string
  entryId: string
  entityId: string
  entityName: string
  controllerDid: string
  body: string
}

const now = () => new Date().toISOString()

let nominations: RepresentativeNomination[] = [
  {
    id: 'nom-public-morena-001',
    representativeId: 'party_morena_president_2026',
    mode: 'public',
    nominatorDid: 'did:plc:demo-civic-user',
    reason: 'Debe reclamar su perfil para responder preguntas públicas sobre organización territorial.',
    supportCount: 18,
    status: 'pending',
    createdAt: now(),
  },
]

let pajareoEntries: RepresentativePajareoEntry[] = [
  {
    id: 'pajareo-sheinbaum-001',
    representativeId: 'fed_exec_1',
    type: 'pregunta',
    body: '¿Cuándo se publicará el calendario de seguimiento para compromisos de agua y transporte?',
    anonymousDisplayArea: 'Persona verificada de México',
    supportCount: 124,
    questionAnswered: false,
    status: 'visible',
    createdAt: now(),
  },
  {
    id: 'pajareo-nl-001',
    representativeId: 'gov_nl_1',
    type: 'señal',
    body: 'Hay preocupación local por obras viales sin información clara sobre mitigación ambiental.',
    anonymousDisplayArea: 'Persona verificada de Nuevo León',
    supportCount: 42,
    questionAnswered: false,
    status: 'visible',
    createdAt: now(),
  },
]

let pajareoOfficialResponses: RepresentativePajareoOfficialResponse[] = [
  {
    id: 'pajareo-response-sheinbaum-001',
    entryId: 'pajareo-sheinbaum-001',
    representativeId: 'fed_exec_1',
    entityId: 'official:representative:fed_exec_1',
    entityName: 'Claudia Sheinbaum',
    body: 'Respuesta oficial: se publicará una ruta de seguimiento para compromisos de agua y transporte antes de la siguiente sesión comunitaria.',
    controllerHash: 'ctrl_7e1a6f44',
    createdAt: now(),
  },
]

export function normalizeRepresentative(
  representative: RepresentativeItem,
): RepresentativeItem {
  const areaScope = representative.areaScope ?? {
    type:
      representative.state === 'National'
        ? 'national'
        : representative.municipality === 'State'
          ? 'state'
          : 'municipality',
    label:
      representative.state === 'National'
        ? 'México'
        : representative.municipality === 'State'
          ? representative.state
          : `${representative.municipality}, ${representative.state}`,
    state:
      representative.state === 'National' ? undefined : representative.state,
    municipality:
      representative.municipality === 'State'
        ? undefined
        : representative.municipality,
  } as const

  return {
    ...representative,
    status:
      representative.status ??
      (representative.did ? 'verified' : 'unclaimed'),
    jurisdiction: representative.jurisdiction ?? areaScope.label,
    office: representative.office ?? representative.category,
    term: representative.term ?? 'Periodo por confirmar',
    source:
      representative.source ??
      (representative.type === 'Party'
        ? 'Registro público / INE'
        : 'Gobernanza comunitaria PARA'),
    claimContact:
      representative.claimContact ??
      `verificacion+${representative.id}@para.social`,
    areaScope,
  }
}

export function findRepresentativeByActor(
  actor: {did?: string; handle?: string} | undefined,
) {
  if (!actor) return undefined
  return REPRESENTATIVES.map(normalizeRepresentative).find(rep => {
    return (
      (actor.did && rep.did === actor.did) ||
      (actor.handle &&
        rep.handle.replace(/^@/, '') === actor.handle.replace(/^@/, ''))
    )
  })
}

export function getRepresentativeParticipationIndex(): RepresentativeParticipationIndex {
  const nominationsByRepresentative: Record<string, RepresentativeNomination[]> =
    {}
  const pajareoByRepresentative: Record<string, RepresentativePajareoEntry[]> =
    {}

  for (const nomination of nominations) {
    if (nomination.mode === 'private') continue
    nominationsByRepresentative[nomination.representativeId] ??= []
    nominationsByRepresentative[nomination.representativeId].push(nomination)
  }

  for (const entry of pajareoEntries) {
    if (entry.status !== 'visible') continue
    pajareoByRepresentative[entry.representativeId] ??= []
    pajareoByRepresentative[entry.representativeId].push(entry)
  }

  return {nominationsByRepresentative, pajareoByRepresentative}
}

export function getRepresentativeNominations(
  representativeId: string,
  viewerDid?: string,
) {
  return nominations.filter(nomination => {
    if (nomination.representativeId !== representativeId) return false
    if (nomination.mode === 'public') return true
    return Boolean(viewerDid && nomination.nominatorDid === viewerDid)
  })
}

export function createRepresentativeNomination(
  input: CreateNominationInput,
) {
  const nomination: RepresentativeNomination = {
    id: `nom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    representativeId: input.representativeId,
    mode: input.mode,
    nomineeHandle: input.nomineeHandle,
    nomineeDid: input.nomineeDid,
    communityUri: input.communityUri,
    nominatorDid: input.nominatorDid,
    reason: input.reason,
    supportCount: 1,
    status: 'pending',
    createdAt: now(),
  }
  nominations = [nomination, ...nominations]
  return nomination
}

export function updateRepresentativeNominationStatus(
  nominationId: string,
  status: Extract<
    RepresentativeNominationStatus,
    'accepted' | 'declined' | 'expired'
  >,
) {
  nominations = nominations.map(nomination =>
    nomination.id === nominationId ? {...nomination, status} : nomination,
  )
  return nominations.find(nomination => nomination.id === nominationId)
}

export function getRepresentativePajareoEntries(representativeId: string) {
  return pajareoEntries.filter(
    entry =>
      entry.representativeId === representativeId && entry.status === 'visible',
  ).map(entry => ({
    ...entry,
    officialResponse: pajareoOfficialResponses.find(
      response => response.entryId === entry.id,
    ),
  }))
}

export function checkRepresentativeAreaEligibility({
  representative,
  viewerDid,
}: {
  representative: RepresentativeItem
  viewerDid?: string
}): RepresentativeAreaEligibility {
  const normalized = normalizeRepresentative(representative)
  if (!viewerDid) {
    return {
      representativeId: normalized.id,
      viewerDid,
      eligible: false,
      reason: 'missing_session',
      areaLabel: normalized.areaScope?.label ?? normalized.jurisdiction ?? '',
    }
  }
  if (normalized.status !== 'verified') {
    return {
      representativeId: normalized.id,
      viewerDid,
      eligible: false,
      reason: 'representative_not_verified',
      areaLabel: normalized.areaScope?.label ?? normalized.jurisdiction ?? '',
    }
  }
  return {
    representativeId: normalized.id,
    viewerDid,
    eligible: true,
    reason: 'eligible',
    areaLabel: normalized.areaScope?.label ?? normalized.jurisdiction ?? '',
  }
}

export function createRepresentativePajareoEntry(
  input: CreatePajareoEntryInput,
) {
  const representative = REPRESENTATIVES.map(normalizeRepresentative).find(
    rep => rep.id === input.representativeId,
  )
  const eligibility = checkRepresentativeAreaEligibility({
    representative: representative ?? {
      id: input.representativeId,
      name: '',
      handle: '',
      category: '',
      affiliate: '',
      state: 'National',
      municipality: 'National',
      avatarColor: '#2563EB',
      type: 'Community',
    },
    viewerDid: input.viewerDid,
  })
  if (!eligibility.eligible) {
    throw new Error('No tienes elegibilidad verificada para participar aquí.')
  }

  const existingSignature =
    input.type === 'firma'
      ? pajareoEntries.find(
          entry =>
            entry.representativeId === input.representativeId &&
            entry.type === 'firma' &&
            entry.body === input.body,
        )
      : undefined
  if (existingSignature) {
    existingSignature.supportCount += 1
    return existingSignature
  }

  const entry: RepresentativePajareoEntry = {
    id: `paj-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    representativeId: input.representativeId,
    type: input.type,
    body: input.body,
    anonymousDisplayArea: `Persona verificada de ${eligibility.areaLabel}`,
    supportCount: input.type === 'firma' ? 1 : 0,
    questionAnswered: false,
    status: 'visible',
    createdAt: now(),
  }
  pajareoEntries = [entry, ...pajareoEntries]
  return entry
}

export function supportRepresentativePajareoEntry(entryId: string) {
  pajareoEntries = pajareoEntries.map(entry =>
    entry.id === entryId
      ? {...entry, supportCount: entry.supportCount + 1}
      : entry,
  )
  return pajareoEntries.find(entry => entry.id === entryId)
}

export function reportRepresentativePajareoEntry(entryId: string) {
  return pajareoEntries.find(entry => entry.id === entryId)
}

export function createOfficialPajareoResponse(
  input: CreateOfficialPajareoResponseInput,
) {
  const response: RepresentativePajareoOfficialResponse = {
    id: `paj-response-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    entryId: input.entryId,
    representativeId: input.representativeId,
    entityId: input.entityId,
    entityName: input.entityName,
    body: input.body,
    controllerHash: hashController(input.controllerDid),
    createdAt: now(),
  }
  pajareoOfficialResponses = [
    response,
    ...pajareoOfficialResponses.filter(item => item.entryId !== input.entryId),
  ]
  pajareoEntries = pajareoEntries.map(entry =>
    entry.id === input.entryId ? {...entry, questionAnswered: true} : entry,
  )
  return response
}

function hashController(controllerDid: string) {
  let hash = 0
  for (let i = 0; i < controllerDid.length; i++) {
    hash = (hash << 5) - hash + controllerDid.charCodeAt(i)
    hash |= 0
  }
  return `ctrl_${Math.abs(hash).toString(16).padStart(8, '0')}`
}
