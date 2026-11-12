import {AtUri} from '@atproto/syntax'

import {type CabildeoServiceAgent} from '#/lib/api/cabildeo'
import {isRecordNotFoundError} from '#/lib/xrpc-error'
import {com} from '#/lexicons'

/**
 * `legacy` is a `com.para.community.proposal`, which nothing writes any more:
 * proposals, arguments and decisions are cabildeos. It is shown read-only.
 */
export type ProposalKind = 'cabildeo' | 'legacy' | 'unsupported'

export type LegacyProposal = {
  title: string
  body: string
  community: string
}

export function getProposalKind(uri: string): ProposalKind {
  try {
    const collection = new AtUri(uri).collection
    if (collection === 'com.para.civic.cabildeo') return 'cabildeo'
    if (collection === 'com.para.community.proposal') return 'legacy'
  } catch {
    // Invalid route parameters have an ordinary not-found state.
  }
  return 'unsupported'
}

function isLegacyProposal(value: unknown): value is LegacyProposal {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.title === 'string' &&
    typeof record.body === 'string' &&
    typeof record.community === 'string'
  )
}

export async function fetchLegacyProposal(
  agent: CabildeoServiceAgent,
  uri: string,
): Promise<LegacyProposal | null> {
  if (getProposalKind(uri) !== 'legacy') return null
  const parsed = new AtUri(uri)
  if (!parsed.rkey) return null

  try {
    const response = await agent.pdsClient.call(com.atproto.repo.getRecord, {
      repo: parsed.host,
      collection: 'com.para.community.proposal',
      rkey: parsed.rkey,
    })
    return isLegacyProposal(response.value) ? response.value : null
  } catch (error) {
    if (isRecordNotFoundError(error)) return null
    throw error
  }
}
