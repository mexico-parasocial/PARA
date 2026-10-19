import {
  type SembleExportCard,
  type SembleExportConnection,
  type SembleExportPlan,
} from './sembleExport'
import {subjectKeyForUrl} from './subject'

/*
 * What the user has already published to Semble, read back from their own
 * repo, and how a new export fits on top of it.
 *
 * Exporting used to create every record again, so a second export doubled
 * the collection on Semble. Now an export only adds what is missing:
 *
 *  - the collection is the user's Semble collection with the same name;
 *  - a link is one card in the user's library however many collections hold
 *    it (Semble's own model), recognised by subject key so `www.` or a
 *    tracking parameter does not make it a different card;
 *  - a note is reused when the same text already exists on the same parent;
 *  - a connection is reused when the same two cards are already joined
 *    with the same type.
 *
 * Nothing is removed. Something taken out of a PARA collection stays on
 * Semble, and anything the user added on Semble itself is left alone.
 *
 * The source is only ever the user's own repo, on their own PDS.
 */

export const SEMBLE_COLLECTIONS = {
  collection: 'network.cosmik.collection',
  card: 'network.cosmik.card',
  collectionLink: 'network.cosmik.collectionLink',
  connection: 'network.cosmik.connection',
} as const

export type StrongRef = {uri: string; cid: string}

export type RepoRecord = {uri: string; cid: string; value: unknown}

export type SembleLibrary = {
  collections: (StrongRef & {
    name: string
    description?: string
    value: Record<string, unknown>
  })[]
  cards: (StrongRef &
    (
      | {type: 'URL'; subject: string}
      | {type: 'NOTE'; text: string; parentUri?: string}
    ))[]
  links: {collectionUri: string; cardUri: string}[]
  connections: {source: string; target: string; connectionType?: string}[]
  /** A listing stopped at its page limit, so a match may have been missed. */
  truncated: boolean
}

export const EMPTY_SEMBLE_LIBRARY: SembleLibrary = {
  collections: [],
  cards: [],
  links: [],
  connections: [],
  truncated: false,
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const str = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : undefined

function refUri(v: unknown): string | undefined {
  return isObject(v) ? str(v.uri) : undefined
}

/**
 * Reads raw repo records into a library. Records are the user's own but may
 * have been written by any Semble client, so every field is checked and
 * anything malformed is skipped rather than trusted.
 */
export function parseSembleLibrary(input: {
  collections: RepoRecord[]
  cards: RepoRecord[]
  links: RepoRecord[]
  connections: RepoRecord[]
  truncated: boolean
}): SembleLibrary {
  const library: SembleLibrary = {
    collections: [],
    cards: [],
    links: [],
    connections: [],
    truncated: input.truncated,
  }

  for (const r of input.collections) {
    if (!isObject(r.value)) continue
    const name = str(r.value.name)
    if (!name) continue
    library.collections.push({
      uri: r.uri,
      cid: r.cid,
      name,
      description: str(r.value.description),
      value: r.value,
    })
  }

  for (const r of input.cards) {
    if (!isObject(r.value)) continue
    const content = isObject(r.value.content) ? r.value.content : {}
    if (r.value.type === 'URL') {
      const url = str(r.value.url) ?? str(content.url)
      const subject = url ? subjectKeyForUrl(url) : undefined
      if (subject)
        library.cards.push({uri: r.uri, cid: r.cid, type: 'URL', subject})
    } else if (r.value.type === 'NOTE') {
      const text = str(content.text)
      if (text === undefined) continue
      library.cards.push({
        uri: r.uri,
        cid: r.cid,
        type: 'NOTE',
        text,
        parentUri: refUri(r.value.parentCard),
      })
    }
  }

  for (const r of input.links) {
    if (!isObject(r.value)) continue
    const collectionUri = refUri(r.value.collection)
    const cardUri = refUri(r.value.card)
    if (collectionUri && cardUri) library.links.push({collectionUri, cardUri})
  }

  for (const r of input.connections) {
    if (!isObject(r.value)) continue
    const source = str(r.value.source)
    const target = str(r.value.target)
    if (!source || !target) continue
    library.connections.push({
      source,
      target,
      connectionType: str(r.value.connectionType),
    })
  }

  return library
}

export type SembleCardAction = {
  card: SembleExportCard
  /** The card already in the user's library, when there is one. */
  existing?: StrongRef
  /** Whether the card still has to be added to the collection. */
  link: boolean
}

export type SembleExportActions = {
  /** The collection to add to, or undefined to create one. */
  collection?: SembleLibrary['collections'][number]
  /** Set when the existing collection's description should change. */
  description?: string
  cards: SembleCardAction[]
  connections: SembleExportConnection[]
  counts: {
    newCards: number
    reusedCards: number
    newLinks: number
    newConnections: number
    existingConnections: number
  }
  /** True when the export would write nothing at all. */
  upToDate: boolean
}

const connectionKey = (source: string, target: string, type?: string) =>
  `${subjectKeyForUrl(source) ?? source}\u0000${
    subjectKeyForUrl(target) ?? target
  }\u0000${type ?? ''}`

const noteKey = (text: string, parentUri?: string) =>
  `${parentUri ?? ''}\u0000${text.trim()}`

/** Most recent first: record keys are TIDs, which sort by creation time. */
const newest = <T extends {uri: string}>(items: T[]) =>
  [...items].sort((a, b) => (a.uri < b.uri ? 1 : a.uri > b.uri ? -1 : 0))[0]

export function reconcileSembleExport(
  plan: SembleExportPlan,
  library: SembleLibrary,
): SembleExportActions {
  const name = plan.collection.name.trim()
  const collection = newest(
    library.collections.filter(c => c.name.trim() === name),
  )
  const description =
    collection &&
    plan.collection.description !== undefined &&
    plan.collection.description !==
      (collection.description?.trim() || undefined)
      ? plan.collection.description
      : undefined

  const urlCards = new Map<string, StrongRef>()
  const noteCards = new Map<string, StrongRef>()
  for (const card of library.cards) {
    const ref = {uri: card.uri, cid: card.cid}
    if (card.type === 'URL') {
      if (!urlCards.has(card.subject)) urlCards.set(card.subject, ref)
    } else {
      const key = noteKey(card.text, card.parentUri)
      if (!noteCards.has(key)) noteCards.set(key, ref)
    }
  }

  const linked = new Set(
    collection
      ? library.links
          .filter(l => l.collectionUri === collection.uri)
          .map(l => l.cardUri)
      : [],
  )

  /*
   * A note hangs from its parent's URI, which is only known up front when the
   * parent is reused; a note on a new parent is necessarily new.
   */
  const resolved = new Map<string, StrongRef | undefined>()
  const cards: SembleCardAction[] = []
  for (const card of plan.cards) {
    let existing: StrongRef | undefined
    if (card.type === 'URL') {
      const subject = subjectKeyForUrl(card.url)
      existing = subject ? urlCards.get(subject) : undefined
    } else if (card.parentItemKey) {
      const parent = resolved.get(card.parentItemKey)
      existing = parent
        ? noteCards.get(noteKey(card.text, parent.uri))
        : undefined
    } else {
      existing = noteCards.get(noteKey(card.text))
    }
    resolved.set(card.itemKey, existing)

    const rides = card.type === 'NOTE' && !!card.parentItemKey
    cards.push({
      card,
      existing,
      link: !rides && !(existing && linked.has(existing.uri)),
    })
  }

  /*
   * A connection end is published as the link's URL, or else as the card's
   * AT-URI. A new card has no URI yet, so any connection touching one is new.
   */
  const endValue = (end: SembleExportConnection['from']) =>
    end.url ?? resolved.get(end.itemKey)?.uri
  const published = new Set(
    library.connections.map(c =>
      connectionKey(c.source, c.target, c.connectionType),
    ),
  )
  const connections = plan.connections.filter(c => {
    const source = endValue(c.from)
    const target = endValue(c.to)
    return (
      !source ||
      !target ||
      !published.has(connectionKey(source, target, c.connectionType))
    )
  })

  const newCards = cards.filter(c => !c.existing).length
  const newLinks = cards.filter(c => c.link).length
  const counts = {
    newCards,
    reusedCards: cards.length - newCards,
    newLinks,
    newConnections: connections.length,
    existingConnections: plan.connections.length - connections.length,
  }

  return {
    collection,
    description,
    cards,
    connections,
    counts,
    upToDate:
      !!collection &&
      description === undefined &&
      newCards === 0 &&
      newLinks === 0 &&
      connections.length === 0,
  }
}
