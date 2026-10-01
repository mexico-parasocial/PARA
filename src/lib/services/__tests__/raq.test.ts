import {TID} from '@atproto/common-web'

import {com} from '#/lexicons'
import {
  fetchCommunityAlignment,
  fetchUserAlignment,
  type ParaServiceAgent,
  submitOpenQuestion,
  submitProposalVote,
  submitProposedQuestion,
} from '../raq'

function setup() {
  const call = jest.fn().mockResolvedValue({})
  return {
    call,
    agent: {
      session: {did: 'did:plc:viewer'},
      pdsClient: {call},
      appviewClient: {call},
    } as unknown as ParaServiceAgent,
  }
}

it('writes proposals with valid TIDs and preserves the exact axis and community', async () => {
  const {call, agent} = setup()
  await submitProposedQuestion(
    agent,
    'A real proposal',
    'eco_coord',
    'at://did:plc:community/com.para.community/one',
  )
  const [endpoint, request] = call.mock.calls[0]
  expect(endpoint).toBe(com.atproto.repo.putRecord)
  expect(TID.fromStr(request.rkey).toString()).toBe(request.rkey)
  expect(request.record).toMatchObject({
    text: 'A real proposal',
    targetAxis: 'eco_coord',
    targetCommunity: 'at://did:plc:community/com.para.community/one',
  })
})

it('writes a neutral support reaction to undo a proposal vote', async () => {
  const {call, agent} = setup()
  await submitProposalVote(
    agent,
    'at://did:plc:author/com.para.raq.proposal/one',
    0,
  )
  expect(call.mock.calls[0][1].record.value).toBe(0)
  expect(TID.fromStr(call.mock.calls[0][1].rkey).toString()).toBe(
    call.mock.calls[0][1].rkey,
  )
})

it('publishes open questions with the searchable marker exactly once', async () => {
  const {call, agent} = setup()
  await submitOpenQuestion(agent, '  Why?  ')
  await submitOpenQuestion(agent, 'Why? |#?OpenQuestion')
  expect(call.mock.calls[0][1].record).toMatchObject({
    text: 'Why?\n\n|#?OpenQuestion',
    tags: ['?OpenQuestion'],
  })
  expect(call.mock.calls[1][1].record.text).toBe('Why? |#?OpenQuestion')
})

it('treats missing published alignment as empty but preserves network errors', async () => {
  const {call, agent} = setup()
  call.mockRejectedValueOnce({error: 'NotFound'})
  await expect(fetchUserAlignment(agent, 'did:plc:viewer')).resolves.toBeNull()
  const offline = new Error('offline')
  call.mockRejectedValueOnce(offline)
  await expect(fetchUserAlignment(agent, 'did:plc:viewer')).rejects.toBe(
    offline,
  )
  call.mockRejectedValueOnce(offline)
  await expect(fetchCommunityAlignment(agent, 'community')).rejects.toBe(
    offline,
  )
})

it('rejects logged-out writes before contacting the PDS', async () => {
  const {call, agent} = setup()
  const loggedOut = {
    ...agent,
    session: undefined,
  } as unknown as ParaServiceAgent
  await expect(submitOpenQuestion(loggedOut, 'Question')).rejects.toThrow(
    'Not logged in',
  )
  await expect(submitProposedQuestion(loggedOut, 'Proposal')).rejects.toThrow(
    'Not logged in',
  )
  expect(call).not.toHaveBeenCalled()
})
