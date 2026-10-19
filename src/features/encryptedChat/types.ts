import {CHAT_ENGINE} from '#/env'

export type ChatScope = {
  accountId: string
  homeserver: string
  userId: string
}

export type ChatMessage = {
  id: string
  eventId?: string
  sender: string
  body: string
  timestamp: number
  kind:
    | 'text'
    | 'image'
    | 'audio'
    | 'video'
    | 'file'
    | 'redacted'
    | 'unableToDecrypt'
  media?: {filename: string; mimeType: string; size?: number}
  reactions: Array<{key: string; count: number; reactedByMe: boolean}>
  replyTo?: {eventId: string; sender?: string; body?: string}
  edited: boolean
  readByCount: number
  pending: boolean
  unableToDecrypt: boolean
  /** Set on the DM intro message (lib/matrix/dmIntro); never rendered. */
  dmIntro?: {requestId: string; did: string}
}

export type ChatSessionInfo = {
  userId: string
  deviceId: string
  recoveryEnabled: boolean
}

export type ChatSecurityStatus = {
  recovery: 'unknown' | 'disabled' | 'incomplete' | 'enabled'
  verification: 'unknown' | 'unverified' | 'verified'
  backupExists: boolean
  backupEnabled: boolean
}

export type RecoveryKey = {key: string; persisted: boolean}

export type ChatVerificationState = {
  status:
    | 'idle'
    | 'waiting'
    | 'requested'
    | 'comparing'
    | 'verified'
    | 'cancelled'
    | 'failed'
  deviceId?: string
  symbols?: string[]
}

export interface ChatDeviceVerification {
  watch(listener: (state: ChatVerificationState) => void): () => void
  request(): Promise<void>
  accept(): Promise<void>
  confirm(matches: boolean): Promise<void>
  cancel(): Promise<void>
}

export interface ChatRecovery {
  getSecurityStatus(): Promise<ChatSecurityStatus>
  getPendingRecoveryKey(): Promise<RecoveryKey | undefined>
  enableRecovery(): Promise<RecoveryKey>
  acknowledgeRecoveryKey(): Promise<void>
  recover(key: string): Promise<void>
  syncKeyBackup(): Promise<void>
}

/** The UI never receives access tokens, the crypto-store key, or SDK objects. */
export interface EncryptedChatClient extends ChatRecovery {
  session: ChatSessionInfo
  verification: ChatDeviceVerification
  createRoom(name: string, invite: string[]): Promise<string>
  /**
   * An encrypted direct room (`is_direct`, recorded in m.direct) inviting one
   * MXID, whose first event is the encrypted DM intro (lib/matrix/dmIntro).
   */
  createDirectRoom(
    invitee: string,
    intro: {requestId: string; did: string},
  ): Promise<string>
  /** Direct rooms this account is invited to and has not joined. */
  listDirectInvites(): Promise<Array<{roomId: string}>>
  /**
   * Join a direct invite and resolve its DM intro, or undefined if none
   * arrives within `timeoutMs`. Leaves the room open in this client.
   */
  readDmIntro(roomId: string, timeoutMs?: number): Promise<unknown>
  leaveRoom(roomId: string): Promise<void>
  openRoom(
    roomId: string,
    onMessages: (messages: ChatMessage[]) => void,
    onTyping?: (userIds: string[]) => void,
  ): Promise<void>
  sendText(body: string, replyToEventId?: string): Promise<void>
  editText(eventId: string, body: string): Promise<void>
  /** Returns true when the beginning of available history was reached. */
  loadEarlier(): Promise<boolean>
  toggleReaction(eventId: string, key: string): Promise<void>
  markRead(): Promise<void>
  setTyping(typing: boolean): Promise<void>
  retryDecryption(): void
  openMedia(eventId: string): Promise<string>
  /**
   * One message of the open room by event ID, decrypted with this device's
   * keys when it can be. Undefined when it is not in this device's timeline.
   */
  getMessage(eventId: string): Promise<ChatMessage | undefined>
  sendImage(image: {
    uri: string
    name: string
    size: number
    mimeType: string
    width: number
    height: number
  }): Promise<void>
  sendFile(file: {
    uri: string
    name: string
    size: number
    mimeType: string
  }): Promise<void>
  registerPush(expoPushToken: string, gatewayUrl: string): Promise<void>
  close(): Promise<void>
  logout(): Promise<void>
}

export type ConnectOptions = {
  scope: ChatScope
  /**
   * Authorizes a NEW device against the homeserver's authorization server.
   * Receives the login URL and must resolve with the redirect URL the browser
   * is sent back to. Omit to resume a saved device only.
   *
   * This replaced a password login. The deployment delegates authentication to
   * MAS, which has passwords disabled and does not support
   * `m.login.application_service`; Synapse no longer serves `/login` at all.
   * Authorization-code flow is the only way this stack mints a device.
   *
   * No password ever reaches this module, and no access token leaves it.
   */
  authorize?: (loginUrl: string) => Promise<string>
}

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

/**
 * The adapter runs only when the native chat engine is selected. It was
 * previously gated on a separate `__DEV__`-only lab flag with no UI consumers;
 * that flag graduates into the engine flag now that a screen uses it.
 *
 * This is not a claim that the engine is production-ready. It is off by
 * default, and the acceptance criteria for it (two-device interoperability,
 * verification, recovery) have not been met yet.
 */
export const E2EE_ENGINE_ENABLED = CHAT_ENGINE === 'native'
