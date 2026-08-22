import {type CivicTreeItem} from '#/state/queries/collection-items'

import {
  canContributeItem,
  contributionFromItem,
} from '../contribution'

const item = (over: Partial<CivicTreeItem> = {}): CivicTreeItem => ({
  addedAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

describe('contributionFromItem', () => {
  it('routes an AT-URI to sourceUri, not sourceUrl', () => {
    const draft = contributionFromItem(
      item({
        title: 'Rent cap',
        policyUri: 'at://did:plc:a/com.para.civic.cabildeo/1',
      }),
    )

    expect(draft.sourceUri).toEqual('at://did:plc:a/com.para.civic.cabildeo/1')
    expect(draft.sourceUrl).toBeUndefined()
  })

  it('routes a web link to sourceUrl, not sourceUri', () => {
    const draft = contributionFromItem(
      item({title: 'Study', url: 'https://example.org/study'}),
    )

    expect(draft.sourceUrl).toEqual('https://example.org/study')
    expect(draft.sourceUri).toBeUndefined()
  })

  it('carries both when an item has a record and a link', () => {
    const draft = contributionFromItem(
      item({
        title: 'Both',
        policyUri: 'at://did:plc:a/com.para.civic.cabildeo/1',
        url: 'https://example.org/x',
      }),
    )

    expect(draft.sourceUri).toEqual('at://did:plc:a/com.para.civic.cabildeo/1')
    expect(draft.sourceUrl).toEqual('https://example.org/x')
  })

  it('carries neither for a note with no reference', () => {
    const draft = contributionFromItem(
      item({title: 'My thought', kind: 'note'}),
    )

    expect(draft.sourceUri).toBeUndefined()
    expect(draft.sourceUrl).toBeUndefined()
    expect(draft.title).toEqual('My thought')
  })

  it('keeps a topic typed as a topic rather than guessing', () => {
    const draft = contributionFromItem(
      item({title: 'Vivienda', kind: 'topic', flairId: 'matter_vivienda'}),
    )

    expect(draft.sourceType).toEqual('topic')
  })

  it('infers a source type from a link', () => {
    const draft = contributionFromItem(
      item({title: 'Talk', url: 'https://youtube.com/watch?v=x'}),
    )

    expect(draft.sourceType).toEqual('video')
  })

  it('infers from the policy category when there is no link', () => {
    const draft = contributionFromItem(
      item({
        title: 'A paper',
        sourceUri: 'at://did:plc:a/x/1',
        policyCategory: 'research',
      }),
    )

    expect(draft.sourceType).toEqual('research')
  })

  it('falls back to the item title for a policy reference', () => {
    const draft = contributionFromItem(
      item({title: 'Rent cap', policyTitle: 'Rent cap', kind: 'policy'}),
    )

    expect(draft.title).toEqual('Rent cap')
    expect(draft.sourceType).toBeTruthy()
  })

  it('passes the policy category through for the preview', () => {
    const draft = contributionFromItem(
      item({title: 'X', policyCategory: 'Vivienda'}),
    )

    expect(draft.category).toEqual('Vivienda')
  })

  it('never leaks the note the user wrote for themselves', () => {
    const draft = contributionFromItem(
      item({title: 'X', note: 'my private reasoning', description: 'desc'}),
    )

    expect(JSON.stringify(draft)).not.toContain('my private reasoning')
  })

  it('resolves a title from policyTitle when title is absent', () => {
    const draft = contributionFromItem(item({policyTitle: 'From policy'}))
    expect(draft.title).toEqual('From policy')
  })
})

describe('canContributeItem', () => {
  it('accepts an item with a title', () => {
    expect(canContributeItem(item({title: 'Something'}))).toBe(true)
  })

  it('rejects an item with no resolvable title', () => {
    expect(canContributeItem(item())).toBe(false)
  })

  it('rejects a whitespace-only title', () => {
    expect(canContributeItem(item({title: '   '}))).toBe(false)
  })
})
