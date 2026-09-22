import {type M8CivicVoteProof, postCivicVoteProof} from '#/lib/im8'
import {
  type PublicSessionBundle,
  type SessionBundle,
} from '#/state/session/session-core'

export async function issueParaVoteProof(
  agent: SessionBundle | PublicSessionBundle,
  input: {
    subjectUri: string
    selectedOption?: number
    subjectType: M8CivicVoteProof['subjectType']
  },
) {
  if (!agent.session) throw new Error('Not logged in')
  const proof = await postCivicVoteProof(input)
  if (
    !proof ||
    proof.subjectUri !== input.subjectUri ||
    proof.subjectType !== input.subjectType ||
    typeof proof.voteNullifier !== 'string' ||
    !/^[a-f0-9]{64}$/.test(proof.voteNullifier) ||
    typeof proof.eligibilityProofRef !== 'string' ||
    !proof.eligibilityProofRef.trim() ||
    proof.eligibilityProofRef.length > 512 ||
    (input.subjectType === 'cabildeo' &&
      !/^m8:cabildeo:v1:[A-Za-z0-9_-]{43}$/.test(proof.eligibilityProofRef))
  ) {
    throw new Error('El emisor no devolvió una autorización de voto válida')
  }
  return proof
}
