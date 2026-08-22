import {
  buildTopicClusters,
  flairIdOf,
  type TopicGraphData,
  untopicedNodes,
} from '../topics'

const node = (
  id: string,
  card_type: string,
  author_did: string,
  title = id,
) => ({
  id,
  title,
  card_type,
  author_did,
  community_uri: 'at://c',
})

const edge = (
  source: string,
  target: string,
  relationship_type = 'addresses',
) => ({
  id: `${source}->${target}`,
  source,
  target,
  relationship_type,
})

const graph = (
  nodes: ReturnType<typeof node>[],
  edges: ReturnType<typeof edge>[] = [],
): TopicGraphData => ({nodes, edges})

describe('flairIdOf', () => {
  it('reads a flair id from a namespaced node id', () => {
    expect(
      flairIdOf(node('col1::flair:matter_vivienda', 'topic', 'did:a')),
    ).toEqual('matter_vivienda')
  })

  it('reads a flair id from a bare node id', () => {
    expect(
      flairIdOf(node('flair:policy_educacion_laica', 'topic', 'did:a')),
    ).toEqual('policy_educacion_laica')
  })

  it('returns nothing for a free-text topic', () => {
    expect(flairIdOf(node('topic-abc123', 'topic', 'did:a'))).toBeUndefined()
  })
})

describe('buildTopicClusters', () => {
  it('returns nothing when the tree has no topics', () => {
    expect(
      buildTopicClusters(graph([node('a', 'claim', 'did:a')])),
    ).toHaveLength(0)
  })

  it('attaches cards linked in either direction', () => {
    const clusters = buildTopicClusters(
      graph(
        [
          node('t', 'topic', 'did:a'),
          node('c1', 'claim', 'did:b'),
          node('c2', 'claim', 'did:c'),
        ],
        [edge('c1', 't'), edge('t', 'c2')],
      ),
    )

    expect(clusters[0].attached.map(n => n.id).sort()).toEqual(['c1', 'c2'])
  })

  it('counts distinct members, not cards', () => {
    const clusters = buildTopicClusters(
      graph(
        [
          node('t', 'topic', 'did:a'),
          node('c1', 'claim', 'did:b'),
          node('c2', 'claim', 'did:b'),
          node('c3', 'claim', 'did:b'),
        ],
        [edge('c1', 't'), edge('c2', 't'), edge('c3', 't')],
      ),
    )

    expect(clusters[0].attached).toHaveLength(3)
    expect(clusters[0].contributorCount).toEqual(2)
  })

  it('ranks a shared concern above a busier monologue', () => {
    const clusters = buildTopicClusters(
      graph(
        [
          node('shared', 'topic', 'did:a', 'Shared'),
          node('s1', 'claim', 'did:b'),
          node('s2', 'claim', 'did:c'),
          node('solo', 'topic', 'did:z', 'Solo'),
          node('x1', 'claim', 'did:z'),
          node('x2', 'claim', 'did:z'),
          node('x3', 'claim', 'did:z'),
          node('x4', 'claim', 'did:z'),
        ],
        [
          edge('s1', 'shared'),
          edge('s2', 'shared'),
          edge('x1', 'solo'),
          edge('x2', 'solo'),
          edge('x3', 'solo'),
          edge('x4', 'solo'),
        ],
      ),
    )

    expect(clusters[0].topic.title).toEqual('Shared')
    expect(clusters[0].contributorCount).toEqual(3)
    expect(clusters[1].topic.title).toEqual('Solo')
    expect(clusters[1].attached.length).toBeGreaterThan(
      clusters[0].attached.length,
    )
  })

  it('flags a topic only its author has touched', () => {
    const clusters = buildTopicClusters(
      graph(
        [node('t', 'topic', 'did:a'), node('c', 'claim', 'did:a')],
        [edge('c', 't')],
      ),
    )

    expect(clusters[0].isMonologue).toBe(true)
  })

  it('does not flag a topic two members have touched', () => {
    const clusters = buildTopicClusters(
      graph(
        [node('t', 'topic', 'did:a'), node('c', 'claim', 'did:b')],
        [edge('c', 't')],
      ),
    )

    expect(clusters[0].isMonologue).toBe(false)
  })

  it('counts a bare topic as its author alone', () => {
    const clusters = buildTopicClusters(graph([node('t', 'topic', 'did:a')]))
    expect(clusters[0].contributorCount).toEqual(1)
    expect(clusters[0].isMonologue).toBe(true)
  })

  it('carries the flair id through for cross-tree comparison', () => {
    const clusters = buildTopicClusters(
      graph([node('flair:matter_vivienda', 'topic', 'did:a')]),
    )
    expect(clusters[0].flairId).toEqual('matter_vivienda')
  })

  it('ignores an edge whose endpoint is missing', () => {
    const clusters = buildTopicClusters(
      graph([node('t', 'topic', 'did:a')], [edge('ghost', 't')]),
    )
    expect(clusters[0].attached).toHaveLength(0)
  })

  it('orders equal topics by title so the list is stable', () => {
    const clusters = buildTopicClusters(
      graph([
        node('t2', 'topic', 'did:a', 'Beta'),
        node('t1', 'topic', 'did:a', 'Alpha'),
      ]),
    )
    expect(clusters.map(c => c.topic.title)).toEqual(['Alpha', 'Beta'])
  })
})

describe('appview edge shape', () => {
  it('accepts source_card_id/target_card_id as it comes from the query', () => {
    const clusters = buildTopicClusters({
      nodes: [node('t', 'topic', 'did:a'), node('c', 'claim', 'did:b')],
      edges: [{source_card_id: 'c', target_card_id: 't'}],
    })

    expect(clusters[0].attached.map(n => n.id)).toEqual(['c'])
    expect(clusters[0].contributorCount).toEqual(2)
  })

  it('finds untopiced cards with the appview edge shape too', () => {
    const loose = untopicedNodes({
      nodes: [
        node('t', 'topic', 'did:a'),
        node('c', 'claim', 'did:b'),
        node('loose', 'claim', 'did:c'),
      ],
      edges: [{source_card_id: 'c', target_card_id: 't'}],
    })

    expect(loose.map(n => n.id)).toEqual(['loose'])
  })
})

describe('untopicedNodes', () => {
  it('finds cards attached to no topic', () => {
    const loose = untopicedNodes(
      graph(
        [
          node('t', 'topic', 'did:a'),
          node('attached', 'claim', 'did:b'),
          node('loose', 'claim', 'did:c'),
        ],
        [edge('attached', 't')],
      ),
    )

    expect(loose.map(n => n.id)).toEqual(['loose'])
  })

  it('returns nothing when the tree has no topics at all', () => {
    expect(untopicedNodes(graph([node('a', 'claim', 'did:a')]))).toHaveLength(0)
  })

  it('never lists a topic as untopiced', () => {
    const loose = untopicedNodes(
      graph([node('t1', 'topic', 'did:a'), node('t2', 'topic', 'did:b')]),
    )
    expect(loose).toHaveLength(0)
  })
})
