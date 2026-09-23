// oxlint-disable-next-line import/no-nodejs-modules -- Test-only execution of the generated browser script.
import vm from 'node:vm'

import {buildClientHtml} from '#/screens/Communities/matrix-client'
import {matrixMediaUrl, safeMatrixFilename} from './media-url'

describe('authenticated Matrix media URLs', () => {
  it('uses the authenticated client endpoint without putting the token in the URL', () => {
    expect(
      matrixMediaUrl('https://matrix.example/', 'mxc://matrix.example/abc:123'),
    ).toBe(
      'https://matrix.example/_matrix/client/v1/media/download/matrix.example/abc%3A123',
    )
    expect(
      matrixMediaUrl(
        'https://matrix.example',
        'mxc://matrix.example/id',
        'thumbnail',
      ),
    ).toBe(
      'https://matrix.example/_matrix/client/v1/media/thumbnail/matrix.example/id?width=800&height=600&method=scale',
    )
  })

  it('rejects malformed media identifiers and strips path components from filenames', () => {
    expect(() =>
      matrixMediaUrl('https://matrix.example', 'https://other.example/image'),
    ).toThrow()
    expect(() =>
      matrixMediaUrl('https://matrix.example', 'mxc://matrix.example/id/extra'),
    ).toThrow()
    expect(safeMatrixFilename('../../private/photo.png')).toBe('photo.png')
  })
})

describe('WebView media client', () => {
  function helpers(fetchMock: jest.Mock) {
    const html = buildClientHtml()
    const start = html.indexOf('function mediaEndpoint(')
    const end = html.indexOf('function retainMediaUrl(', start)
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    const source = html.slice(start, end)
    return vm.runInNewContext(`${source}\n({mediaEndpoint, fetchMedia})`, {
      CONFIG: {homeServer: 'https://matrix.example', accessToken: 'secret'},
      fetch: fetchMock,
      Blob,
    }) as {
      mediaEndpoint: (mxc: string, thumbnail: boolean) => string
      fetchMedia: (
        mxc: string,
        thumbnail: boolean,
        limit: number,
      ) => Promise<Blob>
    }
  }

  it('sends the token only in the authorization header and produces a blob', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name === 'content-type' ? 'image/png' : null),
      },
      body: {
        getReader: () => ({
          read: jest
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new Uint8Array([1, 2, 3]),
            })
            .mockResolvedValueOnce({done: true}),
        }),
      },
    })
    const {fetchMedia} = helpers(fetchMock)
    const blob = await fetchMedia('mxc://matrix.example/photo', true, 10)
    expect(blob.size).toBe(3)
    expect(fetchMock).toHaveBeenCalledWith(
      matrixMediaUrl(
        'https://matrix.example',
        'mxc://matrix.example/photo',
        'thumbnail',
      ),
      {headers: {Authorization: 'Bearer secret'}},
    )
    const [requestedUrl] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(requestedUrl).not.toContain('secret')
  })

  it('refuses previews larger than the byte limit', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined)
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name === 'content-length' ? '11' : null),
      },
      body: {cancel},
    })
    const {fetchMedia} = helpers(fetchMock)
    await expect(
      fetchMedia('mxc://matrix.example/photo', true, 10),
    ).rejects.toThrow('MEDIA_TOO_LARGE')
    expect(cancel).toHaveBeenCalled()
  })

  it('also stops an unannounced oversized response while streaming', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined)
    const read = jest
      .fn()
      .mockResolvedValueOnce({done: false, value: new Uint8Array(6)})
      .mockResolvedValueOnce({done: false, value: new Uint8Array(6)})
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      headers: {get: () => null},
      body: {getReader: () => ({read, cancel})},
    })
    const {fetchMedia} = helpers(fetchMock)
    await expect(
      fetchMedia('mxc://matrix.example/photo', true, 10),
    ).rejects.toThrow('MEDIA_TOO_LARGE')
    expect(cancel).toHaveBeenCalled()
  })
})
