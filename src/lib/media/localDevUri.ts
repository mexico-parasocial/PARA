import {LOCAL_DEV_SERVICE} from '#/lib/constants'
import {IS_WEB} from '#/env'

/*
 * The local dev-env AppView and PDS describe themselves as
 * `http://localhost:2584` / `:2583`, so the image URLs they return (avatars,
 * banners, embeds) point at localhost. On a physical device localhost is the
 * device itself and every image silently fails to load.
 *
 * The dev-env Docker network publishes only the PDS port on the LAN; the
 * AppView stays on 127.0.0.1. So AppView image URLs
 * (`/img/<preset>/plain/<did>/<cid>`) are served from the PDS the app already
 * reaches, through `com.atproto.sync.getBlob`. That skips the imgproxy resize,
 * which is fine for development. Web and the iOS simulator run on the dev Mac
 * and keep localhost; production URLs never match.
 */
const LOCAL_APPVIEW = 'http://localhost:2584'
const LOCAL_PDS = 'http://localhost:2583'
const PDS_ORIGIN = __DEV__ && !IS_WEB ? originOf(LOCAL_DEV_SERVICE) : ''
const ENABLED =
  !!PDS_ORIGIN && !/^https?:\/\/(localhost|127\.0\.0\.1)\b/i.test(PDS_ORIGIN)

const APPVIEW_IMG_RE = /^\/img\/[^/]+\/plain\/(did:[^/]+)\/([^/@?#]+)/

export function toDeviceReachableUri(uri: string): string
export function toDeviceReachableUri(
  uri: string | undefined,
): string | undefined
export function toDeviceReachableUri(uri: string | undefined) {
  if (!uri || !ENABLED) return uri
  if (uri.startsWith(`${LOCAL_APPVIEW}/`)) {
    const match = APPVIEW_IMG_RE.exec(uri.slice(LOCAL_APPVIEW.length))
    if (!match) return uri
    const [, did, cid] = match
    return `${PDS_ORIGIN}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(
      did,
    )}&cid=${encodeURIComponent(cid)}`
  }
  if (uri.startsWith(`${LOCAL_PDS}/`)) {
    return PDS_ORIGIN + uri.slice(LOCAL_PDS.length)
  }
  return uri
}

// A regex rather than `new URL()`: React Native's URL does not implement
// `origin` on every engine.
function originOf(url: string): string {
  return /^https?:\/\/[^/?#]+/i.exec(url)?.[0] ?? ''
}
