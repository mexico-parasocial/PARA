import {describe, expect, it} from '@jest/globals'

import {
  appendFromMe,
  buildSearchPostsV2Filters,
  extractFromMe,
  extractSearchPostsParams,
  extractedOperatorsToSearchFilters,
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

  const tests: {
    name: string
    input: string
    output: ReturnType<typeof extractSearchPostsParams>
  }[] = [
    {
      name: `passes bare text through untouched`,
      input: `hello world`,
      output: {q: `hello world`},
    },
    {
      name: `lifts from: into author and strips it from q`,
      input: `cats from:alice`,
      output: {q: `cats`, author: `alice`},
    },
    {
      name: `lifts to: into mentions (alias) and strips it from q`,
      input: `cats to:alice`,
      output: {q: `cats`, mentions: `alice`},
    },
    // Handles may be typed with a leading @ (e.g. from:@alice.bsky.social),
    // which the appview rejects. Strip it to match the advanced-search dialog.
    {
      name: `strips a leading @ from from:`,
      input: `cats from:@alice.bsky.social`,
      output: {q: `cats`, author: `alice.bsky.social`},
    },
    {
      name: `strips a leading @ from mentions:`,
      input: `cats mentions:@alice.bsky.social`,
      output: {q: `cats`, mentions: `alice.bsky.social`},
    },
    {
      name: `strips a leading @ from to: (mentions alias)`,
      input: `cats to:@alice.bsky.social`,
      output: {q: `cats`, mentions: `alice.bsky.social`},
    },
    // `me` is resolved by the backend, so the :me operators stay in q verbatim
    // instead of being lifted into author/mentions.
    {
      name: `keeps from:me in q verbatim`,
      input: `cats from:me`,
      output: {q: `cats from:me`},
    },
    {
      name: `keeps to:me in q verbatim`,
      input: `cats to:me`,
      output: {q: `cats to:me`},
    },
    {
      name: `keeps mentions:me in q verbatim`,
      input: `cats mentions:me`,
      output: {q: `cats mentions:me`},
    },
    {
      name: `accumulates multiple hashtags into tag[]`,
      input: `#cats #dogs`,
      output: {q: ``, tag: [`cats`, `dogs`]},
    },
    {
      name: `keeps quoted phrases in q`,
      input: `"no clues" from:alice`,
      output: {q: `"no clues"`, author: `alice`},
    },
    {
      name: `keeps OR groups in q`,
      input: `(cats OR dogs) lang:en`,
      output: {q: `(cats OR dogs)`, lang: `en`},
    },
    {
      name: `extracts a valid since date`,
      input: `cats since:2024-01-01`,
      output: {q: `cats`, since: `2024-01-01`},
    },
    {
      name: `leaves an invalid since date in q`,
      input: `cats since:garbage`,
      output: {q: `cats since:garbage`},
    },
    {
      name: `leaves unsupported operators in q`,
      input: `cats replies:only media:true`,
      output: {q: `cats replies:only media:true`},
    },
    {
      name: `lifts all supported operators at once`,
      input: `term from:alice mentions:bob domain:bsky.app url:bsky.app/x lang:en since:2024-01-01 until:2024-02-01 #tag`,
      output: {
        q: `term`,
        author: `alice`,
        mentions: `bob`,
        domain: `bsky.app`,
        url: `bsky.app/x`,
        lang: `en`,
        since: `2024-01-01`,
        until: `2024-02-01`,
        tag: [`tag`],
      },
    },
    {
      name: `keeps the first value for a repeated singular operator`,
      input: `from:alice from:bob`,
      output: {q: ``, author: `alice`},
    },
    // CJK (and other space-free scripts) carries no whitespace, so the
    // whitespace-based tokenizer must keep it intact as bare query text.
    {
      name: `passes bare CJK text through untouched`,
      input: `東京`,
      output: {q: `東京`},
    },
    {
      name: `lifts an operator from a CJK query and keeps the CJK text`,
      input: `東京 from:alice`,
      output: {q: `東京`, author: `alice`},
    },
    {
      name: `treats a whole CJK phrase as a single token`,
      input: `寿司 ラーメン`,
      output: {q: `寿司 ラーメン`},
    },
    {
      name: `lifts a CJK hashtag into tag[]`,
      input: `#日本 ramen`,
      output: {q: `ramen`, tag: [`日本`]},
    },
  ]

  it.each(tests)(`$name`, ({input, output}) => {
    expect(extractSearchPostsParams(input)).toEqual(output)
  })
})

describe(`extractFromMe / appendFromMe`, () => {
  it(`strips a bare from:me token and reports it`, () => {
    expect(extractFromMe(`cats from:me`)).toEqual({q: `cats`, fromMe: true})
    expect(extractFromMe(`from:me`)).toEqual({q: ``, fromMe: true})
  })

  it(`reports fromMe false when the token is absent`, () => {
    expect(extractFromMe(`cats from:alice`)).toEqual({
      q: `cats from:alice`,
      fromMe: false,
    })
  })

  it(`leaves a quoted from:me in the query text`, () => {
    expect(extractFromMe(`"from:me"`)).toEqual({q: `"from:me"`, fromMe: false})
  })

  it(`re-appends the token only when the filter is active`, () => {
    expect(appendFromMe(`cats`, true)).toBe(`cats from:me`)
    expect(appendFromMe(`cats`, false)).toBe(`cats`)
    expect(appendFromMe(``, true)).toBe(`from:me`)
  })

  it(`does not duplicate an existing from:me token`, () => {
    expect(appendFromMe(`cats from:me`, true)).toBe(`cats from:me`)
  })

  it(`round-trips through extract and append`, () => {
    const {q, fromMe} = extractFromMe(`cats from:me`)
    expect(appendFromMe(q, fromMe)).toBe(`cats from:me`)
  })
})

describe(`buildSearchPostsV2Filters`, () => {
  it(`maps embedded operators alone into v2 plural params`, () => {
    expect(
      buildSearchPostsV2Filters({
        author: `alice`,
        domain: `bsky.app`,
        lang: `en`,
        tag: [`cats`],
      }),
    ).toEqual({
      authors: [`alice`],
      domains: [`bsky.app`],
      languages: [`en`],
      hashtags: [`cats`],
    })
  })

  it(`maps dialog filters alone, including v2-only booleans`, () => {
    expect(
      buildSearchPostsV2Filters(
        {},
        {author: `bob carol`, media: `true`, replies: `none`},
      ),
    ).toEqual({
      authors: [`bob`, `carol`],
      hasMedia: true,
      excludeReplies: true,
    })
  })

  it(`unions list values from both sources without clobbering`, () => {
    expect(
      buildSearchPostsV2Filters(
        {author: `alice`, tag: [`cats`]},
        {author: `bob carol`, tag: `dogs`},
      ),
    ).toEqual({
      authors: [`alice`, `bob`, `carol`],
      hashtags: [`cats`, `dogs`],
    })
  })

  it(`dedupes overlapping values across sources`, () => {
    expect(
      buildSearchPostsV2Filters({author: `alice`}, {author: `alice bob`}),
    ).toEqual({
      authors: [`alice`, `bob`],
    })
  })

  it(`prefers the dialog filter for scalar fields, falling back to embedded`, () => {
    expect(
      buildSearchPostsV2Filters(
        {lang: `en`, since: `2024-01-01`},
        {lang: `ja`},
      ),
    ).toEqual({
      languages: [`ja`],
      since: `2024-01-01T00:00:00Z`,
    })
  })

  it(`normalizes date-only since/until to midnight UTC timestamps`, () => {
    expect(
      buildSearchPostsV2Filters({}, {since: `2024-01-01`, until: `2024-02-01`}),
    ).toEqual({
      since: `2024-01-01T00:00:00Z`,
      until: `2024-02-01T00:00:00Z`,
    })
  })

  it(`leaves a timestamp with an explicit time component unchanged`, () => {
    expect(
      buildSearchPostsV2Filters({}, {until: `2024-02-01T12:30:00Z`}),
    ).toEqual({
      until: `2024-02-01T12:30:00Z`,
    })
  })

  it(`passes exclude lists through from dialog filters`, () => {
    expect(
      buildSearchPostsV2Filters(
        {author: `alice`},
        {excludeAuthor: `bob carol`, excludeTag: `spam`},
      ),
    ).toEqual({
      authors: [`alice`],
      excludeAuthors: [`bob`, `carol`],
      excludeHashtags: [`spam`],
    })
  })
})