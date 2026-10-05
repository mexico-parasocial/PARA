import {getCurrentSession, restoreM8Session, revokeM8Session} from './api'
import {type ProofBrokerSession} from './types'

export {connectM8SessionFor} from './grant'

export async function fetchM8Session(): Promise<ProofBrokerSession> {
  return getCurrentSession()
}

export async function restoreM8SessionOrNull(): Promise<ProofBrokerSession | null> {
  return restoreM8Session()
}

export async function logoutM8() {
  await revokeM8Session()
}
