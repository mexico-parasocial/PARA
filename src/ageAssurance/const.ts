import {
  ageAssuranceRuleIDs as ids,
  type AppBskyAgeassuranceDefs,
} from '@atproto/api'

import {AgeAssuranceAccess} from '#/ageAssurance/types'
import {
  ANDROID_API_LEVEL,
  IOS_MAJOR_VERSION,
  IS_ANDROID,
  IS_IOS,
  IS_WEB,
} from '#/env'
/**
 * Minimum age required to access the app at all.
 */
export const MIN_ACCESS_AGE = 13

/**
 * The identifier for the current platform, matching the `knownValues` of the
 * `platforms` property on `app.bsky.ageassurance.defs#configRegion`. Used to
 * filter out region configs that don't apply to this platform.
 */
export const AGE_ASSURANCE_PLATFORM: 'web' | 'ios' | 'android' = IS_WEB
  ? 'web'
  : IS_IOS
    ? 'ios'
    : 'android'

export const FALLBACK_REGION_CONFIG: AppBskyAgeassuranceDefs.ConfigRegion = {
  countryCode: '*',
  regionCode: undefined,
  minAccessAge: MIN_ACCESS_AGE,
  rules: [
    {
      $type: ids.IfDeclaredOverAge,
      age: MIN_ACCESS_AGE,
      access: AgeAssuranceAccess.Full,
    },
    {
      $type: ids.Default,
      access: AgeAssuranceAccess.Full, // LOCAL DEV: bypass (PDS lacks ageassurance endpoints)
    },
  ],
}
