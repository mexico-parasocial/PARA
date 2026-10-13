import {matrixBridgeFetch} from './bridge'
import {BRIDGE_AUDIENCES, bridgeCallWithProof} from './proofs'

/**
 * Matrix direct messages by consent (bridge `routes/dm-requests.ts`).
 *
 * The homeserver cannot name the Matrix account behind a DID, so a DM starts
 * as a request: the requester proves its MXID with iM8 (audience dm.v1),
 * which is its consent to share it with the recipient. Listings never carry
 * MXIDs. On accept the recipient alone receives the requester's MXID, once,
 * and its own client creates the encrypted direct room and invites it.
 */

export interface IncomingDmRequest {
  id: string
  requesterDid: string
  createdAt: string
  expiresAt: string
}

export interface OutgoingDmRequest {
  id: string
  recipientDid: string
  /** `accepted`: the recipient said yes and an encrypted invite is coming. */
  status: 'pending' | 'accepted'
  createdAt: string
  expiresAt: string
}

export interface DmRequests {
  incoming: IncomingDmRequest[]
  outgoing: OutgoingDmRequest[]
}

/** Matrix session pieces the REST room creation needs (web OIDC session). */
export interface MatrixRestSession {
  homeServer: string
  accessToken: string
  userId: string
}

async function bridgeJson<T>(path: string, init: RequestInit): Promise<T> {
  const res = await matrixBridgeFetch(path, init)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {error?: string}
    throw new Error(body.error || `Bridge call failed: ${res.status}`)
  }
  return (await res.json()) as T
}

/** Ask `recipientDid` for a DM. Opens iM8 to approve sharing the chat identity. */
export function requestDirectMessage(
  recipientDid: string,
): Promise<{id: string; expiresAt: string}> {
  return bridgeCallWithProof(BRIDGE_AUDIENCES.dm, '/api/dm-requests', {
    recipientDid,
  })
}

export function listDirectMessageRequests(): Promise<DmRequests> {
  return bridgeJson('/api/dm-requests', {method: 'GET'})
}

/** Recipient only. Returns the requester's MXID once; the request is gone after. */
export function acceptDirectMessageRequest(
  id: string,
): Promise<{requesterDid: string; requesterMxid: string}> {
  return bridgeJson('/api/dm-requests/accept', {
    method: 'POST',
    body: JSON.stringify({id}),
  })
}

/** Recipient declines, or requester cancels. */
export async function declineDirectMessageRequest(id: string): Promise<void> {
  await bridgeJson('/api/dm-requests/decline', {
    method: 'POST',
    body: JSON.stringify({id}),
  })
}

async function matrixJson<T>(
  session: MatrixRestSession,
  path: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(
    `${session.homeServer.replace(/\/$/, '')}/_matrix/client/v3${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  )
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {errcode?: string}
    throw new Error(body.errcode || `Matrix request failed: ${res.status}`)
  }
  return (await res.json()) as T
}

/**
 * Create an encrypted direct room inviting `invitee` through the client-server
 * API, and record it in the account's m.direct data the way Matrix clients
 * expect. The encryption state is part of the creation, so no message can be
 * sent in the clear before it applies.
 */
export async function createEncryptedDirectRoom(
  session: MatrixRestSession,
  invitee: string,
): Promise<string> {
  const {room_id: roomId} = await matrixJson<{room_id: string}>(
    session,
    '/createRoom',
    {
      method: 'POST',
      body: JSON.stringify({
        preset: 'trusted_private_chat',
        is_direct: true,
        invite: [invitee],
        initial_state: [
          {
            type: 'm.room.encryption',
            state_key: '',
            content: {algorithm: 'm.megolm.v1.aes-sha2'},
          },
          // Invited members get the keys of what is sent before they join,
          // starting with the DM intro.
          {
            type: 'm.room.history_visibility',
            state_key: '',
            content: {history_visibility: 'invited'},
          },
        ],
      }),
    },
  )

  const directPath = `/user/${encodeURIComponent(session.userId)}/account_data/m.direct`
  let direct: Record<string, string[]> = {}
  try {
    direct = await matrixJson<Record<string, string[]>>(session, directPath, {
      method: 'GET',
    })
  } catch {
    // M_NOT_FOUND: no direct rooms recorded yet.
  }
  const rooms = new Set(direct[invitee] ?? [])
  rooms.add(roomId)
  await matrixJson(session, directPath, {
    method: 'PUT',
    body: JSON.stringify({...direct, [invitee]: [...rooms]}),
  })
  return roomId
}
