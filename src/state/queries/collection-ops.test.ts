import {type CivicTreeItem, type CivicTreeRelation} from './collection-items'
import {
  applyCollectionOp,
  type CollectionShape,
  isSameItem,
  withItemId,
} from './collection-ops'
import {
  enqueueCollectionWrite,
  forgetCollectionWrite,
  hasPendingCollectionWrite,
  recallCollectionWrite,
  rememberCollectionWrite,
} from './collection-write-queue'

const at = '2026-01-01T00:00:00.000Z'
const item = (itemId: string, extra: Partial<CivicTreeItem> = {}) => ({
  itemId,
  title: itemId,
  addedAt: at,
  ...extra,
})
const relation = (id: string, from: string, to: string): CivicTreeRelation => ({
  id,
  fromItemId: from,
  toItemId: to,
  kind: 'supports',
  createdAt: at,
})
const base = (over: Partial<CollectionShape> = {}): CollectionShape => ({
  name: 'Housing',
  items: [],
  relations: [],
  ...over,
})

describe('applyCollectionOp', () => {
  it('adds an item and gives it a stable id', () => {
    const next = applyCollectionOp(base(), {
      type: 'addItem',
      item: {title: 'Note', addedAt: at},
    })

    expect(next.items).toHaveLength(1)
    expect(next.items[0].itemId).toBeTruthy()
  })

  it('uses a policy URI as the id so its key does not change', () => {
    const policyUri = 'at://did:plc:a/com.para.civic.cabildeo/1'

    expect(withItemId({policyUri, addedAt: at}).itemId).toBe(policyUri)
  })

  it('does not add a duplicate, including a legacy item matched by policy', () => {
    const policyUri = 'at://did:plc:a/com.para.civic.cabildeo/1'
    const legacy = {policyUri, addedAt: at}
    const collection = base({items: [legacy]})

    const next = applyCollectionOp(collection, {
      type: 'addItem',
      item: {policyUri, policyTitle: 'Again', addedAt: at},
    })

    expect(next).toBe(collection)
  })

  it('matches a link to a legacy item that has the same url', () => {
    expect(
      isSameItem(
        {url: 'https://x.test/a', addedAt: at},
        {url: 'https://x.test/a', addedAt: at},
      ),
    ).toBe(true)
  })

  it('keeps an item key stable when its url is edited', () => {
    const legacy = {url: 'https://old.test', title: 'Old', addedAt: at}
    const collection = base({
      items: [legacy],
      relations: [relation('r1', 'https://old.test', 'other')],
    })

    const next = applyCollectionOp(collection, {
      type: 'updateItem',
      itemKey: 'https://old.test',
      patch: {url: 'https://new.test'},
    })

    expect(next.items[0].itemId).toBe('https://old.test')
    expect(next.items[0].url).toBe('https://new.test')
    expect(next.relations).toEqual(collection.relations)
  })

  it('removes an item together with its relations', () => {
    const collection = base({
      items: [item('a'), item('b'), item('c')],
      relations: [relation('r1', 'a', 'b'), relation('r2', 'b', 'c')],
    })

    const next = applyCollectionOp(collection, {
      type: 'removeItem',
      itemKey: 'a',
    })

    expect(next.items.map(i => i.itemId)).toEqual(['b', 'c'])
    expect(next.relations?.map(r => r.id)).toEqual(['r2'])
  })

  it('adds a relation once and removes it by id', () => {
    const r = relation('r1', 'a', 'b')
    const added = applyCollectionOp(base(), {type: 'addRelation', relation: r})
    const again = applyCollectionOp(added, {type: 'addRelation', relation: r})
    const removed = applyCollectionOp(added, {
      type: 'removeRelation',
      relationId: 'r1',
    })

    expect(again).toBe(added)
    expect(removed.relations).toEqual([])
  })

  it('renames without touching items, and can clear the description', () => {
    const collection = base({description: 'old', items: [item('a')]})

    const next = applyCollectionOp(collection, {
      type: 'updateDetails',
      fields: {name: 'Transit', description: null},
    })

    expect(next.name).toBe('Transit')
    expect(next.description).toBeUndefined()
    expect(next.items).toBe(collection.items)
  })

  it('does not mutate its input', () => {
    const collection = base({items: [item('a')]})
    const snapshot = JSON.stringify(collection)

    applyCollectionOp(collection, {type: 'removeItem', itemKey: 'a'})

    expect(JSON.stringify(collection)).toBe(snapshot)
  })
})

describe('collection write queue', () => {
  it('runs writes to one collection one at a time, in order', async () => {
    const log: string[] = []
    const slow = () =>
      new Promise<void>(resolve =>
        setTimeout(() => {
          log.push('first')
          resolve()
        }, 20),
      )

    const first = enqueueCollectionWrite('c-order', slow)
    const second = enqueueCollectionWrite('c-order', async () => {
      log.push('second')
    })
    await Promise.all([first, second])

    expect(log).toEqual(['first', 'second'])
  })

  it('keeps running after a failed write', async () => {
    const failing = enqueueCollectionWrite('c-fail', async () => {
      throw new Error('boom')
    })
    const after = enqueueCollectionWrite('c-fail', async () => 'ok')

    await expect(failing).rejects.toThrow('boom')
    await expect(after).resolves.toBe('ok')
  })

  it('reports pending while queued and clears afterwards', async () => {
    const p = enqueueCollectionWrite('c-pending', async () => {})

    expect(hasPendingCollectionWrite('c-pending')).toBe(true)
    await p
    await Promise.resolve()

    expect(hasPendingCollectionWrite('c-pending')).toBe(false)
  })

  it('does not block other collections', async () => {
    let releaseA: () => void = () => {}
    const a = enqueueCollectionWrite(
      'c-a',
      () => new Promise<void>(resolve => (releaseA = resolve)),
    )
    const b = await enqueueCollectionWrite('c-b', async () => 'b-done')

    expect(b).toBe('b-done')
    releaseA()
    await a
  })

  it('remembers a write and can forget it', () => {
    rememberCollectionWrite('c-recent', {name: 'x'})

    expect(recallCollectionWrite('c-recent')).toEqual({name: 'x'})
    forgetCollectionWrite('c-recent')
    expect(recallCollectionWrite('c-recent')).toBeUndefined()
  })
})
