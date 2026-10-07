import * as Crypto from 'expo-crypto'

/** The native callback code alone must not authorize its interceptor. */
export async function createM8ExchangeBinding() {
  const verifier = `${Crypto.randomUUID()}${Crypto.randomUUID()}`
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    {encoding: Crypto.CryptoEncoding.BASE64},
  )
  return {
    verifier,
    challenge: digest
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''),
  }
}
