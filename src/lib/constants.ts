import {type Insets, Platform} from 'react-native'
import {type Service} from '@atproto/lex'
import {api} from '@bsky/sdk'

import {BLUESKY_PROXY_DID, CHAT_PROXY_DID, IS_DEV} from '#/env'
import {type app} from '#/lexicons'

export const LOCAL_DEV_SERVICE =
  Platform.OS === 'android' ? 'http://10.0.2.2:2583' : 'http://localhost:2583'
export const STAGING_SERVICE = 'https://staging.bsky.dev'
export const BSKY_SERVICE = 'https://bsky.social'
export const BSKY_SERVICE_DID = 'did:web:bsky.social'
export const PUBLIC_BSKY_SERVICE = 'https://public.api.bsky.app'
export const DEFAULT_SERVICE = BSKY_SERVICE
const HELP_DESK_LANG = 'en-us'
export const HELP_DESK_URL = `https://blueskyweb.zendesk.com/hc/${HELP_DESK_LANG}`
export const CHAT_SERVICE = 'https://api.bsky.chat'
export const EMBED_SERVICE = 'https://embed.bsky.app'
export const EMBED_SCRIPT = `${EMBED_SERVICE}/static/embed.js`
export const BSKY_DOWNLOAD_URL = 'https://bsky.app/download'
export const STARTER_PACK_MAX_SIZE = 150
export const CARD_ASPECT_RATIO = 1200 / 630

// HACK
// Yes, this is exactly what it looks like. It's a hard-coded constant
// reflecting the number of new users in the last week. We don't have
// time to add a route to the servers for this so we're just going to hard
// code and update this number with each release until we can get the
// server route done.
// -prf
export const JOINED_THIS_WEEK = 560000 // estimate as of 12/18/24

export const DISCOVER_DEBUG_DIDS: Record<string, true> = {
  'did:plc:oisofpd7lj26yvgiivf3lxsi': true, // hailey.at
  'did:plc:p2cp5gopk7mgjegy6wadk3ep': true, // samuel.bsky.team
  'did:plc:ragtjsm2j2vknwkz3zp4oxrd': true, // pfrazee.com
  'did:plc:vpkhqolt662uhesyj6nxm7ys': true, // why.bsky.team
  'did:plc:3jpt2mvvsumj2r7eqk4gzzjz': true, // esb.lol
  'did:plc:vjug55kidv6sye7ykr5faxxn': true, // emilyliu.me
  'did:plc:tgqseeot47ymot4zro244fj3': true, // iwsmith.bsky.social
  'did:plc:2dzyut5lxna5ljiaasgeuffz': true, // darrin.bsky.team
}

const BASE_FEEDBACK_FORM_URL = `${HELP_DESK_URL}/requests/new`
export function FEEDBACK_FORM_URL({
  email,
  handle,
}: {
  email?: string
  handle?: string
}): string {
  let str = BASE_FEEDBACK_FORM_URL
  if (email) {
    str += `?tf_anonymous_requester_email=${encodeURIComponent(email)}`
    if (handle) {
      str += `&tf_17205412673421=${encodeURIComponent(handle)}`
    }
  }
  return str
}

export const MAX_DISPLAY_NAME = 64
export const MAX_DESCRIPTION = 256

export const MAX_GRAPHEME_LENGTH = 300

export const MAX_DRAFT_GRAPHEME_LENGTH = 1000

export const MAX_DM_GRAPHEME_LENGTH = 1000

export const MAX_GROUP_NAME_GRAPHEME_LENGTH = 50

// Recommended is 100 per: https://www.w3.org/WAI/GL/WCAG20/tests/test3.html
// but increasing limit per user feedback
export const MAX_ALT_TEXT = 2000

export const MAX_REPORT_REASON_GRAPHEME_LENGTH = 2000

export function IS_TEST_USER(handle?: string) {
  return handle && handle?.endsWith('.test')
}

export function IS_PROD_SERVICE(url?: string) {
  return url && url !== STAGING_SERVICE && !url.startsWith(LOCAL_DEV_SERVICE)
}

export const PROD_DEFAULT_FEED = (rkey: string) =>
  `at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/${rkey}`

export const STAGING_DEFAULT_FEED = (rkey: string) =>
  `at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/${rkey}`

export const PROD_FEEDS = [
  `feedgen|${PROD_DEFAULT_FEED('whats-hot')}`,
  `feedgen|${PROD_DEFAULT_FEED('thevids')}`,
]

export const STAGING_FEEDS = [
  `feedgen|${STAGING_DEFAULT_FEED('whats-hot')}`,
  `feedgen|${STAGING_DEFAULT_FEED('thevids')}`,
]

export const IMAGE_SIZE_CONFIG_POSTS = {
  maxDimension: 4000,
  maxSize: 2000000,
}

export const IMAGE_SIZE_CONFIG_2K_1MB = {
  maxDimension: 2000,
  maxSize: 1000000,
}

export const STAGING_LINK_META_PROXY =
  'https://cardyb.staging.bsky.dev/v1/extract?url='

export const PROD_LINK_META_PROXY = 'https://cardyb.bsky.app/v1/extract?url='

export function LINK_META_PROXY(_serviceUrl: string) {
  if (IS_DEV) {
    return STAGING_LINK_META_PROXY
  }

  return PROD_LINK_META_PROXY
}

export const STATUS_PAGE_URL = 'https://status.bsky.app/'

// Hitslop constants
export const createHitslop = (size: number): Insets => ({
  top: size,
  left: size,
  bottom: size,
  right: size,
})
export const HITSLOP_10 = createHitslop(10)
export const HITSLOP_20 = createHitslop(20)
export const HITSLOP_30 = createHitslop(30)
export const LANG_DROPDOWN_HITSLOP = {top: 10, bottom: 10, left: 4, right: 4}
export const BACK_HITSLOP = HITSLOP_30
export const MAX_POST_LINES = 25

export const BSKY_APP_ACCOUNT_DID = 'did:plc:z72i7hdynmk6r22z27h6tvur'

export const BSKY_FEED_OWNER_DIDS = [
  BSKY_APP_ACCOUNT_DID,
  'did:plc:vpkhqolt662uhesyj6nxm7ys',
  'did:plc:q6gjnaw2blty4crticxkmujt',
]

export const TRENDING_DID = 'did:plc:qrz3lhbyuxbeilrc6nekdqme'
export const TRENDING_HANDLE = 'trending.bsky.app'

export const DISCOVER_FEED_URI =
  'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot'
export const VIDEO_FEED_URI =
  'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/thevids'
export const STAGING_VIDEO_FEED_URI =
  'at://did:plc:yofh3kx63drvfljkibw5zuxo/app.bsky.feed.generator/thevids'
export const VIDEO_FEED_URIS = [VIDEO_FEED_URI, STAGING_VIDEO_FEED_URI]
export const DISCOVER_SAVED_FEED = {
  type: 'feed',
  value: DISCOVER_FEED_URI,
  pinned: true,
}
export const TIMELINE_SAVED_FEED = {
  type: 'timeline',
  value: 'following',
  pinned: true,
}
export const VIDEO_SAVED_FEED = {
  type: 'feed',
  value: VIDEO_FEED_URI,
  pinned: true,
}

export const RECOMMENDED_SAVED_FEEDS: Pick<
  app.bsky.actor.defs.SavedFeed,
  'type' | 'value' | 'pinned'
>[] = [DISCOVER_SAVED_FEED, TIMELINE_SAVED_FEED]

export const KNOWN_SHUTDOWN_FEEDS = [
  'at://did:plc:wqowuobffl66jv3kpsvo7ak4/app.bsky.feed.generator/the-algorithm', // for you by skygaze
]

export const GIF_SERVICE = 'https://gifs.bsky.app'

export const GIF_KLIPY_SEARCH = (params: string) =>
  `${GIF_SERVICE}/klipy/v2/search?${params}`
export const GIF_KLIPY_FEATURED = (params: string) =>
  `${GIF_SERVICE}/klipy/v2/featured?${params}`

export const MAX_LABELERS = 20

export const VIDEO_SERVICE = 'https://video.bsky.app'
export const VIDEO_SERVICE_DID = 'did:web:video.bsky.app'

export const VIDEO_MAX_DURATION_MS = 10 * 60 * 1000 // 10 minutes in milliseconds
/**
 * Maximum size of a video in megabytes, _not_ mebibytes. Backend uses
 * ISO megabytes.
 */
export const VIDEO_MAX_SIZE_MB = 300
export const VIDEO_MAX_SIZE = VIDEO_MAX_SIZE_MB * 1000 * 1000 // 300mb

export const SUPPORTED_MIME_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/webm',
  'video/quicktime',
  'image/gif',
] as const

export type SupportedMimeTypes = (typeof SUPPORTED_MIME_TYPES)[number]

export const EMOJI_REACTION_LIMIT = 5

export const urls = {
  website: {
    blog: {
      findFriendsAnnouncement:
        'https://bsky.social/about/blog/12-16-2025-find-friends',
      initialVerificationAnnouncement: `https://bsky.social/about/blog/04-21-2025-verification`,
      searchTipsAndTricks: 'https://bsky.social/about/blog/05-31-2024-search',
    },
    support: {
      findFriendsPrivacyPolicy:
        'https://bsky.social/about/support/find-friends-privacy-policy',
    },
  },
}

export const PUBLIC_APPVIEW = 'https://api.bsky.app'
export const PUBLIC_APPVIEW_DID = 'did:web:api.bsky.app'
export const PUBLIC_STAGING_APPVIEW_DID = 'did:web:api.staging.bsky.dev'

export const DEV_ENV_APPVIEW = `http://localhost:2584` // always the same

// temp hack for e2e - esb
export const BLUESKY_PROXY_HEADER = {
  value: `${BLUESKY_PROXY_DID}#bsky_appview`,
  get() {
    return this.value as Service
  },
  set(value: string) {
    this.value = value
  },
}

/**
 * The chat service's proxy target, in the `did#service_id` form a lex client's
 * `service` option takes. A client constructed with it emits `atproto-proxy:
 * <this value>` on every request, which is what routes `chat.bsky.*` calls to
 * the chat service.
 *
 * The DID comes from the env-configurable `CHAT_PROXY_DID` (via
 * `EXPO_PUBLIC_CHAT_PROXY_DID`) rather than a hard-coded constant, so the
 * target can be retargeted per environment.
 */
export const CHAT_PROXY_SERVICE: Service = `${CHAT_PROXY_DID}#bsky_chat`

/**
 * Bluesky's own moderation service, in the `did#service_id` form a lex client's
 * per-call `service` option takes. Passing it emits `atproto-proxy: <this
 * value>` on that one request, routing a `com.atproto.moderation.*` call to
 * Bluesky's labeler.
 *
 * Reports and appeals aimed at a DIFFERENT labeler build their own value from
 * that labeler's creator did instead, so this is a per-call option rather than a
 * client-level one like {@link CHAT_PROXY_SERVICE}.
 */
export const MOD_PROXY_SERVICE: Service = `${api.moderation.did}#atproto_labeler`

/**
 * The notification service's proxy target, in the `did#service_id` form a lex
 * client's per-call `service` option takes. Passing it emits `atproto-proxy:
 * <this value>` on that one request, which is what routes push registration to
 * the notification service (replaces the old
 * `BLUESKY_NOTIF_SERVICE_HEADERS`).
 */
export const NOTIF_SERVICE: Service = `${BLUESKY_PROXY_DID}#bsky_notif`

export const webLinks = {
  tos: `https://para.social/tos`,
  privacy: `https://para.social/privacy`,
  community: `https://para.social/community-guidelines`,
  communityDeprecated: `https://para.social/community-guidelines-deprecated`,
}

export const MOCK_COMMUNITY_LIST_URI =
  'at://did:plc:mock/app.bsky.graph.list/community'
export const MOCK_PARTY_LIST_URI = 'at://did:plc:mock/app.bsky.graph.list/party'

/*
 * Local-service URL detection. Consumed by session restore, login, and DM
 * headers to treat local PDS URLs as first-class services. These were dropped
 * in a constants rewrite but are still imported across the app.
 */
export const DEV_ENV_APPVIEW_DID = `did:plc:mdok2ef5oewozmds2zlhua5n`
export const DEV_ENV_CHAT_DID = 'did:plc:ztgydimgwegx72nfqbfgurrb'
/*
 * Dev builds run against the local demo stack, so treat them as local-dev mode
 * regardless of DEFAULT_SERVICE (which always points at prod here). Matches
 * the pre-rewrite behavior where dev builds defaulted to the local PDS.
 */
export const IS_LOCAL_DEV_MODE: boolean =
  __DEV__ || DEFAULT_SERVICE === (LOCAL_DEV_SERVICE as string)

export const POST_IMG_MAX = {
  width: 2000,
  height: 2000,
  size: 1000000,
}

export const LOCAL_DEV_APPVIEW_PROXY_DID =
  process.env.EXPO_PUBLIC_LOCAL_BSKY_PROXY_DID || DEV_ENV_APPVIEW_DID
export const LOCAL_DEV_CHAT_PROXY_DID =
  process.env.EXPO_PUBLIC_LOCAL_CHAT_PROXY_DID || DEV_ENV_CHAT_DID
const LOCAL_DEV_SERVICE_HOSTNAME = parseServiceHostname(LOCAL_DEV_SERVICE)

function parseServiceHostname(serviceUrl?: string): string | null {
  if (!serviceUrl) return null
  try {
    const normalizedUrl = serviceUrl.includes('://')
      ? serviceUrl
      : `http://${serviceUrl}`
    return new URL(normalizedUrl).hostname
  } catch {
    return null
  }
}

function isDirectLocalHostname(hostname: string): boolean {
  const octets = hostname.split('.')
  const isIpv4 =
    octets.length === 4 &&
    octets.every(
      part => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255,
    )
  const firstOctet = isIpv4 ? Number(octets[0]) : -1
  const secondOctet = isIpv4 ? Number(octets[1]) : -1
  const isPrivateIpv4 =
    isIpv4 &&
    (firstOctet === 10 ||
      (firstOctet === 192 && secondOctet === 168) ||
      (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31))

  return hostname === 'localhost' || hostname === '127.0.0.1' || isPrivateIpv4
}

export function isLikelyLocalServiceUrl(serviceUrl?: string): boolean {
  const hostname = parseServiceHostname(serviceUrl)
  if (!hostname) return false

  return (
    isDirectLocalHostname(hostname) || hostname === LOCAL_DEV_SERVICE_HOSTNAME
  )
}

export function normalizeLocalServiceUrl(serviceUrl: string): string {
  if (!isLikelyLocalServiceUrl(serviceUrl)) return serviceUrl
  try {
    const normalizedUrl = serviceUrl.includes('://')
      ? serviceUrl
      : `http://${serviceUrl}`
    const url = new URL(normalizedUrl)
    if (isDirectLocalHostname(url.hostname)) {
      return LOCAL_DEV_SERVICE.replace(/\/+$/, '')
    }
    return url.toString().replace(/\/+$/, '')
  } catch {
    return serviceUrl
  }
}

export function getDmServiceHeadersForServiceUrl(serviceUrl?: string) {
  const proxyDid = isLikelyLocalServiceUrl(serviceUrl)
    ? LOCAL_DEV_CHAT_PROXY_DID
    : CHAT_PROXY_DID

  return {
    'atproto-proxy': `${proxyDid}#bsky_chat`,
  }
}

/*
 * Default saved feeds. In local dev mode the discover/video feeds resolve to
 * null so onboarding doesn't pin feeds the local AppView can't serve.
 */
export const DEFAULT_DISCOVER_FEED_URI = IS_LOCAL_DEV_MODE
  ? null
  : DISCOVER_FEED_URI
export const DEFAULT_DISCOVER_FEED_DESCRIPTOR = DEFAULT_DISCOVER_FEED_URI
  ? `feedgen|${DEFAULT_DISCOVER_FEED_URI}`
  : 'following'
export const DEFAULT_VIDEO_FEED_URI = IS_LOCAL_DEV_MODE ? null : VIDEO_FEED_URI
export const DEFAULT_VIDEO_FEED_DESCRIPTOR = DEFAULT_VIDEO_FEED_URI
  ? `feedgen|${DEFAULT_VIDEO_FEED_URI}`
  : null
export const DEFAULT_VIDEO_FEED_URIS = DEFAULT_VIDEO_FEED_URI
  ? [DEFAULT_VIDEO_FEED_URI, STAGING_VIDEO_FEED_URI]
  : []
export const DEFAULT_DISCOVER_SAVED_FEED = DEFAULT_DISCOVER_FEED_URI
  ? {
      type: 'feed',
      value: DEFAULT_DISCOVER_FEED_URI,
      pinned: true,
    }
  : null
export const DEFAULT_VIDEO_SAVED_FEED = DEFAULT_VIDEO_FEED_URI
  ? {
      type: 'feed',
      value: DEFAULT_VIDEO_FEED_URI,
      pinned: true,
    }
  : null

export function isDefaultDiscoverFeedUri(uri?: string | null) {
  return Boolean(DEFAULT_DISCOVER_FEED_URI && uri === DEFAULT_DISCOVER_FEED_URI)
}

export function isDiscoverFeedUri(uri?: string | null) {
  return Boolean(
    uri &&
    (uri === DISCOVER_FEED_URI ||
      (DEFAULT_DISCOVER_FEED_URI !== null &&
        uri === DEFAULT_DISCOVER_FEED_URI)),
  )
}

export function isDefaultVideoFeedUri(uri?: string | null) {
  return Boolean(uri && DEFAULT_VIDEO_FEED_URIS.includes(uri))
}
