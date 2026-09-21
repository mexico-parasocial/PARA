import {isQvlUnavailable} from './qvl-status'

describe('QV release safeguards', () => {
  it.each(['FeatureNotEnabled', 'BallotPrivacyUnavailable'])(
    'recognizes the structured and transported %s error',
    error => {
      expect(isQvlUnavailable({error})).toBe(true)
      expect(isQvlUnavailable(new Error(`XRPC: ${error}`))).toBe(true)
    },
  )

  it.each([null, undefined, {}, new Error('Network unavailable')])(
    'keeps unexpected failures retryable: %s',
    error => expect(isQvlUnavailable(error)).toBe(false),
  )
})
