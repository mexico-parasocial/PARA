import {POST_FLAIRS} from '#/lib/tags'
import {
  type CivicTreeItem,
  getCivicTreeItemKind,
  getCivicTreeItemTitle,
} from '#/state/queries/collection-items'
import {type CivicTreeCollection} from '#/state/queries/collections'
import {flairIdOf, type TopicGraphEdge} from '../communityCivicTree/topics'
import {normalizeSubjectUrl} from './subject'

/*
 * What civic trees connect to a matter.
 *
 * A matter is a subject, so a tree reaches it in one of two ways: a topic node
 * drawn from the flair catalog (`flairId`), or the debate itself saved as an
 * item/card (its AT-URI). Whatever is *connected* to such a node is related to
 * the matter. Merely sharing a flair is not a connection and is not listed.
 */

export type MatterAnchor = {
  /** The debate's AT-URI, when the matter is backed by a live record. */
  uri?: string
  /** The flairs the matter carries, as written on posts (`|#Sanidad`). */
  flairs?: string[]
}

export type RelatedCategory = 'policy' | 'data' | 'other'

export type RelatedOrigin = {
  kind: 'personal' | 'community'
  /** The collection or community the connection was drawn in. */
  name: string
  /** Community URI, for opening the tree the connection lives in. */
  communityUri?: string
}

export type RelatedItem = {
  key: string
  title: string
  category: RelatedCategory
  /** The item's own kind or card type, e.g. `book`, `research`. */
  type: string
  /** The record this item stands for, when it has one. */
  uri?: string
  url?: string
  origins: RelatedOrigin[]
}

const FLAIR_IDS_BY_TAG = new Map<string, string>(
  Object.values(POST_FLAIRS).map(flair => [flair.tag.toLowerCase(), flair.id]),
)

/** The catalog ids of the flairs a matter carries; unknown flairs are skipped. */
export function flairIdsForTags(tags: string[] | undefined) {
  const ids = new Set<string>()
  for (const tag of tags ?? []) {
    const id = FLAIR_IDS_BY_TAG.get(tag.toLowerCase())
    if (id) ids.add(id)
  }
  return ids
}

const AT_URI = /^at:\/\//i
const DATA_TYPES = new Set([
  'link',
  'evidence',
  'book',
  'research',
  'audio',
  'video',
])

function categoryOf(type: string, postType?: string): RelatedCategory {
  if (type === 'policy' || postType === 'policy') return 'policy'
  if (DATA_TYPES.has(type)) return 'data'
  // An article is a reference unless it is one of PARA's own posts.
  if (type === 'article' && !postType) return 'data'
  return 'other'
}

function atUri(...candidates: Array<string | null | undefined>) {
  return candidates.find((v): v is string => !!v && AT_URI.test(v))
}

function webUrl(...candidates: Array<string | null | undefined>) {
  return candidates.find(
    (v): v is string => !!v && normalizeSubjectUrl(v) !== undefined,
  )
}

function sameUri(a: string | undefined | null, b: string | undefined) {
  return !!a && !!b && a.replace(/\/+$/, '') === b.replace(/\/+$/, '')
}

function neighbours(pairs: Array<[string, string]>) {
  const map = new Map<string, Set<string>>()
  for (const [from, to] of pairs) {
    if (from === to) continue
    if (!map.has(from)) map.set(from, new Set())
    if (!map.has(to)) map.set(to, new Set())
    map.get(from)!.add(to)
    map.get(to)!.add(from)
  }
  return map
}

function isAnchorItem(
  item: CivicTreeItem,
  anchor: MatterAnchor,
  flairIds: Set<string>,
) {
  if (item.kind === 'topic') {
    return !!item.flairId && flairIds.has(item.flairId)
  }
  return (
    sameUri(item.policyUri, anchor.uri) || sameUri(item.sourceUri, anchor.uri)
  )
}

/** Items in the viewer's own collections connected to the matter. */
export function relatedFromCollections(
  collections: readonly CivicTreeCollection[],
  anchor: MatterAnchor,
): RelatedItem[] {
  const flairIds = flairIdsForTags(anchor.flairs)
  const out: RelatedItem[] = []

  for (const collection of collections) {
    const anchors = new Set(
      collection.items
        .filter(item => isAnchorItem(item, anchor, flairIds))
        .map(item => item.itemId)
        .filter((id): id is string => !!id),
    )
    if (anchors.size === 0) continue

    const linked = neighbours(
      (collection.relations ?? []).map(r => [r.fromItemId, r.toItemId]),
    )
    const connected = new Set<string>()
    for (const id of anchors) {
      for (const other of linked.get(id) ?? []) {
        if (!anchors.has(other)) connected.add(other)
      }
    }

    for (const item of collection.items) {
      if (!item.itemId || !connected.has(item.itemId)) continue
      const title = getCivicTreeItemTitle(item).trim()
      if (!title) continue
      const type = getCivicTreeItemKind(item)
      const uri = atUri(item.policyUri, item.sourceUri, item.url)
      out.push({
        key: `personal:${collection.id}:${item.itemId}`,
        title,
        category: categoryOf(type),
        type,
        uri,
        url: webUrl(item.url),
        origins: [{kind: 'personal', name: collection.name}],
      })
    }
  }
  return out
}

/** The slice of a community card this module reads. */
export type RelatedGraphNode = {
  id: string
  title: string
  card_type: string
  author_did: string
  source_uri?: string | null
  source_url?: string | null
  metadata?: string | null
}

function parseMetadata(metadata: string | null | undefined) {
  if (!metadata) return {}
  try {
    const value = JSON.parse(metadata)
    return value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function edgeEnds(edge: TopicGraphEdge): [string, string] {
  return 'source' in edge
    ? [edge.source, edge.target]
    : [edge.source_card_id, edge.target_card_id]
}

/** Cards in one community's tree connected to the matter. */
export function relatedFromCommunityGraph(
  graph: {
    nodes: readonly RelatedGraphNode[]
    edges: readonly TopicGraphEdge[]
  },
  community: {name: string; uri?: string},
  anchor: MatterAnchor,
): RelatedItem[] {
  const flairIds = flairIdsForTags(anchor.flairs)
  const byId = new Map(graph.nodes.map(node => [node.id, node]))

  const anchors = new Set(
    graph.nodes
      .filter(node => {
        if (node.card_type === 'topic') {
          const flairId =
            flairIdOf(node) ?? parseMetadata(node.metadata).flairId
          return typeof flairId === 'string' && flairIds.has(flairId)
        }
        return (
          sameUri(node.source_uri, anchor.uri) ||
          sameUri(node.source_url, anchor.uri)
        )
      })
      .map(node => node.id),
  )
  if (anchors.size === 0) return []

  const linked = neighbours(
    graph.edges.map(edge => edgeEnds(edge)).filter(([a, b]) => a && b),
  )
  const connected = new Set<string>()
  for (const id of anchors) {
    for (const other of linked.get(id) ?? []) {
      if (!anchors.has(other) && byId.has(other)) connected.add(other)
    }
  }

  const out: RelatedItem[] = []
  for (const id of connected) {
    const node = byId.get(id)!
    const title = node.title.trim()
    if (!title) continue
    const postType = parseMetadata(node.metadata).postType
    out.push({
      key: `community:${community.uri ?? community.name}:${node.id}`,
      title,
      category: categoryOf(
        node.card_type,
        typeof postType === 'string' ? postType : undefined,
      ),
      type: node.card_type,
      uri: atUri(node.source_uri, node.source_url),
      url: webUrl(node.source_url),
      origins: [
        {kind: 'community', name: community.name, communityUri: community.uri},
      ],
    })
  }
  return out
}

function identity(item: RelatedItem) {
  if (item.uri) return `uri:${item.uri.replace(/\/+$/, '')}`
  if (item.url) return `url:${normalizeSubjectUrl(item.url) ?? item.url}`
  return titleKey(item)
}

/*
 * The same post is a `post` item in a collection and an `article` card in a
 * community, so the type cannot tell them apart; the category can.
 */
function titleKey(item: RelatedItem) {
  return `title:${item.category}:${item.title.trim().toLowerCase()}`
}

function hasReference(item: RelatedItem) {
  return Boolean(item.uri || item.url)
}

const CATEGORY_ORDER: RelatedCategory[] = ['policy', 'data', 'other']

/**
 * One entry per thing, however many trees connect it: the same policy saved by
 * the viewer and a community is listed once with both origins.
 */
export function mergeRelatedItems(items: readonly RelatedItem[]) {
  const entries: RelatedItem[] = []
  const byIdentity = new Map<string, RelatedItem>()
  /*
   * A community card may not carry the record's URI while a collection item
   * does, so an item without a reference joins one with the same title, in
   * either order. Two referenced items are different records even when their
   * titles match, and a title several records share is ambiguous (`null`), so
   * a reference-less item joins none of them.
   */
  const byTitle = new Map<string, RelatedItem | null>()
  for (const item of items) {
    const id = identity(item)
    const title = titleKey(item)
    let existing = byIdentity.get(id)
    if (!existing) {
      const candidate = byTitle.get(title)
      if (candidate && !(hasReference(item) && hasReference(candidate))) {
        existing = candidate
      }
    }
    if (!existing) {
      const entry = {...item, origins: [...item.origins]}
      entries.push(entry)
      byIdentity.set(id, entry)
      if (!byTitle.has(title)) byTitle.set(title, entry)
      else if (hasReference(item)) byTitle.set(title, null)
      continue
    }
    byIdentity.set(id, existing)
    for (const origin of item.origins) {
      const known = existing.origins.some(
        o => o.kind === origin.kind && o.name === origin.name,
      )
      if (!known) existing.origins.push(origin)
    }
    existing.uri ??= item.uri
    existing.url ??= item.url
  }
  return entries.sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      b.origins.length - a.origins.length ||
      a.title.localeCompare(b.title),
  )
}
