/**
 * Services Configuration
 *
 * Controls data source (mock vs real API) and API settings.
 */

// Use mock data in development or when explicitly enabled
export const USE_MOCK_DATA =
  __DEV__ || process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true'

export const API_CONFIG = {
  useMockData: USE_MOCK_DATA,
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.para.app',
  timeout: 30000, // 30 seconds
}
