import {useMemo} from 'react'
import {type AtIdentifierString, AtUri, type NsidString} from '@atproto/syntax'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  type CommunityActivityLedgerEntryRecord,
  type CommunityWikiPageRecord,
  type EconomicActivityRecord,
  PARA_COMMUNITY_ACTIVITY_LEDGER_COLLECTION,
  PARA_COMMUNITY_ECONOMIC_ACTIVITY_COLLECTION,
  PARA_COMMUNITY_SOCIAL_ACTIVITY_COLLECTION,
  PARA_COMMUNITY_WIKI_PAGE_COLLECTION,
  type SocialActivityRecord,
} from '#/lib/api/para-lexicons'
import {
  type ActivityCategory,
  computeTermsDigest,
} from '#/lib/community-activities'
import {type CommunityGovernanceView} from '#/lib/community-governance'
import {logger} from '#/logger'
import {STALE} from '#/state/queries'
import {useCommunityGovernanceQuery} from '#/state/queries/community-governance'
import {useAgent, useSession} from '#/state/session'
import {com} from '#/lexicons'

/*
 * Activities, their ledgers and wiki pages are records in their authors' own
 * repos, read straight from those repos. The AppView does not index them yet,
 * so a community's menu is assembled from the repos of the people entitled to
 * publish there: the published moderators and officials, the board creator,
 * and the viewer (who always sees their own drafts). Every figure on an
 * activity page therefore comes from a record signed by the organizer, which
 * is the property the transparency ledger depends on.
 */

const RQKEY_ROOT = 'community-activities'
const MAX_PAGES_PER_REPO = 5

type RepoRecord<T> = {uri: string; cid: string; authorDid: string; record: T}

export type SocialActivityView = RepoRecord<SocialActivityRecord> & {
  category: 'social'
}
export type EconomicActivityView = RepoRecord<EconomicActivityRecord> & {
  category: 'economic'
}
export type CommunityActivityView = SocialActivityView | EconomicActivityView
export type CommunityLedgerEntryView =
  RepoRecord<CommunityActivityLedgerEntryRecord>
export type CommunityWikiPageView = RepoRecord<CommunityWikiPageRecord>

type Agent = ReturnType<typeof useAgent>

export function getCommunityOrganizerDids({
  governance,
  creatorDid,
  viewerDid,
}: {
  governance?: CommunityGovernanceView
  creatorDid?: string
  viewerDid?: string
}) {
  const dids = [
    creatorDid,
    viewerDid,
    ...(governance?.moderators ?? []).map(person => person.did),
    ...(governance?.officials ?? []).map(person => person.did),
  ].filter((did): did is string => Boolean(did?.startsWith('did:')))
  return Array.from(new Set(dids)).sort()
}

function repoOfUri(uri: string | undefined) {
  if (!uri) return undefined
  try {
    return new AtUri(uri).host
  } catch {
    return undefined
  }
}

/**
 * Who may publish activities and wiki pages for a community: the board's
 * creator (the board record lives in their repo) and its published moderators
 * and officials.
 */
export function useCommunityOrganizers({
  communityUri,
  communityName,
  communityId,
  governance: providedGovernance,
}: {
  communityUri: string | undefined
  communityName?: string
  communityId?: string
  /** Pass when the caller already holds it, to skip the lookup. */
  governance?: CommunityGovernanceView
}) {
  const {currentAccount} = useSession()
  const viewerDid = currentAccount?.did
  const {data: fetchedGovernance} = useCommunityGovernanceQuery({
    communityName: communityName ?? '',
    communityId,
    enabled: !providedGovernance && Boolean(communityName || communityId),
  })
  const governance = providedGovernance ?? fetchedGovernance ?? undefined
  const creatorDid = repoOfUri(communityUri)

  return useMemo(() => {
    const publishers = getCommunityOrganizerDids({governance, creatorDid})
    return {
      organizerDids: getCommunityOrganizerDids({
        governance,
        creatorDid,
        viewerDid,
      }),
      canOrganize: Boolean(viewerDid && publishers.includes(viewerDid)),
    }
  }, [governance, creatorDid, viewerDid])
}

async function listRepoRecords<T>(
  agent: Agent,
  repo: string,
  collection: string,
  keep: (value: T) => boolean,
): Promise<RepoRecord<T>[]> {
  const out: RepoRecord<T>[] = []
  let cursor: string | undefined
  for (let page = 0; page < MAX_PAGES_PER_REPO; page++) {
    const res = await agent.pdsClient.call(com.atproto.repo.listRecords, {
      repo: repo as AtIdentifierString,
      collection: collection as NsidString,
      limit: 100,
      cursor,
    })
    for (const item of res.records) {
      const value = item.value as unknown as T
      if (keep(value)) {
        out.push({uri: item.uri, cid: item.cid, authorDid: repo, record: value})
      }
    }
    cursor = res.cursor
    if (!cursor || res.records.length === 0) break
  }
  return out
}

/** A repo that cannot be read hides its records instead of the whole menu. */
async function listFromRepos<T>(
  agent: Agent,
  repos: string[],
  collection: string,
  keep: (value: T) => boolean,
) {
  const results = await Promise.allSettled(
    repos.map(repo => listRepoRecords<T>(agent, repo, collection, keep)),
  )
  return results.flatMap((result, index) => {
    if (result.status === 'fulfilled') return result.value
    logger.warn('community-activities: could not read repo', {
      repo: repos[index],
      collection,
      safeMessage: String(result.reason),
    })
    return []
  })
}

// ─── Activities ─────────────────────────────────────────────────────────────

const ACTIVITY_COLLECTIONS: Record<ActivityCategory, string> = {
  social: PARA_COMMUNITY_SOCIAL_ACTIVITY_COLLECTION,
  economic: PARA_COMMUNITY_ECONOMIC_ACTIVITY_COLLECTION,
}

export function getActivityCategoryFromUri(
  uri: string,
): ActivityCategory | undefined {
  const collection = new AtUri(uri).collection
  if (collection === PARA_COMMUNITY_SOCIAL_ACTIVITY_COLLECTION) return 'social'
  if (collection === PARA_COMMUNITY_ECONOMIC_ACTIVITY_COLLECTION) {
    return 'economic'
  }
  return undefined
}

function toActivityView(
  category: ActivityCategory,
  item: RepoRecord<unknown>,
): CommunityActivityView {
  return category === 'social'
    ? {...item, category, record: item.record as SocialActivityRecord}
    : {...item, category, record: item.record as EconomicActivityRecord}
}

export function communityActivitiesQueryKey(
  communityUri: string | undefined,
  organizerDids: string[],
) {
  return [RQKEY_ROOT, 'list', communityUri, organizerDids.join(',')] as const
}

export function useCommunityActivitiesQuery({
  communityUri,
  organizerDids,
}: {
  communityUri: string | undefined
  organizerDids: string[]
}) {
  const agent = useAgent()
  return useQuery<CommunityActivityView[]>({
    queryKey: communityActivitiesQueryKey(communityUri, organizerDids),
    queryFn: async () => {
      const keep = (value: {communityUri?: string} | undefined) =>
        value?.communityUri === communityUri
      const [social, economic] = await Promise.all(
        (['social', 'economic'] as const).map(async category =>
          (
            await listFromRepos<{communityUri?: string}>(
              agent,
              organizerDids,
              ACTIVITY_COLLECTIONS[category],
              keep,
            )
          ).map(item => toActivityView(category, item)),
        ),
      )
      return [...social, ...economic].sort((a, b) =>
        a.record.startsAt.localeCompare(b.record.startsAt),
      )
    },
    enabled: Boolean(communityUri) && organizerDids.length > 0,
    staleTime: STALE.SECONDS.THIRTY,
  })
}

export type CommunityActivityDetail = {
  activity: CommunityActivityView
  /** Always empty for social activities, which never move money. */
  ledger: CommunityLedgerEntryView[]
}

export function communityActivityQueryKey(activityUri: string | undefined) {
  return [RQKEY_ROOT, 'detail', activityUri] as const
}

export function useCommunityActivityQuery(activityUri: string | undefined) {
  const agent = useAgent()
  return useQuery<CommunityActivityDetail>({
    queryKey: communityActivityQueryKey(activityUri),
    queryFn: async () => {
      if (!activityUri) throw new Error('No activity URI')
      const category = getActivityCategoryFromUri(activityUri)
      if (!category) throw new Error('Not a community activity')
      const uri = new AtUri(activityUri)
      const res = await agent.pdsClient.call(com.atproto.repo.getRecord, {
        repo: uri.host,
        collection: uri.collection as NsidString,
        rkey: uri.rkey,
      })
      const activity = toActivityView(category, {
        uri: res.uri,
        cid: res.cid ?? '',
        authorDid: uri.host,
        record: res.value,
      })
      if (activity.category === 'social') return {activity, ledger: []}
      // Only the organizer's own repo is read: an entry anyone else writes
      // about this activity is not part of its books.
      const ledger = await listRepoRecords<CommunityActivityLedgerEntryRecord>(
        agent,
        uri.host,
        PARA_COMMUNITY_ACTIVITY_LEDGER_COLLECTION,
        value => value?.activityUri === activityUri,
      )
      ledger.sort((a, b) =>
        b.record.occurredAt.localeCompare(a.record.occurredAt),
      )
      return {activity, ledger}
    },
    enabled: Boolean(activityUri),
    staleTime: STALE.SECONDS.THIRTY,
  })
}

type Authored = 'createdBy' | 'createdAt' | 'updatedAt'

export type CreateCommunityActivityInput =
  | {category: 'social'; record: Omit<SocialActivityRecord, Authored>}
  | {category: 'economic'; record: Omit<EconomicActivityRecord, Authored>}

export function useCreateCommunityActivityMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  return useMutation<
    {uri: string; cid: string},
    Error,
    CreateCommunityActivityInput
  >({
    mutationFn: async ({category, record}) => {
      if (!currentAccount?.did) throw new Error('Not authenticated')
      const now = new Date().toISOString()
      const collection = ACTIVITY_COLLECTIONS[category]
      const res = await agent.pdsClient.call(com.atproto.repo.createRecord, {
        repo: currentAccount.did as AtIdentifierString,
        collection: collection as NsidString,
        record: {
          $type: collection,
          ...record,
          createdBy: currentAccount.did,
          createdAt: now,
          updatedAt: now,
        } as unknown as com.atproto.repo.createRecord.$InputBody['record'],
      })
      return {uri: res.uri, cid: res.cid}
    },
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({
        queryKey: [RQKEY_ROOT, 'list', input.record.communityUri],
      })
    },
  })
}

export type UpdateCommunityActivityInput =
  | {
      activity: SocialActivityView
      changes: Partial<
        Pick<
          SocialActivityRecord,
          'status' | 'description' | 'links' | 'details'
        >
      >
    }
  | {
      activity: EconomicActivityView
      changes: Partial<
        Pick<
          EconomicActivityRecord,
          'status' | 'description' | 'links' | 'details'
        >
      >
    }

/**
 * Progress updates (status, signatures collected, a raffle's winning tickets)
 * rewrite the record in place. An economic activity's committed terms are
 * immutable here: the update is refused if it would change their digest.
 */
export function useUpdateCommunityActivityMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()
  return useMutation<
    {uri: string; cid: string},
    Error,
    UpdateCommunityActivityInput
  >({
    mutationFn: async ({activity, changes}) => {
      const record = {
        ...activity.record,
        ...changes,
        updatedAt: new Date().toISOString(),
      }
      if (
        activity.category === 'economic' &&
        computeTermsDigest(record as EconomicActivityRecord) !==
          computeTermsDigest(activity.record)
      ) {
        throw new Error('The committed terms of this activity cannot change')
      }
      const uri = new AtUri(activity.uri)
      const collection = ACTIVITY_COLLECTIONS[activity.category]
      const res = await agent.pdsClient.call(com.atproto.repo.putRecord, {
        repo: uri.host,
        collection: collection as NsidString,
        rkey: uri.rkey,
        swapRecord: activity.cid || undefined,
        record: {
          $type: collection,
          ...record,
        } as unknown as com.atproto.repo.putRecord.$InputBody['record'],
      })
      return {uri: res.uri, cid: res.cid}
    },
    onSuccess: (_data, {activity}) => {
      void queryClient.invalidateQueries({
        queryKey: communityActivityQueryKey(activity.uri),
      })
      void queryClient.invalidateQueries({
        queryKey: [RQKEY_ROOT, 'list', activity.record.communityUri],
      })
    },
  })
}

export type AddLedgerEntryInput = {
  activity: EconomicActivityView
  entry: Omit<
    CommunityActivityLedgerEntryRecord,
    'activityUri' | 'communityUri' | 'termsDigest' | 'currency' | 'createdAt'
  >
}

export function useAddLedgerEntryMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  return useMutation<{uri: string}, Error, AddLedgerEntryInput>({
    mutationFn: async ({activity, entry}) => {
      if (currentAccount?.did !== activity.authorDid) {
        throw new Error('Only the organizer can book entries')
      }
      const record: CommunityActivityLedgerEntryRecord = {
        ...entry,
        activityUri: activity.uri,
        communityUri: activity.record.communityUri,
        termsDigest: computeTermsDigest(activity.record),
        currency: activity.record.financialPlan.currency,
        createdAt: new Date().toISOString(),
      }
      const res = await agent.pdsClient.call(com.atproto.repo.createRecord, {
        repo: currentAccount.did as AtIdentifierString,
        collection: PARA_COMMUNITY_ACTIVITY_LEDGER_COLLECTION,
        record: {
          $type: PARA_COMMUNITY_ACTIVITY_LEDGER_COLLECTION,
          ...record,
        },
      })
      return {uri: res.uri}
    },
    onSuccess: (_data, {activity}) => {
      void queryClient.invalidateQueries({
        queryKey: communityActivityQueryKey(activity.uri),
      })
    },
  })
}

// ─── Wiki ───────────────────────────────────────────────────────────────────

export function communityWikiPagesQueryKey(
  communityUri: string | undefined,
  organizerDids: string[],
) {
  return [RQKEY_ROOT, 'wiki', communityUri, organizerDids.join(',')] as const
}

/**
 * When two organizers publish the same slug, the most recently updated page
 * wins, so an edit by any organizer supersedes the previous version.
 */
export function dedupeWikiPagesBySlug(pages: CommunityWikiPageView[]) {
  const bySlug = new Map<string, CommunityWikiPageView>()
  for (const page of pages) {
    const current = bySlug.get(page.record.slug)
    if (!current || page.record.updatedAt > current.record.updatedAt) {
      bySlug.set(page.record.slug, page)
    }
  }
  return Array.from(bySlug.values()).sort(
    (a, b) =>
      Number(Boolean(b.record.pinned)) - Number(Boolean(a.record.pinned)) ||
      (a.record.sortOrder ?? 0) - (b.record.sortOrder ?? 0) ||
      a.record.title.localeCompare(b.record.title),
  )
}

export function useCommunityWikiPagesQuery({
  communityUri,
  organizerDids,
}: {
  communityUri: string | undefined
  organizerDids: string[]
}) {
  const agent = useAgent()
  return useQuery<CommunityWikiPageView[]>({
    queryKey: communityWikiPagesQueryKey(communityUri, organizerDids),
    queryFn: async () =>
      dedupeWikiPagesBySlug(
        await listFromRepos<CommunityWikiPageRecord>(
          agent,
          organizerDids,
          PARA_COMMUNITY_WIKI_PAGE_COLLECTION,
          value => value?.communityUri === communityUri,
        ),
      ),
    enabled: Boolean(communityUri) && organizerDids.length > 0,
    staleTime: STALE.SECONDS.THIRTY,
  })
}

export type SaveWikiPageInput = {
  /** The viewer's own copy of the page, if they have edited it before. */
  existing?: CommunityWikiPageView
  page: Omit<CommunityWikiPageRecord, 'createdBy' | 'createdAt' | 'updatedAt'>
}

/**
 * Saving writes to the viewer's repo. Editing a page another organizer wrote
 * creates the viewer's own copy under the same slug, which then wins by
 * `updatedAt`; nobody can overwrite someone else's record.
 */
export function useSaveWikiPageMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  return useMutation<{uri: string}, Error, SaveWikiPageInput>({
    mutationFn: async ({existing, page}) => {
      if (!currentAccount?.did) throw new Error('Not authenticated')
      const now = new Date().toISOString()
      const ownExisting =
        existing && existing.authorDid === currentAccount.did
          ? existing
          : undefined
      const record = {
        $type: PARA_COMMUNITY_WIKI_PAGE_COLLECTION,
        ...page,
        createdBy: currentAccount.did,
        createdAt: ownExisting?.record.createdAt ?? now,
        updatedAt: now,
      } as unknown as com.atproto.repo.createRecord.$InputBody['record']
      if (ownExisting) {
        const uri = new AtUri(ownExisting.uri)
        const res = await agent.pdsClient.call(com.atproto.repo.putRecord, {
          repo: currentAccount.did as AtIdentifierString,
          collection: PARA_COMMUNITY_WIKI_PAGE_COLLECTION,
          rkey: uri.rkey,
          swapRecord: ownExisting.cid || undefined,
          record,
        })
        return {uri: res.uri}
      }
      const res = await agent.pdsClient.call(com.atproto.repo.createRecord, {
        repo: currentAccount.did as AtIdentifierString,
        collection: PARA_COMMUNITY_WIKI_PAGE_COLLECTION,
        record,
      })
      return {uri: res.uri}
    },
    onSuccess: (_data, {page}) => {
      void queryClient.invalidateQueries({
        queryKey: [RQKEY_ROOT, 'wiki', page.communityUri],
      })
    },
  })
}
