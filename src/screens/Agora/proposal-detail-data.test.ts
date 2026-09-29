import {type CabildeoServiceAgent} from '#/lib/api/cabildeo'
import {fetchQvlProposal, getProposalKind} from './proposal-detail-data'

const qvlUri = 'at://did:plc:alice/com.para.community.proposal/abc'
const civicUri = 'at://did:plc:alice/com.para.civic.cabildeo/abc'

function agentWithRecord(call: jest.Mock): CabildeoServiceAgent {
  return {pdsClient: {call}} as unknown as CabildeoServiceAgent
}

describe('proposal detail data', () => {
  it('distinguishes supported records from malformed routes', () => {
    expect(getProposalKind(qvlUri)).toBe('qvl')
    expect(getProposalKind(civicUri)).toBe('cabildeo')
    expect(getProposalKind('not an at-uri')).toBe('unsupported')
  })

  it('loads proposal metadata from its author repo', async () => {
    const call = jest.fn().mockResolvedValue({
      value: {
        title: 'Local parks',
        body: 'Fund new trees',
        community: civicUri,
      },
    })
    await expect(
      fetchQvlProposal(agentWithRecord(call), qvlUri),
    ).resolves.toEqual({
      title: 'Local parks',
      body: 'Fund new trees',
      community: civicUri,
    })
    expect(call).toHaveBeenCalledWith(expect.anything(), {
      repo: 'did:plc:alice',
      collection: 'com.para.community.proposal',
      rkey: 'abc',
    })
  })

  it('does not fetch unsupported records and treats absent or invalid records as missing', async () => {
    const call = jest.fn().mockResolvedValue({value: {title: 'Incomplete'}})
    const agent = agentWithRecord(call)
    await expect(fetchQvlProposal(agent, civicUri)).resolves.toBeNull()
    expect(call).not.toHaveBeenCalled()
    await expect(fetchQvlProposal(agent, qvlUri)).resolves.toBeNull()
    call.mockRejectedValueOnce(new Error('Could not locate record: abc'))
    await expect(fetchQvlProposal(agent, qvlUri)).resolves.toBeNull()
  })

  it('propagates network failures so the screen can offer retry', async () => {
    const call = jest.fn().mockRejectedValue(new Error('Network unavailable'))
    await expect(
      fetchQvlProposal(agentWithRecord(call), qvlUri),
    ).rejects.toThrow('Network unavailable')
  })
})
