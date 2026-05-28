import {XRPCError} from '@atproto/api'
import {t} from '@lingui/core/macro'

export function cleanError(str: unknown): string {
  if (!str) {
    return ''
  }
  const strValue = typeof str === 'string' ? str : String(str)
  if (isNetworkError(strValue)) {
    return t`Unable to connect. Please check your internet connection and try again.`
  }
  if (
    strValue.includes('Upstream Failure') ||
    strValue.includes('NotEnoughResources') ||
    strValue.includes('pipethrough network error')
  ) {
    return t`The server appears to be experiencing issues. Please try again in a few moments.`
  }
  /**
   * @see https://github.com/bluesky-social/atproto/blob/255cfcebb54332a7129af768a93004e22c6858e3/packages/pds/src/actor-store/preference/transactor.ts#L24
   */
  if (
    strValue.includes('Do not have authorization to set preferences') &&
    strValue.includes('app.bsky.actor.defs#personalDetailsPref')
  ) {
    return t`You cannot update your birthdate while using an app password. Please sign in with your main password to update your birthdate.`
  }
  if (
    strValue.includes('Bad token scope') ||
    strValue.includes('Bad token method')
  ) {
    return t`This feature is not available while using an App Password. Please sign in with your main password.`
  }
  if (strValue.startsWith('Error: ')) {
    return strValue.slice('Error: '.length)
  }
  return strValue
}

const NETWORK_ERRORS = [
  'Abort',
  'Network request failed',
  'Failed to fetch',
  'Load failed',
  'Upstream service unreachable',
]

export function isNetworkError(e: unknown) {
  const str = String(e)
  for (const err of NETWORK_ERRORS) {
    if (str.includes(err)) {
      return true
    }
  }
  return false
}

export function isErrorMaybeAppPasswordPermissions(e: unknown) {
  if (e instanceof XRPCError && e.error === 'TokenInvalid') {
    return true
  }
  const str = String(e)
  return str.includes('Bad token scope') || str.includes('Bad token method')
}

/**
 * Intended to capture "User cancelled" or "Crop cancelled" errors
 * that we often get from expo modules such @bsky.app/expo-image-crop-tool
 * The exact name has changed in the past so let's just see if the string
 * contains "cancel"
 */

export function isCancelledError(e: unknown) {
  const str = String(e).toLowerCase()
  return str.includes('cancel')
}
