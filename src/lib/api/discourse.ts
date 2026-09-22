import {type AtUriString} from '@atproto/syntax'

import {
  type PublicSessionBundle,
  type SessionBundle,
} from '#/state/session/session-core'
import {com} from '#/lexicons'
import {
  type DiscourseSnapshot,
  type DiscourseTopology,
  type TopicCluster,
} from './para-lexicons'

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
  }): Promise<TopicCluster[]> {
    if (!params.community) return []
    const res = await this.agent.appviewClient.call(
      com.para.discourse.getTopics,
      {
        community: params.community as AtUriString,
      },
    )
    // The lexicon's Topic shape (label/weight/growthRate) no longer matches
    // the legacy TopicCluster view; cast keeps the consumer contract while
    // the screen is updated to the new fields.
    return (res.topics as unknown as TopicCluster[]) ?? []
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
    return (res.topology as unknown as DiscourseTopology) ?? null
  }
}
