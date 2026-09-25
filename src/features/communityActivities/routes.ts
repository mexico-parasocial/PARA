/*
 * Path builders for the community menu screens. Params that are not path
 * segments travel as a query string so wiki hyperlinks and shared activity
 * links open the same screen on web and native.
 */

function query(params: Record<string, string | undefined>) {
  const pairs = Object.entries(params)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  return pairs.length ? `?${pairs.join('&')}` : ''
}

export function communityWikiPagePath(params: {
  communityUri: string
  communityName: string
  communityId?: string
  slug: string
}) {
  return `/communities/wiki${query(params)}`
}

export function communityActivityPath(activityUri: string) {
  return `/communities/activities/${encodeURIComponent(activityUri)}`
}
