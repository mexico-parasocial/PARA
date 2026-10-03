import {useCallback, useEffect, useRef, useState} from 'react'
import {AppState, ScrollView, TextInput, View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {chatErrorCode} from '#/features/encryptedChat/errors'
import {
  type ChatRecovery,
  type ChatSecurityStatus,
  type RecoveryKey,
} from '#/features/encryptedChat/types'

/** Native device recovery; key material never enters navigation or query caches. */
export function ChatRecoveryPanel({
  recovery,
  deviceId,
  onClose,
}: {
  recovery: ChatRecovery
  deviceId: string
  onClose: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const [status, setStatus] = useState<ChatSecurityStatus>()
  const [pendingKey, setPendingKey] = useState<RecoveryKey>()
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<'restored' | 'synced'>()
  const generation = useRef(0)

  const run = useCallback(
    async (
      action: 'refresh' | 'create' | 'restore' | 'ack' | 'sync',
      key?: string,
    ) => {
      const current = ++generation.current
      setBusy(true)
      setError(undefined)
      setNotice(undefined)
      setStatus(undefined)
      const active = () => generation.current === current
      try {
        if (action === 'create') {
          const pending = await recovery.enableRecovery()
          if (active()) setPendingKey(pending)
        } else if (action === 'restore') {
          await recovery.recover(key ?? '')
          if (active()) setNotice('restored')
        } else if (action === 'ack') {
          await recovery.acknowledgeRecoveryKey()
          if (active()) {
            setPendingKey(undefined)
            setShowKey(false)
          }
        } else if (action === 'sync') {
          await recovery.syncKeyBackup()
          if (active()) setNotice('synced')
        } else {
          const pending = await recovery.getPendingRecoveryKey()
          if (active()) setPendingKey(pending)
        }
        if (!active()) return
        const next = await recovery.getSecurityStatus()
        if (active()) setStatus(next)
      } catch (cause) {
        if (active()) setError(chatErrorCode(cause))
      } finally {
        if (active()) setBusy(false)
      }
    },
    [recovery],
  )

  const cancelPending = useCallback(() => {
    generation.current++
  }, [])
  useEffect(() => {
    void run('refresh')
    return cancelPending
  }, [run, cancelPending])
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        setShowKey(false)
        setKeyInput('')
      }
    })
    return () => subscription.remove()
  }, [])

  const errorCopy =
    error === 'RECOVER_EXISTING_KEYS_FIRST'
      ? l`Ya existe una recuperación o su estado no está listo. Usa tu clave guardada; no se reemplazó el respaldo.`
      : error === 'RECOVERY_RESTORE_FAILED' || error === 'INVALID_RECOVERY_KEY'
        ? l`No se pudieron recuperar las claves. Revisa la clave, la cuenta y tu conexión e inténtalo de nuevo.`
        : error === 'RECOVERY_STORAGE_FAILED'
          ? l`No se pudo acceder al almacén seguro del dispositivo. Reintenta antes de crear o descartar una clave.`
          : error === 'RECOVERY_SYNC_FAILED'
            ? l`No se pudo confirmar la sincronización del respaldo. Reintenta con conexión.`
            : l`No se pudo completar la operación o consultar el estado. Reintenta con conexión.`

  return (
    <ScrollView
      testID="chatRecoveryPanel"
      style={[a.flex_1]}
      contentContainerStyle={[a.p_lg, a.gap_lg]}
      keyboardShouldPersistTaps="handled">
      <View style={[a.flex_row, a.align_center, a.justify_between]}>
        <Text style={[a.text_lg, a.font_bold]}>
          <Trans>Claves y dispositivo</Trans>
        </Text>
        <Button
          label={l`Volver al chat`}
          size="small"
          color="secondary"
          disabled={busy || (!!pendingKey && !pendingKey.persisted)}
          onPress={onClose}>
          <ButtonText>
            <Trans>Volver</Trans>
          </ButtonText>
        </Button>
      </View>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>
          Guarda tu clave en un lugar privado. Permite recuperar las claves
          disponibles en tu respaldo al cambiar de dispositivo. No la envíes en
          un chat ni en un reporte.
        </Trans>
      </Text>
      <View style={[a.gap_sm]}>
        <Text emoji>
          <Trans>Dispositivo: {deviceId}</Trans>
        </Text>
        <Text>
          {status?.verification === 'verified'
            ? l`Dispositivo verificado`
            : status?.verification === 'unverified'
              ? l`Dispositivo sin verificar`
              : l`Verificación sin confirmar`}
        </Text>
        <Text>
          {status?.recovery === 'enabled'
            ? l`Recuperación configurada en este dispositivo`
            : status?.recovery === 'incomplete' || status?.backupExists
              ? l`Hay claves que recuperar en este dispositivo`
              : status?.recovery === 'disabled'
                ? l`Recuperación sin configurar`
                : l`Estado de recuperación sin confirmar`}
        </Text>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>
            La recuperación solo abre mensajes para los que tienes claves y
            acceso. No restaura mensajes borrados.
          </Trans>
        </Text>
      </View>
      {pendingKey ? (
        <View
          style={[
            a.p_md,
            a.gap_md,
            a.border,
            a.rounded_md,
            t.atoms.border_contrast_low,
          ]}>
          <Text style={[a.font_bold]}>
            <Trans>Guarda tu clave de recuperación</Trans>
          </Text>
          <Text style={[a.text_sm]}>
            {pendingKey.persisted
              ? l`Esta clave queda pendiente en el almacén seguro de este dispositivo hasta que confirmes que la guardaste.`
              : l`No pudimos conservar esta clave en el dispositivo. Guárdala ahora antes de salir o cerrar la aplicación.`}
          </Text>
          {showKey && (
            <Text testID="chatRecoveryKey" selectable style={[a.text_md]}>
              {pendingKey.key}
            </Text>
          )}
          <Button
            label={showKey ? l`Ocultar clave` : l`Mostrar clave`}
            size="small"
            color="secondary"
            onPress={() => setShowKey(value => !value)}>
            <ButtonText>
              {showKey ? l`Ocultar clave` : l`Mostrar clave`}
            </ButtonText>
          </Button>
          <Button
            label={l`Ya guardé mi clave de recuperación`}
            size="small"
            color="primary"
            disabled={busy}
            onPress={() => void run('ack')}>
            <ButtonText>
              <Trans>Ya guardé mi clave</Trans>
            </ButtonText>
          </Button>
        </View>
      ) : status?.recovery === 'disabled' && !status.backupExists ? (
        <Button
          label={l`Crear clave de recuperación`}
          size="large"
          color="primary"
          disabled={busy}
          onPress={() => void run('create')}>
          <ButtonText>
            <Trans>Crear clave de recuperación</Trans>
          </ButtonText>
        </Button>
      ) : null}
      {!pendingKey && (
        <View style={[a.gap_sm]}>
          <Text style={[a.font_bold]}>
            <Trans>Usar una clave guardada</Trans>
          </Text>
          <TextInput
            testID="chatRecoveryKeyInput"
            accessibilityLabel={l`Clave de recuperación`}
            accessibilityHint={l`Introduce la clave guardada para esta cuenta de chat`}
            value={keyInput}
            onChangeText={setKeyInput}
            secureTextEntry
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            textContentType="none"
            maxLength={512}
            editable={!busy}
            style={[
              a.p_md,
              a.border,
              a.rounded_sm,
              t.atoms.border_contrast_low,
              t.atoms.text,
            ]}
          />
          <Button
            label={l`Recuperar claves en este dispositivo`}
            size="large"
            color="primary"
            disabled={busy || !keyInput.trim()}
            onPress={() => {
              const key = keyInput
              setKeyInput('')
              void run('restore', key)
            }}>
            <ButtonText>
              <Trans>Recuperar claves</Trans>
            </ButtonText>
          </Button>
        </View>
      )}
      {status?.backupEnabled && !pendingKey && (
        <Button
          label={l`Sincronizar respaldo de claves`}
          size="small"
          color="secondary"
          disabled={busy}
          onPress={() => void run('sync')}>
          <ButtonText>
            <Trans>Sincronizar respaldo</Trans>
          </ButtonText>
        </Button>
      )}
      {busy && (
        <Text accessibilityLiveRegion="polite">
          <Trans>Procesando… Mantén la aplicación abierta.</Trans>
        </Text>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite">
          {notice === 'restored'
            ? l`Clave aceptada. Volvimos a intentar descifrar los mensajes disponibles.`
            : l`Las claves disponibles se sincronizaron con el respaldo.`}
        </Text>
      )}
      {error && (
        <Text
          accessibilityRole="alert"
          style={[{color: t.palette.negative_500}]}>
          {errorCopy}
        </Text>
      )}
      <Button
        label={l`Actualizar estado de seguridad`}
        size="small"
        color="secondary"
        disabled={busy}
        onPress={() => void run('refresh')}>
        <ButtonText>
          <Trans>Actualizar estado</Trans>
        </ButtonText>
      </Button>
    </ScrollView>
  )
}
