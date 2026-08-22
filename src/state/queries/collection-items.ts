export interface CivicTreeItem {
  itemId?: string
  /**
   * What the item is. Every kind except `topic` references an artifact with
   * a URI or URL; a `topic` names a subject those artifacts are about and has
   * no target of its own.
   */
  kind?: 'policy' | 'post' | 'link' | 'note' | 'evidence' | 'topic'
  title?: string
  description?: string
  url?: string
  sourceUri?: string
  sourceLabel?: string
  policyUri?: string
  policyCid?: string
  policyTitle?: string
  policyCategory?: string
  policyColor?: string
  /**
   * For a topic drawn from PARA's shared flair vocabulary, the flair id.
   * Absent on a free-text topic. Two users tagging the same flair produce
   * the same key, which is what makes personal trees comparable later.
   */
  flairId?: string
  note?: string
  addedAt: string
}

export interface CivicTreeRelation {
  id: string
  fromItemId: string
  toItemId: string
  kind:
    | 'supports'
    | 'opposes'
    | 'evidence_for'
    | 'context_for'
    | 'duplicates'
    | 'depends_on'
    | 'related_to'
  note?: string
  createdAt: string
}

export function createCivicTreeItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createCivicTreeRelationId() {
  return `rel-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getCivicTreeItemKind(item: CivicTreeItem) {
  return item.kind || (item.policyUri ? 'policy' : 'evidence')
}

export function getCivicTreeItemTitle(item: CivicTreeItem) {
  return (
    item.title ||
    item.policyTitle ||
    item.sourceLabel ||
    item.url ||
    item.policyUri ||
    ''
  )
}

export function getCivicTreeItemKey(item: CivicTreeItem) {
  return (
    item.itemId ||
    item.policyUri ||
    item.url ||
    `${getCivicTreeItemTitle(item)}-${item.addedAt}`
  )
}
