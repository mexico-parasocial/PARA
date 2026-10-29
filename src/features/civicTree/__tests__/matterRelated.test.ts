import {type CivicTreeCollection} from '#/state/queries/collections'
import {
  flairIdsForTags,
  mergeRelatedItems,
  relatedFromCollections,
  relatedFromCommunityGraph,
} from '../matterRelated'

const POST = 'at://did:plc:a/com.para.post/3k1'
const DEBATE = 'at://did:plc:a/com.para.civic.cabildeo/3k9'

const collection = (
  patch: Partial<CivicTreeCollection> = {},
): CivicTreeCollection => ({
  id: 'c1',
  name: 'Agua para la colonia',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  items: [
    {
      itemId: 'topic',
      kind: 'topic',
      title: 'Industria hídrica',
      flairId: 'matter_industria_hidrica',
      addedAt: '',
    },
    {
      itemId: 'policy',
      kind: 'policy',
      title: 'Captación de lluvia',
      sourceUri: POST,
      policyUri: POST,
      addedAt: '',
    },
    {
      itemId: 'data',
      kind: 'evidence',
      title: 'INEGI: agua en viviendas',
      url: 'https://www.inegi.org.mx/temas/agua/',
      addedAt: '',
    },
    {itemId: 'loose', kind: 'note', title: 'Sin conexión', addedAt: ''},
  ],
  relations: [
    {
      id: 'r1',
      fromItemId: 'policy',
      toItemId: 'topic',
      kind: 'supports',
      createdAt: '',
    },
    {
      id: 'r2',
      fromItemId: 'topic',
      toItemId: 'data',
      kind: 'context_for',
      createdAt: '',
    },
  ],
  ...patch,
})

describe('flairIdsForTags', () => {
  it('maps tags to catalog ids regardless of case, skipping unknown ones', () => {
    const ids = flairIdsForTags([
      '|#industriahidrica',
      '||#EmpresaPublicaDeAgua',
      '|#NoExiste',
    ])
    expect([...ids].sort()).toEqual([
      'matter_industria_hidrica',
      'policy_empresa_publica_agua',
    ])
  })
})

describe('relatedFromCollections', () => {
  it('lists what is connected to the matter topic, in either direction', () => {
    const items = relatedFromCollections([collection()], {
      flairs: ['|#IndustriaHidrica'],
    })
    expect(items.map(i => i.title).sort()).toEqual([
      'Captación de lluvia',
      'INEGI: agua en viviendas',
    ])
    const policy = items.find(i => i.uri === POST)
    expect(policy?.category).toBe('policy')
    expect(items.find(i => i.url)?.category).toBe('data')
    expect(policy?.origins).toEqual([
      {kind: 'personal', name: 'Agua para la colonia'},
    ])
  })

  it('does not list items that merely sit in the collection', () => {
    const items = relatedFromCollections([collection()], {
      flairs: ['|#IndustriaHidrica'],
    })
    expect(items.some(i => i.title === 'Sin conexión')).toBe(false)
  })

  it('anchors on the debate itself when it was saved as an item', () => {
    const c = collection({
      items: [
        {
          itemId: 'debate',
          kind: 'policy',
          title: 'Debate',
          policyUri: DEBATE,
          addedAt: '',
        },
        {itemId: 'note', kind: 'note', title: 'Mi nota', addedAt: ''},
      ],
      relations: [
        {
          id: 'r',
          fromItemId: 'note',
          toItemId: 'debate',
          kind: 'context_for',
          createdAt: '',
        },
      ],
    })
    expect(
      relatedFromCollections([c], {uri: DEBATE}).map(i => i.title),
    ).toEqual(['Mi nota'])
  })

  it('ignores collections that never mention the matter', () => {
    expect(
      relatedFromCollections([collection()], {flairs: ['|#CarrilBus']}),
    ).toEqual([])
  })
})

describe('relatedFromCommunityGraph', () => {
  const node = (
    id: string,
    card_type: string,
    extra: Record<string, unknown> = {},
  ) => ({
    id,
    title: id,
    card_type,
    author_did: 'did:plc:a',
    ...extra,
  })
  const graph = {
    nodes: [
      node('hidrica', 'topic', {
        metadata: JSON.stringify({flairId: 'matter_industria_hidrica'}),
      }),
      node('agua-post', 'article', {
        source_uri: POST,
        metadata: JSON.stringify({postType: 'policy'}),
      }),
      node('inegi', 'research', {
        source_url: 'https://www.inegi.org.mx/temas/agua/',
      }),
      node('claim', 'claim'),
      node('lejos', 'claim'),
    ],
    edges: [
      {source_card_id: 'agua-post', target_card_id: 'hidrica'},
      {source_card_id: 'inegi', target_card_id: 'hidrica'},
      {source: 'claim', target: 'hidrica'},
    ],
  }

  it('reads topic flairs from metadata and follows connections', () => {
    const items = relatedFromCommunityGraph(
      graph,
      {name: 'Medio Ambiente y Clima', uri: 'at://c'},
      {flairs: ['|#IndustriaHidrica']},
    )
    const byTitle = Object.fromEntries(items.map(i => [i.title, i.category]))
    expect(byTitle).toEqual({
      'agua-post': 'policy',
      inegi: 'data',
      claim: 'other',
    })
  })

  it('finds nothing when no topic matches', () => {
    expect(
      relatedFromCommunityGraph(graph, {name: 'x'}, {flairs: ['|#CarrilBus']}),
    ).toEqual([])
  })

  it('reads a flair out of a namespaced topic id', () => {
    const items = relatedFromCommunityGraph(
      {
        nodes: [
          node('col::flair:matter_carril_bus', 'topic'),
          node('x', 'claim'),
        ],
        edges: [{source: 'x', target: 'col::flair:matter_carril_bus'}],
      },
      {name: 'Movilidad'},
      {flairs: ['|#CarrilBus']},
    )
    expect(items.map(i => i.title)).toEqual(['x'])
  })
})

describe('mergeRelatedItems', () => {
  it('lists one policy once, with every tree that connected it', () => {
    const personal = relatedFromCollections([collection()], {
      flairs: ['|#IndustriaHidrica'],
    })
    const community = relatedFromCommunityGraph(
      {
        nodes: [
          {
            id: 't',
            title: 't',
            card_type: 'topic',
            author_did: 'd',
            metadata: JSON.stringify({flairId: 'matter_industria_hidrica'}),
          },
          {
            id: 'p',
            title: 'Captación de lluvia en escuelas',
            card_type: 'article',
            author_did: 'd',
            source_uri: POST,
            metadata: JSON.stringify({postType: 'policy'}),
          },
        ],
        edges: [{source: 'p', target: 't'}],
      },
      {name: 'Medio Ambiente y Clima', uri: 'at://c'},
      {flairs: ['|#IndustriaHidrica']},
    )
    const merged = mergeRelatedItems([...personal, ...community])
    const policies = merged.filter(i => i.category === 'policy')
    expect(policies).toHaveLength(1)
    expect(policies[0].origins.map(o => o.kind).sort()).toEqual([
      'community',
      'personal',
    ])
    // Policies first, then data.
    expect(merged.map(i => i.category)).toEqual(['policy', 'data'])
  })
  it('joins a card without a record reference to the same-titled item that has one', () => {
    const merged = mergeRelatedItems([
      {
        key: 'a',
        title: 'Captación de lluvia',
        category: 'policy',
        type: 'policy',
        uri: POST,
        origins: [{kind: 'personal', name: 'Agua'}],
      },
      {
        key: 'b',
        title: 'captación de lluvia ',
        category: 'policy',
        type: 'article',
        origins: [{kind: 'community', name: 'Medio Ambiente'}],
      },
      {
        key: 'c',
        title: 'Captación de lluvia',
        category: 'other',
        type: 'note',
        origins: [{kind: 'personal', name: 'Agua'}],
      },
    ])
    expect(merged).toHaveLength(2)
    expect(merged[0].origins).toHaveLength(2)
    expect(merged[1].category).toBe('other')
  })
  it('keeps same-titled records with different references apart', () => {
    const OTHER_POST = 'at://did:plc:b/com.para.post/3k2'
    const card = (key: string, uri?: string) => ({
      key,
      title: 'Captación de lluvia',
      category: 'policy' as const,
      type: 'policy',
      uri,
      origins: [{kind: 'community' as const, name: key}],
    })
    // The reference-less card comes first, so the first record adopts it.
    const merged = mergeRelatedItems([
      card('a'),
      card('b', POST),
      card('c', OTHER_POST),
      card('d', POST),
    ])
    expect(merged.map(i => i.uri).sort()).toEqual([POST, OTHER_POST].sort())
    const first = merged.find(i => i.uri === POST)!
    expect(first.origins.map(o => o.name)).toEqual(['a', 'b', 'd'])
    const second = merged.find(i => i.uri === OTHER_POST)!
    expect(second.origins.map(o => o.name)).toEqual(['c'])
  })
  it('does not guess which of several same-titled records a card means', () => {
    const OTHER_POST = 'at://did:plc:b/com.para.post/3k2'
    const card = (key: string, uri?: string) => ({
      key,
      title: 'Captación de lluvia',
      category: 'policy' as const,
      type: 'policy',
      uri,
      origins: [{kind: 'community' as const, name: key}],
    })
    const merged = mergeRelatedItems([
      card('a', POST),
      card('b', OTHER_POST),
      card('c'),
    ])
    expect(merged).toHaveLength(3)
  })
})
