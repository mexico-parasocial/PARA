/** Expected release safeguards must not be retried as network failures. */
export function isQvlUnavailable(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'error' in error
      ? String(error.error)
      : ''
  const message = error instanceof Error ? error.message : ''
  return ['FeatureNotEnabled', 'BallotPrivacyUnavailable'].some(
    value => code === value || message.includes(value),
  )
}
