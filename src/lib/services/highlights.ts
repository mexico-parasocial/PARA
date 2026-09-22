import {type LexMap} from '@atproto/lex'
import {AtUri, type AtUriString, type DidString} from '@atproto/syntax'

import {
  PARA_HIGHLIGHT_COLLECTION,
  type ParaHighlightRecord,
} from '#/lib/api/para-lexicons'
import {NINTHS_COMMUNITIES} from '#/lib/communities'
import {
  type PublicSessionBundle,
  type SessionBundle,
} from '#/state/session/session-core'
import {app, com} from '#/lexicons'
import {
  type FilterParams,
  type PaginationParams,
  type ServiceResponse,
} from './types'

/** Any `useAgent()` result: authenticated session or public (logged-out). */
type HighlightsServiceAgent = SessionBundle | PublicSessionBundle

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
  color: string | string[] | readonly string[]
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

type CreateRecordResult = {
  uri: string
  cid: string
}

const MAX_PAGINATION_PAGES = 20
const GET_POSTS_BATCH_SIZE = 25

/**
 * Adapt a generated `com.para.highlight.defs#highlightView` to the plain
 * string-based {@link HighlightReadView} the app consumes. `cid` arrives as a
 * CID link instance on the wire, so normalize it to its string form.
 */
function toHighlightReadView(
  view: com.para.highlight.defs.HighlightView,
): HighlightReadView {
  return {
    uri: view.uri,
    cid: String(view.cid),
    creator: view.creator,
    indexedAt: view.indexedAt,
    subjectUri: view.subjectUri,
    subjectCid: view.subjectCid ? String(view.subjectCid) : undefined,
    text: view.text,
    start: view.start,
    end: view.end,
    color: view.color,
    tag: view.tag,
    community: view.community,
    state: view.state,
    party: view.party,
    visibility: view.visibility,
    createdAt: view.createdAt,
  }
}

/**
 * Fetch highlights with optional filtering and pagination
 */
export async function fetchHighlights(
  agent: HighlightsServiceAgent,
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
  agent: HighlightsServiceAgent,
  id: string,
): Promise<Highlight | null> {
  let view: com.para.highlight.defs.HighlightView
  try {
    const res = await agent.appviewClient.call(
      com.para.highlight.getHighlight,
      {
        highlight: id as AtUriString,
      },
    )
    if (!res.highlight) return null
    view = res.highlight
  } catch (err: unknown) {
    const error =
      err && typeof err === 'object'
        ? (err as {error?: string; message?: string})
        : null
    if (error?.error === 'NotFound') {
      return null
    }
    throw new Error(error?.message || 'Unable to fetch highlight.')
  }

  const [hydrated] = await hydrateHighlights(agent, [toHighlightReadView(view)])
  return hydrated || null
}

export async function fetchHighlightViews(
  agent: HighlightsServiceAgent,
  params?: HighlightsQueryParams & {community?: string},
): Promise<{highlights: HighlightReadView[]; cursor?: string}> {
  const allViews: HighlightReadView[] = []
  let cursor: string | undefined
  const limit = params?.limit ?? 30

  for (let page = 0; page < MAX_PAGINATION_PAGES; page++) {
    const res = await agent.appviewClient.call(
      com.para.highlight.listHighlights,
      {
        community: params?.community,
        state: params?.state,
        subject: params?.subject as AtUriString | undefined,
        creator: params?.creator as DidString | undefined,
        limit,
        cursor,
      },
    )
    allViews.push(...(res.highlights ?? []).map(toHighlightReadView))
    if (!res.cursor) {
      cursor = undefined
      break
    }
    cursor = res.cursor
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
  agent: HighlightsServiceAgent,
  record: Omit<ParaHighlightRecord, 'createdAt'> & {createdAt?: string},
): Promise<CreateRecordResult> {
  if (!agent.session) {
    throw new Error('Not logged in')
  }

  const fullRecord: ParaHighlightRecord = {
    ...record,
    createdAt: record.createdAt || new Date().toISOString(),
  }

  const res = await agent.pdsClient.call(com.atproto.repo.createRecord, {
    repo: agent.session.did,
    collection: PARA_HIGHLIGHT_COLLECTION,
    record: fullRecord as unknown as LexMap,
  })

  return {
    uri: res.uri,
    cid: String(res.cid),
  }
}

export async function deleteHighlightAnnotation(
  agent: HighlightsServiceAgent,
  highlightUri: string,
) {
  if (!agent.session) {
    throw new Error('Not logged in')
  }

  const urip = new AtUri(highlightUri)
  if (urip.collection !== PARA_HIGHLIGHT_COLLECTION) {
    throw new Error(`Unsupported highlight uri: ${highlightUri}`)
  }

  return await agent.pdsClient.call(com.atproto.repo.deleteRecord, {
    repo: agent.session.did,
    collection: urip.collection,
    rkey: urip.rkey,
  })
}

export async function updateHighlightAnnotation(
  agent: HighlightsServiceAgent,
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

  return await agent.pdsClient.call(com.atproto.repo.putRecord, {
    repo: agent.session.did,
    collection: urip.collection,
    rkey: urip.rkey,
    record: record as unknown as LexMap,
  })
}

async function hydrateHighlights(
  agent: HighlightsServiceAgent,
  views: HighlightReadView[],
): Promise<Highlight[]> {
  const subjectUris = Array.from(
    new Set(views.map(view => view.subjectUri).filter(Boolean)),
  )

  const postsByUri = new Map<string, app.bsky.feed.defs.PostView>()
  for (let i = 0; i < subjectUris.length; i += GET_POSTS_BATCH_SIZE) {
    const batch = subjectUris.slice(i, i + GET_POSTS_BATCH_SIZE)
    if (!batch.length) continue
    const res = await agent.appviewClient.call(app.bsky.feed.getPosts, {
      uris: batch as AtUriString[],
    })
    for (const post of res.posts) {
      postsByUri.set(post.uri, post)
    }
  }

  return views.map(view => mapHighlightViewToHighlight(view, postsByUri))
}

function mapHighlightViewToHighlight(
  view: HighlightReadView,
  postsByUri: Map<string, app.bsky.feed.defs.PostView>,
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
