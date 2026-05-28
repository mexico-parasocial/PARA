import {useCallback} from 'react'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import {COMMUNITY_AGENT_PROFILE} from '#/lib/mock-data/community-agent'
import {
  type CivicTreeCollection,
  type CivicTreeItem,
  createCivicTreeItemId,
} from '#/state/queries/collections'
import {useAgent} from '#/state/session'
import {type HighlightActionPayload} from '#/components/HighlightOptionsModal'
import * as Toast from '#/components/Toast'

const HIGHLIGHT_AGENT_ID = COMMUNITY_AGENT_PROFILE.id
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

  const sendToAgent = useCallback(
    async (payload: HighlightActionPayload) => {
      try {
        await persistHighlight(payload)
        await agent.call(
          'com.para.agent.sendMessage',
          undefined,
          {
            agentId: HIGHLIGHT_AGENT_ID,
            text: buildAgentMessage(payload, postUri),
          },
          {encoding: 'application/json'},
        )
        void queryClient.invalidateQueries({
          queryKey: ['agent-chat', HIGHLIGHT_AGENT_ID],
        })
        onDone()
        Toast.show(_(msg`Sent to your civic agent`))
      } catch {
        Toast.show(_(msg`Failed to send to agent`), {type: 'error'})
      }
    },
    [_, agent, onDone, persistHighlight, postUri, queryClient],
  )

  const saveToCivicTree = useCallback(
    async (payload: HighlightActionPayload) => {
      try {
        const highlight = await persistHighlight(payload)
        const collection = await getHighlightCollection(agent)
        const item = buildCivicTreeItem(payload, postUri, highlight?.text)

        await agent.call('com.para.collection.updateCollection', undefined, {
          id: collection.id,
          collection: {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            color: collection.color,
            items: [...collection.items, item],
            relations: collection.relations || [],
          },
        })
        void queryClient.invalidateQueries({queryKey: ['collections', 'list']})
        void queryClient.invalidateQueries({
          queryKey: ['collections', 'get', collection.id],
        })
        onDone()
        Toast.show(_(msg`Saved as a Civic Tree note`))
      } catch {
        Toast.show(_(msg`Failed to save to Civic Tree`), {type: 'error'})
      }
    },
    [_, agent, onDone, persistHighlight, postUri, queryClient],
  )

  return {sendToAgent, saveToCivicTree}
}

async function getHighlightCollection(agent: ReturnType<typeof useAgent>) {
  const listRes = await agent.call('com.para.collection.listCollections', {})
  const listData = listRes.data as {collections?: CivicTreeCollection[]}
  const collections = listData.collections || []
  const existing = collections.find(
    collection => collection.name === HIGHLIGHT_COLLECTION_NAME,
  )

  if (existing) {
    const latest = await agent.call('com.para.collection.getCollection', {
      id: existing.id,
    })
    const latestData = latest.data as {collection: CivicTreeCollection}
    return latestData.collection
  }

  const created = await agent.call(
    'com.para.collection.createCollection',
    undefined,
    {
      name: HIGHLIGHT_COLLECTION_NAME,
      description:
        'Highlighted civic notes with source text, compass color, and annotation context.',
      color: '#3B82F6',
    },
  )
  const id = (created.data as {id: string}).id
  return {
    id,
    name: HIGHLIGHT_COLLECTION_NAME,
    description:
      'Highlighted civic notes with source text, compass color, and annotation context.',
    color: '#3B82F6',
    items: [],
    relations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } satisfies CivicTreeCollection
}

function buildAgentMessage(payload: HighlightActionPayload, postUri: string) {
  const parts = [
    'Please analyze this civic highlight and help me decide what to do with it.',
    payload.text ? `Highlighted text: "${payload.text}"` : undefined,
    `Compass position: ${payload.label}`,
    `Highlight color: ${payload.color}`,
    payload.note ? `Highlighter note: ${payload.note}` : undefined,
    `Visibility selected: ${payload.isPublic ? 'public' : 'private'}`,
    `Source post: ${postUri}`,
  ].filter(Boolean)

  return parts.join('\n')
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
