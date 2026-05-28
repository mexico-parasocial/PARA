import {type AppBskyFeedDefs, AtUri, type BskyAgent} from '@atproto/api'

import {
  PARA_HIGHLIGHT_COLLECTION,
  type ParaHighlightRecord,
} from '#/lib/api/para-lexicons'
import {NINTHS_COMMUNITIES} from '#/lib/communities'
import {
  type FilterParams,
  type PaginationParams,
  type ServiceResponse,
} from './types'

export interface Highlight {
  id: string
  sourcePostUri?: string
  sourcePostCid?: string
  start?: number
  end?: number
  text: string
  postAuthor: string
  authorName: string
  avatarUrl: string
  postPreview: string
  color: string | string[]
  community: string
  state: string
  party?: string
  createdAt: number
  upvotes: number
  downvotes: number
  saves: number
  replyCount?: number
  isVerified: boolean
  isTrending: boolean
  viewerHasUpvoted?: boolean
  viewerHasDownvoted?: boolean
  viewerHasSaved?: boolean
}

export interface HighlightsQueryParams extends FilterParams, PaginationParams {
  subject?: string
  creator?: string
}
export type HighlightReadView = {
  uri: string
  cid: string
  creator: string
  indexedAt: string
  subjectUri: string
  subjectCid?: string
  text: string
  start: number
  end: number
  color: string
  tag?: string
  community?: string
  state?: string
  party?: string
  visibility: 'public' | 'private' | (string & {})
  createdAt: string
}

type ListHighlightsResponse = {
  highlights?: HighlightReadView[]
  cursor?: string
}

type GetHighlightResponse = {
  highlight?: HighlightReadView
}

type XrpcErrorResponse = {
  error?: string
  message?: string
}

type CreateRecordResult = {
  uri: string
  cid: string
}

const MAX_PAGINATION_PAGES = 20
const GET_POSTS_BATCH_SIZE = 25

/**
 * Fetch highlights with optional filtering and pagination
 */
export async function fetchHighlights(
  agent: BskyAgent,
  params?: HighlightsQueryParams & {community?: string},
): Promise<ServiceResponse<Highlight[]>> {
  const {highlights: allViews, cursor} = await fetchHighlightViews(
    agent,
    params,
  )

  return {
    data: await hydrateHighlights(agent, allViews),
    cursor,
  }
}

/**
 * Fetch a single highlight by ID
 */
export async function fetchHighlightById(
  agent: BskyAgent,
  id: string,
): Promise<Highlight | null> {
  const params = new URLSearchParams()
  params.set('highlight', id)
  const res = await agent.fetchHandler(
    `/xrpc/com.para.highlight.getHighlight?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    },
  )

  if (!res.ok) {
    const error = await safeJson(res)
    if (
      (res.status === 400 && error?.error === 'NotFound') ||
      res.status === 404
    ) {
      return null
    }
    throw new Error(error?.message || 'Unable to fetch highlight.')
  }

  const json = (await res.json()) as GetHighlightResponse
  if (!json.highlight) return null
  const [hydrated] = await hydrateHighlights(agent, [json.highlight])
  return hydrated || null
}

export async function fetchHighlightViews(
  agent: BskyAgent,
  params?: HighlightsQueryParams & {community?: string},
): Promise<{highlights: HighlightReadView[]; cursor?: string}> {
  const allViews: HighlightReadView[] = []
  let cursor: string | undefined
  const limit = params?.limit ?? 30

  for (let page = 0; page < MAX_PAGINATION_PAGES; page++) {
    const result = await requestHighlights<ListHighlightsResponse>(
      agent,
      'com.para.highlight.listHighlights',
      {
        community: params?.community,
        state: params?.state,
        subject: params?.subject,
        creator: params?.creator,
        limit: String(limit),
        cursor,
      },
    )
    allViews.push(...(result.highlights ?? []))
    if (!result.cursor) {
      cursor = undefined
      break
    }
    cursor = result.cursor
  }

  return {highlights: allViews, cursor}
}

export async function voteOnHighlight(
  _id: string,
  _direction: 'up' | 'down',
): Promise<void> {
  // The highlight voting UI is optimistic until a dedicated backend endpoint
  // exists. Returning successfully keeps the backend-backed list from falling
  // back to old mock data just to support local vote counters.
}

export async function toggleSaveHighlight(_id: string): Promise<void> {
  // Saves are stored locally by the screens for now.
}

export async function publishHighlightAnnotation(
  agent: BskyAgent,
  record: Omit<ParaHighlightRecord, 'createdAt'> & {createdAt?: string},
): Promise<CreateRecordResult> {
  if (!agent.session) {
    throw new Error('Not logged in')
  }

  const fullRecord: ParaHighlightRecord = {
    ...record,
    createdAt: record.createdAt || new Date().toISOString(),
  }

  const res = await agent.com.atproto.repo.createRecord({
    repo: agent.session.did,
    collection: PARA_HIGHLIGHT_COLLECTION,
    record: fullRecord as unknown as Record<string, unknown>,
  })

  return {
    uri: res.data.uri,
    cid: res.data.cid,
  }
}

export async function deleteHighlightAnnotation(
  agent: BskyAgent,
  highlightUri: string,
) {
  if (!agent.session) {
    throw new Error('Not logged in')
  }

  const urip = new AtUri(highlightUri)
  if (urip.collection !== PARA_HIGHLIGHT_COLLECTION) {
    throw new Error(`Unsupported highlight uri: ${highlightUri}`)
  }

  return await agent.com.atproto.repo.deleteRecord({
    repo: agent.session.did,
    collection: urip.collection,
    rkey: urip.rkey,
  })
}

export async function updateHighlightAnnotation(
  agent: BskyAgent,
  highlightUri: string,
  record: ParaHighlightRecord,
) {
  if (!agent.session) {
    throw new Error('Not logged in')
  }

  const urip = new AtUri(highlightUri)
  if (urip.collection !== PARA_HIGHLIGHT_COLLECTION) {
    throw new Error(`Unsupported highlight uri: ${highlightUri}`)
  }

  return await agent.com.atproto.repo.putRecord({
    repo: agent.session.did,
    collection: urip.collection,
    rkey: urip.rkey,
    record: record as unknown as Record<string, unknown>,
  })
}

async function requestHighlights<T>(
  agent: BskyAgent,
  endpoint: string,
  params: Record<string, string | undefined>,
): Promise<T> {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value && value.length > 0) {
      search.set(key, value)
    }
  }
  const query = search.toString()
  const url = query.length ? `/xrpc/${endpoint}?${query}` : `/xrpc/${endpoint}`

  const res = await agent.fetchHandler(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  })

  if (!res.ok) {
    const error = await safeJson(res)
    throw new Error(error?.message || `Unable to fetch ${endpoint}.`)
  }

  return (await res.json()) as T
}

async function hydrateHighlights(
  agent: BskyAgent,
  views: HighlightReadView[],
): Promise<Highlight[]> {
  const subjectUris = Array.from(
    new Set(views.map(view => view.subjectUri).filter(Boolean)),
  )

  const postsByUri = new Map<string, AppBskyFeedDefs.PostView>()
  for (let i = 0; i < subjectUris.length; i += GET_POSTS_BATCH_SIZE) {
    const batch = subjectUris.slice(i, i + GET_POSTS_BATCH_SIZE)
    if (!batch.length) continue
    const res = await agent.getPosts({uris: batch})
    for (const post of res.data.posts) {
      postsByUri.set(post.uri, post)
    }
  }

  return views.map(view => mapHighlightViewToHighlight(view, postsByUri))
}

function mapHighlightViewToHighlight(
  view: HighlightReadView,
  postsByUri: Map<string, AppBskyFeedDefs.PostView>,
): Highlight {
  const post = postsByUri.get(view.subjectUri)
  const postRecord = post?.record as {text?: string} | undefined
  const communityName =
    view.community || inferCommunityFromPost(postRecord?.text)
  const state = view.state || inferStateFromPost(postRecord?.text) || 'Unknown'
  const color = resolveHighlightColor(communityName, view.color)

  return {
    id: view.uri,
    sourcePostUri: view.subjectUri,
    sourcePostCid: view.subjectCid,
    start: view.start,
    end: view.end,
    text: view.text,
    postAuthor: post?.author.handle || 'unknown',
    authorName: post?.author.displayName || post?.author.handle || 'Unknown',
    avatarUrl: post?.author.avatar || 'https://i.pravatar.cc/150',
    postPreview: postRecord?.text || view.text,
    color,
    community: communityName || 'Unknown',
    state,
    party: view.party,
    createdAt: new Date(view.createdAt || view.indexedAt).getTime(),
    upvotes: post?.likeCount || 0,
    downvotes: 0,
    saves: post?.repostCount || 0,
    replyCount: post?.replyCount || 0,
    isVerified: !!post?.author.viewer?.followedBy,
    isTrending: (post?.likeCount || 0) > 0,
    viewerHasUpvoted: !!post?.viewer?.like,
    viewerHasDownvoted: false,
    viewerHasSaved: !!post?.viewer?.repost,
  }
}

function resolveHighlightColor(
  community: string | undefined,
  fallback: string,
) {
  if (community) {
    const match = Object.values(NINTHS_COMMUNITIES).find(
      item => item.name.toLowerCase() === community.toLowerCase(),
    )
    if (match) return match.color
  }
  return fallback || '#888888'
}

function inferCommunityFromPost(text?: string) {
  const tags = text?.match(/#\w+/g) || []
  for (const tag of tags) {
    const cleanTag = tag.substring(1)
    const match = Object.values(NINTHS_COMMUNITIES).find(
      item =>
        item.name.replace(/\s+/g, '').toLowerCase() === cleanTag.toLowerCase(),
    )
    if (match) return match.name
  }
  return ''
}

function inferStateFromPost(text?: string) {
  const tags = text?.match(/#\w+/g) || []
  for (const tag of tags) {
    const cleanTag = tag.substring(1)
    const isCommunity = Object.values(NINTHS_COMMUNITIES).some(
      item =>
        item.name.replace(/\s+/g, '').toLowerCase() === cleanTag.toLowerCase(),
    )
    if (!isCommunity) return cleanTag
  }
  return ''
}

async function safeJson(res: Response): Promise<XrpcErrorResponse | undefined> {
  try {
    return (await res.json()) as XrpcErrorResponse
  } catch {
    return undefined
  }
}
