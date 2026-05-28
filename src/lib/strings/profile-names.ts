import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeHandle} from '#/lib/strings/handles'

export function formatUserDisplayName({
  displayName,
  handle,
  isFigure,
  isAnonymous = false,
  isGroup = false,
  moderation,
}: {
  displayName?: string | null
  handle: string
  isFigure: boolean
  isAnonymous?: boolean
  isGroup?: boolean
  moderation?: Parameters<typeof sanitizeDisplayName>[1]
}) {
  const baseName = sanitizeDisplayName(
    displayName || sanitizeHandle(handle),
    moderation,
  )
  const prefix = isGroup ? 'g/' : isAnonymous ? 'a/' : isFigure ? 'f/' : 'i/'
  return `${prefix}${baseName}`
}
