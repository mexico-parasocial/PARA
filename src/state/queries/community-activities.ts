import {useMemo} from 'react'
import {
  type AtIdentifierString,
  AtUri,
  type AtUriString,
  type NsidString,
} from '@atproto/syntax'
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
import {STALE} from '#/state/queries'
import {useCommunityGovernanceQuery} from '#/state/queries/community-governance'
import {useAgent, useSession} from '#/state/session'
import {com} from '#/lexicons'

/*
 * Activities, their ledgers and wiki pages are records in their authors' own
 * repos. The AppView indexes them and serves only those written by the
 * community's current organizers: the board's creator, or an owner or
 * moderator by verified authority events (WatZappa
 * data-plane/server/routes/community-activities.ts). Reading through it, not
 * straight from repos, is what keeps a record anyone can write under any
 * community out of its menu and its books.
 */

const RQKEY_ROOT = 'community-activities'
/** Upper bound on pages read for one community's full list. */
const MAX_PAGES = 10

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

/**
 * Who the AppView treats as the community's organizers: the board's creator
 * and the current owners and moderators by verified authority events
 * (`roleHolders`). The governance record's moderators and officials are not
 * used, because any account can publish one under any community's name.
 */
export function getCommunityOrganizerDids({
  governance,
  creatorDid,
}: {
  governance?: CommunityGovernanceView
  creatorDid?: string
}) {
  const dids = [
    creatorDid,
    ...(governance?.roleHolders ?? [])
      .filter(holder => holder.role === 'owner' || holder.role === 'moderator')
      .map(holder => holder.did),
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
 * Whether the viewer may publish activities and wiki pages for a community,
 * by the same rule the AppView applies when serving them.
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
    const organizerDids = getCommunityOrganizerDids({governance, creatorDid})
    return {
      organizerDids,
      canOrganize: Boolean(viewerDid && organizerDids.includes(viewerDid)),
    }
  }, [governance, creatorDid, viewerDid])
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

type ServedRecord = {
  uri: string
  cid: string
  author: string
  record: unknown
}
type ServedActivity = ServedRecord & {category: string}

function toActivityView(item: ServedActivity): CommunityActivityView | null {
  const base = {uri: item.uri, cid: item.cid, authorDid: item.author}
  if (item.category === 'social') {
    return {...base, category: 'social', record: item.record as SocialActivityRecord}
  }
  if (item.category === 'economic') {
    return {
      ...base,
      category: 'economic',
      record: item.record as EconomicActivityRecord,
    }
  }
  return null
}

export function communityActivitiesQueryKey(communityUri: string | undefined) {
  return [RQKEY_ROOT, 'list', communityUri] as const
}

export function useCommunityActivitiesQuery({
  communityUri,
}: {
  communityUri: string | undefined
}) {
  const agent = useAgent()
  return useQuery<CommunityActivityView[]>({
    queryKey: communityActivitiesQueryKey(communityUri),
    queryFn: () => fetchCommunityActivities({agent, communityUri}),
    enabled: Boolean(communityUri),
    staleTime: STALE.SECONDS.THIRTY,
  })
}

/** One page of activities, across every community unless one is given. */
export async function fetchCommunityActivitiesPage({
  agent,
  communityUri,
  cursor,
  limit = 100,
}: {
  agent: Agent
  communityUri?: string
  cursor?: string
  limit?: number
}): Promise<{activities: CommunityActivityView[]; cursor?: string}> {
  const res = (await agent.appviewClient.call(
    com.para.community.listActivities,
    {
      community: communityUri as AtUriString | undefined,
      cursor,
      limit,
    },
  )) as {activities?: ServedActivity[]; cursor?: string}
  return {
    activities: (res.activities ?? []).flatMap(item => {
      const view = toActivityView(item)
      return view ? [view] : []
    }),
    cursor: res.cursor,
  }
}

/** All of a community's activities, soonest first. */
export async function fetchCommunityActivities({
  agent,
  communityUri,
}: {
  agent: Agent
  communityUri: string | undefined
}): Promise<CommunityActivityView[]> {
  if (!communityUri) return []
  const out: CommunityActivityView[] = []
  let cursor: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetchCommunityActivitiesPage({
      agent,
      communityUri,
      cursor,
    })
    out.push(...res.activities)
    cursor = res.cursor
    if (!cursor) break
  }
  return out.sort((a, b) => a.record.startsAt.localeCompare(b.record.startsAt))
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
      const res = (await agent.appviewClient.call(
        com.para.community.getActivity,
        {uri: activityUri as AtUriString},
      )) as {activity?: ServedActivity; ledger?: ServedRecord[]}
      const activity = res.activity ? toActivityView(res.activity) : null
      if (!activity) throw new Error('Not a community activity')
      // The AppView only returns entries an organizer of the activity's own
      // community recorded against it.
      const ledger: CommunityLedgerEntryView[] = (res.ledger ?? []).map(
        entry => ({
          uri: entry.uri,
          cid: entry.cid,
          authorDid: entry.author,
          record: entry.record as CommunityActivityLedgerEntryRecord,
        }),
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

export function communityWikiPagesQueryKey(communityUri: string | undefined) {
  return [RQKEY_ROOT, 'wiki', communityUri] as const
}

/**
 * The AppView returns one page per slug: when several organizers publish the
 * same slug, the most recently updated wins, so an edit by any organizer
 * supersedes the previous version. Pinned pages come first.
 */
export function useCommunityWikiPagesQuery({
  communityUri,
}: {
  communityUri: string | undefined
}) {
  const agent = useAgent()
  return useQuery<CommunityWikiPageView[]>({
    queryKey: communityWikiPagesQueryKey(communityUri),
    queryFn: async () => {
      const res = (await agent.appviewClient.call(
        com.para.community.listWikiPages,
        {community: communityUri as AtUriString},
      )) as {pages?: ServedRecord[]}
      return (res.pages ?? []).map(page => ({
        uri: page.uri,
        cid: page.cid,
        authorDid: page.author,
        record: page.record as CommunityWikiPageRecord,
      }))
    },
    enabled: Boolean(communityUri),
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
