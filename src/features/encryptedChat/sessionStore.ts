import {
  type ClientSessionDelegate,
  type Session,
} from '@unomed/react-native-matrix-sdk'

import {assertSessionScope} from './scope'
import {type ChatScope} from './types'

export type SavedDevice = {
  version: 1
  storeId: string
  storeKey: string
  session?: Session
}

/** SDK refresh callbacks must durably replace both rotating tokens before returning. */
export function createSessionDelegate(
  scope: ChatScope,
  saved: SavedDevice,
  storage: {
    read: () => string | null
    write: (value: string) => void
    revoked: () => boolean
  },
): ClientSessionDelegate {
  const validate = (session: Session) => {
    if (storage.revoked()) throw new Error('CHAT_CLOSED')
    assertSessionScope(scope, session)
    if (saved.session && session.deviceId !== saved.session.deviceId)
      throw new Error('CHAT_SESSION_MISMATCH')
  }
  return {
    retrieveSessionFromKeychain(userId) {
      if (userId !== scope.userId || storage.revoked())
        throw new Error('CHAT_SESSION_MISMATCH')
      const raw = storage.read()
      const latest: SavedDevice | undefined = raw ? JSON.parse(raw) : undefined
      if (!latest?.session) throw new Error('CHAT_LOGIN_REQUIRED')
      if (
        latest.storeId !== saved.storeId ||
        latest.storeKey !== saved.storeKey ||
        latest.version !== 1
      )
        throw new Error('CHAT_SESSION_MISMATCH')
      validate(latest.session)
      saved.session = latest.session
      return latest.session
    },
    saveSessionInKeychain(session) {
      validate(session)
      storage.write(JSON.stringify({...saved, session}))
      saved.session = session
    },
  }
}
