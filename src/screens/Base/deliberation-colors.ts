export const CARD_TYPE_COLORS: Record<string, string> = {
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
