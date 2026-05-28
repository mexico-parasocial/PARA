import {type Voter} from '#/lib/mock-data'
import {VOTERS} from '#/lib/mock-data'
import {USE_MOCK_DATA} from './config'
import {type PaginationParams, type ServiceResponse} from './types'

export interface VotersQueryParams extends PaginationParams {
  communityId?: string
}

/**
 * Fetch voters for a community
 */
export async function fetchVoters(
  params?: VotersQueryParams,
): Promise<ServiceResponse<Voter[]>> {
  if (USE_MOCK_DATA) {
    await simulateNetworkDelay()

    const limit = params?.limit || 20
    const data = VOTERS.slice(0, limit)

    return {data, cursor: data.length >= limit ? 'next-page' : undefined}
  }

  throw new Error('Real API not yet implemented for voters')
}

function simulateNetworkDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 100))
}
