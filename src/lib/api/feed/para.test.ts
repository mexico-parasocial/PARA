import {type Client} from '@atproto/lex'

import {app} from '#/lexicons'
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

  it('calls the Bluesky timeline fallback with no filter params by default', async () => {
    const client = createClient()
    const api = new ParaTimelineFeedAPI({client: client as unknown as Client})

    await api.fetch({cursor: undefined, limit: 30})

    expect(client.call).toHaveBeenCalledWith(app.bsky.feed.getTimeline, {
      limit: 30,
      cursor: undefined,
    })
  })

  it('stores party and community filters for the Para timeline', () => {
    const client = createClient()
    const api = new ParaTimelineFeedAPI({
      client: client as unknown as Client,
      filters: {party: 'PAN', community: 'Center Right'},
    })

    expect(api.filters).toEqual({party: 'PAN', community: 'Center Right'})
  })

  it('hydrates timeline results into feed view posts', async () => {
    const client = createClient()
    const api = new ParaTimelineFeedAPI({client: client as unknown as Client})

    const result = await api.hydrateTimelinePost({
      uri: 'at://did:plc:alice/com.para.post/1',
      cid: 'bafy-post',
      author: 'did:plc:alice',
      text: 'Hello from PARA',
      createdAt: '2026-04-30T10:00:00.000Z',
      tags: ['policy'],
      flairs: ['||#'],
      postType: 'policy',
    })

    expect(result.post.uri).toBe('at://did:plc:alice/com.para.post/1')
    expect(result.post.author.handle).toBe('alice.test')
    expect(result.post.record).toMatchObject({
      $type: 'app.bsky.feed.post',
      text: 'Hello from PARA',
      flairs: ['||#'],
      postType: 'policy',
    })
  })

  it('returns an empty feed when the timeline call fails', async () => {
    const bskyPost = {
      post: {
        uri: 'at://did:plc:alice/app.bsky.feed.post/1',
        cid: 'bafy-bsky-post',
        author: {
          did: 'did:plc:alice',
          handle: 'alice.bsky.social',
        },
        record: {
          $type: 'app.bsky.feed.post',
          text: 'Hello from Bluesky',
          createdAt: '2026-06-05T10:00:00.000Z',
        },
        indexedAt: '2026-06-05T10:00:00.000Z',
      },
    }
    const client = createClient({feed: [bskyPost]})
    client.call.mockRejectedValueOnce(new Error('Method Not Implemented'))
    const api = new ParaTimelineFeedAPI({client: client as unknown as Client})

    const result = await api.fetch({cursor: 'cursor-1', limit: 30})

    expect(client.call).toHaveBeenCalledWith(app.bsky.feed.getTimeline, {
      cursor: 'cursor-1',
      limit: 30,
    })
    expect(result).toEqual({feed: []})
  })
})

function createClient(data?: {feed?: unknown[]}): {
  call: jest.Mock
} {
  return {
    call: jest.fn(async (proc: unknown) => {
      if (proc === app.bsky.actor.getProfile) {
        return {
          did: 'did:plc:alice',
          handle: 'alice.test',
          displayName: 'Alice',
          labels: [],
        }
      }
      return {
        cursor: 'next-cursor',
        feed: data?.feed ?? [],
      }
    }),
  }
}
