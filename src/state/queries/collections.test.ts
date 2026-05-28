import {
  type CivicTreeItem,
  createCivicTreeRelationId,
  getCivicTreeItemKey,
  getCivicTreeItemKind,
  getCivicTreeItemTitle,
} from './collection-items'

describe('collection item helpers', () => {
  it('normalizes legacy policy items', () => {
    const item: CivicTreeItem = {
      policyUri: 'at://did:example:alice/com.para.civic.cabildeo/abc',
      policyTitle: 'Transit reform',
      addedAt: '2026-05-17T00:00:00.000Z',
    }

    expect(getCivicTreeItemKind(item)).toBe('policy')
    expect(getCivicTreeItemTitle(item)).toBe('Transit reform')
    expect(getCivicTreeItemKey(item)).toBe(item.policyUri)
  })

  it('normalizes manual evidence cards', () => {
    const item: CivicTreeItem = {
      itemId: 'item-1',
      kind: 'evidence',
      title: 'Budget hearing notes',
      description: 'Key claims from the finance committee.',
      addedAt: '2026-05-17T00:00:00.000Z',
    }

    expect(getCivicTreeItemKind(item)).toBe('evidence')
    expect(getCivicTreeItemTitle(item)).toBe('Budget hearing notes')
    expect(getCivicTreeItemKey(item)).toBe('item-1')
  })

  it('normalizes link cards without item ids', () => {
    const item: CivicTreeItem = {
      kind: 'link',
      title: 'Public dataset',
      url: 'https://example.com/data',
      addedAt: '2026-05-17T00:00:00.000Z',
    }

    expect(getCivicTreeItemKind(item)).toBe('link')
    expect(getCivicTreeItemTitle(item)).toBe('Public dataset')
    expect(getCivicTreeItemKey(item)).toBe('https://example.com/data')
  })

  it('creates relation ids for item relationships', () => {
    expect(createCivicTreeRelationId()).toMatch(/^rel-/)
  })
})
