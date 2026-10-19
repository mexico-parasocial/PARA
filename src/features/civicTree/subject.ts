import {type CivicTreeItem} from '#/state/queries/collection-items'
import {normalizeForSearch} from './nodeSearch'

/*
 * What an item is *about*, as a stable key.
 *
 * Item ids are random and only unique within a collection, so until now
 * nothing could tell that the policy filed under "Agua" and the one filed
 * under "Presupuesto" are the same policy. A subject key is that missing
 * identity: two items with the same key point at the same thing, whoever
 * filed them and wherever.
 *
 * It is deliberately conservative. A false merge (two different things shown
 * as one) misleads; a missed merge only loses a hint. So:
 *
 *  - a `note` has no subject. It is the user's own text, not a reference.
 *  - a `book` without an author has no subject: "Democracia" alone names
 *    too many books.
 *  - anything that is not a well-formed http(s) URL, AT-URI or flair has no
 *    subject rather than a guessed one.
 *
 * Keys are computed, never stored, so the rules can improve without a
 * migration.
 */

/** Query parameters that identify a click, not a page. */
const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'si',
  'ref_src',
  'ref_url',
])

const AT_URI = /^at:\/\/[^/\s]+(\/[^\s]*)?$/i

function atSubject(uri: string | undefined): string | undefined {
  const trimmed = uri?.trim()
  if (!trimmed || !AT_URI.test(trimmed)) return undefined
  return trimmed.replace(/\/+$/, '')
}

/*
 * Parsed by hand rather than with `URL`: React Native's `URL` is a regex shim
 * that never throws and differs from the browser's and Node's (it appends
 * slashes, does not decode). The key must come out identical on every
 * platform, including the AppView once community cards carry it.
 */
const HTTP_URL =
  /^(https?):\/\/(?:[^@/?#\s]*@)?([^/?#:\s]+)(?::(\d+))?([^?#\s]*)(?:\?([^#\s]*))?(?:#\S*)?$/i

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * One spelling per web page: https, lowercase host without `www.`, no default
 * port, no fragment, no tracking parameters, sorted query, no trailing slash.
 * Path and parameter values keep their case, since servers may treat it as
 * significant. DOI links become `doi:` keys, since the same paper is linked
 * through several resolvers and DOIs are case-insensitive. Returns undefined
 * for anything that is not an http(s) URL.
 */
export function normalizeSubjectUrl(input: string): string | undefined {
  const match = HTTP_URL.exec(input.trim())
  if (!match) return undefined
  const [, , rawHost, port, rawPath = '', rawQuery = ''] = match

  const host = rawHost.toLowerCase().replace(/^www\./, '')
  if (!host.includes('.') && host !== 'localhost') return undefined

  if (host === 'doi.org' || host === 'dx.doi.org') {
    const doi = safeDecode(rawPath.replace(/^\/+/, ''))
    return doi ? `doi:${doi.toLowerCase()}` : undefined
  }

  const pairs = rawQuery.split('&').filter(pair => {
    if (!pair) return false
    const key = safeDecode(pair.split('=')[0]).toLowerCase()
    return !key.startsWith('utm_') && !TRACKING_PARAMS.has(key)
  })

  /* A youtu.be share link and a watch link are the same video. */
  if (host === 'youtu.be' && rawPath.length > 1) {
    return finish('youtube.com', '/watch', [
      ...pairs,
      `v=${rawPath.slice(1).replace(/\/+$/, '')}`,
    ])
  }

  const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : ''
  return finish(host + portSuffix, rawPath.replace(/\/+$/, ''), pairs)
}

function finish(host: string, path: string, pairs: string[]) {
  const query = pairs.length ? `?${[...pairs].sort().join('&')}` : ''
  return `https://${host}${path}${query}`
}

/**
 * The subject of a bare link: a normalised web URL or an AT-URI. Used to
 * recognise a link that was already published, whatever spelling it was
 * published under.
 */
export function subjectKeyForUrl(input: string): string | undefined {
  return normalizeSubjectUrl(input) ?? atSubject(input)
}

/** The subject an item refers to, or undefined when it has none. */
export function subjectKeyForItem(item: CivicTreeItem): string | undefined {
  switch (item.kind) {
    case 'note':
      return undefined
    case 'topic': {
      if (item.flairId) return `flair:${item.flairId}`
      const title = normalizeForSearch(item.title ?? '')
      return title ? `topic:${title}` : undefined
    }
  }

  /*
   * The PARA record is the most specific reference, then the page the user
   * linked, then the record the item was saved from (a post that shared a
   * link is about that link, so the link wins when both are present).
   */
  const policy = atSubject(item.policyUri)
  if (policy) return policy

  const url = item.url ? normalizeSubjectUrl(item.url) : undefined
  if (url) return url

  const source = atSubject(item.sourceUri)
  if (source) return source

  if (item.kind === 'book') {
    const title = normalizeForSearch(item.title ?? '')
    const author = normalizeForSearch(item.sourceLabel ?? '')
    if (title && author) return `book:${title}|${author}`
  }

  return undefined
}
