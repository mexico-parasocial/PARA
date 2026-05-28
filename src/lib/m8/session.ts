import { clearM8Session,getCurrentSession, postSessionStart, restoreM8Session } from './api'
import type { M8SessionStartResponse, ProofBrokerSession } from './types'

export async function startM8Session(identifier: string): Promise<M8SessionStartResponse> {
  return postSessionStart(identifier)
}

export async function fetchM8Session(): Promise<ProofBrokerSession> {
  return getCurrentSession()
}

export async function restoreM8SessionOrNull(): Promise<ProofBrokerSession | null> {
  return restoreM8Session()
}

export async function logoutM8() {
  await clearM8Session()
}
