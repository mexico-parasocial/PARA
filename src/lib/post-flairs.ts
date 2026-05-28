import {
  parseTag,
  POST_FLAIRS,
  POST_TYPES,
  type PostFlair,
  type PostType,
  TAG_TYPES,
} from '#/lib/tags'

export interface CustomPostFlair {
  id: string
  label: string
  tag: string
  color?: string
  category?: string
}

export type ComposerFlair = PostFlair | CustomPostFlair

export interface PostBadge {
  key: string
  label: string
  color: string
  bgColor: string
  kind: 'policy' | 'matter' | 'postType'
  isOfficial?: boolean
  /** Full original tag string, e.g. |#SanidadPrivada or ||#SanidadPrivada. Undefined for postType badges or generic fallbacks. */
  tag?: string
  /** The flair's id field (e.g. 'matter_sanidad_privada'). Used to resolve the eje axis in FlairFeed. */
  flairId?: string
}

export type PostBadgeRecord = {
  flairs?: string[]
  tags?: string[]
  postType?: string | null
}

const DEFAULT_POLICY_COLOR = '#474652'
const DEFAULT_MATTER_COLOR = '#6B7280'

function normalizeTag(tag: string) {
  const parsed = parseTag(tag)
  return parsed.type ? `#${parsed.type}` : tag
}

function titleCaseTagLabel(label: string) {
  return label
    .replace(/^#/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
}

export function isPolicyFlair(flair: {id: string}) {
  return flair.id.startsWith('policy_')
}

export function findPostTypeById(id?: string | null): PostType | undefined {
  if (!id || id === 'none') return undefined
  return Object.values(POST_TYPES).find(pt => pt.id === id)
}

export function applyOfficialToFlairTag(tag: string, isOfficial: boolean) {
  if (tag.startsWith('||#')) {
    return isOfficial ? tag : `|#${tag.slice(3)}`
  }
  if (tag.startsWith('|#')) {
    return isOfficial ? `||#${tag.slice(2)}` : tag
  }
  return tag
}

export function applyOfficialToFlair<T extends ComposerFlair>(
  flair: T,
  isOfficial: boolean,
): T {
  return {
    ...flair,
    tag: applyOfficialToFlairTag(flair.tag, isOfficial),
  }
}

export function normalizeComposerFlairs(
  flairs: ComposerFlair[],
): ComposerFlair[] {
  let policy: ComposerFlair | undefined
  let matter: ComposerFlair | undefined

  for (const flair of flairs) {
    if (isPolicyFlair(flair)) {
      policy = flair
    } else {
      matter = flair
    }
  }

  return [policy, matter].filter(Boolean) as ComposerFlair[]
}

export function derivePostTypeId(post: {
  flairs?: ComposerFlair[]
  postType?: PostType | null
}) {
  if (post.postType?.id && post.postType.id !== 'none') {
    return post.postType.id
  }

  if (!post.flairs?.length) {
    return undefined
  }

  return post.flairs.some(isPolicyFlair) ? 'policy' : 'matter'
}

function resolveBadgeFromTag(
  tag: string,
  fallbackKind?: 'policy' | 'matter',
): PostBadge | undefined {
  const parsed = parseTag(tag)
  const matched = Object.values(POST_FLAIRS).find(
    flair => normalizeTag(flair.tag) === normalizeTag(tag),
  )

  const kind = matched
    ? isPolicyFlair(matched)
      ? 'policy'
      : 'matter'
    : parsed.type === 'Policy'
      ? 'policy'
      : parsed.type === 'Matter'
        ? 'matter'
        : fallbackKind

  if (!kind) {
    return undefined
  }

  // Skip generic type-only tags (e.g. |#Matter, ||#Policy) — they carry no
  // specific subject and would display the raw type name as a label.  The
  // getPostBadges fallback will produce a proper badge when no specific flair
  // is found.
  if (
    !matched &&
    (parsed.type === TAG_TYPES.MATTER || parsed.type === TAG_TYPES.POLICY)
  ) {
    return undefined
  }

  const color =
    matched?.color ||
    (kind === 'policy' ? DEFAULT_POLICY_COLOR : DEFAULT_MATTER_COLOR)
  const label = matched?.label || titleCaseTagLabel(parsed.type ?? tag)

  return {
    key: `${kind}:${normalizeTag(tag)}`,
    label,
    color,
    bgColor: `${color}20`,
    kind,
    isOfficial: parsed.isOfficial,
    tag,
    flairId: matched?.id,
  }
}

function inferPostTypeFromTags(record: PostBadgeRecord): string | undefined {
  if (record.postType && record.postType !== 'none') {
    return record.postType
  }

  const tags = record.tags || []
  if (tags.some(t => t === '|#!RAQ')) return 'raq'
  if (tags.some(t => t === '|#?OpenQuestion')) return 'open_question'
  if (tags.some(t => t === '#MEME')) return 'meme'
  if (tags.some(t => t === '#META')) return 'meta'
  if (tags.some(t => t === '#Competition')) return 'competition'
  if (tags.some(t => t === '#FakeArticle')) return 'fake_article'

  const flairTags = tags.filter(
    tag => tag.startsWith('|#') || tag.startsWith('||#'),
  )
  if (flairTags.some(t => t.startsWith('||#'))) return 'policy'
  if (flairTags.some(t => t.startsWith('|#'))) return 'matter'

  return undefined
}

export function getPostBadges(record: PostBadgeRecord): PostBadge[] {
  const inferredPostType = inferPostTypeFromTags(record)

  const badges: PostBadge[] = []
  const seen = new Set<string>()
  const flairTags =
    record.flairs?.filter(Boolean) ||
    record.tags?.filter(tag => tag.startsWith('|#') || tag.startsWith('||#')) ||
    []

  const fallbackKind =
    inferredPostType === 'policy' || inferredPostType === 'matter'
      ? inferredPostType
      : undefined

  for (const tag of flairTags) {
    const badge = resolveBadgeFromTag(tag, fallbackKind)
    if (!badge || seen.has(badge.kind)) {
      continue
    }
    seen.add(badge.kind)
    badges.push(badge)
  }

  // Design requirement: every matter/policy flair must be specific.
  // A post tagged with only |#Matter or ||#Policy but no specific sub-flair
  // shows NO flair badge — a generic label like "Asunto" is meaningless.

  const postType = findPostTypeById(inferredPostType)
  if (postType) {
    badges.push({
      key: `postType:${postType.id}`,
      label: postType.label,
      color: postType.color,
      bgColor: `${postType.color}20`,
      kind: 'postType',
    })
  }

  return badges
}

export function isPolicyPostRecord(record: PostBadgeRecord) {
  const inferredPostType = inferPostTypeFromTags(record)
  if (inferredPostType === 'policy') {
    return true
  }

  const flairTags =
    record.flairs?.filter(Boolean) ||
    record.tags?.filter(tag => tag.startsWith('|#') || tag.startsWith('||#')) ||
    []

  return flairTags.some(tag => {
    const badge = resolveBadgeFromTag(tag)
    return badge?.kind === 'policy'
  })
}
