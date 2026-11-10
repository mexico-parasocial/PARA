import {type AssemblyDecisionReadView} from '#/lib/api/cabildeo'

/**
 * A cabildeo can carry a `protectedAction`: a community decision its assembly
 * votes on. Once resolved, the AppView counts the vote (quorum and threshold
 * are fixed by the protocol, not by the community) and, if it passed, says
 * which authority event to publish. The client never counts anything itself.
 */

/** The only actions an assembly can turn into an authority event. */
export type AssemblyActionId = 'membership.approve' | 'owner.recover'

export const ASSEMBLY_ACTIONS: ReadonlyArray<{
  id: AssemblyActionId
  title: string
  description: string
  subjectLabel: string
}> = [
  {
    id: 'membership.approve',
    title: 'Admitir a una persona',
    description:
      'La asamblea decide si una persona entra a una comunidad con admisión por asamblea. Gana la mayoría de los votos emitidos.',
    subjectLabel: 'Persona a admitir (DID)',
  },
  {
    id: 'owner.recover',
    title: 'Recuperar la titularidad',
    description:
      'La asamblea retira la titularidad a quien la ejerce o se la otorga a otra persona. Requiere dos tercios de los votos emitidos.',
    subjectLabel: 'Persona cuya titularidad cambia (DID)',
  },
]

/**
 * A decision only counts if voting stayed open at least this long (the AppView
 * enforces it; `ASSEMBLY_MIN_VOTING_MS` in `@atproto/common`). PARA never
 * writes a deadline, so the AppView's default of seven days applies.
 */
export const ASSEMBLY_MIN_VOTING_HOURS = 72

/** A decision has exactly two options: the first approves, the second rejects. */
export const ASSEMBLY_OPTIONS = [
  {label: 'Aprobar', description: 'La asamblea aprueba esta decisión.'},
  {label: 'Rechazar', description: 'La asamblea rechaza esta decisión.'},
] as const

export const COMMUNITY_BOARD_COLLECTION = 'com.para.community.board'
export const AUTHORITY_EVENT_COLLECTION = 'com.para.community.authorityEvent'

const DID_PATTERN = /^did:[a-z]+:[a-zA-Z0-9._:%-]*[a-zA-Z0-9._-]$/

export function isDid(value: string): boolean {
  return DID_PATTERN.test(value) && value.length <= 2048
}

/** Whether a community identifier is a board's AT URI, which the AppView requires. */
export function isBoardUri(value: string): boolean {
  return new RegExp(
    `^at://did:[^/]+/${COMMUNITY_BOARD_COLLECTION.replaceAll('.', '\\.')}/[^/]+$`,
  ).test(value)
}

export type AssemblyDraftProblem = 'community' | 'subject' | null

/** The first thing missing from a decision cabildeo, or null. */
export function assemblyDraftProblem(draft: {
  community: string
  subject: string
}): AssemblyDraftProblem {
  if (!isBoardUri(draft.community.trim())) return 'community'
  if (!isDid(draft.subject.trim())) return 'subject'
  return null
}

export function assemblyDraftProblemText(
  problem: Exclude<AssemblyDraftProblem, null>,
): string {
  return problem === 'community'
    ? 'Elige la comunidad de la lista: una decisión de asamblea necesita una comunidad concreta.'
    : 'Escribe el DID de la persona sobre la que decide la asamblea.'
}

export function protectedActionFor(action: AssemblyActionId, subject: string) {
  return {action, subject: subject.trim()}
}

const REASON_TEXT: Record<string, string> = {
  approved: 'La asamblea aprobó.',
  'no-ballots': 'Nadie votó.',
  'quorum-not-met': 'No se alcanzó el quórum.',
  'threshold-not-met': 'No se alcanzó la mayoría necesaria.',
}

const PROBLEM_TEXT: Record<string, string> = {
  'unknown-cabildeo': 'No se encontró este cabildeo.',
  'not-resolved': 'La votación aún no tiene resultado.',
  'wrong-community':
    'Este cabildeo no nombra a su comunidad por identificador, así que no puede fundamentar una decisión.',
  'record-changed':
    'El cabildeo se editó después de abrir la votación, así que su resultado ya no vale como decisión.',
  'too-short': `La votación estuvo abierta menos de ${ASSEMBLY_MIN_VOTING_HOURS} horas, así que su resultado no vale como decisión.`,
  'not-decidable': 'La asamblea no puede decidir esta acción.',
  options:
    'Una decisión de asamblea tiene exactamente dos opciones: aprobar y rechazar.',
  'not-admissible':
    'La persona no puede ser admitida ahora: la comunidad no admite por asamblea o la persona está suspendida, bloqueada o expulsada.',
}

export function assemblyReasonText(reason: string): string {
  return REASON_TEXT[reason] ?? reason
}

export function assemblyProblemText(problem: string): string {
  return PROBLEM_TEXT[problem] ?? problem
}

/** What the viewer can do with a resolved decision cabildeo. */
export type AssemblyDecisionState =
  | {kind: 'applied'; eventUri: string}
  | {kind: 'publishable'}
  | {kind: 'rejected'}
  | {kind: 'invalid'; problem: string}

export function assemblyDecisionState(
  decision: AssemblyDecisionReadView,
): AssemblyDecisionState {
  if (decision.appliedEvent) {
    return {kind: 'applied', eventUri: decision.appliedEvent}
  }
  if (decision.problem) return {kind: 'invalid', problem: decision.problem}
  if (decision.event) return {kind: 'publishable'}
  return {kind: 'rejected'}
}

/**
 * The `com.para.community.authorityEvent` that carries an approved decision
 * out. Anyone may publish it, because the vote is the authority, not the
 * issuer; the AppView recounts the vote when it arrives and refuses the event
 * if it does not hold.
 */
export function buildAssemblyDecisionEvent(opts: {
  community: string
  issuer: string
  decision: AssemblyDecisionReadView
  now?: Date
}) {
  const {event} = opts.decision
  if (!event) throw new Error('This decision has no event to publish.')
  const now = (opts.now ?? new Date()).toISOString()
  return {
    $type: AUTHORITY_EVENT_COLLECTION,
    community: opts.community,
    subject: event.subject,
    action: event.action,
    issuer: opts.issuer,
    effectiveAt: now,
    version: event.version,
    ...(event.predecessor ? {predecessor: event.predecessor} : {}),
    basis: 'assemblyDecision',
    evidence: event.evidence,
    createdAt: now,
  }
}
