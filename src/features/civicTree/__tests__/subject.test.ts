import {normalizeSubjectUrl, subjectKeyForItem} from '../subject'

const at = '2026-01-01T00:00:00.000Z'

describe('normalizeSubjectUrl', () => {
  it('collapses spellings of the same page', () => {
    const spellings = [
      'https://www.example.org/agua/',
      'http://example.org/agua',
      'https://EXAMPLE.org/agua#section',
      'https://example.org/agua?utm_source=x&fbclid=y',
    ]
    expect(new Set(spellings.map(normalizeSubjectUrl))).toEqual(
      new Set(['https://example.org/agua']),
    )
  })

  it('keeps meaningful query parameters, in a stable order', () => {
    expect(normalizeSubjectUrl('https://example.org/p?b=2&a=1')).toBe(
      normalizeSubjectUrl('https://example.org/p?a=1&b=2'),
    )
    expect(normalizeSubjectUrl('https://example.org/p?id=1')).not.toBe(
      normalizeSubjectUrl('https://example.org/p?id=2'),
    )
  })

  it('keeps path case, which servers may treat as significant', () => {
    expect(normalizeSubjectUrl('https://example.org/Ley')).not.toBe(
      normalizeSubjectUrl('https://example.org/ley'),
    )
  })

  it('maps youtu.be share links to the watch page', () => {
    expect(normalizeSubjectUrl('https://youtu.be/abc123?si=tracking')).toBe(
      normalizeSubjectUrl('https://www.youtube.com/watch?v=abc123'),
    )
  })

  it('turns DOI resolver links into case-insensitive doi keys', () => {
    expect(normalizeSubjectUrl('https://doi.org/10.1000/ABC.1')).toBe(
      'doi:10.1000/abc.1',
    )
    expect(normalizeSubjectUrl('http://dx.doi.org/10.1000/abc.1')).toBe(
      'doi:10.1000/abc.1',
    )
  })

  it('rejects anything that is not http(s)', () => {
    expect(normalizeSubjectUrl('not a url')).toBeUndefined()
    expect(normalizeSubjectUrl('javascript:alert(1)')).toBeUndefined()
    expect(normalizeSubjectUrl('obsidian://open?vault=x')).toBeUndefined()
  })
})

describe('subjectKeyForItem', () => {
  it('gives notes no subject, even when they cite a post', () => {
    expect(
      subjectKeyForItem({
        kind: 'note',
        title: 'My thought',
        sourceUri: 'at://did:plc:a/com.para.post/1',
        addedAt: at,
      }),
    ).toBeUndefined()
  })

  it('identifies a flair topic by its flair, a free topic by its name', () => {
    expect(
      subjectKeyForItem({
        kind: 'topic',
        title: 'Agua',
        flairId: 'agua',
        addedAt: at,
      }),
    ).toBe('flair:agua')
    expect(
      subjectKeyForItem({kind: 'topic', title: ' Educación ', addedAt: at}),
    ).toBe(subjectKeyForItem({kind: 'topic', title: 'educacion', addedAt: at}))
  })

  it('prefers the policy record over a link', () => {
    expect(
      subjectKeyForItem({
        kind: 'policy',
        policyUri: 'at://did:plc:a/com.para.civic.cabildeo/1',
        url: 'https://example.org/x',
        addedAt: at,
      }),
    ).toBe('at://did:plc:a/com.para.civic.cabildeo/1')
  })

  it('prefers the page over the record it was imported from', () => {
    expect(
      subjectKeyForItem({
        kind: 'evidence',
        url: 'https://www.example.org/report/',
        sourceUri: 'at://did:plc:b/com.para.post/1',
        addedAt: at,
      }),
    ).toBe('https://example.org/report')
  })

  it('identifies a book by title and author, and not by title alone', () => {
    expect(
      subjectKeyForItem({
        kind: 'book',
        title: 'La democracia en México',
        sourceLabel: 'Pablo González Casanova',
        addedAt: at,
      }),
    ).toBe('book:la democracia en mexico|pablo gonzalez casanova')
    expect(
      subjectKeyForItem({kind: 'book', title: 'Democracia', addedAt: at}),
    ).toBeUndefined()
  })

  it('has no subject without a reliable reference', () => {
    expect(
      subjectKeyForItem({kind: 'link', title: 'Something', addedAt: at}),
    ).toBeUndefined()
    expect(
      subjectKeyForItem({
        kind: 'link',
        url: 'example.org/no-scheme',
        addedAt: at,
      }),
    ).toBeUndefined()
  })
})
