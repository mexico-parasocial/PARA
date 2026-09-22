import {CHAT_ENGINE} from '#/env'

export type ChatScope = {
  accountId: string
  homeserver: string
  userId: string
}

export type ChatMessage = {
  id: string
  sender: string
  body: string
  pending: boolean
  unableToDecrypt: boolean
}

export type ChatSessionInfo = {
  userId: string
  deviceId: string
  recoveryEnabled: boolean
}

/** The UI never receives access tokens, the crypto-store key, or SDK objects. */
export interface EncryptedChatClient {
  session: ChatSessionInfo
  createRoom(name: string, invite: string[]): Promise<string>
  openRoom(
    roomId: string,
    onMessages: (messages: ChatMessage[]) => void,
  ): Promise<void>
  sendText(body: string): Promise<void>
  sendFile(file: {
    uri: string
    name: string
    size: number
    mimeType: string
  }): Promise<void>
  enableRecovery(): Promise<string>
  recover(key: string): Promise<void>
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
