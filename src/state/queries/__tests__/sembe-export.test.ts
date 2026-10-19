import {planSembleExport} from '#/features/civicTree/sembleExport'
import {com} from '#/lexicons'
import {exportPlanToSemble} from '../sembe'

jest.mock('#/state/session', () => ({
  useAgent: jest.fn(),
  useSession: jest.fn(),
}))

const did = 'did:plc:me'
const at = '2026-01-01T00:00:00.000Z'

type Stored = {uri: string; cid: string; value: Record<string, unknown>}

/**
 * Just enough of a PDS: records per collection, listRecords, applyWrites
 * with results, and putRecord. Counts the calls so tests can see batching.
 */
function fakeAgent() {
  const store = new Map<string, Stored[]>()
  const calls: {method: string; writes?: number}[] = []
  let seq = 0

  const create = (collection: string, value: Record<string, unknown>) => {
    seq++
    const rkey = `3k${String(seq).padStart(11, '0')}`
    const rec = {
      uri: `at://${did}/${collection}/${rkey}`,
      cid: `cid${seq}`,
      value,
    }
    store.set(collection, [...(store.get(collection) ?? []), rec])
    return rec
  }

  const call = jest.fn(async (method: unknown, params: any) => {
    if (method === com.atproto.repo.listRecords) {
      calls.push({method: 'listRecords'})
      return {records: store.get(params.collection) ?? []}
    }
    if (method === com.atproto.repo.applyWrites) {
      calls.push({method: 'applyWrites', writes: params.writes.length})
      return {
        results: params.writes.map((w: any) => {
          const rec = create(w.collection, w.value)
          return {uri: rec.uri, cid: rec.cid}
        }),
      }
    }
    if (method === com.atproto.repo.putRecord) {
      calls.push({method: 'putRecord'})
      const list = store.get(params.collection) ?? []
      const i = list.findIndex(r => r.uri.endsWith(`/${params.rkey}`))
      seq++
      list[i] = {uri: list[i].uri, cid: `cid${seq}`, value: params.record}
      return {uri: list[i].uri, cid: list[i].cid}
    }
    throw new Error('unexpected call')
  })

  return {agent: {pdsClient: {call}} as any, store, calls}
}

const collection = {
  name: 'Agua',
  description: 'Fuentes',
  items: [
    {
      itemId: 'l1',
      kind: 'link' as const,
      title: 'Informe',
      url: 'https://example.org/informe',
      note: 'Contradicts the mayor',
      addedAt: at,
    },
    {itemId: 't1', kind: 'topic' as const, title: 'Agua', addedAt: at},
  ],
  relations: [
    {
      id: 'r1',
      fromItemId: 'l1',
      toItemId: 't1',
      kind: 'context_for' as const,
      createdAt: at,
    },
  ],
}

const records = (store: Map<string, Stored[]>, nsid: string) =>
  store.get(`network.cosmik.${nsid}`) ?? []

describe('exportPlanToSemble', () => {
  it('writes in three dependency-ordered batches with real references', async () => {
    const {agent, store, calls} = fakeAgent()
    const plan = planSembleExport(collection, {includeNotes: true})

    const result = await exportPlanToSemble(agent, did, plan)

    expect(calls.filter(c => c.method === 'applyWrites')).toEqual([
      {method: 'applyWrites', writes: 3}, // collection, link card, topic card
      {method: 'applyWrites', writes: 1}, // the note on the link
      {method: 'applyWrites', writes: 3}, // two links, one connection
    ])
    expect(result.createdCollection).toBe(true)

    const [col] = records(store, 'collection')
    const cards = records(store, 'card')
    const urlCard = cards.find(c => c.value.type === 'URL')!
    const topicCard = cards.find(
      c => c.value.type === 'NOTE' && !c.value.parentCard,
    )!
    const noteCard = cards.find(c => c.value.parentCard)!

    expect(noteCard.value.parentCard).toEqual({
      uri: urlCard.uri,
      cid: urlCard.cid,
    })
    expect(records(store, 'collectionLink').map(l => l.value.card)).toEqual([
      {uri: urlCard.uri, cid: urlCard.cid},
      {uri: topicCard.uri, cid: topicCard.cid},
    ])
    expect(records(store, 'collectionLink')[0].value.collection).toEqual({
      uri: col.uri,
      cid: col.cid,
    })
    expect(records(store, 'connection')[0].value).toMatchObject({
      source: 'https://example.org/informe',
      target: topicCard.uri,
      connectionType: 'RELATED',
    })
  })

  it('writes nothing when exported again', async () => {
    const {agent, calls} = fakeAgent()
    const plan = planSembleExport(collection, {includeNotes: true})

    await exportPlanToSemble(agent, did, plan)
    calls.length = 0
    const again = await exportPlanToSemble(agent, did, plan)

    expect(calls.every(c => c.method === 'listRecords')).toBe(true)
    expect(again).toMatchObject({
      createdCollection: false,
      newCards: 0,
      newConnections: 0,
    })
  })

  it('rewrites only the description when that is all that changed', async () => {
    const {agent, store, calls} = fakeAgent()
    await exportPlanToSemble(
      agent,
      did,
      planSembleExport(collection, {includeNotes: false}),
    )
    calls.length = 0

    await exportPlanToSemble(
      agent,
      did,
      planSembleExport(
        {...collection, description: 'Fuentes actualizadas'},
        {includeNotes: false},
      ),
    )

    expect(calls.filter(c => c.method !== 'listRecords')).toEqual([
      {method: 'putRecord'},
    ])
    expect(records(store, 'collection')).toHaveLength(1)
    expect(records(store, 'collection')[0].value).toMatchObject({
      name: 'Agua',
      description: 'Fuentes actualizadas',
      accessType: 'OPEN',
    })
  })

  it('splits a large export at the PDS write limit', async () => {
    const {agent, calls} = fakeAgent()
    const items = Array.from({length: 250}, (_, i) => ({
      itemId: `l${i}`,
      kind: 'link' as const,
      title: `Fuente ${i}`,
      url: `https://example.org/${i}`,
      addedAt: at,
    }))

    await exportPlanToSemble(
      agent,
      did,
      planSembleExport({name: 'Grande', items}, {includeNotes: false}),
    )

    expect(
      calls.filter(c => c.method === 'applyWrites').map(c => c.writes),
    ).toEqual([200, 51, 200, 50])
  })

  it('writes nothing when the library cannot be read', async () => {
    const {agent, calls} = fakeAgent()
    agent.pdsClient.call.mockImplementationOnce(async () => {
      throw new Error('offline')
    })

    await expect(
      exportPlanToSemble(
        agent,
        did,
        planSembleExport(collection, {includeNotes: false}),
      ),
    ).rejects.toThrow('offline')
    expect(calls.some(c => c.method === 'applyWrites')).toBe(false)
  })
})
