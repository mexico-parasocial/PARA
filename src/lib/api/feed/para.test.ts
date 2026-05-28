import {type BskyAgent} from '@atproto/api'

import {
  buildParaTimelineFilterParams,
  ParaTimelineFeedAPI,
} from '#/lib/api/feed/para'

describe('ParaTimelineFeedAPI', () => {
  it('omits empty filter params', () => {
    expect(buildParaTimelineFilterParams({})).toEqual({})
  })

  it('builds party and community filter params', () => {
    expect(
      buildParaTimelineFilterParams({
        party: 'Morena',
        community: 'Auth Left',
      }),
    ).toEqual({
      party: 'Morena',
      community: 'Auth Left',
    })
  })

  it('calls com.para.feed.getTimeline with no filter params by default', async () => {
    const agent = createAgent()
    const api = new ParaTimelineFeedAPI({agent: agent as unknown as BskyAgent})

    await api.fetch({cursor: undefined, limit: 30})

    expect(agent.call).toHaveBeenCalledWith('com.para.feed.getTimeline', {
      limit: 30,
      cursor: undefined,
    })
  })

  it('passes party and community filter params to getTimeline', async () => {
    const agent = createAgent()
    const api = new ParaTimelineFeedAPI({
      agent: agent as unknown as BskyAgent,
      filters: {party: 'PAN', community: 'Center Right'},
    })

    await api.fetch({cursor: 'cursor-1', limit: 50})

    expect(agent.call).toHaveBeenCalledWith('com.para.feed.getTimeline', {
      limit: 50,
      cursor: 'cursor-1',
      party: 'PAN',
      community: 'Center Right',
    })
  })

  it('hydrates timeline results into feed view posts', async () => {
    const agent = createAgent({
      feed: [
        {
          uri: 'at://did:plc:alice/com.para.post/1',
          cid: 'bafy-post',
          author: 'did:plc:alice',
          text: 'Hello from PARA',
          createdAt: '2026-04-30T10:00:00.000Z',
          tags: ['policy'],
          flairs: ['||#'],
          postType: 'policy',
        },
      ],
    })
    const api = new ParaTimelineFeedAPI({agent: agent as unknown as BskyAgent})

    const result = await api.fetch({cursor: undefined, limit: 30})

    expect(result.feed[0].post.uri).toBe('at://did:plc:alice/com.para.post/1')
    expect(result.feed[0].post.author.handle).toBe('alice.test')
    expect(result.feed[0].post.record).toMatchObject({
      $type: 'app.bsky.feed.post',
      text: 'Hello from PARA',
      flairs: ['||#'],
      postType: 'policy',
    })
  })
})

function createAgent(data?: {feed?: unknown[]}): {
  call: jest.Mock
  getProfile: jest.Mock
} {
  return {
    call: jest.fn().mockResolvedValue({
      data: {
        cursor: 'next-cursor',
        feed: data?.feed ?? [],
      },
    }),
    getProfile: jest.fn().mockResolvedValue({
      data: {
        did: 'did:plc:alice',
        handle: 'alice.test',
        displayName: 'Alice',
        labels: [],
      },
    }),
  }
}
