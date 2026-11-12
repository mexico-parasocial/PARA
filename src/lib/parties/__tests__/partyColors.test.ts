import {getCitiesForState} from '#/lib/constants/mexicoCityData'
import {
  PARTY_COLORS,
  PARTY_FALLBACK_COLOR,
  partyColor,
  partyTextColor,
  partyTint,
} from '#/lib/parties/partyColors'

describe('partyColor', () => {
  it('returns the party color', () => {
    expect(partyColor('PRI')).toBe(PARTY_COLORS.PRI)
  })

  it('falls back for an unknown or missing party', () => {
    expect(partyColor('Partido Nuevo')).toBe(PARTY_FALLBACK_COLOR)
    expect(partyColor(undefined)).toBe(PARTY_FALLBACK_COLOR)
    expect(partyColor('')).toBe(PARTY_FALLBACK_COLOR)
  })
})

describe('partyTextColor', () => {
  it('darkens PRD so its label stays readable', () => {
    expect(partyTextColor('PRD')).toBe('#B8860B')
  })

  it('uses the party color otherwise', () => {
    expect(partyTextColor('PAN')).toBe(PARTY_COLORS.PAN)
    expect(partyTextColor('Partido Nuevo')).toBe(PARTY_FALLBACK_COLOR)
  })
})

describe('partyTint', () => {
  it('appends a light alpha to the party color', () => {
    expect(partyTint('Morena')).toBe(`${PARTY_COLORS.Morena}20`)
    expect(partyTint('Partido Nuevo')).toBe(`${PARTY_FALLBACK_COLOR}20`)
  })

  it('uses a stronger tint for PRD', () => {
    expect(partyTint('PRD')).toBe(`${PARTY_COLORS.PRD}30`)
  })
})

describe('getCitiesForState', () => {
  it('matches a state regardless of accents and case', () => {
    const cities = getCitiesForState('nuevo leon')
    expect(cities.length).toBeGreaterThan(0)
    expect(getCitiesForState('Nuevo León')).toBe(cities)
  })

  it('returns no cities for an unknown state', () => {
    expect(getCitiesForState('Atlántida')).toEqual([])
  })
})
