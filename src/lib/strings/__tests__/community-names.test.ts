import {describe, expect, it} from '@jest/globals'

import {
  buildCommunitySearchQuery,
  formatCommunityName,
} from '#/lib/strings/community-names'

describe('community name formatting', () => {
  it('formats a bare community name with a single p/ prefix', () => {
    expect(formatCommunityName('Jalisco')).toMatchObject({
      displayName: 'p/Jalisco',
      plainName: 'Jalisco',
      slug: 'jalisco',
      searchName: 'Jalisco',
    })
  })

  it('keeps an already-prefixed community name idempotent', () => {
    expect(formatCommunityName('p/Jalisco')).toMatchObject({
      displayName: 'p/Jalisco',
      plainName: 'Jalisco',
      slug: 'jalisco',
      searchName: 'Jalisco',
    })
  })

  it('normalizes whitespace around the prefix and name', () => {
    expect(formatCommunityName('  p/   Nuevo Leon  ')).toMatchObject({
      displayName: 'p/Nuevo Leon',
      plainName: 'Nuevo Leon',
      slug: 'nuevo-leon',
      searchName: 'NuevoLeon',
    })
  })

  it('preserves mixed case in display while normalizing slug', () => {
    expect(formatCommunityName('p/cDmX')).toMatchObject({
      displayName: 'p/cDmX',
      plainName: 'cDmX',
      slug: 'cdmx',
      searchName: 'cDmX',
    })
  })

  it('removes accents for slug and search output', () => {
    expect(formatCommunityName('p/Nuevo León')).toMatchObject({
      displayName: 'p/Nuevo León',
      plainName: 'Nuevo León',
      slug: 'nuevo-leon',
      searchName: 'NuevoLeon',
    })
  })
})

describe('buildCommunitySearchQuery', () => {
  it('supports prefixed route params', () => {
    expect(buildCommunitySearchQuery('p/Jalisco')).toBe('Jalisco')
  })

  it('supports unprefixed route params', () => {
    expect(buildCommunitySearchQuery('Jalisco')).toBe('Jalisco')
  })

  it('prefers governance community while keeping the query normalized', () => {
    expect(buildCommunitySearchQuery('Jalisco', 'p/Nuevo León')).toBe(
      'NuevoLeon',
    )
  })
})
