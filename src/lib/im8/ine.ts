/**
 * INE (Instituto Nacional Electoral) integration status.
 *
 * Real INE verification — validating against INE systems and issuing signed
 * credentials — is gated on institutional approval to use INE infrastructure.
 * Until it lands, INE-dependent UI runs in PREVIEW mode: flows stay reachable
 * for demos, but they are clearly labeled, never write verification flags,
 * and never present data as if it came from the INE.
 *
 * Flip INE_INTEGRATION_APPROVED once approval lands to restore the real
 * ZK-proof-gated issuance path.
 */
export const INE_INTEGRATION_APPROVED = false

export const INE_PREVIEW_NOTICE =
  'Preview: INE integration is pending approval. This flow uses simulated data and does not issue a real credential.'

/**
 * mubEZ issues an INE credential only to a wallet that proves an Ed25519
 * holder key (CD-13). PARA holds no key: it asks the iM8 wallet through the
 * relay (requestWalletHolderBinding in ./wallet) and the credentials are
 * delivered to iM8, not here (CD-14). Stays false until the iM8 wallet has
 * passed device tests and a real issuer integration exists; it is separate
 * from, and in addition to, INE_INTEGRATION_APPROVED.
 */
export const WALLET_HOLDER_KEY_SUPPORTED = false

export const WALLET_HOLDER_KEY_UNSUPPORTED_MESSAGE =
  'INE credentials are held by the iM8 wallet, which is not available for this yet.'
