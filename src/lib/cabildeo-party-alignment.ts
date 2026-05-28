/**
 * Deterministic party alignment for cabildeos.
 * In a production system this would come from user/AI tagging or community metadata.
 * For MVP we use a simple hash of the cabildeo URI mapped to party profiles.
 */

import {type CabildeoView} from '#/lib/cabildeo-client'
import {PARTY_COMPASS_PROFILES} from '#/lib/compass/party-distributions'

const PARTIES = PARTY_COMPASS_PROFILES.map(p => ({
  id: p.id,
  name: p.name,
  color: p.color,
}))

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export type AlignedParty = {
  id: string
  name: string
  color: string
}

/**
 * Returns the most-aligned party for a given cabildeo.
 * Deterministic — same cabildeo always returns same party.
 */
export function getCabildeoAlignedParty(cabildeo: CabildeoView): AlignedParty {
  const hash = hashString(cabildeo.uri)
  const idx = hash % PARTIES.length
  return PARTIES[idx]
}

/**
 * Aggregate vote breakdown by party for a list of voted cabildeos.
 */
export function getVoteBreakdownByParty(cabildeos: CabildeoView[]) {
  const voted = cabildeos.filter(
    c => c.userContext?.viewerVoteOption !== undefined,
  )
  const counts = new Map<string, {party: AlignedParty; count: number}>()

  for (const c of voted) {
    const party = getCabildeoAlignedParty(c)
    const existing = counts.get(party.id)
    if (existing) {
      existing.count++
    } else {
      counts.set(party.id, {party, count: 1})
    }
  }

  return Array.from(counts.values()).sort((a, b) => b.count - a.count)
}
