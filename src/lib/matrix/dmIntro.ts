import {type OutgoingDmRequest} from './directMessages'

/**
 * The first message of a Matrix DM created by accepting a request: encrypted,
 * sent by the recipient (B) right after creating the room. It names the
 * request and B's DID so the requester (A) can tell the invite is B's.
 *
 * An invite alone proves nothing: anyone A shares a community room with can
 * see A's MXID. The request id can: only A, B and the bridge know it.
 */
export const DM_INTRO_MSGTYPE = 'com.para.dm.intro'

export type DmIntro = {requestId: string; did: string}

/**
 * The intro travels as an m.room.message with its own msgtype and the intro
 * as JSON in the body: every client keeps m.room.message in its timeline
 * (custom event types can be filtered out), and PARA hides it by msgtype.
 */
export function dmIntroMessage(intro: DmIntro): {
  msgtype: string
  body: string
} {
  return {msgtype: DM_INTRO_MSGTYPE, body: JSON.stringify(intro)}
}

/** The intro carried by a message of the intro msgtype; undefined if malformed. */
export function parseDmIntroBody(body: string): DmIntro | undefined {
  try {
    const value = JSON.parse(body) as Partial<DmIntro>
    if (typeof value?.requestId === 'string' && typeof value?.did === 'string')
      return {requestId: value.requestId, did: value.did}
  } catch {}
  return undefined
}

/**
 * The accepted request this intro answers, or undefined when it answers none
 * of A's: wrong shape, unknown or still-pending request, or a DID that is not
 * the one A asked.
 */
export function matchDmIntro(
  content: unknown,
  outgoing: OutgoingDmRequest[],
): OutgoingDmRequest | undefined {
  if (!content || typeof content !== 'object') return undefined
  const {requestId, did} = content as Partial<DmIntro>
  if (typeof requestId !== 'string' || typeof did !== 'string') return undefined
  return outgoing.find(
    r =>
      r.id === requestId && r.status === 'accepted' && r.recipientDid === did,
  )
}
