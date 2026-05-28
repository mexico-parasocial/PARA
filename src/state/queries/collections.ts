import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  PERSISTED_QUERY_GCTIME,
  PERSISTED_QUERY_ROOT,
} from '#/state/queries/index'
import {useAgent} from '#/state/session'
import {
  type CivicTreeItem,
  type CivicTreeRelation,
  getCivicTreeItemKey,
} from './collection-items'

export type {
  CivicTreeItem,
  CivicTreeRelation,
} from './collection-items'
export {
  createCivicTreeItemId,
  createCivicTreeRelationId,
  getCivicTreeItemKey,
  getCivicTreeItemKind,
  getCivicTreeItemTitle,
} from './collection-items'

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

function getListQueryKey(): [string, string, string] {
  return [PERSISTED_QUERY_ROOT, RQKEY_ROOT, 'list']
}

function getDetailQueryKey(id: string): [string, string, string, string] {
  return [PERSISTED_QUERY_ROOT, RQKEY_ROOT, 'get', id]
}

export function useCollectionsQuery() {
  const agent = useAgent()
  return useQuery<CivicTreeCollection[]>({
    queryKey: getListQueryKey(),
    queryFn: async () => {
      const res = await agent.call('com.para.collection.listCollections', {})
      return (res.data.collections || []) as CivicTreeCollection[]
    },
    staleTime: STALE_TIME,
    gcTime: PERSISTED_QUERY_GCTIME,
  })
}

export function useCollectionQuery(id: string | undefined) {
  const agent = useAgent()
  return useQuery<CivicTreeCollection>({
    queryKey: id ? getDetailQueryKey(id) : ['collections', 'get', 'disabled'],
    queryFn: async () => {
      if (!id) throw new Error('No collection id')
      const res = await agent.call('com.para.collection.getCollection', {
        id,
      })
      return res.data.collection as CivicTreeCollection
    },
    enabled: !!id,
    staleTime: STALE_TIME,
    gcTime: PERSISTED_QUERY_GCTIME,
  })
}

interface ListContext {
  previousList: CivicTreeCollection[] | undefined
}

interface DetailListContext {
  previousDetail: CivicTreeCollection | undefined
  previousList: CivicTreeCollection[] | undefined
}

export function useCreateCollectionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    {id: string},
    Error,
    {name: string; description?: string; color?: string},
    ListContext
  >({
    mutationFn: async input => {
      const res = await agent.call(
        'com.para.collection.createCollection',
        undefined,
        input,
      )
      return res.data as {id: string}
    },
    onMutate: async input => {
      await queryClient.cancelQueries({queryKey: getListQueryKey()})
      const previousList = queryClient.getQueryData<CivicTreeCollection[]>(
        getListQueryKey(),
      )
      const optimisticCollection: CivicTreeCollection = {
        id: `optimistic-${Date.now()}`,
        name: input.name,
        description: input.description,
        color: input.color,
        items: [],
        relations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      queryClient.setQueryData<CivicTreeCollection[]>(
        getListQueryKey(),
        old => (old ? [optimisticCollection, ...old] : [optimisticCollection]),
      )
      return {previousList}
    },
    onError: (_err, _variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(getListQueryKey(), context.previousList)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: getListQueryKey()})
    },
  })
}

export function useUpdateCollectionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    void,
    Error,
    {id: string; collection: CivicTreeCollectionInput},
    DetailListContext
  >({
    mutationFn: async input => {
      await agent.call(
        'com.para.collection.updateCollection',
        undefined,
        input,
      )
    },
    onMutate: async input => {
      const detailKey = getDetailQueryKey(input.id)
      const listKey = getListQueryKey()
      await queryClient.cancelQueries({queryKey: detailKey})
      await queryClient.cancelQueries({queryKey: listKey})

      const previousDetail = queryClient.getQueryData<CivicTreeCollection>(
        detailKey,
      )
      const previousList = queryClient.getQueryData<CivicTreeCollection[]>(
        listKey,
      )

      const optimisticCollection: CivicTreeCollection = {
        ...(previousDetail ?? {
          id: input.id,
          name: input.collection.name,
          description: input.collection.description,
          color: input.collection.color,
          items: input.collection.items,
          relations: input.collection.relations ?? [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
        ...input.collection,
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData<CivicTreeCollection>(detailKey, optimisticCollection)
      queryClient.setQueryData<CivicTreeCollection[]>(listKey, old =>
        old
          ? old.map(c => (c.id === input.id ? optimisticCollection : c))
          : old,
      )

      return {previousDetail, previousList}
    },
    onError: (_err, variables, context) => {
      const detailKey = getDetailQueryKey(variables.id)
      if (context?.previousDetail) {
        queryClient.setQueryData(detailKey, context.previousDetail)
      }
      if (context?.previousList) {
        queryClient.setQueryData(getListQueryKey(), context.previousList)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({queryKey: getListQueryKey()})
      queryClient.invalidateQueries({
        queryKey: getDetailQueryKey(variables.id),
      })
    },
  })
}

export function useDeleteCollectionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<void, Error, {id: string}, ListContext>({
    mutationFn: async input => {
      await agent.call(
        'com.para.collection.deleteCollection',
        undefined,
        input,
      )
    },
    onMutate: async input => {
      await queryClient.cancelQueries({queryKey: getListQueryKey()})
      const previousList = queryClient.getQueryData<CivicTreeCollection[]>(
        getListQueryKey(),
      )
      queryClient.setQueryData<CivicTreeCollection[]>(
        getListQueryKey(),
        old => (old ? old.filter(c => c.id !== input.id) : old),
      )
      return {previousList}
    },
    onError: (_err, _variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(getListQueryKey(), context.previousList)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: getListQueryKey()})
    },
  })
}

export function useDuplicateCollectionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    {id: string},
    Error,
    {sourceId: string; newName: string},
    ListContext
  >({
    mutationFn: async input => {
      const {sourceId, newName} = input
      const {data} = await agent.call('com.para.collection.getCollection', {
        id: sourceId,
      })
      const source = data.collection
      if (!source) throw new Error('Source collection not found')
      const res = await agent.call(
        'com.para.collection.createCollection',
        undefined,
        {
          name: newName,
          description: source.description,
          color: source.color,
        },
      )
      const newId = (res.data as {id: string}).id
      if (source.items.length > 0 || (source.relations || []).length > 0) {
        await agent.call(
          'com.para.collection.updateCollection',
          undefined,
          {
            id: newId,
            collection: {
              id: newId,
              name: newName,
              description: source.description,
              color: source.color,
              items: source.items,
              relations: source.relations || [],
            },
          },
        )
      }
      return {id: newId}
    },
    onMutate: async input => {
      await queryClient.cancelQueries({queryKey: getListQueryKey()})
      const previousList = queryClient.getQueryData<CivicTreeCollection[]>(
        getListQueryKey(),
      )
      const source = previousList?.find(c => c.id === input.sourceId)
      const optimisticCollection: CivicTreeCollection = {
        id: `optimistic-${Date.now()}`,
        name: input.newName,
        description: source?.description,
        color: source?.color,
        items: source?.items ?? [],
        relations: source?.relations ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      queryClient.setQueryData<CivicTreeCollection[]>(
        getListQueryKey(),
        old => (old ? [optimisticCollection, ...old] : [optimisticCollection]),
      )
      return {previousList}
    },
    onError: (_err, _variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(getListQueryKey(), context.previousList)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({queryKey: getListQueryKey()})
    },
  })
}

export function useAddToCollectionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    void,
    Error,
    {collectionId: string; item: CivicTreeItem; existingItems: CivicTreeItem[]},
    DetailListContext
  >({
    mutationFn: async input => {
      const {collectionId, item, existingItems} = input
      // Avoid duplicates
      const itemKey = getCivicTreeItemKey(item)
      if (existingItems.some(i => getCivicTreeItemKey(i) === itemKey)) {
        return
      }
      const collection = await agent.call(
        'com.para.collection.getCollection',
        {id: collectionId},
      )
      const view = collection.data.collection as CivicTreeCollection
      await agent.call(
        'com.para.collection.updateCollection',
        undefined,
        {
          id: collectionId,
          collection: {
            id: view.id,
            name: view.name,
            description: view.description,
            color: view.color,
            items: [...view.items, item],
            relations: view.relations || [],
          },
        },
      )
    },
    onMutate: async input => {
      const detailKey = getDetailQueryKey(input.collectionId)
      const listKey = getListQueryKey()
      await queryClient.cancelQueries({queryKey: detailKey})
      await queryClient.cancelQueries({queryKey: listKey})

      const previousDetail = queryClient.getQueryData<CivicTreeCollection>(
        detailKey,
      )
      const previousList = queryClient.getQueryData<CivicTreeCollection[]>(
        listKey,
      )

      const itemKey = getCivicTreeItemKey(input.item)
      const shouldAdd = !input.existingItems.some(
        i => getCivicTreeItemKey(i) === itemKey,
      )

      if (!shouldAdd) return {previousDetail, previousList}

      const updater = (old: CivicTreeCollection | undefined) => {
        if (!old) return old
        return {
          ...old,
          items: [...old.items, input.item],
          updatedAt: new Date().toISOString(),
        }
      }

      queryClient.setQueryData<CivicTreeCollection>(detailKey, updater)
      queryClient.setQueryData<CivicTreeCollection[]>(
        listKey,
        old =>
          old?.map(c => (c.id === input.collectionId ? updater(c)! : c)) ?? old,
      )

      return {previousDetail, previousList}
    },
    onError: (_err, variables, context) => {
      const detailKey = getDetailQueryKey(variables.collectionId)
      if (context?.previousDetail) {
        queryClient.setQueryData(detailKey, context.previousDetail)
      }
      if (context?.previousList) {
        queryClient.setQueryData(getListQueryKey(), context.previousList)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({queryKey: getListQueryKey()})
      queryClient.invalidateQueries({
        queryKey: getDetailQueryKey(variables.collectionId),
      })
    },
  })
}

export function useRemoveFromCollectionMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    void,
    Error,
    {collectionId: string; itemKey: string},
    DetailListContext
  >({
    mutationFn: async input => {
      const {collectionId, itemKey} = input
      const collection = await agent.call(
        'com.para.collection.getCollection',
        {id: collectionId},
      )
      const view = collection.data.collection as CivicTreeCollection
      await agent.call(
        'com.para.collection.updateCollection',
        undefined,
        {
          id: collectionId,
          collection: {
            id: view.id,
            name: view.name,
            description: view.description,
            color: view.color,
            items: view.items.filter(i => getCivicTreeItemKey(i) !== itemKey),
            relations: (view.relations || []).filter(
              relation =>
                relation.fromItemId !== itemKey &&
                relation.toItemId !== itemKey,
            ),
          },
        },
      )
    },
    onMutate: async input => {
      const detailKey = getDetailQueryKey(input.collectionId)
      const listKey = getListQueryKey()
      await queryClient.cancelQueries({queryKey: detailKey})
      await queryClient.cancelQueries({queryKey: listKey})

      const previousDetail = queryClient.getQueryData<CivicTreeCollection>(
        detailKey,
      )
      const previousList = queryClient.getQueryData<CivicTreeCollection[]>(
        listKey,
      )

      const updater = (old: CivicTreeCollection | undefined) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.filter(i => getCivicTreeItemKey(i) !== input.itemKey),
          relations: (old.relations || []).filter(
            relation =>
              relation.fromItemId !== input.itemKey &&
              relation.toItemId !== input.itemKey,
          ),
          updatedAt: new Date().toISOString(),
        }
      }

      queryClient.setQueryData<CivicTreeCollection>(detailKey, updater)
      queryClient.setQueryData<CivicTreeCollection[]>(
        listKey,
        old =>
          old?.map(c => (c.id === input.collectionId ? updater(c)! : c)) ?? old,
      )

      return {previousDetail, previousList}
    },
    onError: (_err, variables, context) => {
      const detailKey = getDetailQueryKey(variables.collectionId)
      if (context?.previousDetail) {
        queryClient.setQueryData(detailKey, context.previousDetail)
      }
      if (context?.previousList) {
        queryClient.setQueryData(getListQueryKey(), context.previousList)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({queryKey: getListQueryKey()})
      queryClient.invalidateQueries({
        queryKey: getDetailQueryKey(variables.collectionId),
      })
    },
  })
}

export function useAddCivicTreeRelationMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    void,
    Error,
    {collectionId: string; relation: CivicTreeRelation},
    DetailListContext
  >({
    mutationFn: async input => {
      const {collectionId, relation} = input
      const collection = await agent.call(
        'com.para.collection.getCollection',
        {id: collectionId},
      )
      const view = collection.data.collection as CivicTreeCollection
      const relations = view.relations || []
      if (relations.some(existing => existing.id === relation.id)) {
        return
      }
      await agent.call(
        'com.para.collection.updateCollection',
        undefined,
        {
          id: collectionId,
          collection: {
            id: view.id,
            name: view.name,
            description: view.description,
            color: view.color,
            items: view.items,
            relations: [...relations, relation],
          },
        },
      )
    },
    onMutate: async input => {
      const detailKey = getDetailQueryKey(input.collectionId)
      const listKey = getListQueryKey()
      await queryClient.cancelQueries({queryKey: detailKey})
      await queryClient.cancelQueries({queryKey: listKey})

      const previousDetail = queryClient.getQueryData<CivicTreeCollection>(
        detailKey,
      )
      const previousList = queryClient.getQueryData<CivicTreeCollection[]>(
        listKey,
      )

      const updater = (old: CivicTreeCollection | undefined) => {
        if (!old) return old
        if ((old.relations || []).some(r => r.id === input.relation.id)) {
          return old
        }
        return {
          ...old,
          relations: [...(old.relations || []), input.relation],
          updatedAt: new Date().toISOString(),
        }
      }

      queryClient.setQueryData<CivicTreeCollection>(detailKey, updater)
      queryClient.setQueryData<CivicTreeCollection[]>(
        listKey,
        old =>
          old?.map(c => (c.id === input.collectionId ? updater(c)! : c)) ?? old,
      )

      return {previousDetail, previousList}
    },
    onError: (_err, variables, context) => {
      const detailKey = getDetailQueryKey(variables.collectionId)
      if (context?.previousDetail) {
        queryClient.setQueryData(detailKey, context.previousDetail)
      }
      if (context?.previousList) {
        queryClient.setQueryData(getListQueryKey(), context.previousList)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({queryKey: getListQueryKey()})
      queryClient.invalidateQueries({
        queryKey: getDetailQueryKey(variables.collectionId),
      })
    },
  })
}

export function useRemoveCivicTreeRelationMutation() {
  const queryClient = useQueryClient()
  const agent = useAgent()
  return useMutation<
    void,
    Error,
    {collectionId: string; relationId: string},
    DetailListContext
  >({
    mutationFn: async input => {
      const {collectionId, relationId} = input
      const collection = await agent.call(
        'com.para.collection.getCollection',
        {id: collectionId},
      )
      const view = collection.data.collection as CivicTreeCollection
      await agent.call(
        'com.para.collection.updateCollection',
        undefined,
        {
          id: collectionId,
          collection: {
            id: view.id,
            name: view.name,
            description: view.description,
            color: view.color,
            items: view.items,
            relations: (view.relations || []).filter(
              relation => relation.id !== relationId,
            ),
          },
        },
      )
    },
    onMutate: async input => {
      const detailKey = getDetailQueryKey(input.collectionId)
      const listKey = getListQueryKey()
      await queryClient.cancelQueries({queryKey: detailKey})
      await queryClient.cancelQueries({queryKey: listKey})

      const previousDetail = queryClient.getQueryData<CivicTreeCollection>(
        detailKey,
      )
      const previousList = queryClient.getQueryData<CivicTreeCollection[]>(
        listKey,
      )

      const updater = (old: CivicTreeCollection | undefined) => {
        if (!old) return old
        return {
          ...old,
          relations: (old.relations || []).filter(
            relation => relation.id !== input.relationId,
          ),
          updatedAt: new Date().toISOString(),
        }
      }

      queryClient.setQueryData<CivicTreeCollection>(detailKey, updater)
      queryClient.setQueryData<CivicTreeCollection[]>(
        listKey,
        old =>
          old?.map(c => (c.id === input.collectionId ? updater(c)! : c)) ?? old,
      )

      return {previousDetail, previousList}
    },
    onError: (_err, variables, context) => {
      const detailKey = getDetailQueryKey(variables.collectionId)
      if (context?.previousDetail) {
        queryClient.setQueryData(detailKey, context.previousDetail)
      }
      if (context?.previousList) {
        queryClient.setQueryData(getListQueryKey(), context.previousList)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({queryKey: getListQueryKey()})
      queryClient.invalidateQueries({
        queryKey: getDetailQueryKey(variables.collectionId),
      })
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
