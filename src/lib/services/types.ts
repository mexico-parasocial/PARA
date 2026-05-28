/**
 * Shared Service Types
 *
 * Common types and interfaces used across all service modules.
 */

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  cursor?: string
  limit?: number
}

/**
 * Filter parameters for data queries
 */
export interface FilterParams {
  state?: string
  category?: string
  community?: string
}

/**
 * Standard service response wrapper
 */
export interface ServiceResponse<T> {
  data: T
  cursor?: string
}

/**
 * Error response from services
 */
export interface ServiceError {
  code: string
  message: string
  details?: unknown
}
