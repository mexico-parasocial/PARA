import {issueParaVoteProof} from '#/lib/api/vote-proof'
import {type SessionBundle} from '#/state/session/session-core'
import {castPolicyVote} from './policy-vote'

jest.mock('#/lib/api/vote-proof', () => ({issueParaVoteProof: jest.fn()}))

const policyUri = 'at://did:plc:author/app.bsky.feed.post/policy'
const call = jest.fn()
const agent = {
  session: {did: 'did:plc:voter'},
  pdsClient: {call},
} as unknown as SessionBundle
const issue = jest.mocked(issueParaVoteProof)

const newUri = 'at://did:plc:voter/com.para.civic.vote/new'

/** Routes pdsClient.call by method: create returns newUri, list returns `listed`. */
let listed: {uri: string; value: Record<string, unknown>}[] = []
beforeEach(() => {
  listed = []
  call.mockReset().mockImplementation(async (method: {$nsid?: string}) => {
    const nsid = String(method?.$nsid ?? method)
    if (nsid.includes('listRecords')) return {records: listed}
    if (nsid.includes('deleteRecord')) return {}
    return {uri: newUri, cid: 'c'}
  })
  issue.mockReset().mockResolvedValue({
    subjectUri: policyUri,
    subjectType: 'policy',
    voteNullifier: 'a'.repeat(64),
    eligibilityProofRef: 'm8:policy:v1:' + 'b'.repeat(43),
    issuedAt: '2026-09-29T00:00:00Z',
  })
})

it('asks m8 to bind the signal, then writes the ballot to the own repo', async () => {
  await castPolicyVote(agent, {policyUri, signal: -2})

  expect(issue).toHaveBeenCalledWith(agent, {
    subjectUri: policyUri,
    subjectType: 'policy',
    signal: -2,
  })
  const [, write] = call.mock.calls[0]
  expect(write).toMatchObject({
    repo: 'did:plc:voter',
    collection: 'com.para.civic.vote',
    record: {
      subject: policyUri,
      subjectType: 'policy',
      signal: -2,
      isDirect: true,
      voteNullifier: 'a'.repeat(64),
      eligibilityProofRef: 'm8:policy:v1:' + 'b'.repeat(43),
    },
  })
  // Never names delegators or an option.
  expect(write.record).not.toHaveProperty('delegatedFrom')
  expect(write.record).not.toHaveProperty('selectedOption')
})

it.each([4, -4, 1.5])(
  'refuses a signal outside -3..+3 before asking m8: %s',
  async signal => {
    await expect(castPolicyVote(agent, {policyUri, signal})).rejects.toThrow(
      /-3 to \+3/,
    )
    expect(issue).not.toHaveBeenCalled()
    expect(call).not.toHaveBeenCalled()
  },
)

it('writes nothing when m8 refuses the authorization', async () => {
  issue.mockRejectedValue(new Error('INE required'))
  await expect(castPolicyVote(agent, {policyUri, signal: 1})).rejects.toThrow(
    'INE required',
  )
  expect(call).not.toHaveBeenCalled()
})

it('removes the earlier ballots on the same policy, and only those', async () => {
  listed = [
    {uri: newUri, value: {subject: policyUri, subjectType: 'policy'}},
    {
      uri: 'at://did:plc:voter/com.para.civic.vote/old',
      value: {subject: policyUri, subjectType: 'policy'},
    },
    {
      uri: 'at://did:plc:voter/com.para.civic.vote/other-policy',
      value: {subject: 'at://other', subjectType: 'policy'},
    },
    {
      uri: 'at://did:plc:voter/com.para.civic.vote/cabildeo',
      value: {subject: policyUri, subjectType: 'cabildeo'},
    },
  ]
  await castPolicyVote(agent, {policyUri, signal: 1})

  const deletes = call.mock.calls
    .map(([, input]) => input)
    .filter(input => input && 'rkey' in input)
  expect(deletes).toEqual([
    {repo: 'did:plc:voter', collection: 'com.para.civic.vote', rkey: 'old'},
  ])
})

it('still counts the vote when cleanup fails', async () => {
  call.mockImplementation(async (method: {$nsid?: string}) => {
    if (String(method?.$nsid ?? method).includes('listRecords')) {
      throw new Error('list failed')
    }
    return {uri: newUri, cid: 'c'}
  })
  await expect(castPolicyVote(agent, {policyUri, signal: 1})).resolves.toEqual({
    uri: newUri,
    cid: 'c',
  })
})
