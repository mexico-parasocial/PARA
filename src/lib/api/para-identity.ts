import {type BskyAgent} from '@atproto/api'

import {
  PARA_IDENTITY_COLLECTION,
  type ParaIdentityRecord,
} from '#/lib/api/para-lexicons'

export const PARA_IDENTITY_RKEY = 'self'

export async function fetchParaIdentity(
  agent: BskyAgent,
  repo: string,
): Promise<ParaIdentityRecord | null> {
  const res = await agent.com.atproto.repo
    .getRecord({
      repo,
      collection: PARA_IDENTITY_COLLECTION,
      rkey: PARA_IDENTITY_RKEY,
    })
    .catch(() => null)

  return parseParaIdentityRecord(res?.data.value)
}

export async function putParaIdentity(
  agent: BskyAgent,
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

  return await agent.com.atproto.repo.putRecord({
    repo,
    collection: PARA_IDENTITY_COLLECTION,
    rkey: PARA_IDENTITY_RKEY,
    record: fullRecord as unknown as Record<string, unknown>,
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
