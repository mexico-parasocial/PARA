import {type AppBskyActorDefs} from '@atproto/api'

import {
  type CommunityPostHydrationAgent,
  hydrateCommunityPosts,
} from '#/lib/community-posts'

describe('community posts query helpers', () => {
  it('hydrates PARA community posts into PostView objects', async () => {
    const profileCache = new Map<string, AppBskyActorDefs.ProfileViewDetailed>()
    const agent = {
      getProfile: jest.fn().mockResolvedValue({
        data: {
          did: 'did:plc:alice',
          handle: 'alice.test',
          displayName: 'Alice',
          labels: [],
        },
      }),
    } satisfies CommunityPostHydrationAgent

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

    expect(agent.getProfile).toHaveBeenCalledWith({actor: 'did:plc:alice'})
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
    const profileCache = new Map<string, AppBskyActorDefs.ProfileViewDetailed>([
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
    const agent: CommunityPostHydrationAgent & {getProfile: jest.Mock} = {
      getProfile: jest.fn(),
    }

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

    expect(agent.getProfile).not.toHaveBeenCalled()
    expect(posts[0].author.handle).toBe('cached.test')
  })
})
