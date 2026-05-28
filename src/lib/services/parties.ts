import {type Party, type Topic} from '#/lib/mock-data'
import {PARTIES, TOPICS} from '#/lib/mock-data'
import {USE_MOCK_DATA} from './config'

/**
 * Fetch all parties
 */
export async function fetchParties(): Promise<Party[]> {
  if (USE_MOCK_DATA) {
    await simulateNetworkDelay()
    return PARTIES
  }

  throw new Error('Real API not yet implemented for parties')
}

/**
 * Fetch a single party by ID
 */
export async function fetchPartyById(id: string): Promise<Party | null> {
  if (USE_MOCK_DATA) {
    await simulateNetworkDelay()
    return PARTIES.find(p => p.id === id) || null
  }

  throw new Error('Real API not yet implemented for parties')
}

/**
 * Fetch topics
 */
export async function fetchTopics(): Promise<Topic[]> {
  if (USE_MOCK_DATA) {
    await simulateNetworkDelay()
    return TOPICS
  }

  throw new Error('Real API not yet implemented for topics')
}

function simulateNetworkDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 100))
}
