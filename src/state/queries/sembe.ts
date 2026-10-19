import {type AtIdentifierString, AtUri} from '@atproto/syntax'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {useAgent, useSession} from '#/state/session'
import {
  type SembleConnectionEnd,
  type SembleExportCard,
  type SembleExportPlan,
} from '#/features/civicTree/sembleExport'
import {
  parseSembleLibrary,
  reconcileSembleExport,
  type RepoRecord,
  SEMBLE_COLLECTIONS,
  type SembleLibrary,
  type StrongRef,
} from '#/features/civicTree/sembleLibrary'
import {com} from '#/lexicons'

/*
 * Writes a Semble export to the user's repo. What to publish is decided by
 * `planSembleExport`; what of that is already there is decided by
 * `reconcileSembleExport` against the user's own records. This only turns the
 * result into writes.
 */

type Agent = ReturnType<typeof useAgent>

/** Pages of 100 per record type: enough for 5,000 of each. */
const MAX_LIBRARY_PAGES = 50

const RQKEY_ROOT = 'semble-library'
// Viewer-dependent, so the cache is partitioned by DID.
const libraryQueryKey = (did: string | undefined) => [RQKEY_ROOT, did ?? '']

async function listAll(
  agent: Agent,
  did: string,
  collection: string,
): Promise<{records: RepoRecord[]; truncated: boolean}> {
  const records: RepoRecord[] = []
  let cursor: string | undefined
  for (let page = 0; page < MAX_LIBRARY_PAGES; page++) {
    const res = await agent.pdsClient.call(com.atproto.repo.listRecords, {
      repo: did as AtIdentifierString,
      collection: collection as `${string}.${string}.${string}`,
      limit: 100,
      cursor,
    })
    for (const r of res.records) {
      records.push({uri: r.uri, cid: r.cid, value: r.value})
    }
    cursor = res.cursor
    if (!cursor) return {records, truncated: false}
  }
  return {records, truncated: true}
}

/** Everything the user has published to Semble, read from their own repo. */
export async function fetchSembleLibrary(
  agent: Agent,
  did: string,
): Promise<SembleLibrary> {
  const [collections, cards, links, connections] = await Promise.all([
    listAll(agent, did, SEMBLE_COLLECTIONS.collection),
    listAll(agent, did, SEMBLE_COLLECTIONS.card),
    listAll(agent, did, SEMBLE_COLLECTIONS.collectionLink),
    listAll(agent, did, SEMBLE_COLLECTIONS.connection),
  ])
  return parseSembleLibrary({
    collections: collections.records,
    cards: cards.records,
    links: links.records,
    connections: connections.records,
    truncated:
      collections.truncated ||
      cards.truncated ||
      links.truncated ||
      connections.truncated,
  })
}

/** For the export preview. The export itself reads again before writing. */
export function useSembleLibraryQuery({enabled}: {enabled: boolean}) {
  const agent = useAgent()
  const {currentAccount} = useSession()
  const did = currentAccount?.did

  return useQuery({
    queryKey: libraryQueryKey(did),
    enabled: enabled && !!did,
    staleTime: 30 * 1000,
    queryFn: () => fetchSembleLibrary(agent, did!),
  })
}

/** The PDS refuses more than this many writes in one applyWrites call. */
const MAX_WRITES_PER_BATCH = 200

type Pending = {
  collection: string
  value: Record<string, unknown>
  onCreated?: (ref: StrongRef) => void
}

/**
 * Creates records with as few requests as the PDS allows, reporting each
 * new record's reference back in order.
 */
async function applyCreates(
  agent: Agent,
  repo: AtIdentifierString,
  pending: Pending[],
) {
  for (let i = 0; i < pending.length; i += MAX_WRITES_PER_BATCH) {
    const chunk = pending.slice(i, i + MAX_WRITES_PER_BATCH)
    const res = await agent.pdsClient.call(com.atproto.repo.applyWrites, {
      repo,
      writes: chunk.map(p => ({
        $type: 'com.atproto.repo.applyWrites#create' as const,
        collection: p.collection as `${string}.${string}.${string}`,
        value:
          p.value as unknown as com.atproto.repo.applyWrites.Create['value'],
      })),
    })
    const results = res.results ?? []
    if (results.length !== chunk.length) {
      throw new Error('The PDS did not report the records it created')
    }
    chunk.forEach((p, j) => {
      const r = results[j] as {uri?: string; cid?: string}
      if (!r.uri || !r.cid) {
        throw new Error('The PDS did not report the records it created')
      }
      p.onCreated?.({uri: r.uri, cid: r.cid})
    })
  }
}

function cardValue(
  card: SembleExportCard,
  parentRef: StrongRef | undefined,
  now: string,
): Record<string, unknown> {
  return card.type === 'URL'
    ? {
        $type: SEMBLE_COLLECTIONS.card,
        type: 'URL',
        url: card.url,
        content: {
          $type: 'network.cosmik.card#urlContent',
          url: card.url,
          metadata: {
            $type: 'network.cosmik.card#urlMetadata',
            title: card.title,
            author: card.author,
          },
        },
        createdAt: now,
      }
    : {
        $type: SEMBLE_COLLECTIONS.card,
        type: 'NOTE',
        content: {
          $type: 'network.cosmik.card#noteContent',
          text: card.text,
        },
        parentCard: parentRef,
        createdAt: now,
      }
}

export interface SembleExportResult {
  collectionUri: string
  createdCollection: boolean
  newCards: number
  newConnections: number
}

/**
 * Publishes a plan to the user's repo, adding only what is not there yet.
 * Separate from the hook so the write sequence can be tested on its own.
 */
export async function exportPlanToSemble(
  agent: Agent,
  did: string,
  plan: SembleExportPlan,
): Promise<SembleExportResult> {
  const repo = did as AtIdentifierString

  /*
   * Read fresh rather than trusting the preview's copy: another device
   * may have exported since. If the read fails, so does the export -
   * writing blind is exactly what produced the duplicates.
   */
  const library = await fetchSembleLibrary(agent, did)
  const actions = reconcileSembleExport(plan, library)

  const now = new Date().toISOString()

  // 1. An existing collection whose description changed is rewritten
  //    on its own, guarded by swapRecord against a concurrent edit.
  let collectionRef: StrongRef | undefined
  if (actions.collection) {
    collectionRef = {
      uri: actions.collection.uri,
      cid: actions.collection.cid,
    }
    if (actions.description !== undefined) {
      const res = await agent.pdsClient.call(com.atproto.repo.putRecord, {
        repo,
        collection: SEMBLE_COLLECTIONS.collection,
        rkey: new AtUri(actions.collection.uri).rkey,
        record: {
          ...actions.collection.value,
          $type: SEMBLE_COLLECTIONS.collection,
          description: actions.description,
          updatedAt: now,
        },
        swapRecord: actions.collection.cid,
      })
      collectionRef = {uri: res.uri, cid: res.cid}
    }
  }

  const cardRefs = new Map<string, StrongRef>()
  for (const {card, existing} of actions.cards) {
    if (existing) cardRefs.set(card.itemKey, existing)
  }

  /*
   * Three batches, in dependency order. Records point at each other by
   * strong reference, and a CID is only known once the PDS has written
   * the record, so each batch waits for the one before. Within a batch the
   * writes are atomic; between batches, a failure leaves records the next
   * export recognises and completes.
   */

  // 2. The new collection, if any, and every new card with no parent
  const batchA: Pending[] = []
  if (!collectionRef) {
    batchA.push({
      collection: SEMBLE_COLLECTIONS.collection,
      value: {
        $type: SEMBLE_COLLECTIONS.collection,
        name: plan.collection.name,
        description: plan.collection.description,
        accessType: 'OPEN',
        createdAt: now,
        updatedAt: now,
      },
      onCreated: ref => {
        collectionRef = ref
      },
    })
  }
  for (const {card, existing} of actions.cards) {
    if (existing || (card.type === 'NOTE' && card.parentItemKey)) continue
    batchA.push({
      collection: SEMBLE_COLLECTIONS.card,
      value: cardValue(card, undefined, now),
      onCreated: ref => cardRefs.set(card.itemKey, ref),
    })
  }
  await applyCreates(agent, repo, batchA)

  // 3. New notes, which need their parent card's reference
  const batchB: Pending[] = []
  for (const {card, existing} of actions.cards) {
    if (existing || card.type !== 'NOTE' || !card.parentItemKey) continue
    const parentRef = cardRefs.get(card.parentItemKey)
    if (!parentRef) continue
    batchB.push({
      collection: SEMBLE_COLLECTIONS.card,
      value: cardValue(card, parentRef, now),
      onCreated: ref => cardRefs.set(card.itemKey, ref),
    })
  }
  await applyCreates(agent, repo, batchB)

  if (!collectionRef) throw new Error('Semble collection was not created')
  const collection = collectionRef

  // 4. Links into the collection, and connections
  const batchC: Pending[] = []
  for (const {card, link} of actions.cards) {
    const cardRef = cardRefs.get(card.itemKey)
    if (!link || !cardRef) continue
    batchC.push({
      collection: SEMBLE_COLLECTIONS.collectionLink,
      value: {
        $type: SEMBLE_COLLECTIONS.collectionLink,
        collection,
        card: cardRef,
        addedBy: did,
        addedAt: now,
        createdAt: now,
      },
    })
  }
  const endValue = (end: SembleConnectionEnd) =>
    end.url ?? cardRefs.get(end.itemKey)?.uri
  for (const connection of actions.connections) {
    const source = endValue(connection.from)
    const target = endValue(connection.to)
    if (!source || !target) continue
    batchC.push({
      collection: SEMBLE_COLLECTIONS.connection,
      value: {
        $type: SEMBLE_COLLECTIONS.connection,
        source,
        target,
        connectionType: connection.connectionType,
        note: connection.note,
        createdAt: now,
        updatedAt: now,
      },
    })
  }
  await applyCreates(agent, repo, batchC)

  return {
    collectionUri: collection.uri,
    createdCollection: !actions.collection,
    newCards: actions.counts.newCards,
    newConnections: actions.counts.newConnections,
  }
}

export function useExportCollectionToSembleMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()

  return useMutation<SembleExportResult, Error, {plan: SembleExportPlan}>({
    mutationFn: async ({plan}) => {
      const did = currentAccount?.did
      if (!did) throw new Error('Not authenticated')
      if (!agent.session) throw new Error('Agent not authenticated')
      return exportPlanToSemble(agent, did, plan)
    },
    /*
     * Settle on failure too: a partial export wrote some records, and the
     * next preview must see them so a retry only adds the rest.
     */
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: libraryQueryKey(currentAccount?.did),
      })
    },
  })
}
