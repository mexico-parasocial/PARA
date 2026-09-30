import {buildExploreLayout} from '../explore'
import {buildPersonalTreeGraph} from '../graph'

const item = (itemId: string) => ({
  itemId,
  title: itemId,
  addedAt: '2026-01-01T00:00:00.000Z',
})

const relation = (from: string, to: string, kind = 'supports') => ({
  id: `${from}->${to}`,
  fromItemId: from,
  toItemId: to,
  kind: kind as never,
  createdAt: '2026-01-01T00:00:00.000Z',
})

const size = {width: 400, height: 400}

const graph = buildPersonalTreeGraph([
  {
    id: 'c1',
    name: 'c1',
    items: [item('a'), item('b'), item('c'), item('d')],
    relations: [relation('a', 'b'), relation('c', 'a', 'opposes')],
  },
  {id: 'c2', name: 'c2', items: [item('e')], relations: []},
  {id: 'empty', name: 'empty', items: [], relations: []},
])

describe('buildExploreLayout', () => {
  it('lays out one island hub per non-empty collection', () => {
    const layout = buildExploreLayout(graph, undefined, size)

    expect(layout.hubs.map(h => h.id)).toEqual(['c1', 'c2'])
    expect(layout.nodes).toHaveLength(5)
    expect(layout.nodes.every(n => n.role === 'island')).toBe(true)
    expect(layout.edges.every(e => !e.emphasised)).toBe(true)
  })

  it('centres the focused item and orbits its connections', () => {
    const layout = buildExploreLayout(graph, 'c1::a', size)
    const focus = layout.nodes.find(n => n.role === 'focus')!

    expect(focus.id).toEqual('c1::a')
    expect([focus.x, focus.y]).toEqual([200, 200])
    expect(
      layout.nodes
        .filter(n => n.role === 'neighbour')
        .map(n => n.id)
        .sort(),
    ).toEqual(['c1::b', 'c1::c'])
  })

  it('pushes unrelated items to a faint outer ring without labels', () => {
    const layout = buildExploreLayout(graph, 'c1::a', size)
    const far = layout.nodes.filter(n => n.role === 'far')

    expect(far.map(n => n.id).sort()).toEqual(['c1::d', 'c2::e'])
    expect(far.every(n => !n.showLabel)).toBe(true)
  })

  it('keeps only the focused item edges, all emphasised', () => {
    const layout = buildExploreLayout(graph, 'c1::b', size)

    expect(layout.edges).toHaveLength(1)
    expect(layout.edges[0].emphasised).toBe(true)
  })

  it('falls back to the overview when the focus is gone', () => {
    const layout = buildExploreLayout(graph, 'c1::missing', size)

    expect(layout.hubs).toHaveLength(2)
  })

  it('spills a crowded focus onto a second orbit', () => {
    const many = Array.from({length: 14}, (_, i) => item(`n${i}`))
    const crowded = buildPersonalTreeGraph([
      {
        id: 'c',
        name: 'c',
        items: [item('hub'), ...many],
        relations: many.map(n => relation('hub', n.itemId)),
      },
    ])
    const layout = buildExploreLayout(crowded, 'c::hub', size)
    const radii = new Set(
      layout.nodes
        .filter(n => n.role === 'neighbour')
        .map(n => Math.round(Math.hypot(n.x - 200, n.y - 200))),
    )

    expect(radii.size).toEqual(2)
  })
})
