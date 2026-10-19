import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'

import {BridgeAuthError} from '#/lib/matrix/bridge'
import {BRIDGE_AUDIENCES, bridgeCallWithProof} from '#/lib/matrix/proofs'
import {logger} from '#/logger'
import {useMatrixIdentityQuery} from '#/state/queries/matrix'
import {useSession} from '#/state/session'
import {connectEncryptedChat} from '#/features/encryptedChat/client.native'
import {chatErrorCode} from '#/features/encryptedChat/errors'
import {authorizeInBrowser} from '#/features/encryptedChat/oidc'
import {
  type ChatMessage,
  type ChatRecovery,
  type ChatSessionInfo,
  type EncryptedChatClient,
} from '#/features/encryptedChat/types'

export type ChatRoomStatus =
  | 'idle'
  /** Resolving identity, opening the crypto store, syncing. */
  | 'connecting'
  /** No saved device. The user must authorize one before anything can load. */
  | 'authorizationRequired'
  /** The browser is open for the authorization-code flow. */
  | 'authorizing'
  | 'ready'
  | 'error'

export type ChatRoomState = {
  status: ChatRoomStatus
  messages: ChatMessage[]
  typingUserIds: string[]
  session?: ChatSessionInfo
  recovery: ChatRecovery
  verification: EncryptedChatClient['verification']
  /** A stable code, not a message to render raw. See `chatErrorCode`. */
  error?: string
  send: (body: string, replyToEventId?: string) => Promise<void>
  edit: EncryptedChatClient['editText']
  loadEarlier: EncryptedChatClient['loadEarlier']
  sendImage: EncryptedChatClient['sendImage']
  sendFile: EncryptedChatClient['sendFile']
  openMedia: (eventId: string) => Promise<string>
  getMessage: EncryptedChatClient['getMessage']
  toggleReaction: (eventId: string, key: string) => Promise<void>
  setTyping: (typing: boolean) => Promise<void>
  markRead: () => Promise<void>
  retryDecryption: () => void
  logout: () => Promise<void>
  authorize: () => void
  retry: () => void
}

/**
 * Drives one room through the native Matrix engine.
 *
 * Connects in two phases on purpose. The first attempt passes no `authorize`
 * callback, so a saved device resumes silently and a missing one surfaces as
 * `authorizationRequired` instead of throwing a browser at someone who only
 * opened a screen. Authorization happens when they ask for it.
 */
export function useEncryptedChatRoom(
  roomId: string | undefined,
): ChatRoomState {
  const {currentAccount} = useSession()
  const did = currentAccount?.did
  const {data: identity, error: identityError} = useMatrixIdentityQuery({
    enabled: !!did,
  })

  const scope = JSON.stringify([did, identity?.userId, roomId])
  const activeScope = useRef(scope)
  activeScope.current = scope
  const clientScope = useRef<string | undefined>(undefined)
  const [resolvedScope, setResolvedScope] = useState<string>()
  const [status, setStatus] = useState<ChatRoomStatus>('idle')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typingUserIds, setTypingUserIds] = useState<string[]>([])
  const [session, setSession] = useState<ChatSessionInfo | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [attempt, setAttempt] = useState(0)
  const [authorizationScope, setAuthorizationScope] = useState<string>()
  const wantsAuthorization = authorizationScope === scope

  const clientRef = useRef<EncryptedChatClient | undefined>(undefined)

  useEffect(() => {
    if (!did || !identity || !roomId) return

    let cancelled = false
    let client: EncryptedChatClient | undefined

    const run = async () => {
      setResolvedScope(scope)
      setMessages([])
      setTypingUserIds([])
      setSession(undefined)
      setError(undefined)
      setStatus(wantsAuthorization ? 'authorizing' : 'connecting')
      try {
        client = await connectEncryptedChat({
          scope: {
            accountId: did,
            homeserver: identity.homeServer,
            userId: identity.userId,
          },
          authorize: wantsAuthorization
            ? loginUrl => authorizeInBrowser(loginUrl)
            : undefined,
        })
        if (cancelled) {
          await client.close()
          return
        }
        clientScope.current = scope
        clientRef.current = client
        setSession(client.session)

        await bridgeCallWithProof(
          BRIDGE_AUDIENCES.attest,
          '/api/matrix-attest',
          {
            deviceId: client.session.deviceId,
            friendlyName: 'PARA Native',
          },
        )
        if (cancelled) return
        try {
          const gateway = process.env.EXPO_PUBLIC_MATRIX_PUSH_GATEWAY_URL
          const permission = await Notifications.getPermissionsAsync()
          if (!cancelled && gateway && permission.granted) {
            const projectId =
              Constants.easConfig?.projectId ??
              Constants.expoConfig?.extra?.eas?.projectId
            const token = await Notifications.getExpoPushTokenAsync({projectId})
            if (!cancelled) await client.registerPush(token.data, gateway)
          }
        } catch {
          logger.warn('encryptedChat: push registration unavailable', {
            safeMessage: 'CHAT_PUSH_UNAVAILABLE',
          })
        }
        if (cancelled) return

        await client.openRoom(
          roomId,
          next => {
            // The adapter emits the whole timeline on every change, so this
            // replaces rather than appends. Guarding on `cancelled` keeps a
            // late callback from a closed client out of React state.
            if (!cancelled) setMessages(next)
          },
          userIds => {
            if (!cancelled) setTypingUserIds(userIds)
          },
        )
        if (cancelled) return
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        if (client) {
          await client.close().catch(() => {})
          clientRef.current = undefined
        }
        const code =
          err instanceof BridgeAuthError
            ? err.statusCode === 401
              ? 'CHAT_M8_SESSION_REQUIRED'
              : 'CHAT_ROOM_FORBIDDEN'
            : chatErrorCode(err)
        if (code === 'CHAT_LOGIN_REQUIRED') {
          setStatus('authorizationRequired')
          return
        }
        // A cancelled authorization is a choice, not a failure: go back to
        // asking rather than showing an error.
        if (code === 'CHAT_LOGIN_CANCELLED') {
          setAuthorizationScope(undefined)
          setStatus('authorizationRequired')
          return
        }
        logger.warn('encryptedChat: room failed to open', {safeMessage: code})
        setError(code)
        setStatus('error')
      }
    }

    void run()

    return () => {
      cancelled = true
      clientRef.current = undefined
      setMessages([])
      setTypingUserIds([])
      // Releases the scope lock, the sync loop and the SQLite handles. Without
      // it, the next mount fails with CHAT_ALREADY_OPEN.
      void client?.close().catch(() => {})
    }
  }, [did, identity, roomId, attempt, wantsAuthorization])

  const send = useCallback(async (body: string, replyToEventId?: string) => {
    const client = clientRef.current
    if (!client || clientScope.current !== activeScope.current)
      throw new Error('CHAT_NOT_READY')
    await client.sendText(body, replyToEventId)
  }, [])

  const withClient = useCallback(() => {
    const client = clientRef.current
    if (!client || clientScope.current !== activeScope.current)
      throw new Error('CHAT_NOT_READY')
    return client
  }, [])

  const recovery = useMemo<ChatRecovery>(
    () => ({
      getSecurityStatus: () => withClient().getSecurityStatus(),
      getPendingRecoveryKey: () => withClient().getPendingRecoveryKey(),
      enableRecovery: () => withClient().enableRecovery(),
      acknowledgeRecoveryKey: () => withClient().acknowledgeRecoveryKey(),
      async recover(key) {
        const client = withClient()
        await client.recover(key)
        if (clientRef.current === client) setSession({...client.session})
      },
      syncKeyBackup: () => withClient().syncKeyBackup(),
    }),
    [withClient],
  )
  const verification = useMemo<EncryptedChatClient['verification']>(
    () => ({
      watch: listener => withClient().verification.watch(listener),
      request: () => withClient().verification.request(),
      accept: () => withClient().verification.accept(),
      confirm: matches => withClient().verification.confirm(matches),
      cancel: () => withClient().verification.cancel(),
    }),
    [withClient],
  )

  const sendImage = useCallback<EncryptedChatClient['sendImage']>(
    image => withClient().sendImage(image),
    [withClient],
  )
  const edit = useCallback<EncryptedChatClient['editText']>(
    (eventId, body) => withClient().editText(eventId, body),
    [withClient],
  )
  const loadEarlier = useCallback(
    () => withClient().loadEarlier(),
    [withClient],
  )
  const sendFile = useCallback<EncryptedChatClient['sendFile']>(
    file => withClient().sendFile(file),
    [withClient],
  )
  const openMedia = useCallback(
    (eventId: string) => withClient().openMedia(eventId),
    [withClient],
  )
  const getMessage = useCallback<EncryptedChatClient['getMessage']>(
    eventId => withClient().getMessage(eventId),
    [withClient],
  )
  const toggleReaction = useCallback(
    (eventId: string, key: string) => withClient().toggleReaction(eventId, key),
    [withClient],
  )
  const setTyping = useCallback(
    (typing: boolean) => withClient().setTyping(typing),
    [withClient],
  )
  const markRead = useCallback(() => withClient().markRead(), [withClient])
  const retryDecryption = useCallback(
    () => withClient().retryDecryption(),
    [withClient],
  )
  const logout = useCallback(async () => {
    const client = withClient()
    try {
      await client.logout()
    } finally {
      if (clientRef.current === client) {
        clientRef.current = undefined
        setMessages([])
        setTypingUserIds([])
        setSession(undefined)
        setAuthorizationScope(undefined)
        setStatus('authorizationRequired')
      }
    }
  }, [withClient])

  const authorize = useCallback(() => {
    setAuthorizationScope(scope)
    setAttempt(n => n + 1)
  }, [scope])

  const retry = useCallback(() => {
    setAuthorizationScope(undefined)
    setAttempt(n => n + 1)
  }, [])

  return {
    status: identityError ? 'error' : resolvedScope === scope ? status : 'idle',
    messages: resolvedScope === scope ? messages : [],
    typingUserIds: resolvedScope === scope ? typingUserIds : [],
    session: resolvedScope === scope ? session : undefined,
    recovery,
    verification,
    error: identityError
      ? identityError instanceof BridgeAuthError &&
        identityError.statusCode === 401
        ? 'CHAT_M8_SESSION_REQUIRED'
        : 'CHAT_IDENTITY_UNAVAILABLE'
      : resolvedScope === scope
        ? error
        : undefined,
    send,
    edit,
    loadEarlier,
    sendImage,
    sendFile,
    openMedia,
    getMessage,
    toggleReaction,
    setTyping,
    markRead,
    retryDecryption,
    logout,
    authorize,
    retry,
  }
}
