import {
  buildPersonalTreeGraph,
  type PersonalTreeCollection,
  relationsForNode,
} from '../graph'

const collection = (
  over: Partial<PersonalTreeCollection> & {id: string},
): PersonalTreeCollection => ({
  name: over.id,
  items: [],
  relations: [],
  ...over,
})

const item = (itemId: string, kind?: string) => ({
  itemId,
  title: itemId,
  kind: kind as never,
  addedAt: '2026-01-01T00:00:00.000Z',
})

const relation = (from: string, to: string, kind = 'supports') => ({
  id: `${from}->${to}`,
  fromItemId: from,
  toItemId: to,
  kind: kind as never,
  createdAt: '2026-01-01T00:00:00.000Z',
})

describe('buildPersonalTreeGraph', () => {
  it('makes items the nodes, not collections', () => {
    const graph = buildPersonalTreeGraph([
      collection({id: 'c1', items: [item('a'), item('b')]}),
    ])

    expect(graph.nodes).toHaveLength(2)
    expect(graph.nodes.map(n => n.title).sort()).toEqual(['a', 'b'])
    expect(graph.nodes.every(n => n.group === 'c1')).toBe(true)
  })

  it('draws an edge only where the user authored a relation', () => {
    const graph = buildPersonalTreeGraph([
      collection({
        id: 'c1',
        items: [item('a'), item('b')],
        relations: [relation('a', 'b', 'opposes')],
      }),
    ])

    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0].kind).toEqual('opposes')
  })

  it('does not invent edges between collections that share an item', () => {
    const graph = buildPersonalTreeGraph([
      collection({id: 'c1', items: [item('shared')]}),
      collection({id: 'c2', items: [item('shared')]}),
    ])

    expect(graph.nodes).toHaveLength(2)
    expect(graph.edges).toHaveLength(0)
  })

  it('keeps same-key items in different collections distinct', () => {
    const graph = buildPersonalTreeGraph([
      collection({id: 'c1', items: [item('shared')]}),
      collection({id: 'c2', items: [item('shared')]}),
    ])

    expect(new Set(graph.nodes.map(n => n.id)).size).toEqual(2)
  })

  it('drops a relation whose endpoint was removed', () => {
    const graph = buildPersonalTreeGraph([
      collection({
        id: 'c1',
        items: [item('a')],
        relations: [relation('a', 'deleted')],
      }),
    ])

    expect(graph.nodes).toHaveLength(1)
    expect(graph.edges).toHaveLength(0)
  })

  it('sizes a node by how connected it is', () => {
    const graph = buildPersonalTreeGraph([
      collection({
        id: 'c1',
        items: [item('hub'), item('a'), item('b')],
        relations: [relation('a', 'hub'), relation('b', 'hub')],
      }),
    ])

    const hub = graph.nodes.find(n => n.title === 'hub')!
    const leaf = graph.nodes.find(n => n.title === 'a')!
    expect(hub.radius).toBeGreaterThan(leaf.radius)
    expect(hub.metadata.degree).toEqual(2)
  })

  it('counts items that nothing connects to', () => {
    const graph = buildPersonalTreeGraph([
      collection({
        id: 'c1',
        items: [item('a'), item('b'), item('lonely')],
        relations: [relation('a', 'b')],
      }),
    ])

    expect(graph.totalItems).toEqual(3)
    expect(graph.totalRelations).toEqual(1)
    expect(graph.unconnectedCount).toEqual(1)
  })

  it('skips empty collections in the group legend', () => {
    const graph = buildPersonalTreeGraph([
      collection({id: 'c1', items: [item('a')]}),
      collection({id: 'empty'}),
    ])

    expect(graph.groups.map(g => g.id)).toEqual(['c1'])
  })

  it('gives uncoloured collections distinct fallback colours', () => {
    const graph = buildPersonalTreeGraph([
      collection({id: 'c1', items: [item('a')]}),
      collection({id: 'c2', items: [item('b')]}),
    ])

    expect(graph.groups[0].color).not.toEqual(graph.groups[1].color)
  })

  it('honours a collection its own colour when set', () => {
    const graph = buildPersonalTreeGraph([
      collection({id: 'c1', color: '#123456', items: [item('a')]}),
    ])

    expect(graph.groups[0].color).toEqual('#123456')
    expect(graph.nodes[0].borderColor).toEqual('#123456')
  })

  it('colours the node fill by item kind', () => {
    const graph = buildPersonalTreeGraph([
      collection({id: 'c1', items: [item('p', 'policy'), item('n', 'note')]}),
    ])

    const policy = graph.nodes.find(n => n.title === 'p')!
    const note = graph.nodes.find(n => n.title === 'n')!
    expect(policy.color).not.toEqual(note.color)
  })

  it('survives a relation cycle', () => {
    const graph = buildPersonalTreeGraph([
      collection({
        id: 'c1',
        items: [item('a'), item('b')],
        relations: [relation('a', 'b'), relation('b', 'a')],
      }),
    ])

    expect(graph.edges).toHaveLength(2)
    expect(graph.unconnectedCount).toEqual(0)
  })
})

describe('relationsForNode', () => {
  it('resolves both directions with the other end named', () => {
    const graph = buildPersonalTreeGraph([
      collection({
        id: 'c1',
        items: [item('a'), item('b'), item('c')],
        relations: [relation('a', 'b'), relation('c', 'a')],
      }),
    ])

    const aId = graph.nodes.find(n => n.title === 'a')!.id
    const rels = relationsForNode(graph, aId)

    expect(rels).toHaveLength(2)
    expect(rels.find(r => r.outgoing)!.otherTitle).toEqual('b')
    expect(rels.find(r => !r.outgoing)!.otherTitle).toEqual('c')
  })

  it('returns nothing for an unconnected node', () => {
    const graph = buildPersonalTreeGraph([
      collection({id: 'c1', items: [item('lonely')]}),
    ])

    expect(relationsForNode(graph, graph.nodes[0].id)).toHaveLength(0)
  })
})
