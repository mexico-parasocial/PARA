import {type AtpAgent} from '@atproto/api'

import {type M8CivicVoteProof, postCivicVoteProof} from '#/lib/im8'

export async function issueParaVoteProof(
  agent: AtpAgent,
  input: {
    subjectUri: string
    subjectType: M8CivicVoteProof['subjectType']
  },
) {
  /*
   * The account DID is deliberately not sent. m8 has no use for it - the
   * nullifier is derived from the person root - and receiving it would let the
   * issuer observe account-to-ballot directly. OD-7 5a.4, mubEZ CD-12.
   */
  if (!agent.session) throw new Error('Not logged in')
  try {
    return await postCivicVoteProof(input)
  } catch {
    return null
  }
}
