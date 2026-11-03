import {useUnreadCountQuery} from '#/state/queries/matrix'
import {useUnreadMessageCount} from '#/state/queries/messages/list-conversations'
import {useSession} from '#/state/session'
import {CHAT_ENABLED} from '#/env'

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
 *
 * With chat off (`EXPO_PUBLIC_CHAT_ENABLED=false`) there is no chat surface to
 * badge, so this is always zero.
 */
export function useTotalChatUnread(): {
  count: number
  numUnread?: string
  hasNew: boolean
} {
  const {currentAccount} = useSession()
  const dmUnread = useUnreadMessageCount()
  const matrixUnread = useUnreadCountQuery({enabled: !!currentAccount?.did})

  if (!CHAT_ENABLED) return {count: 0, hasNew: false}

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
