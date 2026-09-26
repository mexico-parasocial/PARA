import {useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  MESSAGE_REPORT_REASONS,
  MessageReportError,
  type MessageReportReason,
  useReportMessageMutation,
} from '#/state/queries/matrix'
import {useSession} from '#/state/session'
import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Toggle from '#/components/forms/Toggle'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'

export type ReportedMessage = {roomId: string; eventId: string}

/** Localized labels for the fixed report reasons, shared with moderation. */
export function useMessageReportReasonLabels(): Record<
  MessageReportReason,
  string
> {
  const {_} = useLingui()
  return {
    spam: _(msg`Spam o publicidad`),
    harassment: _(msg`Acoso o intimidación`),
    hate: _(msg`Discurso de odio`),
    violence: _(msg`Violencia o amenazas`),
    impersonation: _(msg`Suplantación de identidad`),
    other: _(msg`Otro motivo`),
  }
}

/*
 * Report a chat message to the community's moderators.
 *
 * Only the room, the event and a reason from a fixed list are sent. The text of
 * the message never leaves the room: moderators read it there from their own
 * client (D2, PARA/docs/MATRIX-D2-ENCRYPTED-REPORTS-DECISION-2026-09-23.md).
 * The reason is a fixed choice rather than free text for the same reason.
 */
export function ReportMessageDialog({
  control,
  communityUri,
  message,
}: {
  control: Dialog.DialogControlProps
  communityUri: string
  message: ReportedMessage | undefined
}) {
  const {_} = useLingui()
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner
        label={_(msg`Reportar mensaje`)}
        style={web({maxWidth: 420})}>
        {message ? (
          <Inner
            control={control}
            communityUri={communityUri}
            message={message}
          />
        ) : null}
        <Dialog.Close />
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

function Inner({
  control,
  communityUri,
  message,
}: {
  control: Dialog.DialogControlProps
  communityUri: string
  message: ReportedMessage
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const [reason, setReason] = useState<MessageReportReason | undefined>()
  const report = useReportMessageMutation()

  const reasonLabels = useMessageReportReasonLabels()

  const onSubmit = () => {
    if (!reason || !currentAccount) return
    report.mutate(
      {
        reporterDid: currentAccount.did,
        communityUri,
        matrixRoomId: message.roomId,
        matrixEventId: message.eventId,
        reason,
      },
      {
        onSuccess: () => {
          control.close(() => {
            Toast.show(_(msg`Reporte enviado a moderación`))
          })
        },
      },
    )
  }

  return (
    <View style={[a.gap_lg]}>
      <View style={[a.gap_xs]}>
        <Text style={[a.text_xl, a.font_bold, a.leading_tight]}>
          <Trans>Reportar mensaje</Trans>
        </Text>
        <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>
            Moderación verá el mensaje en la sala, desde su propia cuenta. No
            enviamos una copia del texto.
          </Trans>
        </Text>
      </View>

      <Toggle.Group
        label={_(msg`Motivo del reporte`)}
        type="radio"
        values={reason ? [reason] : []}
        onChange={values => setReason(values[0] as MessageReportReason)}>
        <View style={[a.gap_sm]}>
          {MESSAGE_REPORT_REASONS.map(value => (
            <Toggle.Item key={value} name={value} label={reasonLabels[value]}>
              <Toggle.Radio />
              <Toggle.LabelText>{reasonLabels[value]}</Toggle.LabelText>
            </Toggle.Item>
          ))}
        </View>
      </Toggle.Group>

      {report.error ? (
        <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
          {reportErrorCopy(report.error, _)}
        </Text>
      ) : null}

      <Button
        label={_(msg`Enviar reporte`)}
        size="large"
        color="negative"
        disabled={!reason || report.isPending}
        onPress={onSubmit}>
        <ButtonText>
          {report.isPending ? (
            <Trans>Enviando…</Trans>
          ) : (
            <Trans>Enviar reporte</Trans>
          )}
        </ButtonText>
      </Button>
    </View>
  )
}

function reportErrorCopy(
  error: Error,
  _: ReturnType<typeof useLingui>['_'],
): string {
  const code = error instanceof MessageReportError ? error.code : undefined
  switch (code) {
    case 'EventNotFound':
      return _(
        msg`Este mensaje todavía no llega a moderación. Inténtalo de nuevo en unos segundos.`,
      )
    case 'SenderNotAttributable':
      return _(
        msg`No se puede reportar este mensaje desde aquí: su autor no entró con una cuenta de PARA.`,
      )
    case 'SelfReport':
      return _(msg`No puedes reportar tus propios mensajes.`)
    default:
      return _(msg`No se pudo enviar el reporte. Inténtalo de nuevo.`)
  }
}
