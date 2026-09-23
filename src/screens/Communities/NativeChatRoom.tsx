import {useCallback, useMemo, useRef, useState} from 'react'
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItemInfo,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {KeyboardStickyView} from '#/screens/Messages/components/vendor/KeyboardStickyView'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {
  chatErrorCode,
  connectionErrorCopy,
  sendErrorCopy,
} from '#/features/encryptedChat/errors'
import {type ChatMessage} from '#/features/encryptedChat/types'
import {useEncryptedChatRoom} from '#/features/encryptedChat/useEncryptedChatRoom'

/**
 * Community chat rendered by the native Matrix engine.
 *
 * Replaces the WebView when `EXPO_PUBLIC_CHAT_ENGINE=native`. The engine is
 * end-to-end encrypted and refuses to open an unencrypted room, so an
 * `ENCRYPTED_ROOM_REQUIRED` failure here is the fail-closed behaviour working,
 * not a bug to route around: there is deliberately no fallback that would
 * quietly downgrade the protection of a room.
 */
export function NativeChatRoom({roomId}: {roomId: string}) {
  const t = useTheme()
  const {_} = useLingui()
  const {status, messages, session, error, send, authorize, retry} =
    useEncryptedChatRoom(roomId)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | undefined>()
  const listRef = useRef<FlatList<ChatMessage>>(null)

  // The list is inverted so it sticks to the newest message without measuring
  // content height; invert the data to match.
  const inverted = useMemo(() => [...messages].reverse(), [messages])

  const onSend = useCallback(async () => {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setSendError(undefined)
    try {
      await send(body)
      // Only clear on success. Losing what someone typed because the room
      // rejected it is worse than leaving it in the box to retry.
      setDraft('')
    } catch (err) {
      setSendError(chatErrorCode(err))
    } finally {
      setSending(false)
    }
  }, [draft, sending, send])

  const renderItem = useCallback(
    ({item}: ListRenderItemInfo<ChatMessage>) => (
      <MessageRow message={item} isOwn={item.sender === session?.userId} />
    ),
    [session?.userId],
  )

  if (status !== 'ready') {
    return (
      <ConnectionState
        status={status}
        error={error}
        onAuthorize={authorize}
        onRetry={retry}
      />
    )
  }

  return (
    <View style={[a.flex_1]}>
      <FlatList
        ref={listRef}
        data={inverted}
        inverted
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={[a.px_md, a.py_sm, a.gap_xs]}
        keyboardDismissMode="interactive"
        ListEmptyComponent={
          <Text
            style={[
              a.text_sm,
              a.text_center,
              a.py_xl,
              t.atoms.text_contrast_medium,
            ]}>
            <Trans>Aún no hay mensajes en esta sala.</Trans>
          </Text>
        }
      />

      <KeyboardStickyView>
        <View
          style={[
            a.px_md,
            a.py_sm,
            a.gap_xs,
            {borderTopWidth: StyleSheet.hairlineWidth},
            t.atoms.border_contrast_low,
            t.atoms.bg,
          ]}>
          {sendError && (
            <Text style={[a.text_xs, {color: t.palette.negative_500}]}>
              {sendErrorCopy(sendError)}
            </Text>
          )}
          <View style={[a.flex_row, a.align_end, a.gap_sm]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={_(msg`Escribe un mensaje`)}
              placeholderTextColor={t.palette.contrast_500}
              multiline
              // 8000 is the adapter's own limit; stopping here means the
              // rejection never has to reach the user as an error.
              maxLength={8000}
              accessibilityLabel={_(msg`Mensaje`)}
              accessibilityHint={_(
                msg`Escribe un mensaje cifrado para esta sala`,
              )}
              style={[
                a.flex_1,
                a.text_sm,
                a.px_md,
                a.py_sm,
                a.rounded_md,
                t.atoms.text,
                t.atoms.bg_contrast_25,
                {maxHeight: 120},
              ]}
            />
            <Button
              label={_(msg`Enviar mensaje`)}
              size="small"
              variant="solid"
              color="primary"
              disabled={!draft.trim() || sending}
              onPress={onSend}>
              <ButtonText>
                {sending ? _(msg`Enviando…`) : _(msg`Enviar`)}
              </ButtonText>
            </Button>
          </View>
        </View>
      </KeyboardStickyView>
    </View>
  )
}

function MessageRow({message, isOwn}: {message: ChatMessage; isOwn: boolean}) {
  const t = useTheme()

  if (message.unableToDecrypt) {
    return (
      <View style={[a.py_xs, isOwn ? a.align_end : a.align_start]}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: t.palette.contrast_25,
              borderColor: t.palette.contrast_100,
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}>
          <Text style={[a.text_sm, a.italic, t.atoms.text_contrast_medium]}>
            <Trans>No se pudo descifrar este mensaje.</Trans>
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>
              Tu dispositivo no tiene la clave. Verifícalo desde otro
              dispositivo o restaura tu copia de seguridad.
            </Trans>
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[a.py_xs, isOwn ? a.align_end : a.align_start]}>
      {!isOwn && (
        <Text style={[a.text_xs, a.mb_2xs, t.atoms.text_contrast_medium]}>
          {message.sender}
        </Text>
      )}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isOwn
              ? t.palette.primary_500
              : t.palette.contrast_25,
          },
          // A message still in the send queue is dimmed rather than hidden, so
          // it is visible that it has not reached the room yet.
          message.pending && {opacity: 0.6},
        ]}>
        <Text
          style={[a.text_sm, isOwn ? {color: t.palette.white} : t.atoms.text]}>
          {message.body}
        </Text>
      </View>
    </View>
  )
}

function ConnectionState({
  status,
  error,
  onAuthorize,
  onRetry,
}: {
  status: string
  error?: string
  onAuthorize: () => void
  onRetry: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  if (
    status === 'connecting' ||
    status === 'authorizing' ||
    status === 'idle'
  ) {
    return (
      <View style={[a.flex_1, a.align_center, a.justify_center, a.gap_md]}>
        <ActivityIndicator color={t.palette.primary_500} />
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          {status === 'authorizing'
            ? _(msg`Esperando la autorización en el navegador…`)
            : _(msg`Conectando con el chat cifrado…`)}
        </Text>
      </View>
    )
  }

  if (status === 'authorizationRequired') {
    return (
      <View
        style={[a.flex_1, a.align_center, a.justify_center, a.gap_md, a.px_xl]}>
        <Text style={[a.text_md, a.font_bold, a.text_center, t.atoms.text]}>
          <Trans>Autoriza este dispositivo</Trans>
        </Text>
        <Text style={[a.text_sm, a.text_center, t.atoms.text_contrast_medium]}>
          <Trans>
            El chat cifrado necesita un dispositivo propio. Se abrirá tu
            navegador para iniciar sesión en el servidor; la contraseña nunca
            pasa por PARA.
          </Trans>
        </Text>
        <Button
          label={_(msg`Autorizar este dispositivo`)}
          size="small"
          variant="solid"
          color="primary"
          onPress={onAuthorize}>
          <ButtonText>
            <Trans>Autorizar</Trans>
          </ButtonText>
        </Button>
      </View>
    )
  }

  return (
    <View
      style={[a.flex_1, a.align_center, a.justify_center, a.gap_md, a.px_xl]}>
      <Text style={[a.text_sm, a.text_center, {color: t.palette.negative_500}]}>
        {connectionErrorCopy(error)}
      </Text>
      <Button
        label={_(msg`Reintentar la conexión`)}
        size="small"
        variant="solid"
        color="secondary"
        onPress={onRetry}>
        <ButtonText>
          <Trans>Reintentar</Trans>
        </ButtonText>
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '85%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
})
