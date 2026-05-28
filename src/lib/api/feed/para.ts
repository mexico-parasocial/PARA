import {
  type AppBskyActorDefs,
  type AppBskyFeedDefs,
  type BskyAgent,
  type ComAtprotoRepoListRecords,
} from '@atproto/api'

import {PARA_POST_COLLECTION} from '../para-lexicons'
import {type FeedAPI, type FeedAPIResponse} from './types'

export type ParaPostView = {
  uri: string
  cid: string
  author: string
  text: string
  createdAt: string
  replyRoot?: string
  replyParent?: string
  langs?: string[]
  tags?: string[]
  flairs?: string[]
  postType?: string
}

export type ParaTimelineFilters = {
  party?: string
  community?: string
  flairTag?: string
}

export class ParaFeedAPI implements FeedAPI {
  agent: BskyAgent
  actor: string
  authorProfile: AppBskyActorDefs.ProfileViewDetailed | null = null

  constructor({
    agent,
    feedParams,
  }: {
    agent: BskyAgent
    feedParams: {actor: string}
  }) {
    this.agent = agent
    this.actor = feedParams.actor
  }

  async peekLatest(): Promise<AppBskyFeedDefs.FeedViewPost> {
    const res = await this.fetch({limit: 1, cursor: undefined})
    return res.feed[0]
  }

  async fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse> {
    // 1. Fetch Author Profile if needed (for PostView)
    console.error('ParaFeedAPI: fetch called for', this.actor)
    if (!this.authorProfile) {
      try {
        const profileRes = await this.agent.getProfile({actor: this.actor})
        this.authorProfile = profileRes.data
      } catch (e) {
        console.error('Failed to fetch author profile for Para feed', e)
        return {feed: []}
      }
    }

    // 2. List Records from com.para.post
    try {
      const res = await this.agent.api.com.atproto.repo.listRecords({
        repo: this.actor,
        collection: PARA_POST_COLLECTION,
        limit,
        cursor,
        reverse: true, // Newest first
      })

      if (!res.success) {
        throw new Error('Failed to list Para posts')
      }

      const records = res.data.records
      const feed: AppBskyFeedDefs.FeedViewPost[] = []
      for (const record of records) {
        try {
          feed.push(this.hydrateRecord(record, this.authorProfile))
        } catch (e) {
          console.error('Failed to hydrate Para record', record.uri, e)
        }
      }

      return {
        cursor: res.data.cursor,
        feed,
      }
    } catch (e) {
      console.error('Error fetching Para posts', e)
      return {feed: []}
    }
  }

  hydrateRecord(
    record: ComAtprotoRepoListRecords.Record,
    author: AppBskyActorDefs.ProfileViewDetailed,
  ): AppBskyFeedDefs.FeedViewPost {
    const val = JSON.parse(JSON.stringify(record.value))
    // HACK: Alias com.para.post to app.bsky.feed.post to pass client-side validation
    // The UI handles rendering, but the feed slicer enforces strict types.
    if (val.$type === PARA_POST_COLLECTION) {
      val.$type = 'app.bsky.feed.post'
    }

    // Hydrate Images (Basic)
    let embed: AppBskyFeedDefs.PostView['embed'] = undefined
    if (val.embed && val.embed.$type === 'app.bsky.embed.images') {
      const images = (val.embed.images || []).map(
        (img: Record<string, unknown>) => {
          // Construct Link to Blob
          // format: <service>/xrpc/com.atproto.sync.getBlob?did=<did>&cid=<cid>
          // Use agent.service (PDS)
          // Ensure serviceUrl does not have trailing slash?
          const serviceUrl = this.agent.service.toString().replace(/\/$/, '')
          const cid = readBlobRefString(img.image)
          const thumb = `${serviceUrl}/xrpc/com.atproto.sync.getBlob?did=${this.actor}&cid=${cid}`
          return {
            thumb,
            fullsize: thumb,
            alt: img.alt || '',
          }
        },
      )
      embed = {
        $type: 'app.bsky.embed.images#view',
        images,
      }
    }
    // TODO: Support other embeds if needed.

    // Ensure langs exists for validation/filtering
    if (!val.langs || !Array.isArray(val.langs)) {
      val.langs = ['en'] // Default to English for now
    }

    // Preserve Para-specific fields through hydration
    const paraFlairs: string[] = val.flairs || []
    const paraPostType: string | undefined = val.postType
    const paraTags: string[] = val.tags || []

    const postView: AppBskyFeedDefs.PostView = {
      uri: record.uri,
      cid: record.cid,
      author: {
        did: author.did,
        handle: author.handle,
        displayName: author.displayName,
        avatar: author.avatar,
        viewer: author.viewer,
        labels: author.labels,
      },
      record: {
        ...val,
        // Ensure Para fields are always present for downstream consumers
        flairs: paraFlairs,
        postType: paraPostType,
        tags: paraTags,
      },
      indexedAt: val.createdAt,
      likeCount: 0, // MVP: No counts
      replyCount: 0,
      repostCount: 0,
      viewer: {}, // MVP: No interaction state
      embed,
      labels: [],
    }

    // DEBUG: Log the type to verify the hack
    // console.log('Hydrated Para Record Type:', (postView.record as any).$type)

    return {
      post: postView,
      // MVP: No thread context/replies in feed yet
    }
  }
}

export class ParaTimelineFeedAPI implements FeedAPI {
  agent: BskyAgent
  filters: ParaTimelineFilters
  profiles = new Map<string, AppBskyActorDefs.ProfileViewDetailed>()

  constructor({
    agent,
    filters,
  }: {
    agent: BskyAgent
    filters?: ParaTimelineFilters
  }) {
    this.agent = agent
    this.filters = filters ?? {}
  }

  async peekLatest(): Promise<AppBskyFeedDefs.FeedViewPost> {
    const res = await this.fetch({limit: 1, cursor: undefined})
    return res.feed[0]
  }

  async fetch({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse> {
    try {
      const res = await this.agent.call('com.para.feed.getTimeline', {
        limit,
        cursor,
        ...buildParaTimelineFilterParams(this.filters),
      })
      const data = res.data as {cursor?: string; feed?: unknown[]}
      const feed = await Promise.all(
        (data.feed ?? [])
          .filter(isParaTimelinePostView)
          .map(post => this.hydrateTimelinePost(post)),
      )

      return {
        cursor: data.cursor,
        feed,
      }
    } catch (e) {
      console.error('Error fetching Para timeline posts', e)
      return {feed: []}
    }
  }

  async hydrateTimelinePost(
    paraPost: ParaPostView,
  ): Promise<AppBskyFeedDefs.FeedViewPost> {
    const author = await this.getAuthorProfile(paraPost.author)
    return hydrateParaPostView(paraPost, author)
  }

  private async getAuthorProfile(
    actor: string,
  ): Promise<AppBskyActorDefs.ProfileViewDetailed> {
    const cached = this.profiles.get(actor)
    if (cached) return cached

    try {
      const res = await this.agent.getProfile({actor})
      this.profiles.set(actor, res.data)
      return res.data
    } catch (e) {
      console.error('Failed to fetch author profile for Para timeline', e)
      return {
        did: actor,
        handle: actor,
        displayName: actor,
        labels: [],
      }
    }
  }
}

export function buildParaTimelineFilterParams(filters: ParaTimelineFilters) {
  return {
    ...(filters.party ? {party: filters.party} : {}),
    ...(filters.community ? {community: filters.community} : {}),
    ...(filters.flairTag ? {flairTag: filters.flairTag} : {}),
  }
}

export function hydrateParaPostView(
  paraPost: ParaPostView,
  author: AppBskyActorDefs.ProfileViewDetailed,
): AppBskyFeedDefs.FeedViewPost {
  const authorView: AppBskyActorDefs.ProfileViewBasic = {
    did: author.did,
    handle: author.handle,
    displayName: author.displayName,
    avatar: author.avatar,
    associated: author.associated,
    viewer: author.viewer,
    labels: author.labels,
    createdAt: author.createdAt,
  }
  const record = {
    $type: 'app.bsky.feed.post',
    text: paraPost.text,
    createdAt: paraPost.createdAt,
    ...(paraPost.replyRoot && paraPost.replyParent
      ? {
          reply: {
            root: {uri: paraPost.replyRoot, cid: ''},
            parent: {uri: paraPost.replyParent, cid: ''},
          },
        }
      : {}),
    langs: paraPost.langs?.length ? paraPost.langs : ['en'],
    tags: paraPost.tags ?? [],
    flairs: paraPost.flairs ?? [],
    postType: paraPost.postType,
  }

  return {
    post: {
      uri: paraPost.uri,
      cid: paraPost.cid,
      author: authorView,
      record,
      indexedAt: paraPost.createdAt,
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      quoteCount: 0,
      viewer: {},
      labels: [],
    },
  }
}

function readBlobRefString(value: unknown) {
  if (!value || typeof value !== 'object') return ''
  const image = value as {ref?: unknown}
  const ref = image.ref
  if (!ref) return ''
  if (typeof ref === 'string') return ref
  if (
    typeof ref === 'object' &&
    'toString' in ref &&
    typeof ref.toString === 'function'
  ) {
    const toString = ref.toString as () => string
    return toString.call(ref)
  }
  return ''
}

export function isParaPostView(value: unknown): value is ParaPostView {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<ParaPostView>

  const isValid =
    typeof item.uri === 'string' &&
    typeof item.cid === 'string' &&
    typeof item.author === 'string' &&
    typeof item.text === 'string' &&
    typeof item.createdAt === 'string'

  if (!isValid && __DEV__) {
    console.warn('[isParaPostView] Invalid post shape:', {
      uri: typeof item.uri,
      cid: typeof item.cid,
      author: typeof item.author,
      text: typeof item.text,
      createdAt: typeof item.createdAt,
      val: value,
    })
  }

  return isValid
}

function isParaTimelinePostView(value: unknown): value is ParaPostView {
  return isParaPostView(value)
}
