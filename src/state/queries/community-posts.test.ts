import {type Client} from '@atproto/lex'

import {
  type CommunityPostHydrationAgent,
  hydrateCommunityPosts,
} from '#/lib/community-posts'
import {app} from '#/lexicons'

describe('community posts query helpers', () => {
  it('hydrates PARA community posts into PostView objects', async () => {
    const profileCache = new Map<
      string,
      app.bsky.actor.defs.ProfileViewDetailed
    >()
    const call = jest.fn().mockResolvedValue({
      did: 'did:plc:alice',
      handle: 'alice.test',
      displayName: 'Alice',
      labels: [],
    })
    const agent = {
      appviewClient: {call},
    } as unknown as CommunityPostHydrationAgent

    const posts = await hydrateCommunityPosts({
      agent,
      profileCache,
      posts: [
        {
          uri: 'at://did:plc:alice/com.para.post/1',
          cid: 'bafy-post',
          author: 'did:plc:alice',
          text: 'Community post',
          createdAt: '2026-04-30T10:00:00.000Z',
          flairs: ['||#'],
          postType: 'policy',
        },
      ],
    })

    expect(call).toHaveBeenCalledWith(app.bsky.actor.getProfile, {
      actor: 'did:plc:alice',
    })
    expect(posts[0]).toMatchObject({
      uri: 'at://did:plc:alice/com.para.post/1',
      author: {
        handle: 'alice.test',
      },
      record: {
        $type: 'app.bsky.feed.post',
        text: 'Community post',
        flairs: ['||#'],
        postType: 'policy',
      },
    })
  })

  it('reuses cached author profiles', async () => {
    const profileCache = new Map<
      string,
      app.bsky.actor.defs.ProfileViewDetailed
    >([
      [
        'did:plc:alice',
        {
          did: 'did:plc:alice',
          handle: 'cached.test',
          displayName: 'Cached',
          labels: [],
        },
      ],
    ])
    const call = jest.fn()
    const agent = {
      appviewClient: {call},
    } as unknown as CommunityPostHydrationAgent & {appviewClient: Client}

    const posts = await hydrateCommunityPosts({
      agent,
      profileCache,
      posts: [
        {
          uri: 'at://did:plc:alice/com.para.post/1',
          cid: 'bafy-post',
          author: 'did:plc:alice',
          text: 'Community post',
          createdAt: '2026-04-30T10:00:00.000Z',
        },
      ],
    })

    expect(call).not.toHaveBeenCalled()
    expect(posts[0].author.handle).toBe('cached.test')
  })
})
