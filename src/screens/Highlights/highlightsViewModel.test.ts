import {
  buildHighlightCardViews,
  filterHighlightCards,
  getHighlightsForScope,
  getSignalSummaries,
  type HighlightCardView,
  savedHighlightId,
  sortHighlightCards,
} from './highlightsViewModel'

const baseHighlight: HighlightCardView = {
  id: 'at://did:example:alice/com.para.highlight.annotation/1',
  sourcePostUri: 'at://did:example:bob/app.bsky.feed.post/1',
  text: 'Clean water funding',
  postAuthor: 'bob.test',
  authorName: 'Bob',
  avatarUrl: 'https://example.com/avatar.jpg',
  postPreview: 'Clean water funding should be prioritized',
  color: '#22C55E',
  community: 'Public Services',
  state: 'CDMX',
  party: 'Independent',
  createdAt: 100,
  upvotes: 4,
  downvotes: 1,
  saves: 2,
  replyCount: 3,
  isVerified: true,
  isTrending: false,
  source: 'public',
  signalScore: 20,
  savedLocally: false,
  creatorDid: 'did:example:alice',
}

describe('highlightsViewModel', () => {
  it('keeps public highlights in Signals and local saved highlights in Saved', () => {
    const savedId = savedHighlightId(baseHighlight.id)
    const cards = buildHighlightCardViews({
      publicHighlights: [baseHighlight],
      localHighlights: [
        {
          id: savedId,
          postUri: baseHighlight.sourcePostUri || '',
          start: 0,
          end: 10,
          color: '#22C55E',
          isPublic: false,
          text: 'Clean water',
          createdAt: 200,
          tag: 'Public Services',
          creatorDid: 'did:example:viewer',
        },
      ],
      savedIds: new Set([baseHighlight.id]),
      viewerDid: 'did:example:viewer',
    })

    expect(getHighlightsForScope(cards, 'signals')).toHaveLength(1)
    expect(getHighlightsForScope(cards, 'saved')).toHaveLength(2)
  })

  it('filters by route params, active filters, search, and verified state', () => {
    const result = filterHighlightCards({
      highlights: [baseHighlight],
      query: 'water',
      verifiedOnly: true,
      activeFilters: ['Public Services'],
      routeFilters: {
        community: 'Public Services',
        state: 'CDMX',
        subject: baseHighlight.sourcePostUri,
        creator: baseHighlight.creatorDid,
      },
    })

    expect(result).toEqual([baseHighlight])
  })

  it('sorts by civic signal score and builds summaries', () => {
    const weaker = {...baseHighlight, id: 'weak', signalScore: 1}

    expect(sortHighlightCards([weaker, baseHighlight], 'popular')[0]).toBe(
      baseHighlight,
    )
    expect(getSignalSummaries([baseHighlight])[0]).toMatchObject({
      label: 'Public Services',
      count: 1,
      kind: 'community',
    })
  })
})
