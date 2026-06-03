import {describe, expect, it} from '@jest/globals'

import {
  buildSembleExportPayload,
  getExternalKnowledgeNetworkLabel,
  getProviderFromUri,
  marginBookmarkToCivicTreeItem,
} from '../externalKnowledgeNetworks'

describe('external knowledge networks', () => {
  it('preserves Semble export shape from civic collections', () => {
    const payload = buildSembleExportPayload({
      id: 'collection-1',
      name: 'Evidence',
      items: [
        {
          itemId: 'item-1',
          title: 'Dataset',
          url: 'https://example.com/data',
          addedAt: '2026-06-01T00:00:00.000Z',
        },
      ],
      relations: [
        {
          id: 'rel-1',
          fromItemId: 'item-1',
          toItemId: 'item-2',
          kind: 'supports',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ],
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    })

    expect(payload.cards[0]).toMatchObject({
      itemKey: 'item-1',
      title: 'Dataset',
      url: 'https://example.com/data',
    })
    expect(payload.connections[0].kind).toBe('supports')
  })

  it('maps Margin bookmarks into civic tree evidence items', () => {
    const item = marginBookmarkToCivicTreeItem({
      uri: 'at://did:plc:alice/at.margin.bookmark/abc',
      title: 'Marked source',
      url: 'https://example.com/source',
      tags: ['housing', 'budget'],
      createdAt: '2026-06-02T00:00:00.000Z',
    })

    expect(item.kind).toBe('evidence')
    expect(item.sourceUri).toBe('at://did:plc:alice/at.margin.bookmark/abc')
    expect(item.note).toContain('housing, budget')
  })

  it('detects supported external providers', () => {
    expect(getProviderFromUri('at://did/x/network.cosmik.card/1')).toBe(
      'semble',
    )
    expect(getProviderFromUri('at://did/x/at.margin.bookmark/1')).toBe(
      'margin',
    )
    expect(getExternalKnowledgeNetworkLabel('obsidian')).toBe('Obsidian')
  })
})
