import {issueParaVoteProof} from '#/lib/api/vote-proof'
import {
  type PublicSessionBundle,
  type SessionBundle,
} from '#/state/session/session-core'
import {com} from '#/lexicons'

const VOTE_COLLECTION = 'com.para.civic.vote'

/** A policy ballot's weight: whole numbers from -3 to +3. */
export function isPolicySignal(signal: number): boolean {
  return Number.isInteger(signal) && signal >= -3 && signal <= 3
}

/**
 * Casts a public policy ballot: a -3..+3 signal on a policy post, written to
 * the voter's own repo under the identity they are using, and attributable to
 * it permanently (docs/revocable-mandates-spec.md §4.0). m8 authorizes it
 * first, binding the signal, and the PDS refuses the record without that
 * authorization. Casting again replaces the earlier ballot: m8 returns the
 * same nullifier for the same person and policy.
 */
export async function castPolicyVote(
  agent: SessionBundle | PublicSessionBundle,
  input: {policyUri: string; signal: number},
) {
  if (!agent.session) throw new Error('Not logged in')
  if (!isPolicySignal(input.signal)) {
    throw new Error('Policy signal must be a whole number from -3 to +3')
  }

  const proof = await issueParaVoteProof(agent, {
    subjectUri: input.policyUri,
    subjectType: 'policy',
    signal: input.signal,
  })

  const created = await agent.pdsClient.call(com.atproto.repo.createRecord, {
    repo: agent.session.did,
    collection: VOTE_COLLECTION,
    record: {
      $type: VOTE_COLLECTION,
      subject: input.policyUri,
      subjectType: 'policy',
      signal: input.signal,
      isDirect: true,
      voteNullifier: proof.voteNullifier,
      eligibilityProofRef: proof.eligibilityProofRef,
      createdAt: new Date().toISOString(),
    },
  })

  await removeEarlierBallots(agent, input.policyUri, created.uri).catch(() => {
    // Best effort: the AppView already counts only the newest ballot per
    // person (by nullifier). A leftover only shows in the profile history.
  })
  return created
}

/**
 * Deletes this identity's earlier ballots on the same policy, so the profile
 * shows one current vote per policy rather than every change.
 */
async function removeEarlierBallots(
  agent: SessionBundle | PublicSessionBundle,
  policyUri: string,
  keepUri: string,
) {
  if (!agent.session) return
  const res = await agent.pdsClient.call(com.atproto.repo.listRecords, {
    repo: agent.session.did,
    collection: VOTE_COLLECTION,
    limit: 100,
  })
  for (const item of res.records) {
    const value = item.value as {subject?: unknown; subjectType?: unknown}
    if (
      item.uri === keepUri ||
      value.subjectType !== 'policy' ||
      value.subject !== policyUri
    ) {
      continue
    }
    const rkey = item.uri.split('/').pop()
    if (!rkey) continue
    await agent.pdsClient.call(com.atproto.repo.deleteRecord, {
      repo: agent.session.did,
      collection: VOTE_COLLECTION,
      rkey,
    })
  }
}
