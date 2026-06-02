import {type CabildeoReadView} from '#/lib/api/cabildeo'
import {
  buildVsEntityOptions,
  buildVsScreenViewModel,
  resolveVsEntities,
  setVsEntityInPair,
  swapVsEntities,
} from '#/lib/vs-screen'

function cabildeo(
  overrides: Partial<CabildeoReadView> & {
    uri: string
    title: string
    community: string
  },
): CabildeoReadView {
  const {uri, title, community, ...rest} = overrides
  const base: CabildeoReadView = {
    uri,
    cid: `cid-${uri}`,
    creator: 'did:plc:creator',
    indexedAt: '2026-01-10T00:00:00.000Z',
    title,
    description: overrides.description || 'Policy description',
    community,
    communities: overrides.communities,
    flairs: overrides.flairs || [],
    options: [{label: 'A favor'}, {label: 'En contra'}],
    phase: overrides.phase || 'open',
    createdAt: overrides.createdAt || '2026-01-10T00:00:00.000Z',
    optionSummary: overrides.optionSummary || [
      {optionIndex: 0, label: 'A favor', votes: 8, positions: 2},
      {optionIndex: 1, label: 'En contra', votes: 2, positions: 1},
    ],
    positionCounts: overrides.positionCounts || {
      total: 3,
      for: 2,
      against: 1,
      amendment: 0,
      byOption: [],
    },
    voteTotals: overrides.voteTotals || {
      total: 10,
      direct: 7,
      delegated: 3,
    },
  }

  return {
    ...base,
    ...rest,
  }
}

describe('buildVsScreenViewModel', () => {
  it('matches compared entities across primary and secondary communities', () => {
    const view = buildVsScreenViewModel({
      cabildeos: [
        cabildeo({
          uri: 'at://one',
          title: 'Water plan',
          community: 'p/Jalisco',
          communities: ['p/Jalisco', 'p/CDMX'],
        }),
        cabildeo({
          uri: 'at://two',
          title: 'Unrelated plan',
          community: 'p/Puebla',
        }),
      ],
      entities: ['p/Jalisco', 'p/CDMX'],
      selectedTopic: 'all',
    })

    expect(view.totalRelevant).toBe(1)
    expect(view.entities[0].debateCount).toBe(1)
    expect(view.entities[1].debateCount).toBe(1)
    expect(view.entities[0].sharedCount).toBe(1)
  })

  it('classifies cabildeos into the local six policy axes', () => {
    const view = buildVsScreenViewModel({
      cabildeos: [
        cabildeo({
          uri: 'at://economy',
          title: 'Minimum salary increase',
          community: 'p/Jalisco',
        }),
        cabildeo({
          uri: 'at://environment',
          title: 'Water and park recovery',
          community: 'p/CDMX',
        }),
      ],
      entities: ['p/Jalisco', 'p/CDMX'],
      selectedTopic: 'all',
    })

    const economy = view.policyAxisComparisons.find(
      row => row.key === 'economy',
    )
    const environment = view.policyAxisComparisons.find(
      row => row.key === 'environment',
    )

    expect(economy?.entityDebateCounts).toEqual([1, 0])
    expect(environment?.entityDebateCounts).toEqual([0, 1])
  })

  it('merges RAQ community alignment without inventing missing scores', () => {
    const view = buildVsScreenViewModel({
      cabildeos: [],
      entities: ['p/Jalisco', 'p/CDMX'],
      selectedTopic: 'all',
      raqAlignments: [
        [
          {
            axisId: 'eco_coord',
            axisTitle: 'Economic Coordination',
            score: 75,
            label: 'Planning',
          },
        ],
        [
          {
            axisId: 'eco_coord',
            axisTitle: 'Economic Coordination',
            score: 25,
            label: 'Market',
          },
        ],
      ],
    })

    const row = view.raqAxisComparisons.find(
      axis => axis.axisId === 'eco_coord',
    )

    expect(row?.entityScores).toEqual([75, 25])
    expect(row?.delta).toBe(50)
    expect(
      view.raqAxisComparisons.find(axis => axis.axisId === 'eco_dist')
        ?.entityScores,
    ).toEqual([null, null])
  })

  it('returns stable empty state data', () => {
    const view = buildVsScreenViewModel({
      cabildeos: [],
      entities: ['p/Jalisco', 'p/CDMX'],
      selectedTopic: 'all',
    })

    expect(view.totalRelevant).toBe(0)
    expect(view.tableRows).toEqual([])
    expect(view.entities[0].participationTotal).toBe(0)
  })

  it('falls back to all topics when the selected topic is not available', () => {
    const view = buildVsScreenViewModel({
      cabildeos: [
        cabildeo({
          uri: 'at://topic',
          title: 'Education budget',
          community: 'p/Jalisco',
          flairs: ['#Education'],
        }),
      ],
      entities: ['p/Jalisco', 'p/CDMX'],
      selectedTopic: 'water',
    })

    expect(view.selectedTopic).toBe('all')
    expect(view.totalRelevant).toBe(1)
  })

  it('rolls up direct, delegated, vote, and position totals', () => {
    const view = buildVsScreenViewModel({
      cabildeos: [
        cabildeo({
          uri: 'at://votes',
          title: 'Education budget',
          community: 'p/Jalisco',
          voteTotals: {total: 21, direct: 13, delegated: 8},
          positionCounts: {
            total: 5,
            for: 4,
            against: 1,
            amendment: 0,
            byOption: [],
          },
        }),
      ],
      entities: ['p/Jalisco', 'p/CDMX'],
      selectedTopic: 'all',
    })

    expect(view.entities[0].voteTotal).toBe(21)
    expect(view.entities[0].directVoteTotal).toBe(13)
    expect(view.entities[0].delegatedVoteTotal).toBe(8)
    expect(view.entities[0].positionTotal).toBe(5)
    expect(view.entities[0].participationTotal).toBe(26)
  })

  it('preserves the requested entity ordering when swapped', () => {
    const view = buildVsScreenViewModel({
      cabildeos: [
        cabildeo({
          uri: 'at://jalisco',
          title: 'Water plan',
          community: 'p/Jalisco',
        }),
        cabildeo({
          uri: 'at://cdmx',
          title: 'Metro plan',
          community: 'p/CDMX',
        }),
      ],
      entities: swapVsEntities(['p/Jalisco', 'p/CDMX']),
      selectedTopic: 'all',
    })

    expect(view.entities[0].id).toBe('p/CDMX')
    expect(view.entities[1].id).toBe('p/Jalisco')
    expect(view.policyAxisComparisons[0].entityDebateCounts).toHaveLength(2)
  })
})

describe('VS entity helpers', () => {
  it('builds searchable entity options from community metadata', () => {
    const options = buildVsEntityOptions()

    expect(options.some(option => option.id === 'p/Jalisco')).toBe(true)
    expect(options.some(option => option.id === 'p/Morena')).toBe(true)
    expect(
      options.find(option => option.id === 'p/Morena')?.group,
    ).toBe('Partidos')
  })

  it('normalizes party aliases into canonical comparison entities', () => {
    expect(resolveVsEntities(['MORENA', 'PAN'])).toEqual([
      'p/Morena',
      'p/PAN',
    ])
  })

  it('dedupes route entities before applying the fallback side', () => {
    expect(resolveVsEntities(['p/Jalisco', 'Jalisco'])).toEqual([
      'p/Jalisco',
      'p/CDMX',
    ])
  })

  it('accepts comma-delimited web route params', () => {
    expect(resolveVsEntities('p/CDMX,p/Morena')).toEqual([
      'p/CDMX',
      'p/Morena',
    ])
  })

  it('prevents selecting the same entity on both sides', () => {
    const entities: [string, string] = ['p/Jalisco', 'p/CDMX']

    expect(
      setVsEntityInPair({
        entities,
        slot: 0,
        entity: 'p/CDMX',
      }),
    ).toEqual(entities)
  })

  it('updates only the selected side when the next entity is valid', () => {
    expect(
      setVsEntityInPair({
        entities: ['p/Jalisco', 'p/CDMX'],
        slot: 1,
        entity: 'PRI',
      }),
    ).toEqual(['p/Jalisco', 'p/PRI'])
  })
})
