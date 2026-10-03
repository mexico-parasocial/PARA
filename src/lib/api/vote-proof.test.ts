import {postCivicVoteProof} from '#/lib/im8'
import {
  type PublicSessionBundle,
  type SessionBundle,
} from '#/state/session/session-core'
import {issueParaVoteProof} from './vote-proof'

jest.mock('#/lib/im8', () => ({postCivicVoteProof: jest.fn()}))

const agent = {session: {did: 'did:plc:voter'}} as unknown as SessionBundle
const input = {
  subjectUri: 'at://did:plc:board/com.para.civic.cabildeo/one',
  subjectType: 'cabildeo' as const,
  selectedOption: 1,
}
const proof = {
  ...input,
  voteNullifier: 'a'.repeat(64),
  eligibilityProofRef: 'm8:cabildeo:v1:' + 'b'.repeat(43),
  issuedAt: '2026-09-21T00:00:00Z',
}
const issue = jest.mocked(postCivicVoteProof)

beforeEach(() => issue.mockReset())

it('requests the chosen option without sending an alias', async () => {
  issue.mockResolvedValue(proof)
  await expect(issueParaVoteProof(agent, input)).resolves.toEqual(proof)
  expect(issue).toHaveBeenCalledWith(input)
})

it('propagates issuer failures instead of returning null', async () => {
  issue.mockRejectedValue(new Error('issuer unavailable'))
  await expect(issueParaVoteProof(agent, input)).rejects.toThrow(
    'issuer unavailable',
  )
})

it.each([
  {voteNullifier: ''},
  {eligibilityProofRef: ''},
  {eligibilityProofRef: 'm8:civic-vote-proof:legacy'},
  {subjectUri: 'at://another'},
  {subjectType: 'policy' as const},
])('rejects malformed or unrelated proof responses: %j', async extra => {
  issue.mockResolvedValue({...proof, ...extra})
  await expect(issueParaVoteProof(agent, input)).rejects.toThrow(/autorización/)
})

it('does not request a proof without a session', async () => {
  await expect(
    issueParaVoteProof({} as PublicSessionBundle, input),
  ).rejects.toThrow('Not logged in')
  expect(issue).not.toHaveBeenCalled()
})

it('accepts only a policy authorization for a policy ballot', async () => {
  const policyInput = {
    subjectUri: 'at://did:plc:author/app.bsky.feed.post/policy',
    subjectType: 'policy' as const,
    signal: 3,
  }
  const policyProof = {
    subjectUri: policyInput.subjectUri,
    subjectType: 'policy' as const,
    voteNullifier: 'a'.repeat(64),
    eligibilityProofRef: 'm8:policy:v1:' + 'c'.repeat(43),
    issuedAt: '2026-09-29T00:00:00Z',
  }
  issue.mockResolvedValue(policyProof)
  await expect(issueParaVoteProof(agent, policyInput)).resolves.toEqual(
    policyProof,
  )
  expect(issue).toHaveBeenCalledWith(policyInput)

  issue.mockResolvedValue({
    ...policyProof,
    eligibilityProofRef: 'm8:cabildeo:v1:' + 'b'.repeat(43),
  })
  await expect(issueParaVoteProof(agent, policyInput)).rejects.toThrow(
    /autorización/,
  )
})
