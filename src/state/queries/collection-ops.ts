import {
  type CivicTreeItem,
  type CivicTreeRelation,
  createCivicTreeItemId,
  getCivicTreeItemKey,
} from './collection-items'

/*
 * Edits to a personal civic tree collection, expressed as operations rather
 * than as a whole replacement collection.
 *
 * The update endpoint replaces items and relations together, so a client that
 * sends back a collection it read a moment ago silently erases anything written
 * in between. Describing the edit as an operation lets the client apply it to
 * the freshest copy it has, and is the shape a server-side `applyOps` endpoint
 * would accept. Pure and dependency-free so it can be tested without the agent.
 */

export type CollectionShape = {
  name: string
  description?: string
  color?: string
  items: CivicTreeItem[]
  relations?: CivicTreeRelation[]
}

export type CollectionOp =
  | {type: 'addItem'; item: CivicTreeItem}
  | {type: 'updateItem'; itemKey: string; patch: Partial<CivicTreeItem>}
  | {type: 'removeItem'; itemKey: string}
  | {type: 'addRelation'; relation: CivicTreeRelation}
  | {type: 'removeRelation'; relationId: string}
  | {
      type: 'updateDetails'
      fields: {name?: string; description?: string | null; color?: string}
    }

/**
 * A new item always gets a stable `itemId`. Policies keep their URI as the id,
 * which is what the legacy key fell back to, so relations and dedupe behave the
 * same before and after. Everything else gets a generated id.
 */
export function withItemId(item: CivicTreeItem): CivicTreeItem {
  if (item.itemId) return item
  return {...item, itemId: item.policyUri || createCivicTreeItemId()}
}

/** Two items are the same thing if they share a key, policy, or link. */
export function isSameItem(a: CivicTreeItem, b: CivicTreeItem): boolean {
  if (getCivicTreeItemKey(a) === getCivicTreeItemKey(b)) return true
  if (a.policyUri && a.policyUri === b.policyUri) return true
  if (!a.itemId && a.url && a.url === b.url) return true
  return false
}

export function applyCollectionOp<T extends CollectionShape>(
  collection: T,
  op: CollectionOp,
): T {
  const relations = collection.relations ?? []

  switch (op.type) {
    case 'addItem': {
      if (collection.items.some(existing => isSameItem(existing, op.item))) {
        return collection
      }
      return {...collection, items: [...collection.items, withItemId(op.item)]}
    }

    case 'updateItem': {
      let changed = false
      const items = collection.items.map(item => {
        if (getCivicTreeItemKey(item) !== op.itemKey) return item
        changed = true
        /*
         * Pin the key before patching. A legacy item has no `itemId`, so its
         * key is derived from a field (url, policyUri) that the patch may
         * change, which would orphan every relation pointing at it.
         */
        return {...item, itemId: item.itemId ?? op.itemKey, ...op.patch}
      })
      return changed ? {...collection, items} : collection
    }

    case 'removeItem':
      return {
        ...collection,
        items: collection.items.filter(
          item => getCivicTreeItemKey(item) !== op.itemKey,
        ),
        relations: relations.filter(
          r => r.fromItemId !== op.itemKey && r.toItemId !== op.itemKey,
        ),
      }

    case 'addRelation': {
      if (relations.some(r => r.id === op.relation.id)) return collection
      return {...collection, relations: [...relations, op.relation]}
    }

    case 'removeRelation':
      return {
        ...collection,
        relations: relations.filter(r => r.id !== op.relationId),
      }

    case 'updateDetails': {
      const {name, description, color} = op.fields
      return {
        ...collection,
        ...(name !== undefined ? {name} : {}),
        ...(description !== undefined
          ? {description: description ?? undefined}
          : {}),
        ...(color !== undefined ? {color} : {}),
      }
    }
  }
}
