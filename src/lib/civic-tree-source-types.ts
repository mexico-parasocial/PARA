export type CivicTreeSourceType =
  | 'article'
  | 'link'
  | 'book'
  | 'research'
  | 'audio'
  | 'video'
  | 'social'

export const CIVIC_TREE_SOURCE_TYPES: Array<{
  value: CivicTreeSourceType
  label: string
  icon: string
}> = [
  {value: 'article', label: 'Article', icon: '📄'},
  {value: 'link', label: 'Link', icon: '🔗'},
  {value: 'book', label: 'Book', icon: '📚'},
  {value: 'research', label: 'Research', icon: '🔬'},
  {value: 'audio', label: 'Audio', icon: '🎧'},
  {value: 'video', label: 'Video', icon: '🎬'},
  {value: 'social', label: 'Social', icon: '💬'},
]

export function inferCivicTreeSourceType(input?: string | null): CivicTreeSourceType {
  const value = input?.toLowerCase() ?? ''
  if (/youtube|vimeo|tiktok/.test(value)) return 'video'
  if (/spotify|soundcloud|podcast/.test(value)) return 'audio'
  if (/twitter|x\.com|bsky\.app|instagram|facebook|threads/.test(value)) {
    return 'social'
  }
  if (/amazon|goodreads|library|isbn|book/.test(value)) return 'book'
  if (/arxiv|researchgate|doi\.org|pubmed|ssrn|paper|research/.test(value)) {
    return 'research'
  }
  if (/article|policy|matter|cabildeo|proposal/.test(value)) return 'article'
  if (/^https?:\/\//.test(value)) return 'link'
  return 'article'
}
