import {
  type CommunityRoleHolder,
  type CommunityRoleOffer,
} from '#/lib/community-governance'

/*
 * A moderator is appointed with consent, in two steps: an owner offers the
 * office and the member accepts it. Each step is one community action; the
 * host decides whether it counts, nothing here does.
 */

/** Offers addressed to `did` that it has not answered yet. */
export function incomingOffers(
  offers: ReadonlyArray<CommunityRoleOffer>,
  did: string | undefined,
) {
  if (!did) return []
  return offers.filter(offer => offer.subject === did)
}

/** Offers `did` made that the member has not answered yet. */
export function outgoingOffers(
  offers: ReadonlyArray<CommunityRoleOffer>,
  did: string | undefined,
) {
  return did ? offers.filter(offer => offer.offeredBy === did) : []
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
