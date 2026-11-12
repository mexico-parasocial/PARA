jest.mock('#/lib/constants', () => ({
  LOCAL_DEV_SERVICE: 'http://Dev-Mac.local:2583',
}))
jest.mock('#/env', () => ({IS_WEB: false}))

import {toDeviceReachableUri} from '#/lib/media/localDevUri'

describe('toDeviceReachableUri', () => {
  it('serves local AppView images from the reachable PDS', () => {
    expect(
      toDeviceReachableUri(
        'http://localhost:2584/img/avatar_thumbnail/plain/did:plc:abc/bafkrei123@jpeg',
      ),
    ).toBe(
      'http://Dev-Mac.local:2583/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aabc&cid=bafkrei123',
    )
  })

  it('rewrites the local PDS origin', () => {
    expect(toDeviceReachableUri('http://localhost:2583/xrpc/_health')).toBe(
      'http://Dev-Mac.local:2583/xrpc/_health',
    )
  })

  it('leaves other URLs alone', () => {
    const cdn = 'https://cdn.bsky.app/img/avatar/plain/did:plc:abc/bafk@jpeg'
    expect(toDeviceReachableUri(cdn)).toBe(cdn)
    expect(toDeviceReachableUri('http://localhost:2584/xrpc/x')).toBe(
      'http://localhost:2584/xrpc/x',
    )
    expect(toDeviceReachableUri(undefined)).toBeUndefined()
  })
})
