import * as Storage from '#/lib/storage'
import {type OutgoingDmRequest} from './directMessages'
import {matchDmIntro} from './dmIntro'

/**
 * Direct rooms this device has verified, per account: which DID is on the
 * other side of each room. Kept on the device only; the homeserver and the
 * bridge never hold this pairing.
 */
export type VerifiedDmRoom = {roomId: string; did: string}

const key = (accountDid: string) => `matrix_dm_rooms:${accountDid}`

export async function listVerifiedDmRooms(
  accountDid: string,
): Promise<VerifiedDmRoom[]> {
  const raw = await Storage.getItemAsync(key(accountDid))
  if (!raw) return []
  try {
    const value = JSON.parse(raw)
    return Array.isArray(value)
      ? value.filter(
          (r): r is VerifiedDmRoom =>
            typeof r?.roomId === 'string' && typeof r?.did === 'string',
        )
      : []
  } catch {
    return []
  }
}

export async function rememberVerifiedDmRoom(
  accountDid: string,
  room: VerifiedDmRoom,
): Promise<void> {
  const rooms = (await listVerifiedDmRooms(accountDid)).filter(
    r => r.roomId !== room.roomId,
  )
  await Storage.setItemAsync(key(accountDid), JSON.stringify([room, ...rooms]))
}

export type DirectInvite = {roomId: string}

export type ReconcileDeps = {
  /** Join the invite and return the first intro found in it, if any. */
  readIntro: (roomId: string) => Promise<unknown>
  leave: (roomId: string) => Promise<void>
  remember: (room: VerifiedDmRoom) => Promise<void>
  /** Remove the bridge request once its room is verified. */
  dismissRequest: (requestId: string) => Promise<void>
}

export type ReconcileResult = {verified: VerifiedDmRoom[]; left: string[]}

/**
 * The requester's side of a DM by consent. Only while it has an accepted
 * request does it join direct invites; it keeps a room only if the room's
 * intro names one of those requests and that request's recipient, and leaves
 * any other. With nothing accepted it leaves invites untouched: they are not
 * DMs it asked for.
 */
export async function reconcileDirectInvites(
  invites: DirectInvite[],
  outgoing: OutgoingDmRequest[],
  deps: ReconcileDeps,
): Promise<ReconcileResult> {
  const result: ReconcileResult = {verified: [], left: []}
  let pending = outgoing.filter(r => r.status === 'accepted')
  for (const invite of invites) {
    if (pending.length === 0) break
    let intro: unknown
    try {
      intro = await deps.readIntro(invite.roomId)
    } catch {
      intro = undefined
    }
    const match = matchDmIntro(intro, pending)
    if (!match) {
      await deps.leave(invite.roomId)
      result.left.push(invite.roomId)
      continue
    }
    const room = {roomId: invite.roomId, did: match.recipientDid}
    await deps.remember(room)
    await deps.dismissRequest(match.id)
    pending = pending.filter(r => r !== match)
    result.verified.push(room)
  }
  return result
}
