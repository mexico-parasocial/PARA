import {makePostThreadLink} from '#/lib/routes/links'
import {Router} from '#/lib/routes/router'
import {postUriToRelativePath} from '#/lib/strings/url-helpers'

const router = new Router({
  PostThread: '/profile/:name/post/:rkey',
})

describe('post thread route links', () => {
  it('omits the collection query param for Bluesky posts', () => {
    expect(
      makePostThreadLink(
        {did: 'did:plc:alice', handle: 'alice.test'},
        'abc',
        'app.bsky.feed.post',
      ),
    ).toBe('/profile/alice.test/post/abc')
  })

  it('round-trips the collection query param for Para posts', () => {
    const href = makePostThreadLink(
      {did: 'did:plc:alice', handle: 'alice.test'},
      'abc',
      'com.para.post',
    )

    expect(href).toBe('/profile/alice.test/post/abc?collection=com.para.post')
    expect(router.matchPath(href)).toEqual([
      'PostThread',
      {
        name: 'alice.test',
        rkey: 'abc',
        collection: 'com.para.post',
      },
    ])
  })

  it('creates Para post paths from at-uris', () => {
    expect(
      postUriToRelativePath('at://did:plc:alice/com.para.post/abc', {
        handle: 'alice.test',
      }),
    ).toBe('/profile/alice.test/post/abc?collection=com.para.post')
  })
})
