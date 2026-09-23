import {useCallback, useEffect, useRef, useState} from 'react'

import {logger} from '#/logger'
import {useMatrixIdentityQuery} from '#/state/queries/matrix'
import {useSession} from '#/state/session'
import {connectEncryptedChat} from '#/features/encryptedChat/client.native'
import {chatErrorCode} from '#/features/encryptedChat/errors'
import {authorizeInBrowser} from '#/features/encryptedChat/oidc'
import {
  type ChatMessage,
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
  /** A stable code, not a message to render raw. See `chatErrorCode`. */
  error?: string
  send: (body: string, replyToEventId?: string) => Promise<void>
  sendImage: EncryptedChatClient['sendImage']
  sendFile: EncryptedChatClient['sendFile']
  openMedia: (eventId: string) => Promise<string>
  toggleReaction: (eventId: string, key: string) => Promise<void>
  setTyping: (typing: boolean) => Promise<void>
  markRead: () => Promise<void>
  retryDecryption: () => void
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
  const {data: identity} = useMatrixIdentityQuery({enabled: !!did})

  const [status, setStatus] = useState<ChatRoomStatus>('idle')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typingUserIds, setTypingUserIds] = useState<string[]>([])
  const [session, setSession] = useState<ChatSessionInfo | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [attempt, setAttempt] = useState(0)
  const [wantsAuthorization, setWantsAuthorization] = useState(false)

  const clientRef = useRef<EncryptedChatClient | undefined>(undefined)

  useEffect(() => {
    if (!did || !identity || !roomId) return

    let cancelled = false
    let client: EncryptedChatClient | undefined

    const run = async () => {
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
        clientRef.current = client
        setSession(client.session)

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
        const code = chatErrorCode(err)
        if (code === 'CHAT_LOGIN_REQUIRED') {
          setStatus('authorizationRequired')
          return
        }
        // A cancelled authorization is a choice, not a failure: go back to
        // asking rather than showing an error.
        if (code === 'CHAT_LOGIN_CANCELLED') {
          setWantsAuthorization(false)
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
    if (!client) throw new Error('CHAT_NOT_READY')
    await client.sendText(body, replyToEventId)
  }, [])

  const withClient = useCallback(() => {
    const client = clientRef.current
    if (!client) throw new Error('CHAT_NOT_READY')
    return client
  }, [])

  const sendImage = useCallback<EncryptedChatClient['sendImage']>(
    image => withClient().sendImage(image),
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

  const authorize = useCallback(() => {
    setWantsAuthorization(true)
    setAttempt(n => n + 1)
  }, [])

  const retry = useCallback(() => {
    setWantsAuthorization(false)
    setAttempt(n => n + 1)
  }, [])

  return {
    status,
    messages,
    typingUserIds,
    session,
    error,
    send,
    sendImage,
    sendFile,
    openMedia,
    toggleReaction,
    setTyping,
    markRead,
    retryDecryption,
    authorize,
    retry,
  }
}
