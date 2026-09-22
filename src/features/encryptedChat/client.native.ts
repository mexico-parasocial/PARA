import * as Crypto from 'expo-crypto'
import * as FileSystem from 'expo-file-system/legacy'
import * as SecureStore from 'expo-secure-store'
import {
  ClientBuilder,
  type ClientLike,
  CollectStrategy,
  EncryptionState,
  messageEventContentFromMarkdown,
  RecoveryState,
  RoomHistoryVisibility,
  RoomPreset,
  RoomVisibility,
  type Session,
  SlidingSyncVersionBuilder,
  SqliteStoreBuilder,
  type SyncServiceLike,
  type TaskHandleLike,
  type TimelineItemLike,
  type TimelineLike,
  UploadSource,
} from '@unomed/react-native-matrix-sdk'

import {buildOidcConfiguration} from '#/features/encryptedChat/oidc'
import {
  assertSessionScope,
  chatScopeKey,
  normalizeChatScope,
} from '#/features/encryptedChat/scope'
import {applyTimelineChanges} from '#/features/encryptedChat/timeline'
import {
  type ChatMessage,
  type ConnectOptions,
  E2EE_ENGINE_ENABLED,
  type EncryptedChatClient,
  MAX_ATTACHMENT_BYTES,
} from '#/features/encryptedChat/types'

type SavedDevice = {
  version: 1
  storeId: string
  storeKey: string
  session?: Session
}
const activeScopes = new Set<string>()
const keychainOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

async function randomHex(): Promise<string> {
  return Array.from(await Crypto.getRandomBytesAsync(32), byte =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function dispose(object: unknown): void {
  if (
    object &&
    typeof object === 'object' &&
    'uniffiDestroy' in object &&
    typeof object.uniffiDestroy === 'function'
  ) {
    object.uniffiDestroy()
  }
}

function renderMessages(items: TimelineItemLike[]): ChatMessage[] {
  return items.flatMap(item => {
    const event = item.asEvent()
    if (!event || event.content.tag !== 'MsgLike') return []
    const kind = event.content.inner.content.kind
    if (kind.tag !== 'Message' && kind.tag !== 'UnableToDecrypt') return []
    return [
      {
        id: item.uniqueId().id,
        sender: event.sender,
        body: kind.tag === 'Message' ? kind.inner.content.body : '',
        pending: !event.isRemote,
        unableToDecrypt: kind.tag === 'UnableToDecrypt',
      },
    ]
  })
}

/** Development adapter using the SDK's crypto, room state and send queue. */
export async function connectEncryptedChat(
  options: ConnectOptions,
): Promise<EncryptedChatClient> {
  if (!E2EE_ENGINE_ENABLED) throw new Error('CHAT_ENGINE_NOT_NATIVE')
  const scope = normalizeChatScope(options.scope, __DEV__)
  const scopeId = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    chatScopeKey(scope),
  )
  if (activeScopes.has(scopeId)) throw new Error('CHAT_ALREADY_OPEN')
  activeScopes.add(scopeId)
  const secretName = `para.matrix.lab.${scopeId}`
  let client: ClientLike | undefined
  let sync: SyncServiceLike | undefined
  let subscription: TaskHandleLike | undefined
  let timeline: TimelineLike | undefined
  let openRoomId: string | undefined
  let closed = false
  let roomGeneration = 0
  try {
    const raw = await SecureStore.getItemAsync(secretName)
    const saved: SavedDevice = raw
      ? JSON.parse(raw)
      : {version: 1, storeId: await randomHex(), storeKey: await randomHex()}
    if (
      saved.version !== 1 ||
      !/^[a-f0-9]{64}$/.test(saved.storeId) ||
      !/^[a-f0-9]{64}$/.test(saved.storeKey)
    ) {
      throw new Error('INVALID_SAVED_DEVICE')
    }
    if (saved.session) assertSessionScope(scope, saved.session)
    if (!saved.session && !options.authorize)
      throw new Error('CHAT_LOGIN_REQUIRED')
    if (saved.session && options.authorize)
      throw new Error('CHAT_USE_SAVED_DEVICE')

    const dataUri = `${FileSystem.documentDirectory}matrix-lab/${saved.storeId}`
    const cacheUri = `${FileSystem.cacheDirectory}matrix-lab/${saved.storeId}`
    await FileSystem.makeDirectoryAsync(dataUri, {intermediates: true})
    await FileSystem.makeDirectoryAsync(cacheUri, {intermediates: true})
    const matrix = await new ClientBuilder()
      .homeserverUrl(scope.homeserver)
      .sqliteStore(
        new SqliteStoreBuilder(
          decodeURI(dataUri.replace('file://', '')),
          decodeURI(cacheUri.replace('file://', '')),
        ).passphrase(saved.storeKey),
      )
      .slidingSyncVersionBuilder(SlidingSyncVersionBuilder.DiscoverNative)
      .roomKeyRecipientStrategy(CollectStrategy.ErrorOnVerifiedUserProblem)
      .enableShareHistoryOnInvite(false)
      .autoEnableCrossSigning(true)
      .autoEnableBackups(false)
      .build()
    client = matrix

    /** Save the crypto-store key before a login can create a device on the server. */
    await SecureStore.setItemAsync(
      secretName,
      JSON.stringify(saved),
      keychainOptions,
    )
    if (saved.session) {
      await matrix.restoreSession(saved.session)
    } else {
      /*
       * The device ID is derived from the crypto store's id, so the two are
       * created together and lost together. Reusing a device ID whose store is
       * gone would present the server with a device whose Megolm keys we can
       * no longer produce: history stops decrypting and other members keep
       * encrypting to keys nobody holds. A fresh store must mean a fresh
       * device that is then verified and recovered.
       */
      const deviceId = saved.storeId.slice(0, 16).toUpperCase()
      const authorization = await matrix.urlForOidc(
        buildOidcConfiguration(),
        undefined,
        scope.userId,
        deviceId,
        undefined,
      )
      try {
        const callbackUrl = await options.authorize!(authorization.loginUrl())
        await matrix.loginWithOidcCallback(callbackUrl)
      } catch (err) {
        // Leaving the authorization pending would strand it server-side and
        // block the next attempt for this device.
        await matrix.abortOidcAuth(authorization).catch(() => {})
        throw err
      } finally {
        dispose(authorization)
      }
    }
    saved.session = matrix.session()
    assertSessionScope(scope, saved.session)
    await SecureStore.setItemAsync(
      secretName,
      JSON.stringify(saved),
      keychainOptions,
    )
    sync = await matrix.syncService().finish()
    await sync.start()

    const requireOpen = () => {
      if (closed) throw new Error('CHAT_CLOSED')
    }
    const requireEncryptedTimeline = () => {
      requireOpen()
      const room = openRoomId ? matrix.getRoom(openRoomId) : undefined
      if (!timeline || room?.encryptionState() !== EncryptionState.Encrypted) {
        throw new Error('ENCRYPTED_ROOM_REQUIRED')
      }
      return timeline
    }
    const sessionInfo = {
      userId: saved.session.userId,
      deviceId: saved.session.deviceId,
      recoveryEnabled:
        matrix.encryption().recoveryState() === RecoveryState.Enabled,
    }
    const close = async () => {
      if (closed) return
      closed = true
      roomGeneration++
      subscription?.cancel()
      dispose(subscription)
      subscription = undefined
      dispose(timeline)
      timeline = undefined
      await sync?.stop()
      await matrix.enableAllSendQueues(false)
      dispose(sync)
      dispose(matrix)
      activeScopes.delete(scopeId)
    }
    return {
      session: sessionInfo,
      async createRoom(name, invite) {
        requireOpen()
        return matrix.createRoom({
          name,
          invite,
          isEncrypted: true,
          isDirect: false,
          visibility: new RoomVisibility.Private(),
          preset: RoomPreset.PrivateChat,
          historyVisibilityOverride: new RoomHistoryVisibility.Joined(),
        })
      },
      async openRoom(roomId, onMessages) {
        requireOpen()
        const generation = ++roomGeneration
        subscription?.cancel()
        subscription = undefined
        timeline = undefined
        openRoomId = undefined
        onMessages([])
        const room = await matrix.joinRoomById(roomId)
        if (room.encryptionState() !== EncryptionState.Encrypted)
          throw new Error('ENCRYPTED_ROOM_REQUIRED')
        const nextTimeline = await room.timeline()
        let items: TimelineItemLike[] = []
        const nextSubscription = await nextTimeline.addListener({
          onUpdate(changes) {
            if (closed || generation !== roomGeneration) return
            items = applyTimelineChanges(items, changes)
            onMessages(renderMessages(items))
          },
        })
        if (closed || generation !== roomGeneration) {
          nextSubscription.cancel()
          return
        }
        subscription = nextSubscription
        timeline = nextTimeline
        openRoomId = roomId
      },
      async sendText(body) {
        if (!body.trim() || body.length > 8000)
          throw new Error('INVALID_MESSAGE')
        await requireEncryptedTimeline().send(
          messageEventContentFromMarkdown(body),
        )
      },
      async sendFile(file) {
        const currentTimeline = requireEncryptedTimeline()
        if (
          !file.uri.startsWith('file://') ||
          file.size < 1 ||
          file.size > MAX_ATTACHMENT_BYTES
        )
          throw new Error('INVALID_ATTACHMENT')
        const info = await FileSystem.getInfoAsync(file.uri)
        if (!info.exists || info.isDirectory || info.size !== file.size)
          throw new Error('INVALID_ATTACHMENT')
        await currentTimeline
          .sendFile(
            {
              source: new UploadSource.File({
                filename: decodeURI(file.uri.replace('file://', '')),
              }),
              caption: file.name,
            },
            {mimetype: file.mimeType, size: BigInt(file.size)},
          )
          .join()
      },
      async enableRecovery() {
        requireOpen()
        const encryption = matrix.encryption()
        if (
          encryption.recoveryState() !== RecoveryState.Disabled ||
          (await encryption.backupExistsOnServer())
        ) {
          throw new Error('RECOVER_EXISTING_KEYS_FIRST')
        }
        const key = await encryption.enableRecovery(true, undefined, {
          onUpdate() {},
        })
        sessionInfo.recoveryEnabled = true
        return key
      },
      async recover(key) {
        requireOpen()
        await matrix.encryption().recover(key)
        sessionInfo.recoveryEnabled =
          matrix.encryption().recoveryState() === RecoveryState.Enabled
      },
      close,
      async logout() {
        requireOpen()
        await matrix.logout()
        await close()
        await SecureStore.deleteItemAsync(secretName)
        await FileSystem.deleteAsync(dataUri, {idempotent: true})
        await FileSystem.deleteAsync(cacheUri, {idempotent: true})
      },
    }
  } catch (error) {
    subscription?.cancel()
    await sync?.stop()
    dispose(subscription)
    dispose(timeline)
    dispose(sync)
    dispose(client)
    activeScopes.delete(scopeId)
    throw error
  }
}
