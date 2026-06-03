import {type CivicTreeCollectionExportView} from '#/lib/civic-export/obsidian'
import {
  type CivicTreeItem,
  type CivicTreeRelation,
  createCivicTreeItemId,
  getCivicTreeItemKey,
  getCivicTreeItemTitle,
} from '#/state/queries/collection-items'

export type ExternalKnowledgeNetworkProvider = 'semble' | 'margin' | 'obsidian'

export interface ExternalKnowledgeNetworkRef {
  provider: ExternalKnowledgeNetworkProvider
  uri: string
  cid?: string
  url?: string
  title?: string
}

export interface MarginBookmarkView {
  uri: string
  cid?: string
  url?: string
  title?: string
  description?: string
  note?: string
  tags?: string[]
  collectionUri?: string
  createdAt?: string
}

export interface SembleExportPayload {
  collection: {
    name: string
    description?: string
  }
  cards: Array<{
    itemKey: string
    title: string
    url?: string
    note?: string
  }>
  connections: Array<{
    fromItemKey: string
    toItemKey: string
    kind: CivicTreeRelation['kind']
    note?: string
  }>
}

export function buildSembleExportPayload(
  collection: CivicTreeCollectionExportView,
): SembleExportPayload {
  return {
    collection: {
      name: collection.name,
      description: collection.description,
    },
    cards: collection.items.map(item => ({
      itemKey: getCivicTreeItemKey(item),
      title: getCivicTreeItemTitle(item),
      url: item.url ?? item.policyUri ?? item.sourceUri,
      note: item.note ?? item.description,
    })),
    connections: (collection.relations ?? []).map(relation => ({
      fromItemKey: relation.fromItemId,
      toItemKey: relation.toItemId,
      kind: relation.kind,
      note: relation.note,
    })),
  }
}

export function marginBookmarkToCivicTreeItem(
  bookmark: MarginBookmarkView,
): CivicTreeItem {
  return {
    itemId: createCivicTreeItemId(),
    kind: 'evidence',
    title: bookmark.title,
    description: bookmark.description,
    url: bookmark.url,
    sourceUri: bookmark.uri,
    sourceLabel: bookmark.title || bookmark.url || 'Margin bookmark',
    note: [
      bookmark.note,
      bookmark.tags?.length ? `Tags: ${bookmark.tags.join(', ')}` : undefined,
    ]
      .filter(Boolean)
      .join('\n'),
    addedAt: bookmark.createdAt ?? new Date().toISOString(),
  }
}

export function getExternalKnowledgeNetworkLabel(
  provider: ExternalKnowledgeNetworkProvider,
) {
  switch (provider) {
    case 'semble':
      return 'Semble.so'
    case 'margin':
      return 'Margin'
    case 'obsidian':
      return 'Obsidian'
  }
}

export function getExternalRefsFromCollection(
  collection: CivicTreeCollectionExportView,
): ExternalKnowledgeNetworkRef[] {
  const refs: ExternalKnowledgeNetworkRef[] = []
  for (const item of collection.items) {
    const uri = item.sourceUri ?? item.policyUri
    if (!uri) continue
    const provider = getProviderFromUri(uri)
    if (!provider) continue
    refs.push({
        provider,
        uri,
        url: item.url,
        title: getCivicTreeItemTitle(item),
    })
  }
  return refs
}

export function getProviderFromUri(
  uri: string,
): ExternalKnowledgeNetworkProvider | undefined {
  if (uri.includes('network.cosmik.')) return 'semble'
  if (uri.includes('at.margin.')) return 'margin'
  if (uri.startsWith('obsidian://')) return 'obsidian'
  return undefined
}
