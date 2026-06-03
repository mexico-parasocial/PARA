import {
  type CivicTreeItem,
  type CivicTreeRelation,
  getCivicTreeItemKey,
  getCivicTreeItemTitle,
} from '#/state/queries/collection-items'
import {
  type CommunityCivicTreeCard,
  type CommunityCivicTreeRelationship,
} from '#/state/queries/community-civic-tree'

export interface ObsidianVaultFile {
  path: string
  content: string
  frontmatter: Record<string, unknown>
}

export interface ObsidianVaultManifest {
  generatedAt: string
  files: ObsidianVaultFile[]
}

export interface CivicTreeCollectionExportView {
  id: string
  name: string
  description?: string
  color?: string
  items: CivicTreeItem[]
  relations?: CivicTreeRelation[]
  createdAt: string
  updatedAt: string
}

export interface BriefingPackExportView {
  uri?: string
  cid?: string
  title: string
  summary: string
  party: string
  communityUri: string
  cabildeoUris: string[]
  civicTreeCardIds: string[]
  evidenceUris: string[]
  status: string
  updatedAt: string
}

export function buildPersonalCivicTreeVaultManifest(
  collections: CivicTreeCollectionExportView[],
  generatedAt = new Date().toISOString(),
): ObsidianVaultManifest {
  const files = collections.flatMap(collection => {
    const collectionPath = `PARA/Personal Civic Tree/${toFileName(
      collection.name,
    )}.md`
    const itemFiles = collection.items.map(item =>
      civicTreeItemToFile(collection, item),
    )

    return [
      {
        path: collectionPath,
        frontmatter: cleanFrontmatter({
          paraType: 'personal_civic_tree_collection',
          collectionId: collection.id,
          itemCount: collection.items.length,
          relationCount: collection.relations?.length ?? 0,
          color: collection.color,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
        }),
        content: [
          `# ${collection.name}`,
          collection.description,
          '',
          '## Items',
          ...collection.items.map(item => {
            const title = getCivicTreeItemTitle(item) || 'Untitled item'
            return `- [[${toFileStem(title)}]]`
          }),
          '',
          ...relationsToMarkdown(collection.relations ?? []),
        ]
          .filter(line => line !== undefined && line !== null)
          .join('\n'),
      },
      ...itemFiles,
    ]
  })

  return {generatedAt, files: sortFiles(files)}
}

export function buildCommunityCivicTreeVaultManifest({
  communityName,
  communityUri,
  nodes,
  edges,
  generatedAt = new Date().toISOString(),
}: {
  communityName: string
  communityUri: string
  nodes: CommunityCivicTreeCard[]
  edges: CommunityCivicTreeRelationship[]
  generatedAt?: string
}): ObsidianVaultManifest {
  const base = `PARA/Communities/${toFileName(communityName)}/Civic Tree`
  const nodeFiles = nodes.map(node => ({
    path: `${base}/${toFileName(node.title)}.md`,
    frontmatter: cleanFrontmatter({
      paraType: 'community_civic_tree_card',
      atUri: node.uri,
      cid: node.cid,
      cardId: node.id,
      communityUri,
      authorDid: node.author_did,
      cardType: node.card_type,
      sourceUri: node.source_uri,
      sourceUrl: node.source_url,
      stance: node.stance,
      compassQuadrant: node.compass_quadrant,
      relationIds: edges
        .filter(
          edge =>
            edge.source_card_id === node.id || edge.target_card_id === node.id,
        )
        .map(edge => edge.id),
      createdAt: node.created_at,
      updatedAt: node.updated_at,
    }),
    content: [`# ${node.title}`, node.content, linkLine(node.source_url)]
      .filter(Boolean)
      .join('\n\n'),
  }))

  const indexFile: ObsidianVaultFile = {
    path: `${base}/Index.md`,
    frontmatter: cleanFrontmatter({
      paraType: 'community_civic_tree',
      communityUri,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    }),
    content: [
      `# ${communityName} Civic Tree`,
      '',
      '## Cards',
      ...nodes.map(node => `- [[${toFileStem(node.title)}]]`),
      '',
      '## Relationships',
      ...edges.map(edge => {
        const source = nodes.find(node => node.id === edge.source_card_id)
        const target = nodes.find(node => node.id === edge.target_card_id)
        return `- ${source?.title ?? edge.source_card_id} ${edge.relationship_type} ${target?.title ?? edge.target_card_id}`
      }),
    ].join('\n'),
  }

  return {generatedAt, files: sortFiles([indexFile, ...nodeFiles])}
}

export function buildBriefingPackVaultManifest(
  packs: BriefingPackExportView[],
  generatedAt = new Date().toISOString(),
): ObsidianVaultManifest {
  const files = packs.map(pack => ({
    path: `PARA/Party Lobbying Briefing Packs/${toFileName(
      pack.party,
    )}/${toFileName(pack.title)}.md`,
    frontmatter: cleanFrontmatter({
      paraType: 'party_lobbying_briefing_pack',
      atUri: pack.uri,
      cid: pack.cid,
      communityUri: pack.communityUri,
      party: pack.party,
      cabildeoUris: pack.cabildeoUris,
      civicTreeCardIds: pack.civicTreeCardIds,
      evidenceUris: pack.evidenceUris,
      status: pack.status,
      updatedAt: pack.updatedAt,
    }),
    content: [
      `# ${pack.title}`,
      pack.summary,
      '',
      '## Cabildeos',
      ...pack.cabildeoUris.map(uri => `- ${uri}`),
      '',
      '## Evidence',
      ...pack.evidenceUris.map(uri => `- ${uri}`),
    ].join('\n'),
  }))

  return {generatedAt, files: sortFiles(files)}
}

export function fileToMarkdown(file: ObsidianVaultFile) {
  return `${frontmatterToYaml(file.frontmatter)}\n${file.content.trim()}\n`
}

function civicTreeItemToFile(
  collection: CivicTreeCollectionExportView,
  item: CivicTreeItem,
): ObsidianVaultFile {
  const title = getCivicTreeItemTitle(item) || 'Untitled item'
  return {
    path: `PARA/Personal Civic Tree/${toFileName(
      collection.name,
    )}/${toFileName(title)}.md`,
    frontmatter: cleanFrontmatter({
      paraType: 'personal_civic_tree_item',
      collectionId: collection.id,
      itemId: getCivicTreeItemKey(item),
      kind: item.kind,
      atUri: item.sourceUri ?? item.policyUri,
      cid: item.policyCid,
      sourceProvider: inferSourceProvider(item),
      sourceUrl: item.url,
      tags: [item.policyCategory].filter(Boolean),
      addedAt: item.addedAt,
    }),
    content: [
      `# ${title}`,
      item.description,
      item.note,
      linkLine(item.url ?? item.sourceUri ?? item.policyUri),
    ]
      .filter(Boolean)
      .join('\n\n'),
  }
}

function relationsToMarkdown(relations: CivicTreeRelation[]) {
  if (!relations.length) return []
  return [
    '## Relations',
    ...relations.map(relation =>
      `- ${relation.fromItemId} ${relation.kind} ${relation.toItemId}${
        relation.note ? `: ${relation.note}` : ''
      }`,
    ),
  ]
}

function inferSourceProvider(item: CivicTreeItem) {
  const uri = item.sourceUri ?? item.policyUri ?? item.url ?? ''
  if (uri.includes('network.cosmik.')) return 'semble'
  if (uri.includes('at.margin.')) return 'margin'
  if (uri.startsWith('at://')) return 'para'
  return uri ? 'web' : undefined
}

function cleanFrontmatter(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false
      if (Array.isArray(value) && value.length === 0) return false
      return true
    }),
  )
}

function frontmatterToYaml(frontmatter: Record<string, unknown>) {
  const body = Object.entries(frontmatter)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}: ${yamlValue(value)}`)
    .join('\n')
  return `---\n${body}\n---`
}

function yamlValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    return `\n${value.map(item => `  - ${yamlScalar(item)}`).join('\n')}`
  }
  return yamlScalar(value)
}

function yamlScalar(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(String(value))
}

function linkLine(value?: string | null) {
  return value ? `Source: ${value}` : undefined
}

function sortFiles(files: ObsidianVaultFile[]) {
  return [...files].sort((a, b) => a.path.localeCompare(b.path))
}

function toFileStem(value: string) {
  return toFileName(value).replace(/\.md$/i, '')
}

function toFileName(value: string) {
  const safe = value
    .trim()
    .replace(/[\\/:*?"<>|#^[\]]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^-+|-+$/g, '')
  return safe || 'Untitled'
}
