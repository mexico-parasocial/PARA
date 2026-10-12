import {
  type CivicTreeItem,
  type CivicTreeRelation,
  getCivicTreeItemKey,
  getCivicTreeItemKind,
  getCivicTreeItemTitle,
} from '#/state/queries/collection-items'

/*
 * Decides what a Semble export publishes.
 *
 * An export writes public records to the user's own repo, readable and
 * copyable by anyone; deleting them later does not recall the copies. So this
 * is a projection, like `contributionFromItem`, not a pass-through:
 *
 *  - `description` never leaves. It is free text the user wrote for
 *    themselves, and for a saved highlight it holds the highlighted passage,
 *    the compass position and the visibility the user chose. Exporting it
 *    turned private highlights into public cards.
 *  - colours, categories and flair ids never leave. A highlight colour is a
 *    compass position.
 *  - the user's notes - note items, the note on an item, the note on a
 *    connection - leave only when `includeNotes` is set, and the preview lists
 *    them before anything is written.
 *
 * The dialog previews exactly this plan and the mutation writes exactly this
 * plan, so what the user approves is what gets published.
 */

export type SembleConnectionType =
  'SUPPORTS' | 'OPPOSES' | 'RELATED' | 'LEADS_TO'

export type SembleExportCard =
  | {
      itemKey: string
      type: 'URL'
      url: string
      title?: string
      /** A book's author. */
      author?: string
    }
  | {
      itemKey: string
      type: 'NOTE'
      text: string
      /**
       * The URL card this note is about. A note with a parent is shown on
       * that card rather than added to the collection on its own.
       */
      parentItemKey?: string
    }

/**
 * One end of a connection: a card in this plan. Semble joins a URL card by its
 * URL, as its own clients do, and any other card by the card's AT-URI, which
 * is only known once the card exists - so the writer resolves it.
 */
export type SembleConnectionEnd = {itemKey: string; url?: string}

export type SembleExportConnection = {
  id: string
  from: SembleConnectionEnd
  to: SembleConnectionEnd
  connectionType: SembleConnectionType
  note?: string
}

export type SembleExportPlan = {
  collection: {name: string; description?: string}
  cards: SembleExportCard[]
  connections: SembleExportConnection[]
  /** Notes this plan publishes. Zero unless `includeNotes` was set. */
  notesIncluded: number
  /** Notes the user has in this collection, whether included or not. */
  notesAvailable: number
}

export type SembleExportCollection = {
  name: string
  description?: string
  items: CivicTreeItem[]
  relations?: CivicTreeRelation[]
}

const PUBLISHABLE_URL = /^(https?|at):\/\/\S+$/i

export function sembleConnectionType(
  kind: CivicTreeRelation['kind'],
): SembleConnectionType {
  switch (kind) {
    case 'supports':
    case 'evidence_for':
      return 'SUPPORTS'
    case 'opposes':
      return 'OPPOSES'
    case 'depends_on':
      return 'LEADS_TO'
    default:
      return 'RELATED'
  }
}

/** The link a card is published under, or undefined for a note-only card. */
function publishableUrl(item: CivicTreeItem): string | undefined {
  /*
   * A note item's `sourceUri` is the post it was written about, not the note
   * itself; publishing it would attach the user's note to that post.
   */
  if (getCivicTreeItemKind(item) === 'note') return undefined
  const candidate = (item.url || item.policyUri || item.sourceUri)?.trim()
  return candidate && PUBLISHABLE_URL.test(candidate) ? candidate : undefined
}

function trimmed(value: string | undefined): string | undefined {
  const t = value?.trim()
  return t ? t : undefined
}

export function planSembleExport(
  collection: SembleExportCollection,
  {includeNotes}: {includeNotes: boolean},
): SembleExportPlan {
  const cards: SembleExportCard[] = []
  /** Every top-level card, with its URL when it is a URL card. */
  const ends = new Map<string, SembleConnectionEnd>()
  /** Note items, which become cards only when notes are included. */
  const noteItems = new Set<string>()
  let notesAvailable = 0
  let notesIncluded = 0

  const countNote = () => {
    notesAvailable++
    if (includeNotes) notesIncluded++
    return includeNotes
  }

  for (const item of collection.items) {
    const itemKey = getCivicTreeItemKey(item)
    const kind = getCivicTreeItemKind(item)
    const title = trimmed(getCivicTreeItemTitle(item))

    if (kind === 'note') {
      const text = trimmed(item.note) ?? title
      if (!text) continue
      noteItems.add(itemKey)
      if (countNote()) {
        cards.push({itemKey, type: 'NOTE', text})
        ends.set(itemKey, {itemKey})
      }
      continue
    }

    const url = publishableUrl(item)
    const author = kind === 'book' ? trimmed(item.sourceLabel) : undefined

    if (url) {
      ends.set(itemKey, {itemKey, url})
      cards.push({itemKey, type: 'URL', url, title, author})
      const note = trimmed(item.note)
      if (note && countNote()) {
        cards.push({
          itemKey: `${itemKey}#note`,
          type: 'NOTE',
          text: note,
          parentItemKey: itemKey,
        })
      }
      continue
    }

    /*
     * Without a link the card is its name. A book's name is bibliographic, so
     * its author and year go with it; nothing else the user typed does.
     */
    if (!title) continue
    const text =
      kind === 'book' && author
        ? `${title} — ${author}${item.publishedYear ? ` (${item.publishedYear})` : ''}`
        : title
    /*
     * Its own note has no URL card to hang from, so it is not offered: a
     * count the export could not honour would misdescribe it.
     */
    cards.push({itemKey, type: 'NOTE', text})
    ends.set(itemKey, {itemKey})
  }

  const connections: SembleExportConnection[] = []
  for (const relation of collection.relations ?? []) {
    /*
     * An end that is a withheld note item would exist with notes included, so
     * a note on this connection still counts as available: the number on the
     * switch must not change when the switch is flipped.
     */
    const reachable = (key: string) => ends.has(key) || noteItems.has(key)
    if (!reachable(relation.fromItemId) || !reachable(relation.toItemId)) {
      continue
    }
    const note = trimmed(relation.note)
    const withNote = note ? countNote() : false

    const from = ends.get(relation.fromItemId)
    const to = ends.get(relation.toItemId)
    if (!from || !to) continue
    connections.push({
      id: relation.id,
      from,
      to,
      connectionType: sembleConnectionType(relation.kind),
      note: withNote ? note : undefined,
    })
  }

  return {
    collection: {
      name: collection.name,
      description: trimmed(collection.description),
    },
    cards,
    connections,
    notesIncluded,
    notesAvailable,
  }
}
