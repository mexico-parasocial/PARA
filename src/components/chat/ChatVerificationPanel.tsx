import {useEffect, useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {
  type ChatDeviceVerification,
  type ChatVerificationState,
} from '#/features/encryptedChat/types'

/** Self-device SAS: approval requires comparing both screens. */
export function ChatVerificationPanel({
  verification,
}: {
  verification: ChatDeviceVerification
}) {
  const {t: l} = useLingui()
  const theme = useTheme()
  const [state, setState] = useState<ChatVerificationState>({status: 'idle'})
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    const unsubscribe = verification.watch(next => {
      if (active) setState(next)
    })
    return () => {
      active = false
      unsubscribe()
      void verification.cancel().catch(() => {})
    }
  }, [verification])
  const run = async (action: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setFailed(false)
    try {
      await action()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  const pending = ['waiting', 'requested', 'comparing'].includes(state.status)
  return (
    <View style={[a.gap_sm]}>
      <Text style={[a.font_bold]}>
        <Trans>Verificar con otro dispositivo</Trans>
      </Text>
      <Text style={[a.text_sm]}>
        <Trans>
          Abre Element o PARA con esta misma cuenta en un dispositivo que ya
          confías. Compara los símbolos en ambas pantallas antes de confirmar.
        </Trans>
      </Text>
      {state.deviceId && (
        <Text>
          <Trans>Otro dispositivo: {state.deviceId}</Trans>
        </Text>
      )}
      {state.status === 'waiting' && (
        <Text>
          <Trans>Esperando al otro dispositivo…</Trans>
        </Text>
      )}
      {state.status === 'requested' && (
        <Button
          label={l`Aceptar solicitud de verificación`}
          size="small"
          color="primary"
          disabled={busy}
          onPress={() => void run(() => verification.accept())}>
          <ButtonText>
            <Trans>Aceptar solicitud</Trans>
          </ButtonText>
        </Button>
      )}
      {state.status === 'comparing' && state.symbols && (
        <View style={[a.gap_sm]}>
          <Text emoji style={[a.text_lg]}>
            {state.symbols.join(' · ')}
          </Text>
          <Button
            label={l`Los símbolos coinciden en ambos dispositivos`}
            size="small"
            color="primary"
            disabled={busy}
            onPress={() => void run(() => verification.confirm(true))}>
            <ButtonText>
              <Trans>Coinciden</Trans>
            </ButtonText>
          </Button>
          <Button
            label={l`Los símbolos no coinciden`}
            size="small"
            color="secondary"
            disabled={busy}
            onPress={() => void run(() => verification.confirm(false))}>
            <ButtonText>
              <Trans>No coinciden</Trans>
            </ButtonText>
          </Button>
        </View>
      )}
      {state.status === 'verified' && (
        <Text>
          <Trans>
            Verificación completada. Actualiza el estado de seguridad para
            confirmar este dispositivo.
          </Trans>
        </Text>
      )}
      {state.status === 'cancelled' && (
        <Text>
          <Trans>
            Verificación cancelada o vencida. Puedes intentarlo de nuevo.
          </Trans>
        </Text>
      )}
      {(failed || state.status === 'failed') && (
        <Text
          accessibilityRole="alert"
          style={[{color: theme.palette.negative_500}]}>
          <Trans>
            No se pudo verificar. Revisa la conexión de ambos dispositivos y
            reintenta.
          </Trans>
        </Text>
      )}
      <Button
        label={pending ? l`Cancelar verificación` : l`Iniciar verificación`}
        size="small"
        color="secondary"
        disabled={busy}
        onPress={() =>
          void run(() =>
            pending ? verification.cancel() : verification.request(),
          )
        }>
        <ButtonText>
          {pending ? l`Cancelar verificación` : l`Iniciar verificación`}
        </ButtonText>
      </Button>
    </View>
  )
}
