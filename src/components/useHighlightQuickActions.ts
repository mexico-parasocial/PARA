import {useCallback} from 'react'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import {rememberCollectionWrite} from '#/state/queries/collection-write-queue'
import {
  type CivicTreeCollection,
  type CivicTreeItem,
  createCivicTreeItemId,
  fetchAllCollections,
  markCollectionsStale,
  writeCollectionOp,
} from '#/state/queries/collections'
import {useAgent} from '#/state/session'
import {type HighlightActionPayload} from '#/components/HighlightOptionsModal'
import * as Toast from '#/components/Toast'
import {com} from '#/lexicons'

const HIGHLIGHT_COLLECTION_NAME = 'Highlighted Notes'

type PersistHighlight = (
  payload: HighlightActionPayload,
) => Promise<{id?: string; text?: string} | null>

export function useHighlightQuickActions({
  postUri,
  persistHighlight,
  onDone,
}: {
  postUri: string
  persistHighlight: PersistHighlight
  onDone: () => void
}) {
  const {_} = useLingui()
  const agent = useAgent()
  const queryClient = useQueryClient()

  const saveToCivicTree = useCallback(
    async (payload: HighlightActionPayload) => {
      try {
        const highlight = await persistHighlight(payload)
        const collection = await getHighlightCollection(agent)
        const item = buildCivicTreeItem(payload, postUri, highlight?.text)

        /*
         * Goes through the same serialised write path as the tree screens, so a
         * highlight saved while the tree is being edited cannot erase it, and
         * the cache is marked stale under the keys the queries actually use.
         */
        await writeCollectionOp(agent, collection.id, {type: 'addItem', item})
        markCollectionsStale(queryClient, collection.id)
        onDone()
        Toast.show(_(msg`Saved as a Civic Tree note`))
      } catch {
        Toast.show(_(msg`Failed to save to Civic Tree`), {type: 'error'})
      }
    },
    [_, agent, onDone, persistHighlight, postUri, queryClient],
  )

  return {saveToCivicTree}
}

/*
 * Find-or-create must not race with itself: two highlights saved back to back
 * both see "no collection yet" and would each create one. Share the lookup.
 */
let highlightCollectionLookup: Promise<CivicTreeCollection> | undefined

function getHighlightCollection(agent: ReturnType<typeof useAgent>) {
  if (!highlightCollectionLookup) {
    highlightCollectionLookup = findOrCreateHighlightCollection(agent).finally(
      () => {
        highlightCollectionLookup = undefined
      },
    )
  }
  return highlightCollectionLookup
}

async function findOrCreateHighlightCollection(
  agent: ReturnType<typeof useAgent>,
): Promise<CivicTreeCollection> {
  const collections = await fetchAllCollections(agent)
  const existing = collections.find(
    collection => collection.name === HIGHLIGHT_COLLECTION_NAME,
  )
  if (existing) return existing

  const created = await agent.appviewClient.call(
    com.para.collection.createCollection,
    {
      name: HIGHLIGHT_COLLECTION_NAME,
      description:
        'Highlighted civic notes with source text, compass color, and annotation context.',
      color: '#3B82F6',
    },
  )
  const collection: CivicTreeCollection = {
    id: created.id,
    name: HIGHLIGHT_COLLECTION_NAME,
    description:
      'Highlighted civic notes with source text, compass color, and annotation context.',
    color: '#3B82F6',
    items: [],
    relations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  // The read model may not have indexed it yet; base the first write on this.
  rememberCollectionWrite(collection.id, collection)
  return collection
}

function buildCivicTreeItem(
  payload: HighlightActionPayload,
  postUri: string,
  persistedText?: string,
): CivicTreeItem {
  const highlightText = payload.text || persistedText || ''
  const noteTitle = payload.note || highlightText || 'Highlighted civic note'
  const title =
    noteTitle.length > 72 ? `${noteTitle.slice(0, 69).trim()}...` : noteTitle
  const description = [
    highlightText ? `Highlighted text:\n${highlightText}` : undefined,
    `Compass position: ${payload.label}`,
    `Highlight color: ${payload.color}`,
    payload.note ? `Highlighter note:\n${payload.note}` : undefined,
    `Visibility selected: ${payload.isPublic ? 'public' : 'private'}`,
  ].filter(Boolean)

  return {
    itemId: createCivicTreeItemId(),
    kind: 'note',
    title,
    description: description.join('\n\n'),
    sourceUri: postUri,
    sourceLabel: 'Highlighted post',
    policyColor: payload.color,
    note: payload.note,
    addedAt: new Date().toISOString(),
  }
}
