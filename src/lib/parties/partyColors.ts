/*
 * Party colors for maps and electoral data: district accents, city markers
 * and district profiles. Every map screen reads them from here; do not write
 * a party hex value anywhere else.
 *
 * Not yet the same palette as `#/lib/party-feeds` (community and feed
 * colors), which gives several parties different values, PRI red instead of
 * green among them. Merging the two is an open product decision.
 */

export const PARTY_COLORS: Readonly<Record<string, string>> = {
  Morena: '#8B1538',
  PAN: '#003087',
  PRI: '#00923F',
  MC: '#FF6B00',
  PVEM: '#228B22',
  PT: '#FF0000',
  PRD: '#FFD700',
}

/** For a party with no color of its own, or none at all. */
export const PARTY_FALLBACK_COLOR = '#6B7280'

/** Yellow text is unreadable, so PRD labels use a darker gold. */
const TEXT_COLORS: Readonly<Record<string, string>> = {
  PRD: '#B8860B',
}

/** Light parties need a stronger tint to show on a light background. */
const TINT_ALPHA: Readonly<Record<string, string>> = {
  PRD: '30',
}
const DEFAULT_TINT_ALPHA = '20'

/** The party's color, for fills, markers and accents. */
export function partyColor(party: string | undefined): string {
  return (party && PARTY_COLORS[party]) || PARTY_FALLBACK_COLOR
}

/** The party's color for text and icons on a light tint of that color. */
export function partyTextColor(party: string | undefined): string {
  return (party && TEXT_COLORS[party]) || partyColor(party)
}

/** A translucent background in the party's color, behind its label. */
export function partyTint(party: string | undefined): string {
  const alpha =
    (party && party in PARTY_COLORS && TINT_ALPHA[party]) || DEFAULT_TINT_ALPHA
  return `${partyColor(party)}${alpha}`
}
