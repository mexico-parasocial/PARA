import {type AtUriString} from '@atproto/syntax'

import {type CabildeoServiceAgent} from '#/lib/api/cabildeo'
import {isUnsupportedMethodError} from '#/lib/api/unsupported-method'
import {com} from '#/lexicons'

/*
 * Seguimiento reads. The AppView serves a compromiso only when a steward of
 * the cabildeo's community wrote it and the cabildeo is a resolved activity
 * with a single winner that met its quorum (WatZappa
 * data-plane/server/routes/follow-through.ts). The client therefore treats an
 * empty answer as "nothing to show", never as "nobody followed up".
 */

export type FollowThroughView =
  com.para.civic.listFollowThrough.FollowThroughView
export type FollowThroughUpdateView =
  com.para.civic.listFollowThrough.UpdateView
export type FollowThroughSummaryView =
  com.para.civic.listFollowThrough.SummaryView

export type FollowThroughOfCabildeo = {
  /** Top-level compromisos, each with its children. No timelines. */
  items: FollowThroughView[]
  summary: FollowThroughSummaryView | null
}

export const EMPTY_FOLLOW_THROUGH: FollowThroughOfCabildeo = {
  items: [],
  summary: null,
}

/**
 * One cabildeo's seguimiento. An AppView that does not have the method yet
 * answers 501, which reads as empty so the cabildeo page keeps working.
 */
export async function fetchFollowThrough(
  agent: CabildeoServiceAgent,
  cabildeoUri: string,
): Promise<FollowThroughOfCabildeo> {
  try {
    const res = await agent.appviewClient.call(
      com.para.civic.listFollowThrough,
      {cabildeo: cabildeoUri as AtUriString},
    )
    return {
      items: res.items ?? [],
      summary:
        (res.summaries ?? []).find(s => s.cabildeo === cabildeoUri) ?? null,
    }
  } catch (err: unknown) {
    if (isUnsupportedMethodError(err)) return EMPTY_FOLLOW_THROUGH
    throw err
  }
}

/** One compromiso with its full timeline, or null when it is not served. */
export async function fetchFollowThroughItem(
  agent: CabildeoServiceAgent,
  uri: string,
): Promise<FollowThroughView | null> {
  try {
    const res = await agent.appviewClient.call(
      com.para.civic.getFollowThrough,
      {uri: uri as AtUriString},
    )
    return res.item ?? null
  } catch (err: unknown) {
    if (isUnsupportedMethodError(err)) return null
    const error =
      err && typeof err === 'object' ? (err as {error?: string}) : null
    if (error?.error === 'NotFound') return null
    throw err
  }
}
