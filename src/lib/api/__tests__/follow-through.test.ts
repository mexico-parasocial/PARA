import {type CabildeoServiceAgent} from '../cabildeo'
import {
  EMPTY_FOLLOW_THROUGH,
  fetchFollowThrough,
  fetchFollowThroughItem,
} from '../follow-through'

jest.mock('#/lexicons', () => ({
  com: {
    para: {civic: {listFollowThrough: 'list', getFollowThrough: 'get'}},
  },
}))

const CABILDEO = 'at://did:plc:a/com.para.civic.cabildeo/1'
const OTHER = 'at://did:plc:a/com.para.civic.cabildeo/2'

const call = jest.fn()
const agent = {appviewClient: {call}} as unknown as CabildeoServiceAgent
beforeEach(() => call.mockReset())

describe('fetchFollowThrough', () => {
  it('asks for one cabildeo and keeps that cabildeo summary', async () => {
    call.mockResolvedValue({
      items: [{uri: 'item'}],
      summaries: [
        {cabildeo: OTHER, total: 9},
        {cabildeo: CABILDEO, total: 2},
      ],
    })
    const result = await fetchFollowThrough(agent, CABILDEO)
    expect(call).toHaveBeenCalledWith('list', {cabildeo: CABILDEO})
    expect(result.items).toEqual([{uri: 'item'}])
    expect(result.summary).toEqual({cabildeo: CABILDEO, total: 2})
  })

  it('reads an AppView without the method as empty', async () => {
    call.mockRejectedValue({status: 501, error: 'MethodNotImplemented'})
    expect(await fetchFollowThrough(agent, CABILDEO)).toBe(EMPTY_FOLLOW_THROUGH)
  })

  it('does not hide a real failure', async () => {
    call.mockRejectedValue(new Error('network down'))
    await expect(fetchFollowThrough(agent, CABILDEO)).rejects.toThrow(
      'network down',
    )
  })
})

describe('fetchFollowThroughItem', () => {
  it('returns the item', async () => {
    call.mockResolvedValue({item: {uri: 'item', updates: []}})
    expect(await fetchFollowThroughItem(agent, 'item')).toEqual({
      uri: 'item',
      updates: [],
    })
    expect(call).toHaveBeenCalledWith('get', {uri: 'item'})
  })

  it('treats NotFound as not served', async () => {
    call.mockRejectedValue({error: 'NotFound'})
    expect(await fetchFollowThroughItem(agent, 'item')).toBeNull()
  })

  it('does not hide a real failure', async () => {
    call.mockRejectedValue(new Error('boom'))
    await expect(fetchFollowThroughItem(agent, 'item')).rejects.toThrow('boom')
  })
})
