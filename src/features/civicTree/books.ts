import {
  type CommunityCivicTreeCard,
  type CommunityTreeContribution,
} from '#/state/queries/community-civic-tree'

/*
 * A book is not its own record type: it is a community civic-tree card (or a
 * pending contribution) whose type is `book`. The author has no column of its
 * own, so it travels in the card's JSON `metadata` next to the source type.
 */

export const BOOK_SOURCE_TYPE = 'book'

export type BookView = {
  id: string
  title: string
  author?: string
  /** Year the book was first published. */
  publishedYear?: number
  note?: string
  url?: string
  communityUri: string
  communityName: string
  /** `pending` books are the viewer's own contributions awaiting review. */
  status: 'approved' | 'pending'
  createdAt?: string
}

/**
 * A publication year typed by the user, or undefined when blank or not a
 * plausible year. The upper bound allows next year for announced titles.
 */
export function parsePublishedYear(
  value: string | number | null | undefined,
): number | undefined {
  const year =
    typeof value === 'number' ? value : Number(String(value ?? '').trim())
  return Number.isInteger(year) &&
    year >= MIN_PUBLISHED_YEAR &&
    year <= new Date().getFullYear() + 1
    ? year
    : undefined
}

export const MIN_PUBLISHED_YEAR = 1000

export function parseBookMetadata(metadata: string | null | undefined): {
  author?: string
  publishedYear?: number
} {
  if (!metadata) return {}
  try {
    const parsed: unknown = JSON.parse(metadata)
    if (!parsed || typeof parsed !== 'object') return {}
    const {author, publishedYear} = parsed as {
      author?: unknown
      publishedYear?: unknown
    }
    const year = parsePublishedYear(
      typeof publishedYear === 'number' ? publishedYear : undefined,
    )
    return {
      ...(typeof author === 'string' && author.trim()
        ? {author: author.trim()}
        : {}),
      ...(year !== undefined ? {publishedYear: year} : {}),
    }
  } catch {
    return {}
  }
}

/** The book-specific metadata fields, omitting any that are blank or invalid. */
export function bookDetailsMetadata(input: {
  author?: string
  publishedYear?: number
}): {author?: string; publishedYear?: number} {
  const author = input.author?.trim()
  const publishedYear = parsePublishedYear(input.publishedYear)
  return {
    ...(author ? {author} : {}),
    ...(publishedYear !== undefined ? {publishedYear} : {}),
  }
}

export function buildBookMetadata(input: {
  author?: string
  publishedYear?: number
}): string {
  return JSON.stringify({
    sourceType: BOOK_SOURCE_TYPE,
    contributionContext: 'community_civic_tree',
    origin: 'documents_books',
    ...bookDetailsMetadata(input),
  })
}

export function bookFromCard(
  card: CommunityCivicTreeCard,
  communityName: string,
): BookView {
  return {
    id: card.id,
    title: card.title,
    ...parseBookMetadata(card.metadata),
    note: card.content?.trim() || undefined,
    url: card.source_url ?? undefined,
    communityUri: card.community_uri,
    communityName,
    status: 'approved',
    createdAt: card.created_at,
  }
}

export function bookFromContribution(
  contribution: CommunityTreeContribution,
  communityName: string,
): BookView {
  return {
    id: contribution.id,
    title: contribution.title,
    ...parseBookMetadata(contribution.metadata),
    note: contribution.content?.trim() || undefined,
    url: contribution.source_url ?? undefined,
    communityUri: contribution.community_uri,
    communityName,
    status: 'pending',
    createdAt: contribution.created_at,
  }
}

/**
 * Approved books first, then the viewer's pending ones; newest first within
 * each group.
 */
export function mergeBooks(books: BookView[]): BookView[] {
  const time = (b: BookView) => (b.createdAt ? Date.parse(b.createdAt) : 0) || 0
  return [...books].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'approved' ? -1 : 1
    return time(b) - time(a)
  })
}
