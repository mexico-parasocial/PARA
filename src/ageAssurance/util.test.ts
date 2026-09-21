import {getAgeAssuranceRegionConfig} from '@bsky/sdk/utils'

import {getAgeAssuranceRegionConfigForGeolocation} from '#/ageAssurance/util'

jest.mock('#/ageAssurance/data')
jest.mock('@bsky/sdk/utils', () => ({
  ...jest.requireActual('@bsky/sdk/utils'),
  getAgeAssuranceRegionConfig: jest.fn(),
}))

/*
 * Platform-based region filtering itself is implemented and tested in
 * `@bsky/sdk` (see `getAgeAssuranceRegionConfig`). What we own - and test
 * here - is that region resolution passes the current platform through. The
 * jest preset is `jest-expo/ios`, so `AGE_ASSURANCE_PLATFORM` resolves to
 * `ios` in these tests.
 */
describe('getAgeAssuranceRegionConfigForGeolocation', () => {
  it('passes the current platform to the SDK region matcher', () => {
    const config = {regions: []}
    getAgeAssuranceRegionConfigForGeolocation(config, {
      countryCode: 'US',
      regionCode: 'TX',
    })
    expect(getAgeAssuranceRegionConfig).toHaveBeenCalledWith(config, {
      countryCode: 'US',
      regionCode: 'TX',
      platform: 'ios',
    })
  })
})
