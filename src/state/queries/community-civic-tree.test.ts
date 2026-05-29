jest.mock('#/state/session', () => ({
  useAgent: jest.fn(),
}))

import {
  didContributionBecomeApproved,
  getCommunityCivicTreeContributionsQueryKey,
  getCommunityCivicTreeGraphQueryKey,
  normalizeCommunityCivicTreeGraph,
} from './community-civic-tree'
import {
  type CommunityCivicTreeGraph,
  type CommunityTreeContribution,
} from './community-civic-tree'

describe('community civic tree v2 queries', () => {
  it('uses community-scoped query keys', () => {
    expect(getCommunityCivicTreeGraphQueryKey('at://did:example:alice/app/1')).toEqual([
      'community-civic-tree',
      'graph',
      'at://did:example:alice/app/1',
    ])
    expect(
      getCommunityCivicTreeContributionsQueryKey(
        'at://did:example:alice/app/1',
        'pending',
        'did:example:bob',
      ),
    ).toEqual([
      'community-civic-tree',
      'contributions',
      'at://did:example:alice/app/1',
      'pending',
      'did:example:bob',
    ])
  })

  it('normalizes AppView graph views for the graph renderer', () => {
    const graph: CommunityCivicTreeGraph = {
      nodes: [
        {
          id: 'card-1',
          community_uri: 'at://did:example:community/com.para.community.board/1',
          author_did: 'did:example:alice',
          title: 'Transit should be safer',
          content: 'Protected lanes reduce injuries.',
          card_type: 'claim',
          source_url: 'https://example.com/source',
          metadata: null,
          influence: 2,
          vote_count: 4,
          stance: 'pro',
        },
      ],
      edges: [
        {
          id: 'rel-1',
          community_uri: 'at://did:example:community/com.para.community.board/1',
          source_card_id: 'card-1',
          target_card_id: 'card-2',
          relationship_type: 'supports',
          author_did: 'did:example:alice',
          created_at: '2026-05-28T00:00:00.000Z',
        },
      ],
    }

    expect(normalizeCommunityCivicTreeGraph(graph)).toEqual({
      nodes: [
        {
          id: 'card-1',
          community_uri: 'at://did:example:community/com.para.community.board/1',
          author_did: 'did:example:alice',
          title: 'Transit should be safer',
          content: 'Protected lanes reduce injuries.',
          card_type: 'claim',
          source_url: 'https://example.com/source',
          metadata: null,
          influence: 2,
          vote_count: 4,
          stance: 'pro',
        },
      ],
      edges: [
        {
          id: 'rel-1',
          source: 'card-1',
          target: 'card-2',
          relationship_type: 'supports',
        },
      ],
    })
  })

  it('detects approved contributions that should highlight a new card', () => {
    const baseContribution: CommunityTreeContribution = {
      id: 'contribution-1',
      community_uri: 'at://did:example:community/com.para.community.board/1',
      author_did: 'did:example:alice',
      title: 'Add this claim',
      content: null,
      source_url: null,
      source_type: 'claim',
      metadata: null,
      status: 'pending',
      approved_card_id: null,
      created_at: '2026-05-28T00:00:00.000Z',
      decided_at: null,
      approve_count: 0,
      reject_count: 0,
    }

    expect(didContributionBecomeApproved(baseContribution)).toBe(false)
    expect(
      didContributionBecomeApproved({
        ...baseContribution,
        status: 'approved',
        approved_card_id: 'card-1',
      }),
    ).toBe(true)
  })
})
