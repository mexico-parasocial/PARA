import {
  type CivicTreeItem,
  getCivicTreeItemKind,
  getCivicTreeItemTitle,
} from '#/state/queries/collection-items'

import {inferCivicTreeSourceType} from './sourceTypes'

/*
 * Maps a private collection item onto a community contribution.
 *
 * Only this mapping crosses the boundary: the item's title, its source, and a
 * type. The collection it came from, the relations drawn around it, and the
 * user's own notes stay behind - which is the promise
 * CIVIC_TREE_COPY.contributionPrivacy makes and the reason this is a narrow
 * projection rather than passing the item through.
 */

export type ContributionDraft = {
  title: string
  /** AT-URI, when the item references a record in the network. */
  sourceUri?: string
  /** http(s) URL, when the item references a page on the web. */
  sourceUrl?: string
  sourceType: string
  /** Shown in the preview so the user sees what they are sharing. */
  category?: string
}

const AT_URI = /^at:\/\//i
const HTTP_URL = /^https?:\/\//i

/**
 * An item can carry a record reference, a web link, both, or neither. They are
 * different fields on a contribution and were previously conflated - a policy's
 * AT-URI was being sent as `sourceUrl`, which is not a URL.
 */
export function contributionFromItem(item: CivicTreeItem): ContributionDraft {
  const title = getCivicTreeItemTitle(item)
  const kind = getCivicTreeItemKind(item)

  const candidates = [item.policyUri, item.sourceUri, item.url].filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  )

  const sourceUri = candidates.find(v => AT_URI.test(v))
  const sourceUrl = candidates.find(v => HTTP_URL.test(v))

  /*
   * A topic is a subject rather than an artifact, so it keeps its own type
   * instead of being guessed at from a URL it does not have. Everything else
   * infers from whatever reference it carries.
   */
  const sourceType =
    kind === 'topic'
      ? 'topic'
      : inferCivicTreeSourceType(
          [sourceUrl, sourceUri, item.policyCategory, title]
            .filter(Boolean)
            .join(' '),
        )

  return {
    title,
    sourceUri,
    sourceUrl,
    sourceType,
    category: item.policyCategory || undefined,
  }
}

/**
 * Whether an item can be contributed at all. A title is the one thing a
 * community card cannot do without - everything else is optional context.
 */
export function canContributeItem(item: CivicTreeItem): boolean {
  return getCivicTreeItemTitle(item).trim().length > 0
}
