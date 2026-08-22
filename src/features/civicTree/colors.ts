export const CARD_TYPE_COLORS: Record<string, string> = {
  /* Matches PERSONAL_ITEM_KIND_COLORS.topic - the same concept in both trees. */
  topic: '#0f766e',
  article: '#3b82f6',
  link: '#06b6d4',
  book: '#8b5cf6',
  research: '#10b981',
  audio: '#f59e0b',
  video: '#ef4444',
  social: '#ec4899',
  event: '#f97316',
  claim: '#22c55e',
  question: '#a855f7',
}

export const RELATIONSHIP_COLORS: Record<string, string> = {
  supports: '#22c55e',
  opposes: '#ef4444',
  addresses: '#3b82f6',
  helpful: '#f59e0b',
  explainer: '#8b5cf6',
  compares_to: '#06b6d4',
}

/** Canonical stance colors — single source of truth */
export const STANCE_COLORS: Record<string, string> = {
  pro: '#22c55e',
  con: '#ef4444',
  neutral: '#9ca3af',
}

/*
 * Personal civic tree. A separate vocabulary from the community tree above:
 * these are the kinds a user assigns to their own items and to the links they
 * draw between them, defined by com.para.collection.defs#civicTreeRelation and
 * #civicTreeItem. Keep them here rather than in components so the dialog, the
 * graph and the legend cannot drift apart.
 */

/** Relations that read source -> target, and so render with an arrowhead. */
export const PERSONAL_RELATION_DIRECTED: Record<string, boolean> = {
  supports: true,
  opposes: true,
  evidence_for: true,
  context_for: true,
  depends_on: true,
  duplicates: false,
  related_to: false,
}

export const PERSONAL_RELATION_COLORS: Record<string, string> = {
  supports: '#22c55e',
  opposes: '#ef4444',
  evidence_for: '#3b82f6',
  context_for: '#f59e0b',
  depends_on: '#8b5cf6',
  duplicates: '#9ca3af',
  related_to: '#9ca3af',
}

/** Phrased so "<source> <label> <target>" reads as a sentence. */
export const PERSONAL_RELATION_LABELS: Record<string, string> = {
  supports: 'supports',
  opposes: 'opposes',
  evidence_for: 'is evidence for',
  context_for: 'gives context for',
  depends_on: 'depends on',
  duplicates: 'duplicates',
  related_to: 'relates to',
}

export const PERSONAL_ITEM_KIND_COLORS: Record<string, string> = {
  /*
   * `topic` is the only kind that is not an artifact - it names a subject the
   * other items are about, and is what gives a tree its spine rather than a
   * flat mesh of documents.
   */
  topic: '#0f766e',
  policy: '#8b5cf6',
  evidence: '#3b82f6',
  post: '#ec4899',
  link: '#06b6d4',
  note: '#64748b',
}

/*
 * Collections carry an optional user-chosen color. When unset we still want
 * two collections to look different, so fall back to a stable slot derived
 * from position rather than to one shared grey.
 */
export const COLLECTION_FALLBACK_COLORS: string[] = [
  '#6366f1',
  '#0ea5e9',
  '#14b8a6',
  '#f59e0b',
  '#ec4899',
  '#84cc16',
]

export function getCollectionColor(
  color: string | undefined,
  index: number,
): string {
  return (
    color ||
    COLLECTION_FALLBACK_COLORS[index % COLLECTION_FALLBACK_COLORS.length]
  )
}
