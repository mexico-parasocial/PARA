import {type CivicTreeCollection} from './collections'

jest.mock('#/state/session', () => ({useAgent: jest.fn()}))
jest.mock('#/lexicons', () => ({
  com: {
    para: {
      collection: {
        applyOps: 'applyOps',
        getCollection: 'getCollection',
        updateCollection: 'updateCollection',
        listCollections: 'listCollections',
        createCollection: 'createCollection',
        deleteCollection: 'deleteCollection',
      },
    },
  },
}))

// eslint-disable-next-line import/first
import {
  fetchAllCollections,
  resetApplyOpsSupport,
  writeCollectionOp,
} from './collections'

const at = '2026-01-01T00:00:00.000Z'
const stored = (id: string): CivicTreeCollection => ({
  id,
  name: 'Housing',
  items: [],
  relations: [],
  createdAt: at,
  updatedAt: at,
})
const item = (itemId: string) => ({itemId, title: itemId, addedAt: at})

/*
 * A fake appview whose read model never catches up with writes: getCollection
 * always returns the collection as first created. This is the lag that made two
 * quick edits erase each other.
 */
const notImplemented = () =>
  Object.assign(new Error('Method Not Implemented'), {status: 501})

function laggingAgent(initial: CivicTreeCollection) {
  const writes: CivicTreeCollection[] = []
  const call = jest.fn(async (method: string, arg: any) => {
    if (method === 'applyOps') throw notImplemented()
    if (method === 'getCollection') return {collection: initial}
    if (method === 'updateCollection') {
      writes.push(arg.collection)
      return {}
    }
    throw new Error(`unexpected ${method}`)
  })
  return {agent: {appviewClient: {call}} as any, writes, call}
}

describe('writeCollectionOp (server without applyOps)', () => {
  beforeEach(() => resetApplyOpsSupport())

  it('keeps both of two quick edits even when reads lag behind writes', async () => {
    const {agent, writes} = laggingAgent(stored('c-lag'))

    await Promise.all([
      writeCollectionOp(agent, 'c-lag', {type: 'addItem', item: item('a')}),
      writeCollectionOp(agent, 'c-lag', {type: 'addItem', item: item('b')}),
    ])

    expect(writes).toHaveLength(2)
    expect(writes[1].items.map(i => i.itemId)).toEqual(['a', 'b'])
  })

  it('does not write when the operation changes nothing', async () => {
    const {agent, writes} = laggingAgent({
      ...stored('c-noop'),
      items: [item('a')],
    })

    await writeCollectionOp(agent, 'c-noop', {type: 'addItem', item: item('a')})

    expect(writes).toHaveLength(0)
  })

  it('reads fresh again after a failed write', async () => {
    const initial = stored('c-fail-w')
    const writes: CivicTreeCollection[] = []
    let failNext = true
    const call = jest.fn(async (method: string, arg: any) => {
      if (method === 'applyOps') throw notImplemented()
      if (method === 'getCollection') return {collection: initial}
      if (failNext) {
        failNext = false
        throw new Error('network')
      }
      writes.push(arg.collection)
      return {}
    })
    const agent = {appviewClient: {call}} as any

    await expect(
      writeCollectionOp(agent, 'c-fail-w', {type: 'addItem', item: item('a')}),
    ).rejects.toThrow('network')
    await writeCollectionOp(agent, 'c-fail-w', {
      type: 'addItem',
      item: item('b'),
    })

    expect(writes[0].items.map(i => i.itemId)).toEqual(['b'])
  })

  it('refuses to write to a collection that only exists locally', async () => {
    const {agent, call} = laggingAgent(stored('x'))

    await expect(
      writeCollectionOp(agent, 'optimistic-123', {
        type: 'addItem',
        item: item('a'),
      }),
    ).rejects.toThrow('still being created')
    expect(call).not.toHaveBeenCalled()
  })
})

describe('writeCollectionOp (server with applyOps)', () => {
  beforeEach(() => resetApplyOpsSupport())

  function opsAgent() {
    const sent: any[] = []
    const call = jest.fn(async (method: string, arg: any) => {
      if (method !== 'applyOps') throw new Error(`unexpected ${method}`)
      sent.push(arg)
      return {opId: 'op'}
    })
    return {agent: {appviewClient: {call}} as any, sent, call}
  }

  it('sends the edit as an operation without reading the collection first', async () => {
    const {agent, sent, call} = opsAgent()

    const result = await writeCollectionOp(agent, 'c-ops', {
      type: 'addItem',
      item: item('a'),
    })

    expect(result).toBeUndefined()
    expect(call).toHaveBeenCalledTimes(1)
    expect(sent[0]).toEqual({
      id: 'c-ops',
      ops: [{type: 'addItem', item: item('a')}],
    })
  })

  it('sends a cleared field as an empty string, since JSON drops undefined', async () => {
    const {agent, sent} = opsAgent()

    await writeCollectionOp(agent, 'c-clear', {
      type: 'updateItem',
      itemKey: 'a',
      patch: {title: 'New', description: undefined},
    })
    await writeCollectionOp(agent, 'c-clear', {
      type: 'updateDetails',
      fields: {name: 'Renamed', description: null},
    })

    expect(sent[0].ops[0].patch).toEqual({title: 'New', description: ''})
    expect(sent[1].ops[0].fields).toEqual({name: 'Renamed', description: ''})
  })

  it('keeps edits to one collection in order', async () => {
    const order: string[] = []
    const call = jest.fn(async (_m: string, arg: any) => {
      const op = arg.ops[0]
      // The first edit is slower; the second must still wait for it.
      await new Promise(r => setTimeout(r, op.item.itemId === 'first' ? 20 : 0))
      order.push(op.item.itemId)
      return {opId: 'op'}
    })
    const agent = {appviewClient: {call}} as any

    await Promise.all([
      writeCollectionOp(agent, 'c-order', {
        type: 'addItem',
        item: item('first'),
      }),
      writeCollectionOp(agent, 'c-order', {
        type: 'addItem',
        item: item('second'),
      }),
    ])

    expect(order).toEqual(['first', 'second'])
  })

  it('surfaces a server rejection instead of falling back', async () => {
    const call = jest.fn(async () => {
      throw Object.assign(new Error('Collection not found'), {
        error: 'NotFound',
        status: 400,
      })
    })

    await expect(
      writeCollectionOp({appviewClient: {call}} as any, 'c-gone', {
        type: 'removeItem',
        itemKey: 'a',
      }),
    ).rejects.toThrow('Collection not found')
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('falls back to read-modify-write once and remembers the server lacks applyOps', async () => {
    const initial = stored('c-fallback')
    const methods: string[] = []
    const call = jest.fn(async (method: string) => {
      methods.push(method)
      if (method === 'applyOps') throw notImplemented()
      if (method === 'getCollection') return {collection: initial}
      return {}
    })
    const agent = {appviewClient: {call}} as any

    await writeCollectionOp(agent, 'c-fallback', {
      type: 'addItem',
      item: item('a'),
    })
    await writeCollectionOp(agent, 'c-fallback', {
      type: 'addItem',
      item: item('b'),
    })

    expect(methods.filter(m => m === 'applyOps')).toHaveLength(1)
    expect(methods.filter(m => m === 'updateCollection')).toHaveLength(2)
  })
})

describe('fetchAllCollections', () => {
  it('follows the cursor across pages', async () => {
    const pages: Record<string, any> = {
      first: {collections: [stored('a')], cursor: 'next'},
      next: {collections: [stored('b')]},
    }
    const call = jest.fn(async (_m: string, arg: {cursor?: string}) =>
      arg.cursor ? pages.next : pages.first,
    )

    const all = await fetchAllCollections({appviewClient: {call}} as any)

    expect(all.map(c => c.id)).toEqual(['a', 'b'])
    expect(call).toHaveBeenCalledTimes(2)
  })
})
