import {type Session} from '@unomed/react-native-matrix-sdk'

import {createSessionDelegate, type SavedDevice} from './sessionStore'

const scope = {
  accountId: 'did:plc:alice',
  homeserver: 'https://matrix.example',
  userId: '@alice:matrix.example',
}
const session = {
  userId: scope.userId,
  homeserverUrl: scope.homeserver,
  deviceId: 'DEVICE',
  accessToken: 'old',
  refreshToken: 'old-refresh',
} as Session
function fixture() {
  const saved: SavedDevice = {
    version: 1,
    storeId: 'store',
    storeKey: 'key',
    session,
  }
  let raw = JSON.stringify(saved)
  let revoked = false
  const write = jest.fn(value => {
    raw = value
  })
  const delegate = createSessionDelegate(scope, saved, {
    read: () => raw,
    write,
    revoked: () => revoked,
  })
  return {
    delegate,
    write,
    saved,
    revoke: () => {
      revoked = true
      raw = ''
    },
  }
}
it('persists the rotated token pair and retrieves the latest saved device', () => {
  const {delegate, saved, write} = fixture()
  const fresh = {...session, accessToken: 'new', refreshToken: 'new-refresh'}
  delegate.saveSessionInKeychain(fresh)
  expect(delegate.retrieveSessionFromKeychain(scope.userId)).toEqual(fresh)
  expect(JSON.parse(write.mock.calls[0][0])).toMatchObject({
    storeId: saved.storeId,
    storeKey: saved.storeKey,
    session: fresh,
  })
})
it('refuses a token pair from another Matrix account or device', () => {
  const {delegate, write} = fixture()
  expect(() =>
    delegate.saveSessionInKeychain({...session, userId: '@bob:matrix.example'}),
  ).toThrow('CHAT_SESSION_MISMATCH')
  expect(() =>
    delegate.saveSessionInKeychain({...session, deviceId: 'OTHER'}),
  ).toThrow('CHAT_SESSION_MISMATCH')
  expect(write).not.toHaveBeenCalled()
})
it('does not resurrect a session after logout', () => {
  const {delegate, write, revoke} = fixture()
  revoke()
  expect(() =>
    delegate.saveSessionInKeychain({...session, accessToken: 'late'}),
  ).toThrow('CHAT_CLOSED')
  expect(write).not.toHaveBeenCalled()
})
