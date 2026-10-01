import {type CivicTreeItem} from '#/state/queries/collection-items'
import {buildPersonalTreeGraph} from '../graph'
import {buildCivicMapLayout, civicFieldForItem, zoomMapCamera} from '../map'

const item = (
  id: string,
  overrides: Partial<CivicTreeItem> = {},
): CivicTreeItem => ({
  itemId: id,
  title: id,
  kind: 'note',
  addedAt: '2026-09-30',
  ...overrides,
})
const label = (descriptor: {message?: string}) => descriptor.message ?? ''

describe('civic map grouping', () => {
  it('keeps empty collections visible and item IDs scoped to their collections', () => {
    const graph = buildPersonalTreeGraph([
      {id: 'a', name: 'Water', items: [item('shared')]},
      {id: 'b', name: 'Health', items: [item('shared')]},
      {id: 'empty', name: 'Research', items: []},
    ])
    const map = buildCivicMapLayout(graph, 'collection', '', label)
    expect(map.clusters).toHaveLength(3)
    expect(map.clusters.find(c => c.id === 'empty')?.nodes).toHaveLength(0)
    expect(new Set(map.nodes.map(n => n.node.id)).size).toBe(2)
  })

  it('groups data types across collections without duplicating or dropping items', () => {
    const graph = buildPersonalTreeGraph([
      {id: 'a', name: 'A', items: [item('one', {kind: 'book'}), item('two')]},
      {id: 'b', name: 'B', items: [item('three', {kind: 'book'})]},
    ])
    const map = buildCivicMapLayout(graph, 'type', '', label)
    expect(map.clusters.find(c => c.id === 'book')?.collectionIds).toEqual([
      'a',
      'b',
    ])
    expect(map.nodes).toHaveLength(3)
  })

  it('uses explicit flairs and one-hop topic connections, and leaves conflicting fields unassigned', () => {
    const graph = buildPersonalTreeGraph([
      {
        id: 'a',
        name: 'A',
        items: [
          item('water', {
            kind: 'topic',
            flairId: 'policy_empresa_publica_agua',
          }),
          item('tax', {kind: 'topic', flairId: 'policy_impuesto_ventas'}),
          item('source'),
          item('conflict'),
          item('unknown', {title: 'tax water economy'}),
        ],
        relations: [
          {
            id: 'one',
            fromItemId: 'water',
            toItemId: 'source',
            kind: 'context_for',
            createdAt: '',
          },
          {
            id: 'two',
            fromItemId: 'water',
            toItemId: 'conflict',
            kind: 'related_to',
            createdAt: '',
          },
          {
            id: 'three',
            fromItemId: 'tax',
            toItemId: 'conflict',
            kind: 'related_to',
            createdAt: '',
          },
        ],
      },
    ])
    const map = buildCivicMapLayout(graph, 'axis', '', label)
    expect(
      map.clusters
        .find(c => c.id === 'public-services')
        ?.nodes.map(n => n.title),
    ).toEqual(['water', 'source'])
    expect(
      map.clusters.find(c => c.id === 'finance')?.nodes.map(n => n.title),
    ).toEqual(['tax'])
    expect(map.clusters.find(c => c.id === 'unassigned')?.nodes).toHaveLength(2)
    expect(map.nodes).toHaveLength(5)
  })

  it('recognises policy and matter vocabulary and ignores unrelated prose', () => {
    expect(
      civicFieldForItem(item('one', {policyCategory: '2. HACIENDA'})),
    ).toBe('finance')
    expect(
      civicFieldForItem(
        item('two', {policyCategory: '||#EmpresaPublicaDeAgua'}),
      ),
    ).toBe('public-services')
    expect(
      civicFieldForItem(item('three', {title: 'water policy'})),
    ).toBeUndefined()
  })

  it('sizes and sorts collections by their saved information', () => {
    const graph = buildPersonalTreeGraph([
      {id: 'small', name: 'Small', items: [item('one')]},
      {
        id: 'large',
        name: 'Large',
        items: Array.from({length: 40}, (_, i) => item(String(i))),
      },
    ])
    const map = buildCivicMapLayout(graph, 'size', '', label)
    expect(map.clusters.map(c => c.id)).toEqual(['large', 'small'])
    expect(map.clusters[0].radius).toBeGreaterThan(map.clusters[1].radius)
    for (const point of map.nodes) {
      const cluster = map.clusters.find(c => c.id === point.clusterId)!
      expect(Math.hypot(point.x - cluster.x, point.y - cluster.y)).toBeLessThan(
        cluster.radius,
      )
    }
  })

  it('searches notes and collection names, and handles no matches', () => {
    const graph = buildPersonalTreeGraph([
      {
        id: 'a',
        name: 'Water',
        items: [item('one', {note: 'Budget research'}), item('two')],
      },
    ])
    expect(
      buildCivicMapLayout(graph, 'type', 'budget', label).nodes,
    ).toHaveLength(1)
    expect(
      buildCivicMapLayout(graph, 'collection', 'water', label).nodes,
    ).toHaveLength(2)
    const missing = buildCivicMapLayout(graph, 'collection', 'nothing', label)
    expect(missing.clusters).toHaveLength(0)
    expect(Number.isFinite(missing.width)).toBe(true)
  })
})

describe('map camera', () => {
  it('keeps the same world point under the zoom anchor and clamps zoom', () => {
    const camera = {x: -80, y: 30, scale: 0.8}
    const anchor = {x: 250, y: 200}
    const next = zoomMapCamera(camera, 1.2, anchor)
    expect((anchor.x - next.x) / next.scale).toBeCloseTo(
      (anchor.x - camera.x) / camera.scale,
    )
    expect((anchor.y - next.y) / next.scale).toBeCloseTo(
      (anchor.y - camera.y) / camera.scale,
    )
    expect(zoomMapCamera(camera, 100, anchor).scale).toBe(3)
    expect(zoomMapCamera(camera, 0, anchor).scale).toBe(0.15)
  })
})
