import {planSembleExport, type SembleExportPlan} from '../sembleExport'
import {
  EMPTY_SEMBLE_LIBRARY,
  parseSembleLibrary,
  reconcileSembleExport,
  type RepoRecord,
} from '../sembleLibrary'

const at = '2026-01-01T00:00:00.000Z'
const did = 'did:plc:me'
const uri = (col: string, rkey: string) => `at://${did}/${col}/${rkey}`

const plan = (includeNotes = false): SembleExportPlan =>
  planSembleExport(
    {
      name: 'Agua',
      description: 'Fuentes sobre agua',
      items: [
        {
          itemId: 'l1',
          kind: 'link',
          title: 'Informe',
          url: 'https://www.example.org/informe/?utm_source=x',
          note: 'Contradicts the mayor',
          addedAt: at,
        },
        {
          itemId: 'l2',
          kind: 'link',
          title: 'Ley',
          url: 'https://example.org/ley',
          addedAt: at,
        },
        {itemId: 't1', kind: 'topic', title: 'Agua', addedAt: at},
      ],
      relations: [
        {
          id: 'r1',
          fromItemId: 'l1',
          toItemId: 'l2',
          kind: 'opposes',
          createdAt: at,
        },
      ],
    },
    {includeNotes},
  )

const record = (
  col: string,
  rkey: string,
  value: Record<string, unknown>,
): RepoRecord => ({uri: uri(col, rkey), cid: `cid-${rkey}`, value})

/** The repo as it stands after one export of `plan()`. */
function exportedOnce(): RepoRecord[][] {
  const collection = record('network.cosmik.collection', 'c1', {
    name: 'Agua',
    description: 'Fuentes sobre agua',
    accessType: 'OPEN',
  })
  const informe = record('network.cosmik.card', 'k1', {
    type: 'URL',
    url: 'https://example.org/informe',
    content: {url: 'https://example.org/informe'},
  })
  const ley = record('network.cosmik.card', 'k2', {
    type: 'URL',
    url: 'https://example.org/ley',
    content: {url: 'https://example.org/ley'},
  })
  const topic = record('network.cosmik.card', 'k3', {
    type: 'NOTE',
    content: {text: 'Agua'},
  })
  const links = [informe, ley, topic].map((card, i) =>
    record('network.cosmik.collectionLink', `l${i}`, {
      collection: {uri: collection.uri, cid: collection.cid},
      card: {uri: card.uri, cid: card.cid},
    }),
  )
  const connection = record('network.cosmik.connection', 'x1', {
    source: 'https://example.org/informe',
    target: 'https://example.org/ley',
    connectionType: 'OPPOSES',
  })
  return [[collection], [informe, ley, topic], links, [connection]]
}

const library = (records: RepoRecord[][], truncated = false) =>
  parseSembleLibrary({
    collections: records[0],
    cards: records[1],
    links: records[2],
    connections: records[3],
    truncated,
  })

describe('reconcileSembleExport', () => {
  it('creates everything on a first export', () => {
    const actions = reconcileSembleExport(plan(), EMPTY_SEMBLE_LIBRARY)

    expect(actions.collection).toBeUndefined()
    expect(actions.counts).toEqual({
      newCards: 3,
      reusedCards: 0,
      newLinks: 3,
      newConnections: 1,
      existingConnections: 0,
    })
    expect(actions.upToDate).toBe(false)
  })

  it('writes nothing when the same collection is exported again', () => {
    const actions = reconcileSembleExport(plan(), library(exportedOnce()))

    expect(actions.collection?.uri).toBe(uri('network.cosmik.collection', 'c1'))
    expect(actions.counts.newCards).toBe(0)
    expect(actions.counts.newLinks).toBe(0)
    expect(actions.connections).toEqual([])
    expect(actions.description).toBeUndefined()
    expect(actions.upToDate).toBe(true)
  })

  it('recognises a link published under another spelling', () => {
    const actions = reconcileSembleExport(plan(), library(exportedOnce()))
    const informe = actions.cards.find(c => c.card.itemKey === 'l1')

    expect(informe?.existing?.uri).toBe(uri('network.cosmik.card', 'k1'))
  })

  it('reuses a library card but still adds it to a new collection', () => {
    const [, cards, , connections] = exportedOnce()
    const actions = reconcileSembleExport(
      plan(),
      library([[], cards, [], connections]),
    )

    expect(actions.collection).toBeUndefined()
    expect(actions.counts.newCards).toBe(0)
    expect(actions.counts.newLinks).toBe(3)
    expect(actions.upToDate).toBe(false)
  })

  it('adds a note to a reused card, once', () => {
    const first = reconcileSembleExport(plan(true), library(exportedOnce()))
    const note = first.cards.find(c => c.card.itemKey === 'l1#note')
    expect(note).toMatchObject({existing: undefined, link: false})
    expect(first.upToDate).toBe(false)

    const records = exportedOnce()
    records[1].push(
      record('network.cosmik.card', 'k4', {
        type: 'NOTE',
        content: {text: 'Contradicts the mayor'},
        parentCard: {uri: uri('network.cosmik.card', 'k1'), cid: 'cid-k1'},
      }),
    )
    const second = reconcileSembleExport(plan(true), library(records))
    expect(second.upToDate).toBe(true)
  })

  it('updates the description when it changed, and only then', () => {
    const records = exportedOnce()
    ;(records[0][0].value as Record<string, unknown>).description = 'Old'
    const actions = reconcileSembleExport(plan(), library(records))

    expect(actions.description).toBe('Fuentes sobre agua')
    expect(actions.upToDate).toBe(false)
  })

  it('adds to the newest of two collections with the same name', () => {
    const records = exportedOnce()
    records[0].push(
      record('network.cosmik.collection', 'c0', {name: 'Agua'}),
      record('network.cosmik.collection', 'c2', {name: 'Agua'}),
    )
    const actions = reconcileSembleExport(plan(), library(records))

    expect(actions.collection?.uri).toBe(uri('network.cosmik.collection', 'c2'))
  })

  it('treats a connection of another type as new', () => {
    const records = exportedOnce()
    ;(records[3][0].value as Record<string, unknown>).connectionType = 'RELATED'
    const actions = reconcileSembleExport(plan(), library(records))

    expect(actions.counts.newConnections).toBe(1)
  })
})

describe('parseSembleLibrary', () => {
  it('skips malformed records instead of trusting them', () => {
    const lib = parseSembleLibrary({
      collections: [
        {uri: 'a', cid: 'a', value: {description: 'no name'}},
        {uri: 'b', cid: 'b', value: null},
      ],
      cards: [
        {uri: 'c', cid: 'c', value: {type: 'URL', url: 'javascript:x'}},
        {uri: 'd', cid: 'd', value: {type: 'NOTE', content: {}}},
        {uri: 'e', cid: 'e', value: {type: 'OTHER'}},
      ],
      links: [{uri: 'f', cid: 'f', value: {collection: 'not a ref'}}],
      connections: [{uri: 'g', cid: 'g', value: {source: 'x'}}],
      truncated: true,
    })

    expect(lib).toEqual({...EMPTY_SEMBLE_LIBRARY, truncated: true})
  })
})

describe('reconcileSembleExport connections to cards without a link', () => {
  const topicPlan = planSembleExport(
    {
      name: 'Agua',
      items: [
        {
          itemId: 'l2',
          kind: 'link',
          title: 'Ley',
          url: 'https://example.org/ley',
          addedAt: at,
        },
        {itemId: 't1', kind: 'topic', title: 'Agua', addedAt: at},
      ],
      relations: [
        {
          id: 'r1',
          fromItemId: 'l2',
          toItemId: 't1',
          kind: 'context_for',
          createdAt: at,
        },
      ],
    },
    {includeNotes: false},
  )

  it('counts a connection to a new card as new', () => {
    const actions = reconcileSembleExport(topicPlan, EMPTY_SEMBLE_LIBRARY)
    expect(actions.counts.newConnections).toBe(1)
  })

  it('recognises one published earlier by the card AT-URI', () => {
    const [collections, cards, links] = exportedOnce()
    const topicUri = uri('network.cosmik.card', 'k3')
    const lib = library([
      collections,
      cards,
      links,
      [
        record('network.cosmik.connection', 'x2', {
          source: 'https://example.org/ley',
          target: topicUri,
          connectionType: 'RELATED',
        }),
      ],
    ])
    const actions = reconcileSembleExport(topicPlan, lib)

    expect(
      actions.cards.find(c => c.card.itemKey === 't1')?.existing?.uri,
    ).toBe(topicUri)
    expect(actions.connections).toEqual([])
    expect(actions.upToDate).toBe(true)
  })
})
