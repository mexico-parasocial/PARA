import {RichText as RichTextAPI} from '@atproto/api'

import {inferPoliticalAffiliation} from '#/lib/political-affiliations'

// =============================================================================
// UNIFIED CIVIC INSIGNIA SYSTEM
// =============================================================================
// Party shields and community estandartes are the same thing: a visual
// identity mark for a civic entity. This module unifies both into one
// source of truth.
// =============================================================================

export type InsigniaColors = string[]

export type CivicInsigniaInfo = {
  abbreviation: string
  colors: InsigniaColors
  name: string
}

// =============================================================================
// PARTY INSIGNIAS (shield variant)
// =============================================================================

const PARTY_PREFIX_REGEX = /^\[([^\]]+)\]\s*/

/**
 * Extract a party insignia from the beginning of post text.
 * PARA posts prefix the party as `[MC] Title...` or `[PT] Title...`.
 */
export function extractPartyInsignia(text: string): {
  insignia: CivicInsigniaInfo | null
  textWithoutPrefix: string
} {
  const match = text.match(PARTY_PREFIX_REGEX)
  if (!match) {
    return {insignia: null, textWithoutPrefix: text}
  }

  const abbreviation = match[1].trim()
  const affiliation = inferPoliticalAffiliation(abbreviation)

  if (!affiliation) {
    return {insignia: null, textWithoutPrefix: text}
  }

  const textWithoutPrefix = text.slice(match[0].length)

  return {
    insignia: {
      abbreviation,
      colors: [affiliation.color],
      name: affiliation.name,
    },
    textWithoutPrefix,
  }
}

/**
 * Check if post text starts with a party prefix like `[MC]`.
 */
export function hasPartyPrefix(text: string): boolean {
  return PARTY_PREFIX_REGEX.test(text)
}

/**
 * Create a display RichText with the party prefix stripped.
 * Adjusts facet byte offsets to account for the removed prefix.
 */
export function createDisplayRichText(original: RichTextAPI): {
  richText: RichTextAPI
  prefixLength: number
} {
  const text = original.text
  const match = text.match(PARTY_PREFIX_REGEX)
  if (!match) {
    return {richText: original, prefixLength: 0}
  }

  const prefixLength = match[0].length
  const displayText = text.slice(prefixLength)

  const adjustedFacets = original.facets
    ?.map(facet => ({
      ...facet,
      index: {
        byteStart: Math.max(0, facet.index.byteStart - prefixLength),
        byteEnd: Math.max(0, facet.index.byteEnd - prefixLength),
      },
    }))
    .filter(facet => facet.index.byteEnd > 0)

  return {
    richText: new RichTextAPI({text: displayText, facets: adjustedFacets}),
    prefixLength,
  }
}

// =============================================================================
// COMMUNITY INSIGNIAS (banner variant)
// =============================================================================

const DEFAULT_INSIGNIA: InsigniaColors = ['#888888']

const COMMUNITY_INSIGNIAS: Record<string, InsigniaColors> = {
  // National parties — one brand color each (except PRI: flag tricolor)
  morena: ['#8B0000'],
  pan: ['#005EB8'],
  pri: ['#00843D', '#FFFFFF', '#CE1126'],
  pt: ['#D92027'],
  mc: ['#FF6600'],
  pvem: ['#50B747'],
  prd: ['#FFD700'],
  migala: ['#6B21A8'],

  // Demo local communities
  'presupuesto participativo centro': ['#005EB8'],
  'movilidad sostenible norte': ['#34C759'],
  'educacion y cultura sur': ['#AF52DE'],
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Get insignia colors for a community by name.
 * Falls back to a single grey color if unknown.
 */
export function getCommunityInsignia(name: string): InsigniaColors {
  const slug = slugify(name)
  const direct = COMMUNITY_INSIGNIAS[slug]
  if (direct) return direct

  for (const [key, colors] of Object.entries(COMMUNITY_INSIGNIAS)) {
    if (slug.includes(key) || key.includes(slug)) {
      return colors
    }
  }

  return DEFAULT_INSIGNIA
}

/**
 * Derive an insignia from a single hex color.
 * Creates a 2-color banner with the color + a darkened variant.
 */
export function insigniaFromColor(baseColor: string): InsigniaColors {
  return [baseColor, darkenColor(baseColor, 20)]
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max((num >> 16) - amount, 0)
  const g = Math.max(((num >> 8) & 0x00ff) - amount, 0)
  const b = Math.max((num & 0x0000ff) - amount, 0)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
