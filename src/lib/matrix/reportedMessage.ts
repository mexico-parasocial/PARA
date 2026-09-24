import {type ChatMessage} from '#/features/encryptedChat/types'

/**
 * What a moderator sees of a reported message, read with their own Matrix
 * session (D2). The text is never copied into the report: it is read here,
 * from the room, and only if this moderator's session can.
 */
export type ReportedMessageView =
  | {
      state: 'message'
      sender: string
      timestamp?: number
      kind: 'text' | 'image' | 'audio' | 'video' | 'file'
      body: string
    }
  | {state: 'redacted'; sender?: string; timestamp?: number}
  | {state: 'undecryptable'; sender?: string; timestamp?: number}
  | {
      state: 'unavailable'
      /** `not-loaded`: the native engine could not find it on this device. */
      reason: 'not-found' | 'no-access' | 'not-loaded' | 'error'
    }

type ClientServerEvent = {
  type?: unknown
  sender?: unknown
  origin_server_ts?: unknown
  content?: Record<string, unknown>
  unsigned?: {redacted_because?: unknown}
}

const MSGTYPE_KIND: Record<
  string,
  Exclude<ChatMessage['kind'], 'redacted' | 'unableToDecrypt'>
> = {
  'm.text': 'text',
  'm.notice': 'text',
  'm.emote': 'text',
  'm.image': 'image',
  'm.audio': 'audio',
  'm.video': 'video',
  'm.file': 'file',
}

/**
 * Classify an event returned by the client-server API
 * (`GET /rooms/{roomId}/event/{eventId}`) as the WebView engine reads it.
 * That engine has no crypto, so an encrypted event is undecryptable there.
 */
export function classifyClientServerEvent(
  event: ClientServerEvent,
): ReportedMessageView {
  const sender = typeof event.sender === 'string' ? event.sender : undefined
  const timestamp =
    typeof event.origin_server_ts === 'number'
      ? event.origin_server_ts
      : undefined
  const content = event.content ?? {}
  // A redacted event keeps its type but loses its content.
  if (event.unsigned?.redacted_because || Object.keys(content).length === 0) {
    return {state: 'redacted', sender, timestamp}
  }
  if (event.type === 'm.room.encrypted') {
    return {state: 'undecryptable', sender, timestamp}
  }
  if (event.type === 'm.room.message' && sender) {
    const msgtype = typeof content.msgtype === 'string' ? content.msgtype : ''
    return {
      state: 'message',
      sender,
      timestamp,
      kind: MSGTYPE_KIND[msgtype] ?? 'text',
      body: typeof content.body === 'string' ? content.body : '',
    }
  }
  return {state: 'unavailable', reason: 'error'}
}

/** The same view from a message the native engine mapped from its timeline. */
export function viewFromChatMessage(message: ChatMessage): ReportedMessageView {
  if (message.kind === 'redacted') {
    return {
      state: 'redacted',
      sender: message.sender,
      timestamp: message.timestamp,
    }
  }
  if (message.kind === 'unableToDecrypt') {
    return {
      state: 'undecryptable',
      sender: message.sender,
      timestamp: message.timestamp,
    }
  }
  return {
    state: 'message',
    sender: message.sender,
    timestamp: message.timestamp,
    kind: message.kind,
    body: message.body,
  }
}

/**
 * Read one event with the moderator's own session over the client-server API.
 * Used by the WebView engine; the native engine reads through its timeline.
 */
export async function fetchReportedMessage({
  homeServer,
  accessToken,
  roomId,
  eventId,
  fetchImpl = fetch,
}: {
  homeServer: string
  accessToken: string
  roomId: string
  eventId: string
  fetchImpl?: typeof fetch
}): Promise<ReportedMessageView> {
  const url =
    homeServer.replace(/\/$/, '') +
    `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/event/${encodeURIComponent(eventId)}`
  let res: Response
  try {
    res = await fetchImpl(url, {
      headers: {Authorization: `Bearer ${accessToken}`},
    })
  } catch {
    return {state: 'unavailable', reason: 'error'}
  }
  if (res.status === 404) return {state: 'unavailable', reason: 'not-found'}
  // Synapse answers 403 when this user cannot see the event, e.g. it was sent
  // before they joined the room.
  if (res.status === 403) return {state: 'unavailable', reason: 'no-access'}
  if (!res.ok) return {state: 'unavailable', reason: 'error'}
  try {
    return classifyClientServerEvent((await res.json()) as ClientServerEvent)
  } catch {
    return {state: 'unavailable', reason: 'error'}
  }
}
