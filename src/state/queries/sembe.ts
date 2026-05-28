import {useMutation} from '@tanstack/react-query'

import {
  type CivicTreeCollection,
  type CivicTreeItem,
  getCivicTreeItemKey,
  getCivicTreeItemTitle,
} from '#/state/queries/collections'
import {useAgent, useSession} from '#/state/session'

type SembleConnectionType =
  | 'SUPPORTS'
  | 'OPPOSES'
  | 'RELATED'
  | 'ADDRESSES'
  | 'HELPFUL'
  | 'EXPLAINER'
  | 'LEADS_TO'
  | 'SUPPLEMENTS'

function mapRelationKindToConnectionType(
  kind: string,
): SembleConnectionType {
  switch (kind) {
    case 'supports':
    case 'evidence_for':
      return 'SUPPORTS'
    case 'opposes':
      return 'OPPOSES'
    case 'depends_on':
      return 'LEADS_TO'
    case 'context_for':
    case 'duplicates':
    case 'related_to':
    default:
      return 'RELATED'
  }
}

function getItemUrl(item: CivicTreeItem): string | undefined {
  return item.url || item.policyUri || item.sourceUri
}

function getItemNote(item: CivicTreeItem): string | undefined {
  return (
    item.note || item.description || item.title || item.policyTitle || undefined
  )
}

export interface SembleExportResult {
  collectionUri: string
  cardUris: string[]
  connectionUris: string[]
}

export function useExportCollectionToSembleMutation() {
  const agent = useAgent()
  const {currentAccount} = useSession()

  return useMutation<SembleExportResult, Error, {collection: CivicTreeCollection}>({
    mutationFn: async ({collection}) => {
      const did = currentAccount?.did
      if (!did) throw new Error('Not authenticated')
      if (!agent.session) throw new Error('Agent not authenticated')

      const now = new Date().toISOString()

      // 1. Create collection record
      const collectionRecord = {
        $type: 'network.cosmik.collection',
        name: collection.name,
        description: collection.description,
        accessType: 'OPEN',
        createdAt: now,
        updatedAt: now,
      }

      const collectionRes = await agent.com.atproto.repo.createRecord({
        repo: did,
        collection: 'network.cosmik.collection',
        record: collectionRecord,
      })

      const collectionRef: {uri: string; cid: string} = {
        uri: collectionRes.data.uri,
        cid: collectionRes.data.cid,
      }

      // 2. Create cards for each item that has a URL or note
      const cardUris: string[] = []
      const itemKeyToCardRef = new Map<
        string,
        {uri: string; cid: string}
      >()

      for (const item of collection.items) {
        const itemUrl = getItemUrl(item)
        const itemNote = getItemNote(item)
        const itemKey = getCivicTreeItemKey(item)

        if (!itemUrl && !itemNote) continue

        let cardRecord: Record<string, unknown>

        if (itemUrl) {
          cardRecord = {
            $type: 'network.cosmik.card',
            type: 'URL',
            url: itemUrl,
            content: {
              $type: 'network.cosmik.card#urlContent',
              url: itemUrl,
              metadata: {
                $type: 'network.cosmik.card#urlMetadata',
                title: getCivicTreeItemTitle(item) || undefined,
                description: item.description || undefined,
              },
            },
            createdAt: item.addedAt || now,
          }
        } else {
          cardRecord = {
            $type: 'network.cosmik.card',
            type: 'NOTE',
            content: {
              $type: 'network.cosmik.card#noteContent',
              text: itemNote || getCivicTreeItemTitle(item) || '',
            },
            createdAt: item.addedAt || now,
          }
        }

        const cardRes = await agent.com.atproto.repo.createRecord({
          repo: did,
          collection: 'network.cosmik.card',
          record: cardRecord,
        })

        const cardRef = {
          uri: cardRes.data.uri,
          cid: cardRes.data.cid,
        }

        itemKeyToCardRef.set(itemKey, cardRef)
        cardUris.push(cardRef.uri)

        // 3. Link card to collection
        await agent.com.atproto.repo.createRecord({
          repo: did,
          collection: 'network.cosmik.collectionLink',
          record: {
            $type: 'network.cosmik.collectionLink',
            collection: collectionRef,
            card: cardRef,
            addedBy: did,
            addedAt: item.addedAt || now,
            createdAt: now,
          },
        })
      }

      // 4. Create connections for relations
      const connectionUris: string[] = []
      const relations = collection.relations || []

      for (const relation of relations) {
        const fromItem = collection.items.find(
          i => getCivicTreeItemKey(i) === relation.fromItemId,
        )
        const toItem = collection.items.find(
          i => getCivicTreeItemKey(i) === relation.toItemId,
        )

        if (!fromItem || !toItem) continue

        const fromUrl = getItemUrl(fromItem)
        const toUrl = getItemUrl(toItem)

        if (!fromUrl || !toUrl) continue

        const connectionRes = await agent.com.atproto.repo.createRecord({
          repo: did,
          collection: 'network.cosmik.connection',
          record: {
            $type: 'network.cosmik.connection',
            source: fromUrl,
            target: toUrl,
            connectionType: mapRelationKindToConnectionType(relation.kind),
            note: relation.note,
            createdAt: relation.createdAt || now,
            updatedAt: now,
          },
        })

        connectionUris.push(connectionRes.data.uri)
      }

      return {
        collectionUri: collectionRef.uri,
        cardUris,
        connectionUris,
      }
    },
  })
}
