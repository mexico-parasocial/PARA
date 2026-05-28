import {createPersistedQueryStorage} from '../persisted-query-storage'

describe('persisted-query-storage', () => {
  it('stores and retrieves data', async () => {
    const storage = createPersistedQueryStorage('test-storage')
    await storage.setItem('foo', 'bar')
    expect(await storage.getItem('foo')).toBe('bar')
    await storage.removeItem('foo')
    expect(await storage.getItem('foo')).toBe(null)
  })
})
