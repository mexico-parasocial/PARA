import {AUTHORITY_EVENT_COLLECTION} from '#/lib/assembly-decision'
import {
  type CommunityRoleHolder,
  type CommunityRoleOffer,
} from '#/lib/community-governance'

/**
 * A moderator is appointed with consent, in three records: the owner's offer,
 * the member's acceptance, and the owner's appointment (an authority event)
 * citing the acceptance. The AppView checks all three; nothing here decides.
 */
export const ROLE_OFFER_COLLECTION = 'com.para.community.roleOffer'
export const ROLE_ACCEPTANCE_COLLECTION = 'com.para.community.roleAcceptance'

type Clock = {now?: Date}
const stamp = (opts: Clock) => (opts.now ?? new Date()).toISOString()

export function buildRoleOffer(
  opts: {community: string; subject: string} & Clock,
) {
  return {
    $type: ROLE_OFFER_COLLECTION,
    community: opts.community,
    role: 'moderator',
    subject: opts.subject,
    createdAt: stamp(opts),
  }
}

export function buildRoleAcceptance(
  opts: {community: string; offer: CommunityRoleOffer; subject: string} & Clock,
) {
  if (opts.offer.subject !== opts.subject) {
    throw new Error('Esta oferta es para otra persona.')
  }
  return {
    $type: ROLE_ACCEPTANCE_COLLECTION,
    community: opts.community,
    role: opts.offer.role,
    subject: opts.subject,
    offer: opts.offer.uri,
    createdAt: stamp(opts),
  }
}

/** The owner's appointment, once the member accepted. */
export function buildModeratorAppointment(
  opts: {
    community: string
    issuer: string
    offer: CommunityRoleOffer
  } & Clock,
) {
  const {offer} = opts
  if (!offer.acceptanceUri) {
    throw new Error('La persona aún no acepta la oferta.')
  }
  if (offer.offeredBy !== opts.issuer) {
    throw new Error('Solo quien hizo la oferta puede publicar el nombramiento.')
  }
  const now = stamp(opts)
  return {
    $type: AUTHORITY_EVENT_COLLECTION,
    community: opts.community,
    subject: offer.subject,
    action: 'moderator.grant',
    issuer: opts.issuer,
    effectiveAt: now,
    predecessor: offer.subjectEventUri,
    version: offer.subjectEventVersion + 1,
    basis: 'ownerAppointment',
    evidence: offer.acceptanceUri,
    createdAt: now,
  }
}

/** A moderator steps down. Only they may, so subject and issuer are the same. */
export function buildModeratorResignation(
  opts: {community: string; holder: CommunityRoleHolder} & Clock,
) {
  const {holder} = opts
  const next = nextEvent(holder)
  const now = stamp(opts)
  return {
    $type: AUTHORITY_EVENT_COLLECTION,
    community: opts.community,
    subject: holder.did,
    action: 'moderator.resign',
    issuer: holder.did,
    effectiveAt: now,
    ...next,
    basis: 'resignation',
    createdAt: now,
  }
}

/** The owner ends an appointment, naming what it rested on. */
export function buildModeratorRevocation(
  opts: {
    community: string
    issuer: string
    holder: CommunityRoleHolder
  } & Clock,
) {
  const {holder} = opts
  if (!holder.evidence) {
    throw new Error('No se sabe en qué se basa este nombramiento.')
  }
  const now = stamp(opts)
  return {
    $type: AUTHORITY_EVENT_COLLECTION,
    community: opts.community,
    subject: holder.did,
    action: 'moderator.revoke',
    issuer: opts.issuer,
    effectiveAt: now,
    ...nextEvent(holder),
    basis: 'ownerAppointment',
    evidence: holder.evidence,
    createdAt: now,
  }
}

function nextEvent(holder: CommunityRoleHolder) {
  if (!holder.eventUri || !holder.eventVersion) {
    throw new Error('Falta el último evento de autoridad de esta persona.')
  }
  return {predecessor: holder.eventUri, version: holder.eventVersion + 1}
}

/** Offers addressed to `did` that it has not answered yet. */
export function incomingOffers(
  offers: ReadonlyArray<CommunityRoleOffer>,
  did: string | undefined,
) {
  if (!did) return []
  return offers.filter(offer => offer.subject === did && !offer.acceptanceUri)
}

/** Offers `did` made as owner, split by whether the member has answered. */
export function outgoingOffers(
  offers: ReadonlyArray<CommunityRoleOffer>,
  did: string | undefined,
) {
  const mine = did ? offers.filter(offer => offer.offeredBy === did) : []
  return {
    waiting: mine.filter(offer => !offer.acceptanceUri),
    accepted: mine.filter(offer => Boolean(offer.acceptanceUri)),
  }
}

/** Members who can be offered the role: active, and not already holding office. */
export function offerCandidates<T extends {did: string}>(
  members: ReadonlyArray<T>,
  opts: {
    holders: ReadonlyArray<CommunityRoleHolder>
    offers: ReadonlyArray<CommunityRoleOffer>
    viewerDid: string | undefined
  },
) {
  const excluded = new Set<string>([
    ...(opts.viewerDid ? [opts.viewerDid] : []),
    ...opts.holders
      .filter(holder => holder.role === 'owner' || holder.role === 'moderator')
      .map(holder => holder.did),
    ...opts.offers.map(offer => offer.subject),
  ])
  return members.filter(member => !excluded.has(member.did))
}
