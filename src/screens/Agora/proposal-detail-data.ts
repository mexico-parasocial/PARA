import {AtUri} from '@atproto/syntax'

import {type CabildeoServiceAgent} from '#/lib/api/cabildeo'
import {isRecordNotFoundError} from '#/lib/xrpc-error'
import {com} from '#/lexicons'

export type ProposalKind = 'cabildeo' | 'qvl' | 'unsupported'

export type QvlProposal = {
  title: string
  body: string
  community: string
}

export function getProposalKind(uri: string): ProposalKind {
  try {
    const collection = new AtUri(uri).collection
    if (collection === 'com.para.civic.cabildeo') return 'cabildeo'
    if (collection === 'com.para.community.proposal') return 'qvl'
  } catch {
    // Invalid route parameters have an ordinary not-found state.
  }
  return 'unsupported'
}

function isQvlProposal(value: unknown): value is QvlProposal {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.title === 'string' &&
    typeof record.body === 'string' &&
    typeof record.community === 'string'
  )
}

export async function fetchQvlProposal(
  agent: CabildeoServiceAgent,
  uri: string,
): Promise<QvlProposal | null> {
  if (getProposalKind(uri) !== 'qvl') return null
  const parsed = new AtUri(uri)
  if (!parsed.rkey) return null

  try {
    const response = await agent.pdsClient.call(com.atproto.repo.getRecord, {
      repo: parsed.host,
      collection: 'com.para.community.proposal',
      rkey: parsed.rkey,
    })
    return isQvlProposal(response.value) ? response.value : null
  } catch (error) {
    if (isRecordNotFoundError(error)) return null
    throw error
  }
}
