import {describe, expect, it} from '@jest/globals'

import {
  countByGroup,
  countMatters,
  matchesMatters,
  MATTER_GROUPS,
  OFFICIAL_TAGS,
  resolveMatter,
  tagsForGroups,
} from '../matter-filter'

describe('matter groups', () => {
  it('mirrors the six parts of the composer', () => {
    expect(MATTER_GROUPS.map(group => group.number)).toEqual([
      '1.',
      '2.',
      '3.',
      '4.',
      '5.',
      '6.',
    ])
    expect(MATTER_GROUPS[0].title).toBe('Servicios Públicos')
    expect(MATTER_GROUPS.every(group => group.matters.length > 0)).toBe(true)
  })

  it('treats catalog flairs as official and the rest as unofficial', () => {
    const official = MATTER_GROUPS[0].matters[0]
    expect(resolveMatter(official.tag).official).toBe(true)
    expect(resolveMatter(official.tag.toUpperCase()).label).toBe(official.label)

    const unofficial = resolveMatter('|#NiUnaMenos')
    expect(unofficial.official).toBe(false)
    expect(unofficial.label).toBe('Ni Una Menos')
  })
})

describe('matter counts and matching', () => {
  const official = MATTER_GROUPS[0].matters[0]

  it('counts only single-pipe flairs, once per item', () => {
    const counts = countMatters([
      ['||#Policy', '|#NiUnaMenos'],
      ['|#niunamenos'],
      [official.tag],
      ['||#Policy'],
      undefined,
    ])
    expect(counts.get('|#niunamenos')?.count).toBe(2)
    expect(counts.get(official.key)?.count).toBe(1)
    expect(counts.size).toBe(2)
  })

  it('matches everything when nothing is selected', () => {
    expect(matchesMatters(['||#Policy'], [])).toBe(true)
  })

  it('matches an item whose matter is selected, ignoring case', () => {
    expect(matchesMatters(['|#NiUnaMenos'], ['|#niunamenos'])).toBe(true)
    expect(matchesMatters(['|#Otro'], ['|#NiUnaMenos'])).toBe(false)
    expect(matchesMatters(['||#Policy'], ['|#NiUnaMenos'])).toBe(false)
  })
})

describe('group selection', () => {
  it('expands chosen groups into their flairs', () => {
    const group = MATTER_GROUPS[2]
    expect(tagsForGroups([group.key])).toEqual(group.matters.map(m => m.tag))
  })

  it('falls back to every official flair, or none', () => {
    expect(tagsForGroups([], true)).toEqual(OFFICIAL_TAGS)
    expect(tagsForGroups([], false)).toEqual([])
    expect(OFFICIAL_TAGS.length).toBeGreaterThan(MATTER_GROUPS.length)
  })

  it('sums counts per group and ignores unofficial matters', () => {
    const [first, second] = MATTER_GROUPS[0].matters
    const counts = countMatters([
      [first.tag],
      [first.tag],
      [second.tag],
      ['|#Otro'],
    ])
    const byGroup = countByGroup(counts)
    expect(byGroup.get(MATTER_GROUPS[0].key)).toBe(3)
    expect(byGroup.size).toBe(1)
  })
})
