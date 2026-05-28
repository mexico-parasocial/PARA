import {type BskyAgent} from '@atproto/api'

import {postCivicVoteProof, type M8CivicVoteProof} from '#/lib/m8'

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
