import {Trans, useLingui} from '@lingui/react/macro'

import {useRequestMatrixDmMutation} from '#/state/queries/matrix-dm-requests'
import {useSession} from '#/state/session'
import {atoms as a} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import {Lock_Stroke2_Corner2_Rounded as Lock} from '#/components/icons/Lock'
import * as Prompt from '#/components/Prompt'
import * as Toast from '#/components/Toast'
import {MATRIX_DMS_ENABLED} from '#/env'

/**
 * Ask this profile for an encrypted Matrix direct message. Sharing one's chat
 * account is the point of the request, so the user confirms it here and then
 * approves it again in iM8.
 */
export function RequestMatrixDmButton({
  did,
  handle,
}: {
  did: string
  handle: string
}) {
  const {t: l} = useLingui()
  const {currentAccount} = useSession()
  const control = Prompt.usePromptControl()
  const {mutate, isPending} = useRequestMatrixDmMutation()

  if (!MATRIX_DMS_ENABLED || !currentAccount || currentAccount.did === did) {
    return null
  }

  const onConfirm = () => {
    Toast.show(l`Aprueba la solicitud en iM8`, {type: 'info'})
    mutate(did, {
      onSuccess: () =>
        Toast.show(l`Solicitud enviada a @${handle}`, {type: 'success'}),
      onError: err =>
        Toast.show(
          err.message === 'TOO_MANY_PENDING_DM_REQUESTS'
            ? l`Tienes demasiadas solicitudes pendientes`
            : l`No se pudo enviar la solicitud`,
          {type: 'error'},
        ),
    })
  }

  return (
    <>
      <Button
        testID="matrixDmRequestBtn"
        size="small"
        color="secondary"
        variant="solid"
        shape="round"
        disabled={isPending}
        label={l`Pedir mensaje cifrado a @${handle}`}
        style={[a.justify_center]}
        onPress={() => control.open()}>
        <ButtonIcon icon={Lock} size="md" />
      </Button>
      <Prompt.Outer control={control}>
        <Prompt.TitleText>
          <Trans>Pedir un mensaje cifrado</Trans>
        </Prompt.TitleText>
        <Prompt.DescriptionText>
          <Trans>
            @{handle} recibirá tu solicitud. Si la acepta, podrá ver tu cuenta
            de chat y abrir una conversación cifrada contigo. Nadie más la
            recibe. Después confirmarás en iM8.
          </Trans>
        </Prompt.DescriptionText>
        <Prompt.Actions>
          <Prompt.Action cta={l`Enviar solicitud`} onPress={onConfirm} />
          <Prompt.Cancel />
        </Prompt.Actions>
      </Prompt.Outer>
    </>
  )
}
