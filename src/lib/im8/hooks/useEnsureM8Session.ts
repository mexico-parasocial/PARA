import {useEffect} from 'react'

import {IS_LOCAL_DEV_MODE} from '#/lib/constants'
import {logger} from '#/logger'
import {useSession} from '#/state/session'
import {M8_BROKER_URL, postDevIneEnroll} from '../api'
import {ensureM8SessionFor} from '../ensureSession'

/*
 * Only local development starts M8 sessions on its own: there the broker's
 * dev-token bootstrap answers immediately. In production `sessions/start`
 * opens an OAuth attempt that needs the person in the loop (the iM8 app), so
 * firing it on every login would only litter the broker with abandoned
 * attempts.
 */
const AUTO_START_M8_SESSION = Boolean(M8_BROKER_URL) && IS_LOCAL_DEV_MODE

/** Keeps an M8 session bound to the signed-in PARA account. */
export function useEnsureM8Session() {
  const {currentAccount} = useSession()
  const did = currentAccount?.did

  useEffect(() => {
    if (!did || !AUTO_START_M8_SESSION) return
    ensureM8SessionFor(did).then(
      async result => {
        if (result === 'pending_oauth') {
          logger.warn(
            'm8: broker requires OAuth; connect with iM8 to reach the bridge',
          )
          return
        }
        /*
         * Voting and delegating need an INE-verified person behind the
         * session. Locally there is no wallet to do that, so ask the dev
         * broker for its simulated enrollment (a no-op once enrolled).
         */
        const enrolled = await postDevIneEnroll().catch(err => {
          logger.warn('m8: dev INE enrollment failed', {
            safeMessage: String(err),
          })
          return true
        })
        if (!enrolled) {
          logger.warn(
            'm8: broker has no dev INE enrollment; cabildeo votes will be refused',
          )
        }
      },
      err =>
        logger.warn('m8: could not start a session for this account', {
          safeMessage: String(err),
        }),
    )
  }, [did])
}
