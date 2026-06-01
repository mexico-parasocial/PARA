import {type BskyAgent} from '@atproto/api'

import {type M8CivicVoteProof,postCivicVoteProof} from '#/lib/m8'

export async function issueParaVoteProof(
  agent: BskyAgent,
  input: {
    subjectUri: string
    subjectType: M8CivicVoteProof['subjectType']
  },
) {
  if (!agent.session) throw new Error('Not logged in')
  try {
    return await postCivicVoteProof({
      ...input,
      aliasDid: agent.session.did,
    })
  } catch {
    return null
  }
}
