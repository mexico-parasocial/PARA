/*
 * Local stand-in for `expo-age-range`.
 *
 * Upstream depends on `expo-age-range@57.x`, which is published against Expo
 * SDK 57. This app is on SDK 54, and the package has no SDK 54 build (its
 * SDK-aligned releases begin at 56), so the real native module cannot be
 * installed here. `src/ageAssurance/data.tsx` imports it unconditionally, so
 * without this shim the bundle fails to resolve.
 *
 * Deliberate behaviour: the real module resolves to `{lowerBound: 18}` on
 * platforms it does not support - i.e. it reports an ADULT. Silently adopting
 * that here would grant full access to every user on the strength of a missing
 * dependency, so this shim refuses instead. `DEVICE_SIGNALS_SUPPORTED` in
 * `#/ageAssurance/const` is gated on `DEVICE_SIGNALS_MODULE_AVAILABLE` below,
 * so `requestAgeRangeAsync` is never reached; if it ever is, throwing routes
 * the caller through its documented catch and on to the KWS fallback rather
 * than handing back a fabricated age.
 *
 * Delete this file and install the real package when the app moves to Expo 56+.
 */

/** Options for requesting age range information from the user. */
export type AgeRangeRequest = {
  /** The required minimum age for your app. */
  threshold1: number
  /** An optional additional minimum age for your app. */
  threshold2?: number
  /** An optional additional minimum age for your app. */
  threshold3?: number
}

/** Response containing the user's age range information. */
export type AgeRangeResponse = {
  /** The lower limit of the person's age range. */
  lowerBound: number | null
  /** The upper limit of the person's age range. */
  upperBound: number | null
  ageRangeDeclaration?: 'selfDeclared' | 'guardianDeclared' | null
  activeParentalControls?: string[]
  installId?: string | null
  userStatus?:
    | 'VERIFIED'
    | 'SUPERVISED'
    | 'SUPERVISED_APPROVAL_PENDING'
    | 'SUPERVISED_APPROVAL_DENIED'
    | 'DECLARED'
    | 'UNKNOWN'
    | null
  mostRecentApprovalDate?: number | null
}

/**
 * False while this shim stands in for the real package. Gates
 * `DEVICE_SIGNALS_SUPPORTED` so the device-signals flow is skipped entirely
 * and age assurance falls back to KWS.
 */
export const DEVICE_SIGNALS_MODULE_AVAILABLE = false

export async function requestAgeRangeAsync(
  _options: AgeRangeRequest,
): Promise<AgeRangeResponse> {
  throw new Error(
    'expo-age-range is not installed (no Expo SDK 54 build). Device age signals are unavailable; fall back to KWS.',
  )
}
