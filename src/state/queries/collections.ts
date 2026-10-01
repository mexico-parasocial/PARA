import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {isUnsupportedMethodError} from '#/lib/api/unsupported-method'
import {
  PERSISTED_QUERY_GCTIME,
  PERSISTED_QUERY_ROOT,
} from '#/state/queries/index'
import {useAgent} from '#/state/session'
import {com} from '#/lexicons'
import {type CivicTreeItem, type CivicTreeRelation} from './collection-items'
import {applyCollectionOp, type CollectionOp} from './collection-ops'
import {
  enqueueCollectionWrite,
  forgetCollectionWrite,
  hasPendingCollectionWrite,
  recallCollectionWrite,
  rememberCollectionWrite,
} from './collection-write-queue'

export type {CivicTreeItem, CivicTreeRelation} from './collection-items'
export {
  createCivicTreeItemId,
  createCivicTreeRelationId,
  getCivicTreeItemKey,
  getCivicTreeItemKind,
  getCivicTreeItemTitle,
} from './collection-items'
export type {CollectionOp} from './collection-ops'

const STALE_TIME = 60 * 1000 // 1 minute
const RQKEY_ROOT = 'collections'

export interface CivicTreeCollection {
  id: string
  name: string
  description?: string
  color?: string
  items: CivicTreeItem[]
  relations?: CivicTreeRelation[]
  createdAt: string
  updatedAt: string
}

const OPTIMISTIC_PREFIX = 'optimistic-'
/** Collections past this many pages (50 each) are not loaded. */
const MAX_LIST_PAGES = 10

export function getCollectionsListQueryKey(): [string, string, string] {
  return [PERSISTED_QUERY_ROOT, RQKEY_ROOT, 'list']
}

export function getCollectionDetailQueryKey(
  id: string,
): [string, string, string, string] {
  return [PERSISTED_QUERY_ROOT, RQKEY_ROOT, 'get', id]
}

const getListQueryKey = getCollectionsListQueryKey
const getDetailQueryKey = getCollectionDetailQueryKey

/**
 * A collection that exists only in the local cache while its create request is
 * in flight. The server has never heard of this id, so it must not be opened,
 * targeted by an add, or written to.
 */
export function isOptimisticCollectionId(id: string | undefined): boolean {
  return !!id && id.startsWith(OPTIMISTIC_PREFIX)
}

type Agent = ReturnType<typeof useAgent>

/** Every collection, following the cursor, up to {@link MAX_LIST_PAGES}. */
export async function fetchAllCollections(
  agent: Agent,
): Promise<CivicTreeCollection[]> {
  const all: CivicTreeCollection[] = []
  let cursor: string | undefined
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const res = await agent.appviewClient.call(
      com.para.collection.listCollections,
      cursor ? {cursor} : {},
    )
    all.push(...((res.collections || []) as CivicTreeCollection[]))
    cursor = res.cursor
    if (!cursor) break
  }
  return all
}

const NOT_READY_MESSAGE =
  'This collection is still being created. Try again in a moment.'

/*
 * Whether the backend has `applyOps`. Unknown until the first write; once an
 * old server answers "not implemented" the client sticks to read-modify-write
 * for the rest of the session instead of probing on every edit.
 */
let applyOpsSupported: boolean | undefined

/** Forgets what was learned about the backend. Exported for tests. */
export function resetApplyOpsSupport() {
  applyOpsSupported = undefined
}

/**
 * The wire form of an op. JSON drops `undefined`, so "clear this field" is sent
 * as an empty string, which is how the server reads it.
 */
function toWireOp(op: CollectionOp) {
  if (op.type === 'updateItem') {
    return {
      type: op.type,
      itemKey: op.itemKey,
      patch: Object.fromEntries(
        Object.entries(op.patch).map(([k, v]) => [k, v ?? '']),
      ),
    }
  }
  if (op.type === 'updateDetails') {
    const {name, description, color} = op.fields
    return {
      type: op.type,
      fields: {
        ...(name !== undefined ? {name} : {}),
        ...(description !== undefined ? {description: description ?? ''} : {}),
        ...(color !== undefined ? {color} : {}),
      },
    }
  }
  return op
}

/**
 * Applies one operation to a collection, serialised with every other write to
 * it.
 *
 * With `applyOps` the edit is sent as an operation and the server applies it to
 * the collection's current state in log order, so edits from different devices
 * merge and nothing is read first. Against a server without it, the edit is
 * applied to the freshest copy this device has - the collection it wrote last,
 * else a fresh read - and the whole collection is written back; see
 * collection-write-queue for why that is only safe on one device.
 *
 * Resolves to the written collection on the read-modify-write path, and to
 * `undefined` on `applyOps`, where the server holds the result.
 */
export function writeCollectionOp(
  agent: Agent,
  collectionId: string,
  op: CollectionOp,
): Promise<CivicTreeCollection | undefined> {
  if (isOptimisticCollectionId(collectionId)) {
    return Promise.reject(new Error(NOT_READY_MESSAGE))
  }
  return enqueueCollectionWrite(collectionId, async () => {
    if (applyOpsSupported !== false) {
      try {
        await agent.appviewClient.call(com.para.collection.applyOps, {
          id: collectionId,
          ops: [toWireOp(op)],
        } as com.para.collection.applyOps.$InputBody)
        applyOpsSupported = true
        // Any copy remembered for the legacy path is now behind the server.
        forgetCollectionWrite(collectionId)
        return undefined
      } catch (err) {
        if (!isUnsupportedMethodError(err)) throw err
        applyOpsSupported = false
      }
    }

    const base =
      recallCollectionWrite<CivicTreeCollection>(collectionId) ??
      ((
        await agent.appviewClient.call(com.para.collection.getCollection, {
          id: collectionId,
        })
      ).collection as CivicTreeCollection)
    const next = applyCollectionOp(base, op)
    if (next === base) return base
    try {
      await agent.appviewClient.call(com.para.collection.updateCollection, {
        id: collectionId,
        collection: toWire(next),
      } as com.para.collection.updateCollection.$InputBody)
    } catch (err) {
      // Unknown whether the write landed; trust a fresh read next time.
      forgetCollectionWrite(collectionId)
      throw err
    }
    rememberCollectionWrite(collectionId, next)
    return next
  })
}

export function useCollectionsQuery() {
  const agent = useAgent()
  return useQuery<CivicTreeCollection[]>({
    queryKey: getListQueryKey(),
    queryFn: () => fetchAllCollections(agent),
    staleTime: STALE_TIME,
    gcTime: PERSISTED_QUERY_GCTIME,
  })
}

export function useCollectionQuery(id: string | undefined) {
  const agent = useAgent()
  const queryClient = useQueryClient()
  return useQuery<CivicTreeCollection>({
    queryKey: id ? getDetailQueryKey(id) : ['collections', 'get', 'disabled'],
    queryFn: async () => {
      if (!id) throw new Error('No collection id')
      const res = await agent.appviewClient.call(
        com.para.collection.getCollection,
        {id},
      )
      return res.collection as CivicTreeCollection
    },
    /*
     * Seed from the list so opening a collection from the tree is instant, and
     * so a collection just created (not yet readable by id) still renders.
     */
    initialData: () =>
      id
        ? queryClient
            .getQueryData<CivicTreeCollection[]>(getListQueryKey())
            ?.find(c => c.id === id)
        : undefined,
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(getListQueryKey())?.dataUpdatedAt,
    enabled: !!id && !isOptimisticCollectionId(id),
    staleTime: STALE_TIME,
    gcTime: PERSISTED_QUERY_GCTIME,
  })
}

// ─── Cache helpers ─────────────────────────────────────────────────────────

/**
 * What a mutation needs to undo itself. Rollback restores only the one
 * collection it touched; restoring the whole list would also erase any other
 * optimistic edit that landed while this one was in flight.
 */
interface CollectionSnapshot {
  detail: CivicTreeCollection | undefined
  entry: CivicTreeCollection | undefined
}

function snapshotCollection(
  queryClient: QueryClient,
  id: string,
): CollectionSnapshot {
  return {
    detail: queryClient.getQueryData<CivicTreeCollection>(
      getDetailQueryKey(id),
    ),
    entry: queryClient
      .getQueryData<CivicTreeCollection[]>(getListQueryKey())
      ?.find(c => c.id === id),
  }
}

function writeCollectionToCaches(
  queryClient: QueryClient,
  id: string,
  next: CivicTreeCollection,
) {
  queryClient.setQueryData<CivicTreeCollection>(getDetailQueryKey(id), next)
  queryClient.setQueryData<CivicTreeCollection[]>(getListQueryKey(), old =>
    old?.map(c => (c.id === id ? next : c)),
  )
}

function restoreCollection(
  queryClient: QueryClient,
  id: string,
  snapshot: CollectionSnapshot | undefined,
) {
  if (!snapshot) return
  if (snapshot.detail) {
    queryClient.setQueryData(getDetailQueryKey(id), snapshot.detail)
  }
  if (snapshot.entry) {
    const entry = snapshot.entry
    queryClient.setQueryData<CivicTreeCollection[]>(getListQueryKey(), old =>
      old?.map(c => (c.id === id ? entry : c)),
    )
  }
}

/**
 * Marks the collection stale without refetching it now. An immediate refetch
 * can read a model that has not caught up with the write and overwrite the
 * correct optimistic state with the old one, which is how edits used to flicker
 * away. The next mount or focus picks up server truth.
 */
export function markCollectionsStale(queryClient: QueryClient, id?: string) {
  void queryClient.invalidateQueries({
    queryKey: getListQueryKey(),
    refetchType: 'none',
  })
  if (id) {
    void queryClient.invalidateQueries({
      queryKey: getDetailQueryKey(id),
      refetchType: 'none',
    })
  }
}

function toWire(c: CivicTreeCollection) {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    color: c.color,
    items: c.items,
    relations: c.relations || [],
  }
}

// ─── Mutations ─────────────────────────────────────────────────────────────

interface CreateContext {
  optimisticId: string
}

export function useCreateCollectionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    {id: string},
    Error,
    {name: string; description?: string; color?: string},
    CreateContext
  >({
    mutationFn: async input => {
      const res = await agent.appviewClient.call(
        com.para.collection.createCollection,
        input,
      )
      return res
    },
    onMutate: async input => {
      await queryClient.cancelQueries({queryKey: getListQueryKey()})
      const now = new Date().toISOString()
      const optimisticId = `${OPTIMISTIC_PREFIX}${Date.now()}`
      const optimistic: CivicTreeCollection = {
        id: optimisticId,
        name: input.name,
        description: input.description,
        color: input.color,
        items: [],
        relations: [],
        createdAt: now,
        updatedAt: now,
      }
      queryClient.setQueryData<CivicTreeCollection[]>(getListQueryKey(), old =>
        old ? [optimistic, ...old] : [optimistic],
      )
      return {optimisticId}
    },
    onSuccess: (data, _input, context) => {
      /*
       * Swap the placeholder for the real id right away, and seed the detail
       * cache, so nothing downstream ever holds a fake id after the create has
       * succeeded.
       */
      queryClient.setQueryData<CivicTreeCollection[]>(getListQueryKey(), old =>
        old?.map(c =>
          c.id === context?.optimisticId ? {...c, id: data.id} : c,
        ),
      )
      const created = queryClient
        .getQueryData<CivicTreeCollection[]>(getListQueryKey())
        ?.find(c => c.id === data.id)
      if (created) {
        queryClient.setQueryData(getDetailQueryKey(data.id), created)
        /*
         * The read model may not have indexed the new collection yet. Seed the
         * write base so the first edit does not depend on reading it back.
         */
        rememberCollectionWrite(data.id, created)
      }
      markCollectionsStale(queryClient)
    },
    onError: (_err, _input, context) => {
      queryClient.setQueryData<CivicTreeCollection[]>(getListQueryKey(), old =>
        old?.filter(c => c.id !== context?.optimisticId),
      )
    },
  })
}

interface OpContext {
  snapshot: CollectionSnapshot
}

/**
 * One write path for every edit to a collection's contents.
 *
 * The edit is an operation applied to the freshest copy available - the
 * collection this device wrote last, else a fresh read - and writes to one
 * collection run one at a time. See collection-write-queue for why.
 */
function useCollectionOpMutation<V>(toInput: (vars: V) => CollectionOpInput) {
  const queryClient = useQueryClient()
  const agent = useAgent()

  return useMutation<CivicTreeCollection | undefined, Error, V, OpContext>({
    mutationFn: vars => {
      const {collectionId, op} = toInput(vars)
      return writeCollectionOp(agent, collectionId, op)
    },
    onMutate: async vars => {
      const {collectionId, op} = toInput(vars)
      await queryClient.cancelQueries({
        queryKey: getDetailQueryKey(collectionId),
      })
      await queryClient.cancelQueries({queryKey: getListQueryKey()})
      const snapshot = snapshotCollection(queryClient, collectionId)
      const current = snapshot.detail ?? snapshot.entry
      if (current) {
        writeCollectionToCaches(queryClient, collectionId, {
          ...applyCollectionOp(current, op),
          updatedAt: new Date().toISOString(),
        })
      }
      return {snapshot}
    },
    onError: (_err, vars, context) => {
      restoreCollection(
        queryClient,
        toInput(vars).collectionId,
        context?.snapshot,
      )
    },
    onSuccess: (written, vars) => {
      const {collectionId} = toInput(vars)
      /*
       * Only the last write in a burst reconciles the cache; an earlier one
       * would overwrite newer optimistic state with its own older result.
       */
      if (written && !hasPendingCollectionWrite(collectionId)) {
        writeCollectionToCaches(queryClient, collectionId, {
          ...written,
          updatedAt: new Date().toISOString(),
        })
      }
    },
    onSettled: (_data, _err, vars) => {
      markCollectionsStale(queryClient, toInput(vars).collectionId)
    },
  })
}

export interface CollectionOpInput {
  collectionId: string
  op: CollectionOp
}

/** Applies any {@link CollectionOp}; the specific hooks below are sugar. */
export function useApplyCollectionOpMutation() {
  return useCollectionOpMutation<CollectionOpInput>(input => input)
}

export function useAddToCollectionMutation() {
  return useCollectionOpMutation<{
    collectionId: string
    item: CivicTreeItem
    /** Ignored: duplicates are detected against the freshest copy. */
    existingItems?: CivicTreeItem[]
  }>(({collectionId, item}) => ({collectionId, op: {type: 'addItem', item}}))
}

export function useRemoveFromCollectionMutation() {
  return useCollectionOpMutation<{collectionId: string; itemKey: string}>(
    ({collectionId, itemKey}) => ({
      collectionId,
      op: {type: 'removeItem', itemKey},
    }),
  )
}

export function useAddCivicTreeRelationMutation() {
  return useCollectionOpMutation<{
    collectionId: string
    relation: CivicTreeRelation
  }>(({collectionId, relation}) => ({
    collectionId,
    op: {type: 'addRelation', relation},
  }))
}

export function useRemoveCivicTreeRelationMutation() {
  return useCollectionOpMutation<{collectionId: string; relationId: string}>(
    ({collectionId, relationId}) => ({
      collectionId,
      op: {type: 'removeRelation', relationId},
    }),
  )
}

/**
 * Replaces a whole collection. Prefer {@link useApplyCollectionOpMutation}:
 * this sends back exactly what the caller holds, so it can erase newer edits.
 * Kept for callers that genuinely reorder or rewrite every item.
 */
export function useUpdateCollectionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    void,
    Error,
    {id: string; collection: CivicTreeCollectionInput},
    OpContext
  >({
    mutationFn: ({id, collection}) => {
      if (isOptimisticCollectionId(id)) {
        return Promise.reject(new Error(NOT_READY_MESSAGE))
      }
      return enqueueCollectionWrite(id, async () => {
        try {
          await agent.appviewClient.call(com.para.collection.updateCollection, {
            id,
            collection,
          } as com.para.collection.updateCollection.$InputBody)
        } catch (err) {
          forgetCollectionWrite(id)
          throw err
        }
        const current = queryClient.getQueryData<CivicTreeCollection>(
          getDetailQueryKey(id),
        )
        rememberCollectionWrite(id, {
          ...(current ?? {createdAt: '', updatedAt: ''}),
          ...collection,
          relations: collection.relations ?? [],
        })
      })
    },
    onMutate: async ({id, collection}) => {
      await queryClient.cancelQueries({queryKey: getDetailQueryKey(id)})
      await queryClient.cancelQueries({queryKey: getListQueryKey()})
      const snapshot = snapshotCollection(queryClient, id)
      const now = new Date().toISOString()
      writeCollectionToCaches(queryClient, id, {
        createdAt: now,
        ...(snapshot.detail ?? snapshot.entry),
        ...collection,
        relations: collection.relations ?? [],
        updatedAt: now,
      })
      return {snapshot}
    },
    onError: (_err, {id}, context) => {
      restoreCollection(queryClient, id, context?.snapshot)
    },
    onSettled: (_data, _err, {id}) => {
      markCollectionsStale(queryClient, id)
    },
  })
}

export function useDeleteCollectionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    void,
    Error,
    {id: string},
    {removed: CivicTreeCollection | undefined; index: number}
  >({
    mutationFn: ({id}) => {
      if (isOptimisticCollectionId(id)) {
        return Promise.reject(new Error(NOT_READY_MESSAGE))
      }
      return enqueueCollectionWrite(id, async () => {
        await agent.appviewClient.call(com.para.collection.deleteCollection, {
          id,
        })
        forgetCollectionWrite(id)
      })
    },
    onMutate: async ({id}) => {
      await queryClient.cancelQueries({queryKey: getListQueryKey()})
      const list =
        queryClient.getQueryData<CivicTreeCollection[]>(getListQueryKey())
      const index = list?.findIndex(c => c.id === id) ?? -1
      const removed = index >= 0 ? list?.[index] : undefined
      queryClient.setQueryData<CivicTreeCollection[]>(getListQueryKey(), old =>
        old?.filter(c => c.id !== id),
      )
      return {removed, index}
    },
    onError: (_err, _vars, context) => {
      const removed = context?.removed
      if (!removed) return
      queryClient.setQueryData<CivicTreeCollection[]>(
        getListQueryKey(),
        old => {
          if (!old || old.some(c => c.id === removed.id)) return old
          const next = [...old]
          next.splice(Math.min(context.index, next.length), 0, removed)
          return next
        },
      )
    },
    onSettled: () => {
      markCollectionsStale(queryClient)
    },
  })
}

interface CivicTreeCollectionInput {
  id: string
  name: string
  description?: string
  color?: string
  items: CivicTreeItem[]
  relations?: CivicTreeRelation[]
}
