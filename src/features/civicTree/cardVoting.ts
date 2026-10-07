/** Policy source cards can be stored as articles; topic flairs are not policies. */
export function isPolicyCard(card: {
  card_type: string
  metadata?: string | null
}): boolean {
  if (card.card_type === 'policy') return true
  try {
    const metadata: unknown = card.metadata ? JSON.parse(card.metadata) : null
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
      return false
    const source = metadata as Record<string, unknown>
    return source.postType === 'policy' || source.kind === 'policy'
  } catch {
    return false
  }
}
