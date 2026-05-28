import {
  type CabildeoAccessTier,
  type OfficialActionType,
  type OfficialCivicActionRecord,
  type OfficialCivicControllerRecord,
  type OfficialCivicEntityRecord,
  type OfficialCivicScope,
  type OfficialControllerVisibility,
} from '#/lib/api/para-lexicons'
import {type RepresentativeItem} from '#/lib/mock-data'

export const OFFICIAL_CIVIC_SCOPES: Array<{
  value: OfficialCivicScope
  label: string
}> = [
  {value: 'official.profile.manage', label: 'Administrar perfil'},
  {value: 'official.controllers.manage', label: 'Administrar controladores'},
  {value: 'official.post.write', label: 'Publicar oficialmente'},
  {value: 'official.pajareo.respond', label: 'Responder Pajareo'},
  {value: 'official.cabildeo.sign', label: 'Firmar cabildeo'},
  {value: 'official.audit.view', label: 'Ver auditoría'},
]

export const CABILDEO_ACCESS_TIERS: Array<{
  value: CabildeoAccessTier
  label: string
  description: string
}> = [
  {value: 'public', label: 'Público', description: 'Cualquier persona puede verlo.'},
  {value: 'signed_in', label: 'Sesión iniciada', description: 'Requiere cuenta PARA.'},
  {value: 'verified_human', label: 'Humano verificado', description: 'Puede participar sin revelar identidad pública.'},
  {value: 'verified_area', label: 'Área verificada', description: 'Requiere verificación del territorio.'},
  {value: 'community_member', label: 'Miembro de comunidad', description: 'Requiere pertenecer a la comunidad.'},
  {value: 'delegate', label: 'Delegado', description: 'Requiere rol o mandato delegado.'},
  {value: 'official_controller', label: 'Controlador oficial', description: 'Solo cuentas cívicas oficiales autorizadas.'},
]

export type OfficialCivicAccount = OfficialCivicEntityRecord & {
  id: string
  representativeId?: string
  avatarColor: string
}

export type ViewerOfficialCivicAccount = OfficialCivicAccount & {
  viewerController: OfficialCivicController
}

export type OfficialCivicController = OfficialCivicControllerRecord & {
  id: string
  entityId: string
  displayName: string
}

export type OfficialCivicAction = OfficialCivicActionRecord & {
  id: string
  entityId: string
  entityName?: string
}

const now = () => new Date().toISOString()

const seededAccounts: Record<string, Partial<OfficialCivicAccount>> = {
  fed_exec_1: {
    status: 'verified',
    entityDid: 'did:plc:para-official-federal-executive',
    source: 'Perfil oficial reservado por PARA',
  },
  gov_nl_1: {
    status: 'verified',
    entityDid: 'did:plc:para-official-nuevo-leon-governor',
    source: 'Perfil oficial reservado por PARA',
  },
}

let controllers: OfficialCivicController[] = [
  {
    id: 'ctrl-fed-exec-alice',
    entity: 'official:representative:fed_exec_1',
    entityId: 'official:representative:fed_exec_1',
    controllerDid: 'did:plc:alice',
    displayName: 'Controlador verificado',
    scopes: [
      'official.profile.manage',
      'official.post.write',
      'official.pajareo.respond',
      'official.cabildeo.sign',
      'official.audit.view',
    ],
    status: 'active',
    visibilityDefault: 'entity_default',
    approvedByDid: 'did:plc:para-admin',
    createdAt: now(),
  },
]

let actions: OfficialCivicAction[] = [
  {
    id: 'act-fed-water-response',
    entity: 'official:representative:fed_exec_1',
    entityId: 'official:representative:fed_exec_1',
    entityName: 'Presidencia de México',
    actionType: 'pajareo.response',
    subjectUri: 'pajareo-sheinbaum-001',
    recordUri: 'at://did:plc:para-official-federal-executive/com.para.official.action/pajareo-water',
    controllerHash: 'ctrl_7e1a6f44',
    controllerVisibility: 'entity_default',
    summary: 'La oficina dará seguimiento público al calendario de agua y transporte.',
    createdAt: now(),
  },
]

export function getOfficialEntityIdForRepresentative(representativeId: string) {
  return `official:representative:${representativeId}`
}

export function getOfficialCivicAccountForRepresentative(
  representative: RepresentativeItem,
): OfficialCivicAccount {
  const seeded = seededAccounts[representative.id]
  const status =
    seeded?.status ??
    representative.status ??
    (representative.did ? 'verified' : 'unclaimed')

  return {
    id: getOfficialEntityIdForRepresentative(representative.id),
    representativeId: representative.id,
    kind: 'representative',
    status,
    name: representative.name,
    handle: representative.handle,
    office: representative.office ?? representative.category,
    jurisdiction: representative.jurisdiction ?? representative.state,
    state: representative.state,
    source: seeded?.source ?? representative.source,
    entityDid: seeded?.entityDid ?? representative.did,
    avatarColor: representative.avatarColor,
    createdAt: now(),
    updatedAt: now(),
  }
}

export function getOfficialControllers(entityId: string) {
  return controllers.filter(controller => controller.entityId === entityId)
}

export function getActiveOfficialControllers(entityId: string) {
  return getOfficialControllers(entityId).filter(
    controller => controller.status === 'active',
  )
}

export function getOfficialControllerForViewer(
  entityId: string,
  viewerDid?: string,
) {
  if (!viewerDid) return undefined
  return getActiveOfficialControllers(entityId).find(
    controller => controller.controllerDid === viewerDid,
  )
}

export function getViewerOfficialControllerAccounts(
  representatives: RepresentativeItem[],
  viewerDid?: string,
) {
  if (!viewerDid) return []
  return representatives
    .map(account => {
      const officialAccount = getOfficialCivicAccountForRepresentative(account)
      const viewerController = getOfficialControllerForViewer(
        officialAccount.id,
        viewerDid,
      )
      return viewerController
        ? ({...officialAccount, viewerController} satisfies ViewerOfficialCivicAccount)
        : null
    })
    .filter((account): account is ViewerOfficialCivicAccount =>
      Boolean(account),
    )
}

export function hasOfficialScope(
  controller: OfficialCivicController | undefined,
  scope: OfficialCivicScope,
) {
  return Boolean(controller?.status === 'active' && controller.scopes.includes(scope))
}

export function createOfficialAction(input: {
  entityId: string
  controllerDid: string
  actionType: OfficialActionType
  subjectUri: string
  summary: string
  entityName?: string
  recordUri?: string
  controllerVisibility?: OfficialControllerVisibility
}) {
  const action: OfficialCivicAction = {
    id: `official-act-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    entity: input.entityId,
    entityId: input.entityId,
    entityName: input.entityName,
    actionType: input.actionType,
    subjectUri: input.subjectUri,
    recordUri: input.recordUri,
    controllerHash: hashController(input.controllerDid),
    controllerVisibility: input.controllerVisibility ?? 'entity_default',
    revealedControllerDid:
      input.controllerVisibility === 'revealed' ? input.controllerDid : undefined,
    summary: input.summary,
    createdAt: now(),
  }
  actions = [action, ...actions]
  return action
}

export function getOfficialActionsForSubject(subjectUri: string) {
  return actions.filter(action => action.subjectUri === subjectUri)
}

export function getOfficialCabildeoSignatures(cabildeoUri: string) {
  return getOfficialActionsForSubject(cabildeoUri).filter(
    action => action.actionType === 'cabildeo.signature',
  )
}

export function signOfficialCabildeo(input: {
  account: OfficialCivicAccount
  controllerDid: string
  cabildeoUri: string
  summary: string
}) {
  return createOfficialAction({
    entityId: input.account.id,
    entityName: input.account.name,
    controllerDid: input.controllerDid,
    actionType: 'cabildeo.signature',
    subjectUri: input.cabildeoUri,
    summary: input.summary,
    recordUri: input.account.entityDid
      ? `at://${input.account.entityDid}/com.para.official.action/${Date.now()}`
      : undefined,
  })
}

export function evaluateCabildeoAccess({
  tier,
  viewerDid,
  officialControllers,
}: {
  tier?: CabildeoAccessTier
  viewerDid?: string
  officialControllers?: OfficialCivicController[]
}) {
  const required = tier ?? 'public'
  if (required === 'public') return {allowed: true, reason: 'Público'}
  if (!viewerDid) return {allowed: false, reason: 'Requiere iniciar sesión'}
  if (required === 'signed_in') return {allowed: true, reason: 'Sesión activa'}
  if (required === 'verified_human') {
    return {allowed: true, reason: 'Humano verificado'}
  }
  if (required === 'verified_area') {
    return {allowed: true, reason: 'Área verificada'}
  }
  if (required === 'community_member') {
    return {allowed: true, reason: 'Miembro de comunidad'}
  }
  if (required === 'delegate') {
    return {allowed: true, reason: 'Delegado'}
  }
  const canActOfficially = Boolean(
    officialControllers?.some(controller =>
      hasOfficialScope(controller, 'official.cabildeo.sign'),
    ),
  )
  return {
    allowed: canActOfficially,
    reason: canActOfficially
      ? 'Controlador oficial'
      : 'Requiere controlador oficial',
  }
}

export function getAccessTierLabel(tier?: CabildeoAccessTier) {
  return (
    CABILDEO_ACCESS_TIERS.find(item => item.value === (tier ?? 'public'))
      ?.label ?? 'Público'
  )
}

function hashController(controllerDid: string) {
  let hash = 0
  for (let i = 0; i < controllerDid.length; i++) {
    hash = (hash << 5) - hash + controllerDid.charCodeAt(i)
    hash |= 0
  }
  return `ctrl_${Math.abs(hash).toString(16).padStart(8, '0')}`
}
