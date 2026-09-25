import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type ReportedMessageView} from '#/lib/matrix/reportedMessage'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'

/*
 * The reported message a moderator opened from the report queue, read with the
 * moderator's own session (D2). Nothing here is stored or sent anywhere: the
 * card only shows what this session can read, and says plainly when it can't.
 */
export function ReportedMessageCard({
  view,
  encrypted,
  onClose,
  onRetry,
}: {
  /** Undefined while loading. */
  view: ReportedMessageView | undefined
  /** Whether this engine could have decrypted it (native) or not (WebView). */
  encrypted: boolean
  onClose: () => void
  onRetry: () => void
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()

  const sender =
    view && 'sender' in view && view.sender
      ? view.sender.split(':')[0].replace('@', '')
      : undefined
  const when =
    view && 'timestamp' in view && view.timestamp
      ? i18n.date(new Date(view.timestamp), {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : undefined

  return (
    <View
      accessibilityRole="summary"
      style={[
        a.mx_md,
        a.my_sm,
        a.p_md,
        a.rounded_md,
        a.gap_xs,
        a.border,
        {
          borderColor: t.palette.negative_500 + '44',
          backgroundColor: t.palette.negative_500 + '0D',
        },
      ]}>
      <View style={[a.flex_row, a.justify_between, a.align_center]}>
        <Text style={[a.text_xs, a.font_bold, {color: t.palette.negative_500}]}>
          <Trans>Mensaje reportado</Trans>
        </Text>
        <Button
          label={_(msg`Cerrar el mensaje reportado`)}
          size="tiny"
          variant="ghost"
          color="secondary"
          onPress={onClose}>
          <ButtonText>
            <Trans>Cerrar</Trans>
          </ButtonText>
        </Button>
      </View>

      {(sender || when) && (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {[sender, when].filter(Boolean).join(' · ')}
        </Text>
      )}

      {!view ? (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>Cargando el mensaje…</Trans>
        </Text>
      ) : view.state === 'message' ? (
        <Text style={[a.text_sm, t.atoms.text]} selectable>
          {view.kind === 'text'
            ? view.body
            : `[${
                {
                  image: _(msg`imagen`),
                  audio: _(msg`audio`),
                  video: _(msg`video`),
                  file: _(msg`archivo`),
                }[view.kind]
              }] ${view.body}`}
        </Text>
      ) : (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          {stateCopy(view, encrypted, _)}
        </Text>
      )}

      {view?.state === 'unavailable' && view.reason === 'error' && (
        <Button
          label={_(msg`Volver a cargar el mensaje reportado`)}
          size="tiny"
          color="secondary"
          onPress={onRetry}>
          <ButtonText>
            <Trans>Reintentar</Trans>
          </ButtonText>
        </Button>
      )}
    </View>
  )
}

function stateCopy(
  view: Exclude<ReportedMessageView, {state: 'message'}>,
  encrypted: boolean,
  _: ReturnType<typeof useLingui>['_'],
): string {
  switch (view.state) {
    case 'redacted':
      return _(
        msg`Su autor borró este mensaje. El reporte se conserva, pero ya no hay contenido que revisar.`,
      )
    case 'undecryptable':
      return encrypted
        ? _(
            msg`No se puede descifrar en este dispositivo. Ábrelo en un dispositivo con tus llaves o recupéralas desde la copia de seguridad.`,
          )
        : _(
            msg`Este mensaje está cifrado y este chat no puede descifrarlo. Ábrelo con el chat cifrado.`,
          )
    case 'unavailable':
      switch (view.reason) {
        case 'not-found':
          return _(
            msg`El mensaje ya no está en el servidor; pudo expirar por la política de retención.`,
          )
        case 'no-access':
          return _(
            msg`No tienes acceso a este mensaje. Es posible que se enviara antes de que entraras a la sala.`,
          )
        case 'not-loaded':
          return _(
            msg`El mensaje no está en el historial de este dispositivo. Desplázate hacia atrás en el chat o ábrelo en otro dispositivo.`,
          )
        default:
          return _(msg`No se pudo cargar el mensaje reportado.`)
      }
  }
}
