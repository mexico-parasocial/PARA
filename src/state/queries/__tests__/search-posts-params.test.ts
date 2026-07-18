import {describe, expect, it} from '@jest/globals'

import {
  extractedOperatorsToSearchFilters,
  extractSearchPostsParams,
} from '#/state/queries/search-posts-params'

describe('extractSearchPostsParams', () => {
  it('lifts upstream operators and strips them from q', () => {
    const result = extractSearchPostsParams(
      'presupuesto from:alice.domain.com domain:bsky.app #educacion since:2024-01-01',
    )
    expect(result.q).toBe('presupuesto')
    expect(result.author).toBe('alice.domain.com')
    expect(result.domain).toBe('bsky.app')
    expect(result.tag).toEqual(['educacion'])
    expect(result.since).toBe('2024-01-01')
  })

  it('lifts PARA operators', () => {
    const result = extractSearchPostsParams(
      'state:Jalisco district:distrito-1 phase:votacion party:PAN compass:center-left area:salud area:educacion',
    )
    expect(result.q).toBe('')
    expect(result.state).toBe('Jalisco')
    expect(result.district).toBe('distrito-1')
    expect(result.phase).toBe('votacion')
    expect(result.party).toBe('PAN')
    expect(result.compass).toBe('center-left')
    expect(result.area).toEqual(['salud', 'educacion'])
  })

  it('strips a leading @ from from:, mentions:, and to: handle values', () => {
    expect(extractSearchPostsParams('cats from:@alice.bsky.social')).toEqual({
      q: 'cats',
      author: 'alice.bsky.social',
    })
    expect(
      extractSearchPostsParams('cats mentions:@alice.bsky.social'),
    ).toEqual({
      q: 'cats',
      mentions: 'alice.bsky.social',
    })
    expect(extractSearchPostsParams('cats to:@alice.bsky.social')).toEqual({
      q: 'cats',
      mentions: 'alice.bsky.social',
    })
  })

  it('leaves unsupported operators in q', () => {
    const result = extractSearchPostsParams('media:true replies:none foo')
    expect(result.q).toBe('media:true replies:none foo')
  })
})

describe('extractedOperatorsToSearchFilters', () => {
  it('converts lifted operators to SearchFilters', () => {
    const lifted = extractSearchPostsParams(
      'presupuesto state:Jalisco district:distrito-1',
    )
    const filters = extractedOperatorsToSearchFilters(lifted)
    expect(filters).toEqual({
      state: 'Jalisco',
      districtKey: 'distrito-1',
    })
  })

  it('merges list fields with existing filters', () => {
    const filters = extractedOperatorsToSearchFilters(
      {
        tag: ['educacion', 'salud'],
        community: 'at://did:plc:comm',
        area: ['transporte'],
      },
      {tag: 'ciudad', communityUris: 'at://did:plc:existing'},
    )
    expect(filters.tag).toBe('ciudad educacion salud transporte')
    expect(filters.communityUris).toBe(
      'at://did:plc:existing,at://did:plc:comm',
    )
  })

  it('lets lifted scalar operators override existing filters', () => {
    const filters = extractedOperatorsToSearchFilters(
      {state: 'Jalisco'},
      {state: 'Nayarit'},
    )
    expect(filters.state).toBe('Jalisco')
  })
})
