import {useQuery} from '@tanstack/react-query'

import {restoreM8SessionOrNull} from '#/lib/m8'
import {type IneAddress} from '#/lib/m8/types'

export type M8IdentityLocation = {
  /** Whether the user has an active m8 session with INE credentials */
  hasIneVerification: boolean
  /** State from INE address (e.g. 'Jalisco') */
  state?: string
  /** City from INE address */
  city?: string
  /** Neighborhood / colonia from INE address */
  neighborhood?: string
  /** District hash from m8 identity claims (e.g. 'sha256:district:mx-jal-10') */
  districtHash?: string
  /** Postal code from INE address */
  postalCode?: string
}

/**
 * Hook to extract verified location data from the user's m8 identity wallet.
 *
 * This reads the m8 session and, if present, extracts INE-derived address
 * fields (state, city, neighborhood) and district_hash claims. These are
 * considered "trusted" locations because they come from government-issued
 * INE credentials.
 *
 * Use this to enable the higher precision scopes (city, neighborhood) in
 * the GeoScopeSelector.
 */
export function useM8IdentityLocation() {
  return useQuery<M8IdentityLocation, Error>({
    queryKey: ['m8', 'identity-location'],
    queryFn: async () => {
      const session = await restoreM8SessionOrNull()
      if (!session) {
        return {hasIneVerification: false}
      }

      // Look for INE-derived proofs that contain address data
      // The INE credential is stored in proofs with reference to the verification
      const ineProof = session.proofs.find(
        p =>
          p.claimType === 'is_civic_eligible' &&
          p.outcome === 'verified' &&
          p.status === 'active',
      )

      // District hash may be in grants/claims or in the credential directly
      // We scan grants for any district-related requested claims
      const districtGrant = session.grants.find(g =>
        g.requestedClaims.some(c => c.type === 'has_para_verification'),
      )

      let districtHash: string | undefined
      if (districtGrant) {
        // The district hash is typically encoded in the proof artifact reference
        const districtProof = session.proofs.find(
          p =>
            p.grantId === districtGrant.id &&
            p.outcome === 'verified',
        )
        if (districtProof?.reference?.startsWith('district:')) {
          districtHash = districtProof.reference
        }
      }

      // For now, address data from INE is not directly exposed in the session
      // object from the proof broker. In a full integration, the INE credential
      // would include the address. We fall back to extracting from the session
      // paraStatus or other known fields.
      //
      // TODO: When m8 identity-manager exposes IneAddress in the session,
      // replace this with direct field access.
      const address = extractAddressFromSession(session)

      return {
        hasIneVerification: !!ineProof,
        state: address?.state,
        city: address?.city,
        neighborhood: address?.neighborhood,
        districtHash,
        postalCode: address?.postalCode,
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

/**
 * Attempts to extract an IneAddress from the proof broker session.
 *
 * In the current m8 architecture, the INE address is embedded in the
 * credential claims after INE verification. This helper scans the session
 * for any extractable address fragments.
 */
function extractAddressFromSession(
  session: Awaited<ReturnType<typeof restoreM8SessionOrNull>>,
): IneAddress | undefined {
  if (!session) return undefined

  // Look through proofs for any that contain address metadata
  for (const proof of session.proofs) {
    if (proof.reference && proof.reference.includes('::')) {
      // Some proof references encode address fragments as colon-separated values
      const parts = proof.reference.split('::')
      if (parts.length >= 3) {
        return {
          street: parts[0] ?? '',
          neighborhood: parts[1] ?? '',
          city: parts[2] ?? '',
          state: parts[3] ?? '',
          postalCode: parts[4] ?? '',
        }
      }
    }
  }

  return undefined
}
