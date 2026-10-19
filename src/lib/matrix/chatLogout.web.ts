import {
  cancelMatrixWebAuthorization,
  clearMatrixWebSession,
  loadMatrixWebSession,
} from '#/features/encryptedChat/webOidc'
import {runChatLogout} from './accountLifecycle'
import {requestDeadline} from './request'

export function logoutChatAccount(did: string): Promise<void> {
  return runChatLogout(did, async () => {
    const session = await loadMatrixWebSession(did)
    await clearMatrixWebSession(did)
    cancelMatrixWebAuthorization(did)
    if (!session) return
    const deadline = requestDeadline()
    try {
      const response = await fetch(
        `${session.homeServer.replace(/\/$/, '')}/_matrix/client/v3/logout`,
        {
          method: 'POST',
          headers: {Authorization: `Bearer ${session.accessToken}`},
          signal: deadline.signal,
        },
      )
      if (!response.ok && response.status !== 401)
        throw new Error('CHAT_REMOTE_LOGOUT_UNAVAILABLE')
    } finally {
      deadline.dispose()
    }
  })
}
