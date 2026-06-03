import {describe, expect, it} from '@jest/globals'

import {
  buildBriefingPackVaultManifest,
  buildCommunityCivicTreeVaultManifest,
  buildPersonalCivicTreeVaultManifest,
  fileToMarkdown,
} from '../obsidian'

describe('Obsidian civic export', () => {
  it('exports personal civic collections with stable paths and frontmatter', () => {
    const manifest = buildPersonalCivicTreeVaultManifest(
      [
        {
          id: 'collection-1',
          name: 'Transit / Evidence',
          description: 'Research trail',
          items: [
            {
              itemId: 'item-1',
              kind: 'evidence',
              title: 'Budget hearing',
              url: 'https://example.com/hearing',
              note: 'Useful source',
              addedAt: '2026-06-01T00:00:00.000Z',
            },
          ],
          relations: [],
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-02T00:00:00.000Z',
        },
      ],
      '2026-06-03T00:00:00.000Z',
    )

    expect(manifest.generatedAt).toBe('2026-06-03T00:00:00.000Z')
    expect(manifest.files.map(file => file.path)).toEqual([
      'PARA/Personal Civic Tree/Transit - Evidence.md',
      'PARA/Personal Civic Tree/Transit - Evidence/Budget hearing.md',
    ])
    expect(manifest.files[1].frontmatter).toMatchObject({
      paraType: 'personal_civic_tree_item',
      itemId: 'item-1',
      sourceProvider: 'web',
    })
  })

  it('exports community civic tree nodes and relationship IDs', () => {
    const manifest = buildCommunityCivicTreeVaultManifest({
      communityName: 'Roma Norte',
      communityUri: 'at://did:plc:community/com.para.community.board/roma',
      generatedAt: '2026-06-03T00:00:00.000Z',
      nodes: [
        {
          id: 'card-a',
          community_uri: 'at://did:plc:community/com.para.community.board/roma',
          author_did: 'did:plc:alice',
          title: 'Tree canopy evidence',
          content: 'More shade reduces heat.',
          card_type: 'evidence',
          source_url: 'https://example.com/canopy',
          metadata: null,
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source_card_id: 'card-a',
          target_card_id: 'card-b',
          relationship_type: 'supports',
          author_did: 'did:plc:alice',
          created_at: '2026-06-01T00:00:00.000Z',
        },
      ],
    })

    const card = manifest.files.find(file =>
      file.path.endsWith('Tree canopy evidence.md'),
    )
    expect(card?.frontmatter).toMatchObject({
      paraType: 'community_civic_tree_card',
      relationIds: ['edge-1'],
    })
  })

  it('renders briefing packs as markdown with YAML frontmatter', () => {
    const manifest = buildBriefingPackVaultManifest([
      {
        uri: 'at://did:plc:alice/com.para.community.briefingPack/1',
        title: 'Transit vote whip',
        summary: 'Arguments for party lobbying.',
        party: 'PAN',
        communityUri: 'at://did:plc:community/com.para.community.board/cdmx',
        cabildeoUris: ['at://did:plc:bob/com.para.civic.cabildeo/transit'],
        civicTreeCardIds: ['card-1'],
        evidenceUris: ['https://example.com/evidence'],
        status: 'published',
        updatedAt: '2026-06-03T00:00:00.000Z',
      },
    ])

    expect(fileToMarkdown(manifest.files[0])).toContain(
      'paraType: "party_lobbying_briefing_pack"',
    )
    expect(fileToMarkdown(manifest.files[0])).toContain('# Transit vote whip')
  })
})
