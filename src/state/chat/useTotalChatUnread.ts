import {useUnreadCountQuery} from '#/state/queries/matrix'
import {useUnreadMessageCount} from '#/state/queries/messages/list-conversations'
import {useSession} from '#/state/session'

/**
 * Returns the total unread count across ALL chat backends:
 * - Bluesky DMs (accepted + request)
 * - Matrix community rooms
 *
 * Used for drawer badges and bottom-tab indicators.
 *
 * `hasNew` carries the DM query's meaning: something is unread but there is no
 * number to show (a pending request), so the surface draws a dot. Matrix unread
 * always has a count, so it never produces `hasNew`.
 */
export function useTotalChatUnread(): {
  count: number
  numUnread?: string
  hasNew: boolean
} {
  const {currentAccount} = useSession()
  const dmUnread = useUnreadMessageCount()
  const matrixUnread = useUnreadCountQuery({enabled: !!currentAccount?.did})

  const matrixCount = matrixUnread.data?.unread ?? 0

  // With nothing unread on Matrix, pass the DM result through untouched — it
  // carries its own overflow cap and the request-convo dot, and re-deriving
  // either from the total would lose them.
  if (matrixCount === 0) return dmUnread

  const total = dmUnread.count + matrixCount
  return {
    count: total,
    numUnread: total > 99 ? '99+' : String(total),
    hasNew: false,
  }
}
