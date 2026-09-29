import {issueParaVoteProof} from '#/lib/api/vote-proof'
import {type SessionBundle} from '#/state/session/session-core'
import {com} from '#/lexicons'
import {castCabildeoVote} from './cabildeo'

jest.mock('#/lib/api/vote-proof', () => ({issueParaVoteProof: jest.fn()}))

const cabildeo = 'at://did:plc:author/com.para.civic.cabildeo/one'
const proof = {
  subjectUri: cabildeo,
  subjectType: 'cabildeo' as const,
  voteNullifier: 'a'.repeat(64),
  eligibilityProofRef: `m8:cabildeo:v1:${'b'.repeat(43)}`,
  issuedAt: '2026-09-24T00:00:00Z',
}
const issue = jest.mocked(issueParaVoteProof)

function makeAgent() {
  const pdsCall = jest.fn().mockResolvedValue({uri: 'at://vote', cid: 'cid'})
  const appviewCall = jest.fn()
  const agent = {
    session: {did: 'did:plc:voter'},
    pdsClient: {call: pdsCall},
    appviewClient: {call: appviewCall},
  } as unknown as SessionBundle
  return {agent, pdsCall, appviewCall}
}

const vote = {
  cabildeo,
  subject: cabildeo,
  subjectType: 'cabildeo' as const,
  selectedOption: 1,
  isDirect: true,
}

beforeEach(() => issue.mockReset())

it('writes a proof-bound vote to the account PDS', async () => {
  const {agent, pdsCall, appviewCall} = makeAgent()
  issue.mockResolvedValue(proof)

  await castCabildeoVote(agent, vote)

  expect(issue).toHaveBeenCalledWith(agent, {
    subjectUri: cabildeo,
    subjectType: 'cabildeo',
    selectedOption: 1,
  })
  expect(pdsCall).toHaveBeenCalledWith(com.para.civic.castVote, {
    cabildeo,
    selectedOption: 1,
    voteNullifier: proof.voteNullifier,
    eligibilityProofRef: proof.eligibilityProofRef,
  })
  expect(appviewCall).not.toHaveBeenCalled()
})

it('does not attempt a write when m8 is unavailable', async () => {
  const {agent, pdsCall, appviewCall} = makeAgent()
  issue.mockRejectedValue(new Error('issuer unavailable'))

  await expect(castCabildeoVote(agent, vote)).rejects.toThrow(
    'issuer unavailable',
  )
  expect(pdsCall).not.toHaveBeenCalled()
  expect(appviewCall).not.toHaveBeenCalled()
})
