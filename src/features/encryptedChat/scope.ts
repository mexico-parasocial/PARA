import {type ChatScope} from '#/features/encryptedChat/types'

export function normalizeChatScope(
  scope: ChatScope,
  allowLocal = false,
): ChatScope {
  const url = new URL(scope.homeserver)
  const loopback = ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(
    url.hostname,
  )
  if (
    (url.protocol !== 'https:' &&
      !(allowLocal && loopback && url.protocol === 'http:')) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  ) {
    throw new Error('INVALID_HOMESERVER')
  }
  if (!scope.accountId || !/^@[^\s:]+:[^\s/]+$/.test(scope.userId)) {
    throw new Error('INVALID_CHAT_IDENTITY')
  }
  return {...scope, homeserver: url.origin}
}

/** An unambiguous input for hashing; never use a handle or display name as a key. */
export function chatScopeKey(scope: ChatScope): string {
  return JSON.stringify([scope.accountId, scope.homeserver, scope.userId])
}

export function assertSessionScope(
  scope: ChatScope,
  session: {userId: string; homeserverUrl: string; deviceId: string},
): void {
  if (
    session.userId !== scope.userId ||
    session.homeserverUrl.replace(/\/$/, '') !== scope.homeserver ||
    !session.deviceId
  ) {
    throw new Error('CHAT_SESSION_MISMATCH')
  }
}
