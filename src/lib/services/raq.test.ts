import {postCivicVoteProof} from '#/lib/im8'
import {type SessionBundle} from '#/state/session/session-core'
import {submitAxisVote, submitProposalVote} from './raq'

jest.mock('#/lib/im8', () => ({postCivicVoteProof: jest.fn()}))

/*
 * RAQ votes are public reactions: their counts are shown, never acted on. So
 * they must not ask m8 for a proof, which would make the issuer store which
 * subject this person reacted to, and the PDS now refuses one that carries it
 * (OD-7 §5h). These pin both halves on the client.
 */
function fakeAgent() {
  const call = jest.fn().mockResolvedValue({})
  const agent = {
    session: {did: 'did:plc:voter'},
    pdsClient: {call},
  } as unknown as SessionBundle
  return {agent, call}
}

const writtenRecord = (call: jest.Mock) =>
  (call.mock.calls[0][1] as {record: Record<string, unknown>}).record

beforeEach(() => jest.mocked(postCivicVoteProof).mockReset())

it('writes an axis vote without asking m8 for a proof', async () => {
  const {agent, call} = fakeAgent()
  await submitAxisVote(agent, 'community-axis-1', 1)

  expect(postCivicVoteProof).not.toHaveBeenCalled()
  const record = writtenRecord(call)
  expect(record).not.toHaveProperty('voteNullifier')
  expect(record).not.toHaveProperty('eligibilityProofRef')
})

it('writes a proposal vote without asking m8 for a proof', async () => {
  const {agent, call} = fakeAgent()
  await submitProposalVote(
    agent,
    'at://did:plc:author/com.para.raq.proposal/one',
    -1,
  )

  expect(postCivicVoteProof).not.toHaveBeenCalled()
  const record = writtenRecord(call)
  expect(record).not.toHaveProperty('voteNullifier')
  expect(record).not.toHaveProperty('eligibilityProofRef')
  expect(record.value).toBe(-1)
})
