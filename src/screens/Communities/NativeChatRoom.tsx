import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  type ListRenderItemInfo,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as ImagePicker from 'expo-image-picker'
import * as Sharing from 'expo-sharing'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useQuery} from '@tanstack/react-query'

import {
  type ReportedMessageView,
  viewFromChatMessage,
} from '#/lib/matrix/reportedMessage'
import {KeyboardStickyView} from '#/screens/Messages/components/vendor/KeyboardStickyView'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {ReportedMessageCard} from '#/components/chat/ReportedMessageCard'
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
export function NativeChatRoom({
  roomId,
  onEncryptionVerified,
  onReportMessage,
  focusEventId,
}: {
  roomId: string
  onEncryptionVerified?: (verified: boolean) => void
  /** Report another member's sent message, by event ID only (D2). */
  onReportMessage?: (eventId: string) => void
  /** A reported message a moderator opened from the report queue. */
  focusEventId?: string
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {
    status,
    messages,
    typingUserIds,
    session,
    error,
    send,
    sendImage,
    sendFile,
    openMedia,
    getMessage,
    toggleReaction,
    setTyping,
    markRead,
    retryDecryption,
    authorize,
    retry,
  } = useEncryptedChatRoom(roomId)

  const [focusDismissed, setFocusDismissed] = useState(false)
  const reported = useQuery({
    queryKey: ['reported-message', 'native', roomId, focusEventId],
    enabled: status === 'ready' && !!focusEventId && !focusDismissed,
    retry: false,
    queryFn: async (): Promise<ReportedMessageView> => {
      const message = await getMessage(focusEventId!)
      return message
        ? viewFromChatMessage(message)
        : {state: 'unavailable', reason: 'not-loaded'}
    },
  })

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | undefined>()
  const [replyTo, setReplyTo] = useState<ChatMessage | undefined>()
  const listRef = useRef<FlatList<ChatMessage>>(null)
  const latestRead = useRef<string | undefined>(undefined)
  const typingSent = useRef(false)

  useEffect(() => {
    onEncryptionVerified?.(status === 'ready')
    return () => onEncryptionVerified?.(false)
  }, [status, onEncryptionVerified])

  useEffect(() => {
    latestRead.current = undefined
    typingSent.current = false
    setReplyTo(undefined)
  }, [roomId])

  useEffect(() => {
    if (status !== 'ready') return
    if (!draft.trim()) {
      if (typingSent.current) {
        typingSent.current = false
        void setTyping(false).catch(() => {})
      }
      return
    }
    if (!typingSent.current) {
      typingSent.current = true
      void setTyping(true).catch(() => {})
    }
    const timer = setTimeout(() => {
      typingSent.current = false
      void setTyping(false).catch(() => {})
    }, 3000)
    return () => clearTimeout(timer)
  }, [draft, setTyping, status])

  useEffect(() => {
    return () => {
      if (typingSent.current) void setTyping(false).catch(() => {})
    }
  }, [setTyping])

  useEffect(() => {
    if (status !== 'ready') return
    const lastEventId = [...messages]
      .reverse()
      .find(message => message.eventId)?.eventId
    if (!lastEventId || latestRead.current === lastEventId) return
    latestRead.current = lastEventId
    void markRead().catch(() => {})
  }, [markRead, messages, status])

  // The list is inverted so it sticks to the newest message without measuring
  // content height; invert the data to match.
  const inverted = useMemo(() => [...messages].reverse(), [messages])

  const onSend = useCallback(async () => {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setSendError(undefined)
    try {
      await send(body, replyTo?.eventId)
      // Only clear on success. Losing what someone typed because the room
      // rejected it is worse than leaving it in the box to retry.
      setDraft('')
      setReplyTo(undefined)
    } catch (err) {
      setSendError(chatErrorCode(err))
    } finally {
      setSending(false)
    }
  }, [draft, sending, send, replyTo])

  const attachImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      selectionLimit: 1,
    })
    const asset = result.assets?.[0]
    if (!asset || !asset.uri.startsWith('file://')) return
    const info = await FileSystem.getInfoAsync(asset.uri)
    if (!info.exists || info.isDirectory) return
    await sendImage({
      uri: asset.uri,
      name: asset.fileName || 'image.jpg',
      size: info.size,
      mimeType: asset.mimeType || 'image/jpeg',
      width: asset.width,
      height: asset.height,
    })
  }, [sendImage])

  const attachFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    })
    const asset = result.assets?.[0]
    if (!asset || !asset.uri.startsWith('file://')) return
    const info = await FileSystem.getInfoAsync(asset.uri)
    if (!info.exists || info.isDirectory) return
    await sendFile({
      uri: asset.uri,
      name: asset.name,
      size: info.size,
      mimeType: asset.mimeType || 'application/octet-stream',
    })
  }, [sendFile])

  const onAttach = useCallback(() => {
    Alert.alert(_(msg`Adjuntar`), _(msg`Elige qué enviar a la sala cifrada.`), [
      {
        text: _(msg`Foto`),
        onPress: () =>
          void attachImage().catch(err => setSendError(chatErrorCode(err))),
      },
      {
        text: _(msg`Archivo`),
        onPress: () =>
          void attachFile().catch(err => setSendError(chatErrorCode(err))),
      },
      {text: _(msg`Cancelar`), style: 'cancel'},
    ])
  }, [_, attachImage, attachFile])

  const renderItem = useCallback(
    ({item, index}: ListRenderItemInfo<ChatMessage>) => (
      <MessageRow
        message={item}
        isOwn={item.sender === session?.userId}
        showDate={
          !inverted[index + 1] ||
          new Date(item.timestamp).toDateString() !==
            new Date(inverted[index + 1].timestamp).toDateString()
        }
        onReply={() => setReplyTo(item)}
        onReaction={toggleReaction}
        onOpenMedia={openMedia}
        onRetryDecryption={retryDecryption}
        onReport={onReportMessage}
      />
    ),
    [
      session?.userId,
      inverted,
      toggleReaction,
      openMedia,
      retryDecryption,
      onReportMessage,
    ],
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
      {focusEventId && !focusDismissed && (
        <ReportedMessageCard
          view={
            reported.isError
              ? {state: 'unavailable', reason: 'error'}
              : reported.data
          }
          encrypted
          onClose={() => setFocusDismissed(true)}
          onRetry={() => void reported.refetch()}
        />
      )}
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

      {typingUserIds.length > 0 && (
        <Text style={[a.text_xs, a.px_md, t.atoms.text_contrast_medium]}>
          {_(msg`Alguien está escribiendo...`)}
        </Text>
      )}

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
          {replyTo && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={_(msg`Cancelar respuesta`)}
              accessibilityHint={_(
                msg`Quita el mensaje citado de la respuesta`,
              )}
              onPress={() => setReplyTo(undefined)}
              style={[a.px_sm, a.py_xs, t.atoms.bg_contrast_25]}>
              <Text style={[a.text_xs, t.atoms.text]} numberOfLines={1}>
                {_(msg`Respondiendo a ${replyTo.sender}: ${replyTo.body}`)} ✕
              </Text>
            </Pressable>
          )}
          <View style={[a.flex_row, a.align_end, a.gap_sm]}>
            <Button
              label={_(msg`Adjuntar imagen o archivo`)}
              size="small"
              color="secondary"
              onPress={onAttach}>
              <ButtonText>＋</ButtonText>
            </Button>
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

function MessageRow({
  message,
  isOwn,
  showDate,
  onReply,
  onReaction,
  onOpenMedia,
  onRetryDecryption,
  onReport,
}: {
  message: ChatMessage
  isOwn: boolean
  showDate: boolean
  onReply: () => void
  onReaction: (eventId: string, key: string) => Promise<void>
  onOpenMedia: (eventId: string) => Promise<string>
  onRetryDecryption: () => void
  onReport?: (eventId: string) => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const [showActions, setShowActions] = useState(false)
  const [mediaUri, setMediaUri] = useState<string | undefined>()
  const [mediaError, setMediaError] = useState(false)

  useEffect(() => {
    if (message.kind !== 'image' || !message.eventId) return
    let cancelled = false
    void onOpenMedia(message.eventId)
      .then(uri => {
        if (!cancelled) setMediaUri(uri)
      })
      .catch(() => {
        if (!cancelled) setMediaError(true)
      })
    return () => {
      cancelled = true
    }
  }, [message.eventId, message.kind, onOpenMedia])

  const openAttachment = useCallback(async () => {
    if (!message.eventId) return
    try {
      const uri = await onOpenMedia(message.eventId)
      if (message.kind === 'image') setMediaUri(uri)
      else await Sharing.shareAsync(uri, {mimeType: message.media?.mimeType})
    } catch {
      setMediaError(true)
    }
  }, [message.eventId, message.kind, message.media?.mimeType, onOpenMedia])

  const action = (key: string) => {
    if (!message.eventId) return
    setShowActions(false)
    void onReaction(message.eventId, key).catch(() => {})
  }

  return (
    <View style={[a.py_xs]}>
      {showDate && (
        <Text
          style={[
            a.text_xs,
            a.text_center,
            a.py_xs,
            t.atoms.text_contrast_medium,
          ]}>
          {new Date(message.timestamp).toLocaleDateString()}
        </Text>
      )}
      <View style={[isOwn ? a.align_end : a.align_start]}>
        {!isOwn && (
          <Text style={[a.text_xs, a.mb_2xs, t.atoms.text_contrast_medium]}>
            {message.sender}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            message.body || message.media?.filename || _(msg`Mensaje cifrado`)
          }
          accessibilityHint={_(msg`Mantén pulsado para responder o reaccionar`)}
          onLongPress={() => setShowActions(true)}
          style={[
            styles.bubble,
            {
              backgroundColor: isOwn
                ? t.palette.primary_500
                : t.palette.contrast_25,
            },
            message.pending && {opacity: 0.6},
          ]}>
          {message.replyTo && (
            <Text
              style={[a.text_xs, t.atoms.text_contrast_medium]}
              numberOfLines={2}>
              {_(
                msg`En respuesta a ${message.replyTo.sender || message.replyTo.eventId}: ${message.replyTo.body || ''}`,
              )}
            </Text>
          )}
          {message.kind === 'unableToDecrypt' ? (
            <>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                <Trans>Esperando la clave de este mensaje</Trans>
              </Text>
              <Button
                label={_(msg`Volver a intentar descifrar`)}
                size="tiny"
                variant="ghost"
                onPress={onRetryDecryption}>
                <ButtonText>
                  <Trans>Reintentar</Trans>
                </ButtonText>
              </Button>
            </>
          ) : message.kind === 'redacted' ? (
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>Mensaje eliminado</Trans>
            </Text>
          ) : (
            <>
              {message.body && (
                <Text
                  style={[
                    a.text_sm,
                    isOwn ? {color: t.palette.white} : t.atoms.text,
                  ]}>
                  {message.body}
                </Text>
              )}
              {message.kind === 'image' && mediaUri && (
                <Image
                  source={{uri: mediaUri}}
                  style={styles.image}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={message.media?.filename}
                  accessibilityHint={_(msg`Imagen enviada a la sala cifrada`)}
                />
              )}
              {message.media && (!mediaUri || message.kind !== 'image') && (
                <Button
                  label={_(msg`Abrir ${message.media.filename}`)}
                  size="tiny"
                  variant="ghost"
                  onPress={() => void openAttachment()}>
                  <ButtonText>{message.media.filename}</ButtonText>
                </Button>
              )}
              {mediaError && (
                <Text style={[a.text_xs, {color: t.palette.negative_500}]}>
                  <Trans>No se pudo abrir el archivo.</Trans>
                </Text>
              )}
              {message.edited && (
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  <Trans>Editado</Trans>
                </Text>
              )}
            </>
          )}
        </Pressable>
        {message.reactions.length > 0 && (
          <View style={[a.flex_row, a.flex_wrap, a.gap_xs, a.mt_xs]}>
            {message.reactions.map(reaction => (
              <Button
                key={reaction.key}
                label={_(msg`${reaction.key}: ${reaction.count} reacciones`)}
                size="tiny"
                variant="ghost"
                onPress={() => action(reaction.key)}>
                <ButtonText>
                  {reaction.key} {reaction.count}
                </ButtonText>
              </Button>
            ))}
          </View>
        )}
        {isOwn && message.readByCount > 0 && (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {_(msg`Leído por ${message.readByCount}`)}
          </Text>
        )}
        {showActions && message.eventId && (
          <View style={[a.flex_row, a.align_center, a.gap_xs, a.mt_xs]}>
            <Button
              label={_(msg`Responder a este mensaje`)}
              size="tiny"
              color="secondary"
              onPress={() => {
                onReply()
                setShowActions(false)
              }}>
              <ButtonText>
                <Trans>Responder</Trans>
              </ButtonText>
            </Button>
            {['👍', '❤️', '😂', '😮'].map(key => (
              <Button
                key={key}
                label={_(msg`Reaccionar con ${key}`)}
                size="tiny"
                variant="ghost"
                onPress={() => action(key)}>
                <ButtonText>{key}</ButtonText>
              </Button>
            ))}
            {!isOwn && onReport && (
              <Button
                label={_(msg`Reportar este mensaje a moderación`)}
                size="tiny"
                variant="ghost"
                color="negative"
                onPress={() => {
                  setShowActions(false)
                  if (message.eventId) onReport(message.eventId)
                }}>
                <ButtonText>
                  <Trans>Reportar</Trans>
                </ButtonText>
              </Button>
            )}
          </View>
        )}
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
  image: {
    width: 220,
    height: 180,
    borderRadius: 8,
  },
})
