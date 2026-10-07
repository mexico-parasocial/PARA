const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidTimeString(value: string): boolean {
  return TIME_PATTERN.test(value)
}

/**
 * Parses a HH:MM (24h) string into a Date for today in local time. Returns
 * the current time unchanged for invalid inputs — the pickers require a
 * valid date to render.
 */
export function toTimeDate(value: string): Date {
  const date = new Date()
  if (TIME_PATTERN.test(value)) {
    const [hours, minutes] = value.split(':').map(Number)
    date.setHours(hours, minutes, 0, 0)
  }
  return date
}

/**
 * Formats a Date as a HH:MM (24h) string in local time.
 */
export function toSimpleTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
