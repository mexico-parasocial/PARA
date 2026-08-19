import {type AppBskyActorDefs, type AppBskyFeedDefs} from '@atproto/api'
import {type Client} from '@atproto/lex'
import {type AtIdentifierString, type NsidString} from '@atproto/syntax'

import {DEFAULT_SERVICE} from '#/lib/constants'
import {app, com} from '#/lexicons'
import {PARA_POST_COLLECTION} from '../para-lexicons'
import {type FeedAPI, type FeedAPIResponse} from './types'

type ListRecordsItem = com.atproto.repo.listRecords.Record

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

type ParaRecordValue = Record<string, unknown> & {
  $type?: string
  createdAt?: string
  embed?: unknown
  flairs?: unknown
  langs?: unknown
  postType?: unknown
  tags?: unknown
}

export class ParaFeedAPI implements FeedAPI {
  client: Client
  actor: string
  authorProfile: AppBskyActorDefs.ProfileViewDetailed | null = null

  constructor({
    client,
    feedParams,
  }: {
    client: Client,
    feedParams: {actor: string}
  }) {
    this.client = client
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
    if (!this.authorProfile) {
      try {
        const profile = await this.client.call(app.bsky.actor.getProfile, {
          actor: this.actor as AtIdentifierString,
        })
        this.authorProfile = profile as unknown as AppBskyActorDefs.ProfileViewDetailed
      } catch (e) {
        if (isConcurrentSessionUpdateError(e)) throw e
        console.error('Failed to fetch author profile for Para feed', e)
        return {feed: []}
      }
    }

    // 2. List Records from com.para.post
    try {
      const res = await this.client.call(com.atproto.repo.listRecords, {
        repo: this.actor as AtIdentifierString,
        collection: PARA_POST_COLLECTION as NsidString,
        limit,
        cursor,
        reverse: true, // Newest first
      })

      const records = res.records
      const feed: AppBskyFeedDefs.FeedViewPost[] = []
      for (const record of records) {
        try {
          feed.push(this.hydrateRecord(record, this.authorProfile))
        } catch (e) {
          console.error('Failed to hydrate Para record', record.uri, e)
        }
      }

      return {
        cursor: res.cursor,
        feed,
      }
    } catch (e) {
      if (isConcurrentSessionUpdateError(e)) throw e
      console.error('Error fetching Para posts', e)
      return {feed: []}
    }
  }

  hydrateRecord(
    record: ListRecordsItem,
    author: AppBskyActorDefs.ProfileViewDetailed,
  ): AppBskyFeedDefs.FeedViewPost {
    const val = JSON.parse(JSON.stringify(record.value)) as ParaRecordValue
    // HACK: Alias com.para.post to app.bsky.feed.post to pass client-side validation
    // The UI handles rendering, but the feed slicer enforces strict types.
    if (val.$type === PARA_POST_COLLECTION) {
      val.$type = 'app.bsky.feed.post'
    }

    // Hydrate Images (Basic)
    let embed: AppBskyFeedDefs.PostView['embed'] = undefined
    const rawEmbed = isObjectRecord(val.embed) ? val.embed : undefined
    if (rawEmbed?.$type === 'app.bsky.embed.images') {
      const rawImages = Array.isArray(rawEmbed.images) ? rawEmbed.images : []
      const images = rawImages.map(img => {
        const image = isObjectRecord(img) ? img : {}
        // Construct Link to Blob
        // format: <service>/xrpc/com.atproto.sync.getBlob?did=<did>&cid=<cid>
        // MVP: single-PDS deployment, so the default service always hosts the blob.
        const serviceUrl = DEFAULT_SERVICE.replace(/\/$/, '')
        const cid = readBlobRefString(image.image)
        const thumb = `${serviceUrl}/xrpc/com.atproto.sync.getBlob?did=${this.actor}&cid=${cid}`
        return {
          thumb,
          fullsize: thumb,
          alt: typeof image.alt === 'string' ? image.alt : '',
        }
      })
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
    const paraFlairs = readStringArray(val.flairs)
    const paraPostType =
      typeof val.postType === 'string' ? val.postType : undefined
    const paraTags = readStringArray(val.tags)
    const createdAt =
      typeof val.createdAt === 'string'
        ? val.createdAt
        : new Date().toISOString()

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
      indexedAt: createdAt,
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
  client: Client
  filters: ParaTimelineFilters
  profiles = new Map<string, AppBskyActorDefs.ProfileViewDetailed>()

  constructor({
    client,
    filters,
  }: {
    client: Client,
    filters?: ParaTimelineFilters
  }) {
    this.client = client
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
    /*
     * `com.para.feed.getTimeline` is a custom lexicon that has never been
     * added to the codegen pipeline (no lexicons/com/para/*.json), so it has
     * no typed binding on the new lex Client and can't be called until that
     * migration happens. Always fall back to the stock Bluesky timeline for
     * now rather than reach for an endpoint the client can't express.
     */
    return this.fetchBlueskyTimeline({cursor, limit})
  }

  private async fetchBlueskyTimeline({
    cursor,
    limit,
  }: {
    cursor: string | undefined
    limit: number
  }): Promise<FeedAPIResponse> {
    try {
      const res = await this.client.call(app.bsky.feed.getTimeline, {
        cursor,
        limit,
      })
      return {
        cursor: res.cursor,
        feed: res.feed as unknown as AppBskyFeedDefs.FeedViewPost[],
      }
    } catch (e) {
      if (isConcurrentSessionUpdateError(e)) throw e
      console.error('Error fetching Bluesky timeline fallback', e)
    }
    return {feed: []}
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
      const profile = await this.client.call(app.bsky.actor.getProfile, {
        actor: actor as AtIdentifierString,
      })
      const res = profile as unknown as AppBskyActorDefs.ProfileViewDetailed
      this.profiles.set(actor, res)
      return res
    } catch (e) {
      if (isConcurrentSessionUpdateError(e)) throw e
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
  if (typeof ref === 'object' && hasStringableRef(ref)) {
    const toString = ref.toString
    return toString.call(ref)
  }
  return ''
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function hasStringableRef(value: object): value is {toString: () => string} {
  const ref = value as {toString?: unknown}
  return typeof ref.toString === 'function'
}

function isConcurrentSessionUpdateError(e: unknown): boolean {
  return (
    e instanceof Error && e.message === 'Concurrent session update detected'
  )
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

