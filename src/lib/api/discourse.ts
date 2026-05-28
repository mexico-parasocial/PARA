import {type BskyAgent} from '@atproto/api'

import {
  type DiscourseSnapshot,
  type DiscourseTopology,
  type TopicCluster,
} from './para-lexicons'

export class DiscourseAPI {
  constructor(public agent: BskyAgent) {}

  async getSnapshot(params: {
    community?: string
    timeframe: '1h' | '24h' | '7d' | '30d'
  }): Promise<DiscourseSnapshot[]> {
    const res = await this.agent.call('com.para.discourse.getSnapshot', {
      community: params.community,
      timeframe: params.timeframe,
    })
    return (res.data as {snapshots?: DiscourseSnapshot[]}).snapshots ?? []
  }

  async getTopics(params: {
    community?: string
    timeframe: '1h' | '24h' | '7d' | '30d'
  }): Promise<TopicCluster[]> {
    const res = await this.agent.call('com.para.discourse.getTopics', {
      community: params.community,
      timeframe: params.timeframe,
    })
    return (res.data as {topics?: TopicCluster[]}).topics ?? []
  }

  async getTopology(params: {
    community?: string
    timeframe: '1h' | '24h' | '7d' | '30d'
  }): Promise<DiscourseTopology | null> {
    const res = await this.agent.call('com.para.discourse.getTopology', {
      community: params.community,
      timeframe: params.timeframe,
    })
    return (res.data as {topology?: DiscourseTopology}).topology ?? null
  }
}
