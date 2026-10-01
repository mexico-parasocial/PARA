import {type CommunityBoardView} from '#/state/queries/community-boards'
import {resolveDocumentsScope, scopeFromBoard} from '../documentsScope'

const board = (name: string, rkey = name, memberCount = 1) =>
  ({
    uri: `at://did:plc:a/com.para.community.board/${rkey}`,
    name,
    slug: name.toLowerCase(),
    communityId: name.toLowerCase(),
    memberCount,
    createdAt: '2026-01-01T00:00:00.000Z',
  }) as CommunityBoardView

const uri = (b: CommunityBoardView) => b.uri

describe('resolveDocumentsScope', () => {
  it('is unscoped without params', () => {
    expect(resolveDocumentsScope(undefined, [board('PAN')])).toBeUndefined()
    expect(resolveDocumentsScope({}, [board('PAN')])).toBeUndefined()
  })

  it('trusts a URI and takes its display name from the board', () => {
    const pan = board('PAN')
    expect(
      resolveDocumentsScope({communityUri: pan.uri, communityName: 'x'}, [pan]),
    ).toEqual({name: 'PAN', uris: [pan.uri]})
  })

  it('keeps a URI whose board has not loaded, falling back to the name', () => {
    expect(
      resolveDocumentsScope(
        {communityUri: 'at://did:plc:a/board/z', communityName: 'PAN'},
        [],
      ),
    ).toEqual({name: 'PAN', uris: ['at://did:plc:a/board/z']})
  })

  it('spans every board of a community published more than once', () => {
    const a = board('PAN', 'a')
    const b = board('PAN', 'b')
    expect(resolveDocumentsScope({communityUri: a.uri}, [a, b])).toEqual({
      name: 'PAN',
      uris: [a.uri, b.uri],
    })
    expect(resolveDocumentsScope({communityName: 'PAN'}, [a, b])?.uris).toEqual(
      [a.uri, b.uri],
    )
  })

  it('spans same-named ordinary communities as one', () => {
    const a = board('Salud Pública', 'a')
    const b = board('Salud Pública', 'b')
    expect(scopeFromBoard(a, [a, b]).uris).toEqual([a.uri, b.uri])
    expect(
      resolveDocumentsScope({communityName: 'Salud Pública'}, [a, b])?.uris,
    ).toEqual([a.uri, b.uri])
  })

  it('matches a name only to that party, not to a longer name', () => {
    const pan = board('PAN')
    const scope = resolveDocumentsScope({communityName: 'PAN'}, [
      board('PAN supporters'),
      pan,
    ])
    expect(scope?.uris).toEqual([pan.uri])
  })

  it('resolves a ninth by name, and is empty when it has no board', () => {
    const ninth = board('Auth Left')
    expect(
      resolveDocumentsScope({communityName: 'Auth Left'}, [ninth])?.uris,
    ).toEqual([uri(ninth)])
    expect(
      resolveDocumentsScope({communityName: 'Auth Left'}, [board('PAN')]),
    ).toEqual({name: 'Auth Left', uris: []})
  })
})
