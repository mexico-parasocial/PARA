import {adaptParaPostThread} from '#/state/queries/usePostThread/para'

describe('adaptParaPostThread', () => {
  it('maps Para parents, anchor, and replies into thread item depths', () => {
    const result = adaptParaPostThread({
      post: paraPost('at://did:plc:alice/com.para.post/root'),
      parents: [
        paraPost('at://did:plc:alice/com.para.post/grandparent'),
        paraPost('at://did:plc:alice/com.para.post/parent'),
      ],
      replies: [
        paraPost('at://did:plc:bob/com.para.post/reply', {
          replyRoot: 'at://did:plc:alice/com.para.post/root',
          replyParent: 'at://did:plc:alice/com.para.post/root',
        }),
        paraPost('at://did:plc:carol/com.para.post/nested', {
          replyRoot: 'at://did:plc:alice/com.para.post/root',
          replyParent: 'at://did:plc:bob/com.para.post/reply',
        }),
      ],
    })

    expect(result.thread.map(item => item.depth)).toEqual([-2, -1, 0, 1, 2])
    expect(result.thread[2].uri).toBe('at://did:plc:alice/com.para.post/root')
    const anchorValue = result.thread[2].value as {
      post: {uri: string; record: unknown}
    }
    expect(anchorValue.post.uri).toBe('at://did:plc:alice/com.para.post/root')
    expect(anchorValue.post.record).toMatchObject({
      $type: 'app.bsky.feed.post',
      text: 'Para post',
    })
    expect(result.hasOtherReplies).toBe(false)
  })
})

function paraPost(
  uri: string,
  overrides: Partial<{
    replyRoot: string
    replyParent: string
  }> = {},
) {
  const author = uri.split('/')[2]
  return {
    uri,
    cid: `cid-${uri.split('/').at(-1)}`,
    author,
    text: 'Para post',
    createdAt: '2026-04-30T10:00:00.000Z',
    langs: ['en'],
    tags: [],
    flairs: [],
    ...overrides,
  }
}
