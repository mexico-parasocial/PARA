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
      collection: PARA_IDENTITY_COLLECTION,
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
    publicDelegations: record.publicDelegations,
    publicPolicies: record.publicPolicies,
    publicQuestions: record.publicQuestions,
    publicActivities: record.publicActivities,
    state: record.state,
    compassPosition: record.compassPosition,
    party: record.party,
  }

  return await client.call(com.atproto.repo.putRecord, {
    repo: repo as AtIdentifierString,
    collection: PARA_IDENTITY_COLLECTION,
    rkey: PARA_IDENTITY_RKEY,
    record: fullRecord as unknown as LexMap,
  })
}

/**
 * Merges `patch` into the stored identity instead of replacing it, so a writer
 * that only knows some fields cannot erase the others.
 */
export async function updateParaIdentity(
  client: Client,
  repo: string,
  patch: Partial<Omit<ParaIdentityRecord, 'createdAt'>>,
) {
  const existing = await fetchParaIdentity(client, repo)
  return putParaIdentity(client, repo, {
    ...existing,
    isVerifiedPublicFigure: existing?.isVerifiedPublicFigure ?? false,
    ...patch,
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
    publicDelegations:
      typeof record.publicDelegations === 'boolean'
        ? record.publicDelegations
        : undefined,
    publicPolicies:
      typeof record.publicPolicies === 'boolean'
        ? record.publicPolicies
        : undefined,
    publicQuestions:
      typeof record.publicQuestions === 'boolean'
        ? record.publicQuestions
        : undefined,
    publicActivities:
      typeof record.publicActivities === 'boolean'
        ? record.publicActivities
        : undefined,
    state: typeof record.state === 'string' ? record.state : undefined,
    compassPosition:
      typeof record.compassPosition === 'string'
        ? record.compassPosition
        : undefined,
    party: typeof record.party === 'string' ? record.party : undefined,
  }
}
