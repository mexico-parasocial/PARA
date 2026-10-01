import {type GraphData, type GraphNode} from '#/features/civicTree/types'
import {
  buildCommunityCollections,
  buildCommunityMapLayout,
  filterCommunityWorkspace,
} from '../workspace'

const label = (descriptor: {message?: string}) => descriptor.message ?? ''
const node = (
  id: string,
  type = 'article',
  extra: Partial<GraphNode> = {},
): GraphNode => ({
  id,
  title: id,
  card_type: type,
  community_uri: 'at://community',
  author_did: 'did:author',
  ...extra,
})
const edge = (source: string, target: string, type = 'supports') => ({
  id: `${source}:${target}`,
  source,
  target,
  relationship_type: type,
})

describe('community workspace', () => {
  it('retains topic membership and civic fields when a filter hides the topic card', () => {
    const water = node('flair:policy_empresa_publica_agua', 'topic')
    const data = {
      nodes: [water, node('book', 'book')],
      edges: [edge('book', water.id)],
    }
    const filtered = filterCommunityWorkspace(
      data,
      '',
      new Set(['book']),
      new Set(),
      new Set(),
    )
    expect(buildCommunityCollections(filtered, label, data)[0].title).toBe(
      water.title,
    )
    expect(
      buildCommunityMapLayout(filtered, 'axis', label, data).clusters[0].id,
    ).toBe('axis:public-services')
    expect(
      buildCommunityMapLayout(filtered, 'collection', label, data).nodes,
    ).toHaveLength(1)
  })
  it('derives collections only from real topic connections, including loose cards', () => {
    const data = {
      nodes: [
        node('water', 'topic'),
        node('tax', 'topic'),
        node('source'),
        node('loose'),
      ],
      edges: [edge('source', 'water'), edge('source', 'tax')],
    }
    const groups = buildCommunityCollections(data, label)
    expect(
      groups.find(group => group.id === 'water')?.nodes.map(n => n.id),
    ).toEqual(['water', 'source'])
    expect(
      groups.find(group => group.id === 'tax')?.nodes.map(n => n.id),
    ).toEqual(['tax', 'source'])
    expect(
      groups
        .find(group => group.title === 'Without a topic')
        ?.nodes.map(n => n.id),
    ).toEqual(['loose'])
  })

  it('places each card once in every map mode and keeps multi-topic placement stable', () => {
    const data = {
      nodes: [node('b', 'topic'), node('a', 'topic'), node('shared')],
      edges: [edge('shared', 'b'), edge('shared', 'a')],
    }
    for (const mode of ['collection', 'type', 'size', 'axis'] as const) {
      const map = buildCommunityMapLayout(data, mode, label)
      expect(map.nodes).toHaveLength(3)
      expect(new Set(map.nodes.map(point => point.node.id)).size).toBe(3)
    }
    const placement = (graph: GraphData) =>
      buildCommunityMapLayout(graph, 'collection', label).nodes.find(
        point => point.node.id === 'shared',
      )?.clusterId
    expect(placement(data)).toBe(
      placement({
        ...data,
        nodes: [...data.nodes].reverse(),
        edges: [...data.edges].reverse(),
      }),
    )
  })

  it('uses explicit civic metadata and flair topic IDs, leaving conflicting and unknown cards unassigned', () => {
    const water = node('flair:policy_empresa_publica_agua', 'topic')
    const tax = node('tax', 'topic', {
      metadata: JSON.stringify({category: '2. HACIENDA'}),
    })
    const data = {
      nodes: [
        water,
        tax,
        node('source'),
        node('conflict'),
        node('water economy', 'article', {metadata: '{broken'}),
      ],
      edges: [
        edge('source', water.id),
        edge('conflict', water.id),
        edge('conflict', tax.id),
      ],
    }
    const map = buildCommunityMapLayout(data, 'axis', label)
    expect(
      map.clusters
        .find(group => group.id === 'axis:public-services')
        ?.nodes.map(n => n.id),
    ).toEqual([water.id, 'source'])
    expect(
      map.clusters
        .find(group => group.id === 'axis:finance')
        ?.nodes.map(n => n.id),
    ).toEqual(['tax'])
    expect(
      map.clusters
        .find(group => group.id === 'axis:unassigned')
        ?.nodes.map(n => n.id),
    ).toEqual(['conflict', 'water economy'])
  })

  it('filters types, stances, links, and accent-insensitive content without dangling edges', () => {
    const data = {
      nodes: [
        node('a', 'book', {content: 'Educación pública', stance: 'pro'}),
        node('b', 'book', {stance: 'con'}),
      ],
      edges: [edge('a', 'b'), edge('b', 'a', 'opposes')],
    }
    expect(
      filterCommunityWorkspace(
        data,
        'educacion',
        new Set(['book']),
        new Set(),
        new Set(['pro']),
      ).nodes.map(n => n.id),
    ).toEqual(['a'])
    expect(
      filterCommunityWorkspace(
        data,
        'educacion',
        new Set(),
        new Set(),
        new Set(),
      ).edges,
    ).toEqual([])
    expect(
      filterCommunityWorkspace(
        data,
        '',
        new Set(),
        new Set(['opposes']),
        new Set(),
      ).edges.map(e => e.relationship_type),
    ).toEqual(['opposes'])
  })

  it('sorts information size by card count and fits nodes within their clusters', () => {
    const data = {
      nodes: [
        node('small', 'topic'),
        node('large', 'topic'),
        ...Array.from({length: 12}, (_, i) => node(`card${i}`)),
      ],
      edges: Array.from({length: 12}, (_, i) => edge(`card${i}`, 'large')),
    }
    const map = buildCommunityMapLayout(data, 'size', label)
    expect(map.clusters.map(group => group.label)).toEqual(['large', 'small'])
    expect(map.clusters[0].radius).toBeGreaterThan(map.clusters[1].radius)
    for (const point of map.nodes) {
      const cluster = map.clusters.find(group => group.id === point.clusterId)!
      expect(Math.hypot(point.x - cluster.x, point.y - cluster.y)).toBeLessThan(
        cluster.radius,
      )
    }
  })

  it('handles an empty graph without inventing collections or nodes', () => {
    expect(buildCommunityCollections({nodes: [], edges: []}, label)).toEqual([])
    expect(
      buildCommunityMapLayout({nodes: [], edges: []}, 'collection', label)
        .nodes,
    ).toEqual([])
  })
})
