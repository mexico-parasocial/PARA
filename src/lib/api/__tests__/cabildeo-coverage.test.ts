import {
  type CabildeoServiceAgent,
  fetchCabildeos,
  fetchCabildeosWithCoverage,
} from '../cabildeo'

jest.mock('#/lib/api/vote-proof', () => ({issueParaVoteProof: jest.fn()}))
jest.mock('#/lexicons', () => ({com: {para: {civic: {listCabildeos: 'list'}}}}))

const call = jest.fn()
const agent = {appviewClient: {call}} as unknown as CabildeoServiceAgent
beforeEach(() => call.mockReset())

it('reports complete coverage only when the cursor is exhausted', async () => {
  call
    .mockResolvedValueOnce({cabildeos: [{uri: 'first'}], cursor: 'next'})
    .mockResolvedValueOnce({cabildeos: [{uri: 'last'}]})
  expect(await fetchCabildeosWithCoverage(agent)).toEqual({
    cabildeos: [{uri: 'first'}, {uri: 'last'}],
    hasMore: false,
  })
  expect(call.mock.calls[1][1].cursor).toBe('next')
})

it('exposes the safety cap as incomplete coverage', async () => {
  call.mockResolvedValue({cabildeos: [{uri: 'record'}], cursor: 'still-more'})
  const result = await fetchCabildeosWithCoverage(agent)
  expect(result.hasMore).toBe(true)
  expect(result.cabildeos).toHaveLength(20)
  expect(call).toHaveBeenCalledTimes(20)
})

it('preserves the existing array API for other civic screens', async () => {
  call.mockResolvedValue({cabildeos: [{uri: 'record'}]})
  expect(await fetchCabildeos(agent)).toEqual([{uri: 'record'}])
})
