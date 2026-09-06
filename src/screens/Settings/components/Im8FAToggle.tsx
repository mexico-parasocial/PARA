import {useState} from 'react'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {getM8AccessToken, restoreM8Session} from '#/lib/im8/api'
import {authenticateBiometric} from '#/lib/im8/biometric'
import {openM8Verification} from '#/lib/im8/linking'
import {useSession} from '#/state/session'
import {
  useAuthFactorQuery,
  useSetAuthFactorMutation,
} from '#/state/queries/auth-factor'
import * as SettingsList from './SettingsList'

export function Im8FAToggle() {
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const {data} = useAuthFactorQuery()
  const setAuthFactor = useSetAuthFactorMutation()
  const [isVerifying, setIsVerifying] = useState(false)

  const im8On = data?.authFactorType === 'im8'
  const emailOn = !!currentAccount?.emailAuthFactor
  const busy = setAuthFactor.isPending || isVerifying

  const onEnable = async () => {
    if (busy || (emailOn && !im8On)) return
    setIsVerifying(true)
    try {
      // Gate on biometrics before we touch anything server-side.
      const ok = await authenticateBiometric()
      if (!ok) return
      // Require a live iM8 session or enabling would lock the user out.
      let token = await getM8AccessToken()
      if (!token) {
        const session = await restoreM8Session().catch(() => null)
        if (session) {
          token = await getM8AccessToken()
        }
      }
      if (!token) {
        // No iM8 session on this device: open the iM8 app so the user
        // can connect, then they can retry.
        await openM8Verification()
        return
      }
      await setAuthFactor.mutateAsync({authFactorType: 'im8'})
    } finally {
      setIsVerifying(false)
    }
  }

  const onDisable = () => {
    if (busy) return
    setAuthFactor.mutate({authFactorType: null})
  }

  if (emailOn && !im8On) {
    return (
      <SettingsList.BadgeText>
        {_(msg`Email 2FA on`)}
      </SettingsList.BadgeText>
    )
  }

  return (
    <SettingsList.BadgeButton
      label={im8On ? _(msg`Disable`) : _(msg`Enable`)}
      onPress={im8On ? onDisable : onEnable}
    />
  )
}
