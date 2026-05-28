import {
  type CabildeoView,
  countCabildeosByPhase,
  filterCabildeos,
  findCabildeoByUri,
  fromCabildeoRouteParam,
  getCabildeoUri,
  mapCabildeosToView,
  toCabildeoRouteParams,
} from '#/lib/cabildeo-client'

const baseRecord = {
  title: 'Titulo',
  description: 'Descripcion',
  createdAt: '2026-03-16T00:00:00.000Z',
  author: 'did:plc:test-author',
  community: 'p/Jalisco',
  options: [{label: 'A'}, {label: 'B'}],
  phase: 'voting' as const,
}

function buildView(overrides: Partial<CabildeoView>, index = 0): CabildeoView {
  const uri = overrides.uri || getCabildeoUri(baseRecord, index)
  return {
    ...baseRecord,
    uri,
    optionSummary: [],
    positionCounts: {
      total: 0,
      for: 0,
      against: 0,
      amendment: 0,
      byOption: [],
    },
    voteTotals: {
      total: 0,
      direct: 0,
      delegated: 0,
    },
    ...overrides,
  }
}

describe('cabildeo client helpers', () => {
  it('prefers explicit uri when present', () => {
    const uri = getCabildeoUri(
      {...baseRecord, uri: 'at://did:plc:abc/com.para.civic.cabildeo/xyz'},
      0,
    )
    expect(uri).toBe('at://did:plc:abc/com.para.civic.cabildeo/xyz')
  })

  it('creates fallback uri using author and index', () => {
    const uri = getCabildeoUri(baseRecord, 2)
    expect(uri).toBe('at://did:plc:test-author/com.para.civic.cabildeo/3')
  })

  it('maps records to cabildeo views with uris', () => {
    const mapped = mapCabildeosToView([
      baseRecord,
      {...baseRecord, author: 'did:plc:other'},
    ])
    expect(mapped[0].uri).toBe(
      'at://did:plc:test-author/com.para.civic.cabildeo/1',
    )
    expect(mapped[1].uri).toBe('at://did:plc:other/com.para.civic.cabildeo/2')
  })

  it('filters by community and phase', () => {
    const records = [
      buildView({community: 'p/Jalisco', phase: 'voting'}),
      buildView({community: 'p/CDMX', phase: 'deliberating'}, 1),
      buildView({community: 'p/Jalisco', phase: 'resolved'}, 2),
    ]

    const byCommunity = filterCabildeos(records, {
      communityName: 'jalisco',
      phase: 'all',
    })
    expect(byCommunity).toHaveLength(2)

    const byCommunityAndPhase = filterCabildeos(records, {
      communityName: 'p/Jalisco',
      phase: 'voting',
    })
    expect(byCommunityAndPhase).toHaveLength(1)
  })

  it('counts by phase with community scope', () => {
    const records = [
      buildView({community: 'p/Jalisco', phase: 'voting'}),
      buildView({community: 'p/Jalisco', phase: 'voting'}, 1),
      buildView({community: 'p/CDMX', phase: 'voting'}, 2),
    ]
    const count = countCabildeosByPhase(records, 'jalisco', 'voting')
    expect(count).toBe(2)
  })

  it('finds by uri and supports tombstone fallback', () => {
    const records = [buildView({}, 0)]
    const found = findCabildeoByUri(records, records[0].uri)
    const missing = findCabildeoByUri(
      records,
      'at://did:plc:none/com.para.civic.cabildeo/404',
    )
    expect(found?.uri).toBe(records[0].uri)
    expect(missing).toBeNull()
  })

  it('creates route params using cabildeoUri', () => {
    const uri = 'at://did:plc:test/com.para.civic.cabildeo/1'
    const params = toCabildeoRouteParams({
      uri,
    })
    expect(params).toEqual({
      cabildeoUri: encodeURIComponent(uri),
    })
    expect(fromCabildeoRouteParam(params.cabildeoUri)).toBe(uri)
  })
})
