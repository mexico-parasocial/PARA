/**
 * Party-level stats for cabildeos, derived from the AppView's
 * `partyVoteSummary` — the real per-party vote breakdown the backend
 * hydrates for `party_only` cabildeos (party strings come from each
 * voter's declared `para_status.party`, `'unaffiliated'` when absent).
 */

import {type CabildeoView} from '#/lib/cabildeo-client'
import {PARTY_COMPASS_PROFILES} from '#/lib/compass/party-distributions'

const UNAFFILIATED = 'unaffiliated'

/** Neutral fallback for parties without a compass profile (free text). */
const UNMATCHED_PARTY_COLOR = '#8a99a8'

export type PartyStat = {
  id: string
  name: string
  color: string
}

function partyStatFor(party: string): PartyStat {
  if (party === UNAFFILIATED) {
    return {id: UNAFFILIATED, name: 'Sin partido', color: UNMATCHED_PARTY_COLOR}
  }
  const normalized = party.trim().toLowerCase()
  const profile = PARTY_COMPASS_PROFILES.find(
    p =>
      p.id.toLowerCase() === normalized || p.name.toLowerCase() === normalized,
  )
  if (profile) {
    return {id: profile.id, name: profile.name, color: profile.color}
  }
  return {id: party, name: party, color: UNMATCHED_PARTY_COLOR}
}

function pluralityOption(entry: {byOption: number[]}) {
  if (entry.byOption.length === 0) return -1
  return entry.byOption.indexOf(Math.max(...entry.byOption))
}

/**
 * Total votes per party across the given cabildeos, highest first.
 * Only counts parties that actually appear in vote records.
 */
export function getPartyParticipation(
  cabildeos: CabildeoView[],
): Array<{party: PartyStat; count: number}> {
  const counts = new Map<string, {party: PartyStat; count: number}>()
  for (const cabildeo of cabildeos) {
    for (const entry of cabildeo.partyVoteSummary ?? []) {
      if (!entry.total) continue
      const party = partyStatFor(entry.party)
      const existing = counts.get(party.id)
      counts.set(party.id, {
        party,
        count: (existing?.count ?? 0) + entry.total,
      })
    }
  }
  return Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || a.party.name.localeCompare(b.party.name),
  )
}

/**
 * Cabildeos where members of the given party have cast votes.
 */
export function getCabildeosForParty(
  cabildeos: CabildeoView[],
  partyId: string,
) {
  return cabildeos.filter(cabildeo =>
    (cabildeo.partyVoteSummary ?? []).some(
      entry => entry.total > 0 && partyStatFor(entry.party).id === partyId,
    ),
  )
}

/**
 * Per party: how many of the viewer's own votes landed on the same option
 * that party's voters preferred. Real agreement, counted only where party
 * summaries exist (i.e. `party_only` visibility cabildeos).
 */
export function getViewerVoteAlignment(
  votedCabildeos: CabildeoView[],
): Array<{party: PartyStat; count: number}> {
  const counts = new Map<string, {party: PartyStat; count: number}>()
  for (const cabildeo of votedCabildeos) {
    const viewerOption = cabildeo.userContext?.viewerVoteOption
    if (typeof viewerOption !== 'number') continue
    for (const entry of cabildeo.partyVoteSummary ?? []) {
      if (entry.party === UNAFFILIATED || !entry.total) continue
      if (pluralityOption(entry) !== viewerOption) continue
      const party = partyStatFor(entry.party)
      const existing = counts.get(party.id)
      counts.set(party.id, {
        party,
        count: (existing?.count ?? 0) + 1,
      })
    }
  }
  return Array.from(counts.values()).sort(
    (a, b) => b.count - a.count || a.party.name.localeCompare(b.party.name),
  )
}

/**
 * Parties whose voters' majority option matches the viewer's vote on a
 * single cabildeo, strongest participation first.
 */
export function getMatchingPartiesForCabildeo(
  cabildeo: CabildeoView,
): PartyStat[] {
  const viewerOption = cabildeo.userContext?.viewerVoteOption
  if (typeof viewerOption !== 'number') return []
  return (cabildeo.partyVoteSummary ?? [])
    .filter(
      entry =>
        entry.party !== UNAFFILIATED &&
        entry.total > 0 &&
        pluralityOption(entry) === viewerOption,
    )
    .map(entry => partyStatFor(entry.party))
    .sort((a, b) => a.name.localeCompare(b.name))
}
