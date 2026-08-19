import {type Client, type LexMap} from '@atproto/lex'
import {type AtIdentifierString, type NsidString} from '@atproto/syntax'

import {
  PARA_IDENTITY_COLLECTION,
  type ParaIdentityRecord,
} from '#/lib/api/para-lexicons'
import {com} from '#/lexicons'

export const PARA_IDENTITY_RKEY = 'self'

export async function fetchParaIdentity(
  client: Client,
  repo: string,
): Promise<ParaIdentityRecord | null> {
  const res = await client
    .call(com.atproto.repo.getRecord, {
      repo: repo as AtIdentifierString,
      collection: PARA_IDENTITY_COLLECTION as NsidString,
      rkey: PARA_IDENTITY_RKEY,
    })
    .catch(() => null)

  return parseParaIdentityRecord(res?.value)
}

export async function putParaIdentity(
  client: Client,
  repo: string,
  record: Omit<ParaIdentityRecord, 'createdAt'> & {createdAt?: string},
) {
  const now = new Date().toISOString()
  const fullRecord: ParaIdentityRecord & {$type: string} = {
    $type: PARA_IDENTITY_COLLECTION,
    createdAt: record.createdAt ?? now,
    isVerifiedPublicFigure: record.isVerifiedPublicFigure,
    proofBlob: record.proofBlob,
    verifiedAt: record.isVerifiedPublicFigure
      ? (record.verifiedAt ?? now)
      : undefined,
    publicVotes: record.publicVotes,
    publicRaq: record.publicRaq,
    publicHighlights: record.publicHighlights,
    state: record.state,
    compassPosition: record.compassPosition,
    party: record.party,
  }

  return await client.call(com.atproto.repo.putRecord, {
    repo: repo as AtIdentifierString,
    collection: PARA_IDENTITY_COLLECTION as NsidString,
    rkey: PARA_IDENTITY_RKEY,
    record: fullRecord as unknown as LexMap,
  })
}

function parseParaIdentityRecord(value: unknown): ParaIdentityRecord | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Partial<ParaIdentityRecord>
  if (typeof record.isVerifiedPublicFigure !== 'boolean') return null
  if (typeof record.createdAt !== 'string') return null

  return {
    createdAt: record.createdAt,
    isVerifiedPublicFigure: record.isVerifiedPublicFigure,
    proofBlob:
      typeof record.proofBlob === 'string' ? record.proofBlob : undefined,
    verifiedAt:
      typeof record.verifiedAt === 'string' ? record.verifiedAt : undefined,
    publicVotes:
      typeof record.publicVotes === 'boolean' ? record.publicVotes : undefined,
    publicRaq:
      typeof record.publicRaq === 'boolean' ? record.publicRaq : undefined,
    publicHighlights:
      typeof record.publicHighlights === 'boolean'
        ? record.publicHighlights
        : undefined,
    state: typeof record.state === 'string' ? record.state : undefined,
    compassPosition:
      typeof record.compassPosition === 'string'
        ? record.compassPosition
        : undefined,
    party: typeof record.party === 'string' ? record.party : undefined,
  }
}
