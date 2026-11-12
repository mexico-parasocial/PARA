import {type AtUriString} from '@atproto/syntax'

import {type CabildeoServiceAgent} from '#/lib/api/cabildeo'
import {isUnsupportedMethodError} from '#/lib/api/unsupported-method'
import {com} from '#/lexicons'

/*
 * Conclusions of forum and persuasion cabildeos. The AppView serves one only
 * when a current steward of the cabildeo's community wrote it, so an empty
 * answer means "nothing to show", never "nobody concluded".
 */

export const CONCLUSION_COLLECTION = 'com.para.civic.conclusion'

export type ConclusionView = com.para.civic.getConclusion.ConclusionView
export type CitedPositionView = com.para.civic.getConclusion.CitedPosition

export type ConclusionOfCabildeo = {
  /** The newest conclusion by a current steward. */
  conclusion: ConclusionView | null
  /** Superseded conclusions, newest first. */
  earlier: ConclusionView[]
  /**
   * The board the cabildeo resolves to, when conclusions can be served for it.
   * A conclusion record must name it.
   */
  communityUri: string | null
}

export const EMPTY_CONCLUSION: ConclusionOfCabildeo = {
  conclusion: null,
  earlier: [],
  communityUri: null,
}

/** An AppView without the method yet reads as empty, like Seguimiento. */
export async function fetchConclusion(
  agent: CabildeoServiceAgent,
  cabildeoUri: string,
): Promise<ConclusionOfCabildeo> {
  try {
    const res = await agent.appviewClient.call(com.para.civic.getConclusion, {
      cabildeo: cabildeoUri as AtUriString,
    })
    return {
      conclusion: res.conclusion ?? null,
      earlier: res.earlier ?? [],
      communityUri: res.communityUri ?? null,
    }
  } catch (err: unknown) {
    if (isUnsupportedMethodError(err)) return EMPTY_CONCLUSION
    throw err
  }
}

export async function publishConclusion(
  agent: CabildeoServiceAgent,
  input: {
    cabildeo: string
    communityUri: string
    text: string
    cited: string[]
    officialThreadSlug?: string
    reviewDate?: string
  },
) {
  if (!agent.session) throw new Error('Not logged in')
  return await agent.pdsClient.call(com.atproto.repo.createRecord, {
    repo: agent.session.did,
    collection: CONCLUSION_COLLECTION,
    record: {
      cabildeo: input.cabildeo,
      communityUri: input.communityUri,
      text: input.text.trim(),
      ...(input.cited.length > 0 ? {cited: input.cited} : {}),
      ...(input.officialThreadSlug
        ? {officialThreadSlug: input.officialThreadSlug}
        : {}),
      ...(input.reviewDate ? {reviewDate: input.reviewDate} : {}),
      createdAt: new Date().toISOString(),
    },
  })
}
