import {type CivicTreeItem} from '#/state/queries/collection-items'
import {planSembleExport, type SembleExportCollection} from '../sembleExport'

const at = '2026-01-01T00:00:00.000Z'

/** The item `useHighlightQuickActions` saves for a private highlight. */
const privateHighlight: CivicTreeItem = {
  itemId: 'h1',
  kind: 'note',
  title: 'El agua es un derecho',
  description:
    'Highlighted text:\nEl agua es un derecho\n\nCompass position: Lib Left\n\nHighlight color: #c7e4c2\n\nVisibility selected: private',
  sourceUri: 'at://did:plc:a/com.para.post/1',
  sourceLabel: 'Highlighted post',
  policyColor: '#c7e4c2',
  addedAt: at,
}

const link: CivicTreeItem = {
  itemId: 'l1',
  kind: 'link',
  title: 'Informe CONAGUA',
  description: 'Why I saved this: my cousin works there',
  url: 'https://example.org/conagua',
  note: 'Contradicts the mayor',
  addedAt: at,
}

const collection = (
  over: Partial<SembleExportCollection> = {},
): SembleExportCollection => ({
  name: 'Agua',
  items: [],
  relations: [],
  ...over,
})

const published = (plan: ReturnType<typeof planSembleExport>) =>
  JSON.stringify(plan)

describe('planSembleExport', () => {
  it('never publishes a private highlight unless notes are included', () => {
    const plan = planSembleExport(collection({items: [privateHighlight]}), {
      includeNotes: false,
    })

    expect(plan.cards).toEqual([])
    expect(plan.notesAvailable).toBe(1)
    expect(plan.notesIncluded).toBe(0)
    expect(published(plan)).not.toContain('El agua es un derecho')
  })

  it('never publishes descriptions, compass positions or colours', () => {
    for (const includeNotes of [false, true]) {
      const text = published(
        planSembleExport(collection({items: [privateHighlight, link]}), {
          includeNotes,
        }),
      )
      expect(text).not.toContain('Compass position')
      expect(text).not.toContain('Lib Left')
      expect(text).not.toContain('Visibility selected')
      expect(text).not.toContain('#c7e4c2')
      expect(text).not.toContain('my cousin')
    }
  })

  it('does not attach a note to the post it was written about', () => {
    const plan = planSembleExport(collection({items: [privateHighlight]}), {
      includeNotes: true,
    })

    expect(plan.cards).toEqual([
      {itemKey: 'h1', type: 'NOTE', text: 'El agua es un derecho'},
    ])
    expect(published(plan)).not.toContain('com.para.post')
  })

  it('publishes a link with its title, and its note only on request', () => {
    const without = planSembleExport(collection({items: [link]}), {
      includeNotes: false,
    })
    expect(without.cards).toEqual([
      {
        itemKey: 'l1',
        type: 'URL',
        url: 'https://example.org/conagua',
        title: 'Informe CONAGUA',
        author: undefined,
      },
    ])

    const withNotes = planSembleExport(collection({items: [link]}), {
      includeNotes: true,
    })
    expect(withNotes.cards[1]).toEqual({
      itemKey: 'l1#note',
      type: 'NOTE',
      text: 'Contradicts the mayor',
      parentItemKey: 'l1',
    })
    expect(withNotes.notesIncluded).toBe(1)
  })

  it('withholds connection notes unless notes are included', () => {
    const other: CivicTreeItem = {
      itemId: 'l2',
      kind: 'link',
      title: 'Ley de Aguas',
      url: 'https://example.org/ley',
      addedAt: at,
    }
    const input = collection({
      items: [link, other],
      relations: [
        {
          id: 'r1',
          fromItemId: 'l1',
          toItemId: 'l2',
          kind: 'opposes',
          note: 'Private reasoning',
          createdAt: at,
        },
      ],
    })

    const without = planSembleExport(input, {includeNotes: false})
    expect(without.connections).toEqual([
      {
        id: 'r1',
        from: {itemKey: 'l1', url: 'https://example.org/conagua'},
        to: {itemKey: 'l2', url: 'https://example.org/ley'},
        connectionType: 'OPPOSES',
        note: undefined,
      },
    ])
    expect(without.notesAvailable).toBe(2)

    const withNotes = planSembleExport(input, {includeNotes: true})
    expect(withNotes.connections[0].note).toBe('Private reasoning')
  })

  it('does not count notes it has no way to publish', () => {
    const topic: CivicTreeItem = {
      itemId: 't1',
      kind: 'topic',
      title: 'Agua',
      note: 'Has no URL card to attach to',
      addedAt: at,
    }
    const plan = planSembleExport(
      collection({
        items: [topic],
        relations: [
          {
            id: 'r1',
            fromItemId: 't1',
            toItemId: 'missing',
            kind: 'supports',
            note: 'Dropped with its connection',
            createdAt: at,
          },
        ],
      }),
      {includeNotes: true},
    )

    expect(plan.notesAvailable).toBe(0)
    expect(plan.cards).toEqual([{itemKey: 't1', type: 'NOTE', text: 'Agua'}])
    expect(plan.connections).toEqual([])
  })

  it('publishes a book without a link by its bibliographic details', () => {
    const plan = planSembleExport(
      collection({
        items: [
          {
            itemId: 'b1',
            kind: 'book',
            title: 'La democracia en México',
            sourceLabel: 'Pablo González Casanova',
            publishedYear: 1965,
            note: 'Read for the seminar',
            addedAt: at,
          },
        ],
      }),
      {includeNotes: false},
    )

    expect(plan.cards).toEqual([
      {
        itemKey: 'b1',
        type: 'NOTE',
        text: 'La democracia en México — Pablo González Casanova (1965)',
      },
    ])
  })

  it('ignores links that are not http(s) or AT-URIs', () => {
    const plan = planSembleExport(
      collection({
        items: [
          {
            itemId: 'x',
            kind: 'link',
            title: 'Script',
            url: 'javascript:alert(1)',
            addedAt: at,
          },
        ],
      }),
      {includeNotes: false},
    )

    expect(plan.cards).toEqual([{itemKey: 'x', type: 'NOTE', text: 'Script'}])
  })

  it('keeps connections to cards without a link', () => {
    const plan = planSembleExport(
      collection({
        items: [
          link,
          {itemId: 't1', kind: 'topic', title: 'Agua', addedAt: at},
        ],
        relations: [
          {
            id: 'r1',
            fromItemId: 'l1',
            toItemId: 't1',
            kind: 'context_for',
            createdAt: at,
          },
        ],
      }),
      {includeNotes: false},
    )

    expect(plan.connections).toEqual([
      {
        id: 'r1',
        from: {itemKey: 'l1', url: 'https://example.org/conagua'},
        to: {itemKey: 't1'},
        connectionType: 'RELATED',
        note: undefined,
      },
    ])
  })

  it('connects to a note item only when notes are included', () => {
    const input = collection({
      items: [link, privateHighlight],
      relations: [
        {
          id: 'r1',
          fromItemId: 'h1',
          toItemId: 'l1',
          kind: 'supports',
          note: 'Why they connect',
          createdAt: at,
        },
      ],
    })

    const without = planSembleExport(input, {includeNotes: false})
    const withNotes = planSembleExport(input, {includeNotes: true})

    expect(without.connections).toEqual([])
    expect(withNotes.connections).toHaveLength(1)
    expect(withNotes.connections[0].note).toBe('Why they connect')
    // The highlight, the link's note and the connection's note, either way.
    expect(without.notesAvailable).toBe(3)
    expect(withNotes.notesAvailable).toBe(3)
  })
})
