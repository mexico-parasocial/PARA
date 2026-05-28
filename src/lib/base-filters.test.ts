import {
  canonicalizeBaseCommunityFilter,
  classifyBaseFeedFilters,
  normalizeBaseFilterValue,
} from './base-filters'

describe('base feed filters', () => {
  it('classifies official parties as party filters', () => {
    expect(classifyBaseFeedFilters(['Morena'])).toEqual({party: 'p/Morena'})
    expect(classifyBaseFeedFilters(['p/PAN'])).toEqual({party: 'p/PAN'})
  })

  it('classifies ninths as community filters', () => {
    expect(classifyBaseFeedFilters(['Auth Left'])).toEqual({
      community: 'Auth Left',
    })
    expect(classifyBaseFeedFilters(['Lib Right'])).toEqual({
      community: 'Lib Right',
    })
  })

  it('ignores Mexican state filters for the party feed params', () => {
    expect(classifyBaseFeedFilters(['Nuevo León', 'Morena'])).toEqual({
      party: 'p/Morena',
    })
  })

  it('can return both party and community filters', () => {
    expect(classifyBaseFeedFilters(['MC', 'Center Left'])).toEqual({
      party: 'p/MC',
      community: 'Center Left',
    })
  })

  it('normalizes p/ prefixes case-insensitively', () => {
    expect(normalizeBaseFilterValue('P/PVEM')).toBe('pvem')
  })

  it('canonicalizes party communities to the same storage key', () => {
    expect(canonicalizeBaseCommunityFilter('PAN')).toBe('p/PAN')
    expect(canonicalizeBaseCommunityFilter('Auth Left')).toBe('Auth Left')
  })
})
