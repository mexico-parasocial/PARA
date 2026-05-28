import {useUnreadCountQuery} from '#/state/queries/matrix'
import {useUnreadMessageCount} from '#/state/queries/messages/list-conversations'

/**
 * Returns the total unread count across ALL chat backends:
 * - Bluesky DMs (accepted + request)
 * - Matrix community rooms
 *
 * Used for drawer badges and bottom-tab indicators.
 */
export function useTotalChatUnread(): {count: number; numUnread?: string} {
  const dmUnread = useUnreadMessageCount()
  const matrixUnread = useUnreadCountQuery(undefined)

  const dmCount = dmUnread?.count ?? 0
  const matrixCount = matrixUnread.data?.unread ?? 0
  const total = dmCount + matrixCount

  return {
    count: total,
    numUnread: total > 99 ? '99+' : total > 0 ? String(total) : undefined,
  }
}
