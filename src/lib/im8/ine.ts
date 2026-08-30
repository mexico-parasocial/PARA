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
