/**
 * Media Service
 *
 * Handles fetching memes and documents.
 */

import {type Document, type Meme} from '#/lib/mock-data'
import {DOCUMENTS, MEMES} from '#/lib/mock-data'
import {USE_MOCK_DATA} from './config'
import {type PaginationParams, type ServiceResponse} from './types'

/**
 * Fetch memes
 */
export async function fetchMemes(
  params?: PaginationParams,
): Promise<ServiceResponse<Meme[]>> {
  if (USE_MOCK_DATA) {
    await simulateNetworkDelay()

    const limit = params?.limit || 20
    const data = MEMES.slice(0, limit)

    return {data, cursor: data.length >= limit ? 'next-page' : undefined}
  }

  throw new Error('Real API not yet implemented for memes')
}

/**
 * Fetch documents
 */
export async function fetchDocuments(
  params?: PaginationParams,
): Promise<ServiceResponse<Document[]>> {
  if (USE_MOCK_DATA) {
    await simulateNetworkDelay()

    const limit = params?.limit || 20
    const data = DOCUMENTS.slice(0, limit)

    return {data, cursor: data.length >= limit ? 'next-page' : undefined}
  }

  throw new Error('Real API not yet implemented for documents')
}

function simulateNetworkDelay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 100))
}
