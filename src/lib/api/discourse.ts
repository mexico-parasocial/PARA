import {type AtUriString} from '@atproto/syntax'

import {
  type PublicSessionBundle,
  type SessionBundle,
} from '#/state/session/session-core'
import {com} from '#/lexicons'
import {type Topic} from '#/lexicons/com/para/discourse/getTopics'
import {type DiscourseSnapshot, type DiscourseTopology} from './para-lexicons'

const DENSITY_KEYS = {
  'auth-left': 'authLeft',
  'auth-center': 'authCenter',
  'auth-right': 'authRight',
  'center-left': 'centerLeft',
  center: 'center',
  'center-right': 'centerRight',
  'lib-left': 'libLeft',
  'lib-center': 'libCenter',
  'lib-right': 'libRight',
} as const

export class DiscourseAPI {
  constructor(public agent: SessionBundle | PublicSessionBundle) {}

  /**
   * The generated `com.para.discourse.getSnapshot` lexicon is now
   * subject-scoped (`{subject: at-uri}`) and no longer accepts the
   * community/timeframe filters this UI passes, so there is no equivalent
   * call to make — return the empty snapshot list and let the screen's
   * fallbacks render.
   */
  async getSnapshot(_params: {
    community?: string
    timeframe: '1h' | '24h' | '7d' | '30d'
  }): Promise<DiscourseSnapshot[]> {
    return []
  }

  async getTopics(params: {
    community?: string
    timeframe: '1h' | '24h' | '7d' | '30d'
  }): Promise<Topic[]> {
    if (!params.community) return []
    const res = await this.agent.appviewClient.call(
      com.para.discourse.getTopics,
      {
        community: params.community as AtUriString,
      },
    )
    return res.topics ?? []
  }

  async getTopology(params: {
    community?: string
    timeframe: '1h' | '24h' | '7d' | '30d'
  }): Promise<DiscourseTopology | null> {
    const res = await this.agent.appviewClient.call(
      com.para.discourse.getTopology,
      {
        community: params.community,
        timeframe: params.timeframe,
      },
    )
    const topology = res.topology
    if (!topology) return null

    // The lexicon uses camelCase density keys and optional analysis lists.
    // Adapt them to the chart contract, excluding protocol metadata ($type).
    const positionDensity: Record<string, number> = {}
    for (const [position, key] of Object.entries(DENSITY_KEYS)) {
      const density = topology.positionDensity[key]
      if (density !== undefined) positionDensity[position] = density
    }

    return {
      ...topology,
      positionDensity,
      contestedAxes: topology.contestedAxes ?? [],
      bridgeOpportunities: topology.bridgeOpportunities ?? [],
    }
  }
}
