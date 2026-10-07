import {
  type CommunityCivicTreeCard,
  type CommunityTreeContribution,
} from '#/state/queries/community-civic-tree'
import {
  bookDetailsMetadata,
  bookFromCard,
  bookFromContribution,
  buildBookMetadata,
  mergeBooks,
  parseBookMetadata,
  parsePublishedYear,
} from '../books'

const card = (over: Partial<CommunityCivicTreeCard> = {}) => ({
  id: 'c1',
  community_uri: 'at://did:plc:a/com.para.community.board/x',
  author_did: 'did:plc:a',
  title: 'La democracia en América',
  content: ' A classic. ',
  card_type: 'book',
  source_url: 'https://example.org/book',
  metadata: JSON.stringify({author: 'Tocqueville'}),
  ...over,
})

// Annotated, not inferred: `status` is a union on CommunityTreeContribution, and
// an unannotated literal widens 'pending' to string, which the consumers then
// refuse.
const contribution = (
  over: Partial<CommunityTreeContribution> = {},
): CommunityTreeContribution => ({
  id: 'p1',
  community_uri: 'at://did:plc:a/com.para.community.board/x',
  author_did: 'did:plc:a',
  title: 'Pending book',
  content: null,
  source_url: null,
  source_type: 'book',
  metadata: null,
  status: 'pending',
  approved_card_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  decided_at: null,
  approve_count: 0,
  reject_count: 0,
  ...over,
})

describe('parseBookMetadata', () => {
  it('reads the author', () => {
    expect(parseBookMetadata('{"author":" Ana "}')).toEqual({author: 'Ana'})
  })

  it('tolerates missing, blank and malformed metadata', () => {
    expect(parseBookMetadata(null)).toEqual({})
    expect(parseBookMetadata('{"author":"  "}')).toEqual({})
    expect(parseBookMetadata('not json')).toEqual({})
    expect(parseBookMetadata('42')).toEqual({})
  })
})

describe('buildBookMetadata', () => {
  it('round-trips the author and tags the source type', () => {
    const json = buildBookMetadata({author: ' Ana '})
    expect(parseBookMetadata(json)).toEqual({author: 'Ana'})
    expect(JSON.parse(json).sourceType).toEqual('book')
  })

  it('omits an empty author', () => {
    expect(JSON.parse(buildBookMetadata({author: ' '})).author).toBeUndefined()
  })
})

describe('bookFromCard / bookFromContribution', () => {
  it('maps a card', () => {
    const book = bookFromCard(card(), 'Test community')
    expect(book).toMatchObject({
      title: 'La democracia en América',
      author: 'Tocqueville',
      note: 'A classic.',
      url: 'https://example.org/book',
      communityName: 'Test community',
      status: 'approved',
    })
  })

  it('maps a pending contribution without optional fields', () => {
    const book = bookFromContribution(contribution(), 'Test community')
    expect(book.status).toEqual('pending')
    expect(book.author).toBeUndefined()
    expect(book.url).toBeUndefined()
    expect(book.note).toBeUndefined()
  })
})

describe('mergeBooks', () => {
  it('lists approved before pending, newest first', () => {
    const merged = mergeBooks([
      bookFromContribution(contribution(), 'C'),
      {...bookFromCard(card({id: 'a', created_at: '2026-01-01'}), 'C')},
      {...bookFromCard(card({id: 'b', created_at: '2026-02-01'}), 'C')},
    ])
    expect(merged.map(b => b.id)).toEqual(['b', 'a', 'p1'])
  })
})

describe('publication year', () => {
  it('parses a plausible year and rejects the rest', () => {
    expect(parsePublishedYear('1835')).toBe(1835)
    expect(parsePublishedYear(' 1949 ')).toBe(1949)
    expect(parsePublishedYear(1999)).toBe(1999)
    expect(parsePublishedYear('')).toBeUndefined()
    expect(parsePublishedYear('abc')).toBeUndefined()
    expect(parsePublishedYear('99')).toBeUndefined()
    expect(parsePublishedYear('18.5')).toBeUndefined()
    expect(
      parsePublishedYear(String(new Date().getFullYear() + 5)),
    ).toBeUndefined()
    expect(parsePublishedYear(undefined)).toBeUndefined()
  })

  it('round-trips through the book metadata', () => {
    const json = buildBookMetadata({author: 'Ana', publishedYear: 1835})
    expect(parseBookMetadata(json)).toEqual({
      author: 'Ana',
      publishedYear: 1835,
    })
  })

  it('leaves out a blank or invalid year', () => {
    expect(bookDetailsMetadata({author: 'Ana', publishedYear: 5})).toEqual({
      author: 'Ana',
    })
    expect(bookDetailsMetadata({})).toEqual({})
  })

  it('reaches the book shown in Documents', () => {
    const book = bookFromCard(
      card({metadata: JSON.stringify({author: 'Ana', publishedYear: 1835})}),
      'C',
    )
    expect(book.publishedYear).toBe(1835)
    expect(book.author).toBe('Ana')
  })
})
