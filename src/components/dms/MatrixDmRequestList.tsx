import {useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {type DmIntro} from '#/lib/matrix/dmIntro'
import {type VerifiedDmRoom} from '#/lib/matrix/dmRooms'
import {
  DirectRoomCreationError,
  useAcceptMatrixDmRequestMutation,
  useDeclineMatrixDmRequestMutation,
  useMatrixDmRequestsQuery,
} from '#/state/queries/matrix-dm-requests'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'

type FailedAccept = {
  requestId: string
  requesterDid: string
  requesterMxid: string
}

/**
 * Pending Matrix DM requests: received ones to accept or decline, sent ones
 * to cancel. `createRoom` opens the encrypted direct room with the platform's
 * own Matrix session; without it, accepting is unavailable and `notice` says
 * why.
 */
export function MatrixDmRequestList({
  createRoom,
  onAccepted,
  notice,
}: {
  createRoom?: (inviteeMxid: string, intro: DmIntro) => Promise<string>
  /** The room is open: remember who is on the other side of it. */
  onAccepted?: (room: VerifiedDmRoom) => Promise<void> | void
  notice?: React.ReactNode
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {currentAccount} = useSession()
  const {data, isLoading, error, refetch} = useMatrixDmRequestsQuery()
  const decline = useDeclineMatrixDmRequestMutation()
  const accept = useAcceptMatrixDmRequestMutation(
    createRoom ?? (() => Promise.reject(new Error('NO_MATRIX_SESSION'))),
  )
  // The bridge hands the requester's MXID out once; if the room failed, keep
  // it here to retry instead of losing the request.
  const [failed, setFailed] = useState<FailedAccept[]>([])

  const onAccept = (id: string) =>
    accept.mutate(id, {
      onSuccess: ({roomId, requesterDid}) => {
        void onAccepted?.({roomId, did: requesterDid})
        Toast.show(l`Conversación cifrada creada`, {type: 'success'})
      },
      onError: err => {
        if (err instanceof DirectRoomCreationError) {
          setFailed(f => [
            ...f,
            {
              requestId: err.requestId,
              requesterDid: err.requesterDid,
              requesterMxid: err.requesterMxid,
            },
          ])
        }
        Toast.show(l`No se pudo crear la conversación`, {type: 'error'})
      },
    })

  const onRetry = async (item: FailedAccept) => {
    if (!createRoom || !currentAccount) return
    try {
      const roomId = await createRoom(item.requesterMxid, {
        requestId: item.requestId,
        did: currentAccount.did,
      })
      await onAccepted?.({roomId, did: item.requesterDid})
      setFailed(f => f.filter(x => x !== item))
      Toast.show(l`Conversación cifrada creada`, {type: 'success'})
    } catch {
      Toast.show(l`No se pudo crear la conversación`, {type: 'error'})
    }
  }

  if (isLoading) {
    return (
      <View style={[a.p_xl, a.align_center]}>
        <Loader size="lg" />
      </View>
    )
  }
  if (error) {
    return (
      <View style={[a.p_xl, a.gap_md, a.align_center]}>
        <Text style={[t.atoms.text_contrast_medium]}>
          <Trans>No se pudieron cargar las solicitudes.</Trans>
        </Text>
        <Button
          label={l`Reintentar`}
          size="small"
          color="secondary"
          onPress={() => void refetch()}>
          <ButtonText>
            <Trans>Reintentar</Trans>
          </ButtonText>
        </Button>
      </View>
    )
  }

  const incoming = data?.incoming ?? []
  const outgoing = data?.outgoing ?? []

  return (
    <View style={[a.p_lg, a.gap_xl]}>
      {notice ? (
        <View style={[a.p_md, a.rounded_md, t.atoms.bg_contrast_25]}>
          {notice}
        </View>
      ) : null}

      {failed.length > 0 && (
        <Section title={l`Por terminar`}>
          {failed.map(item => (
            <Row key={item.requesterMxid} did={item.requesterDid}>
              <Button
                label={l`Reintentar crear la conversación`}
                size="small"
                color="primary"
                disabled={!createRoom}
                onPress={() => void onRetry(item)}>
                <ButtonText>
                  <Trans>Reintentar</Trans>
                </ButtonText>
              </Button>
            </Row>
          ))}
        </Section>
      )}

      <Section title={l`Recibidas`}>
        {incoming.length === 0 ? (
          <Empty text={l`No tienes solicitudes de mensaje.`} />
        ) : (
          incoming.map(r => (
            <Row key={r.id} did={r.requesterDid} expiresAt={r.expiresAt}>
              <Button
                label={l`Aceptar`}
                size="small"
                color="primary"
                disabled={!createRoom || accept.isPending}
                onPress={() => onAccept(r.id)}>
                <ButtonText>
                  <Trans>Aceptar</Trans>
                </ButtonText>
              </Button>
              <Button
                label={l`Rechazar`}
                size="small"
                color="secondary"
                disabled={decline.isPending}
                onPress={() => decline.mutate(r.id)}>
                <ButtonText>
                  <Trans>Rechazar</Trans>
                </ButtonText>
              </Button>
            </Row>
          ))
        )}
      </Section>

      <Section title={l`Enviadas`}>
        {outgoing.length === 0 ? (
          <Empty text={l`No has enviado solicitudes.`} />
        ) : (
          outgoing.map(r => (
            <Row
              key={r.id}
              did={r.recipientDid}
              expiresAt={r.status === 'pending' ? r.expiresAt : undefined}
              status={
                r.status === 'accepted'
                  ? l`Aceptada: te llegará una invitación cifrada`
                  : undefined
              }>
              <Button
                label={
                  r.status === 'accepted'
                    ? l`Quitar de la lista`
                    : l`Cancelar solicitud`
                }
                size="small"
                color="secondary"
                disabled={decline.isPending}
                onPress={() => decline.mutate(r.id)}>
                <ButtonText>
                  {r.status === 'accepted' ? (
                    <Trans>Quitar</Trans>
                  ) : (
                    <Trans>Cancelar</Trans>
                  )}
                </ButtonText>
              </Button>
            </Row>
          ))
        )}
      </Section>
    </View>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <View style={[a.gap_sm]}>
      <Text style={[a.text_md, a.font_bold]}>{title}</Text>
      {children}
    </View>
  )
}

function Empty({text}: {text: string}) {
  const t = useTheme()
  return <Text style={[t.atoms.text_contrast_medium]}>{text}</Text>
}

function Row({
  did,
  expiresAt,
  status,
  children,
}: {
  did: string
  expiresAt?: string
  status?: string
  children: React.ReactNode
}) {
  const t = useTheme()
  const {data: profile} = useProfileQuery({did})
  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.gap_md,
        a.p_md,
        a.rounded_md,
        t.atoms.bg_contrast_25,
      ]}>
      <View style={[a.flex_1]}>
        <Text style={[a.font_bold]} numberOfLines={1}>
          {profile?.displayName || profile?.handle || did}
        </Text>
        {profile?.handle ? (
          <Text style={[t.atoms.text_contrast_medium]} numberOfLines={1}>
            @{profile.handle}
          </Text>
        ) : null}
        {status ? (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {status}
          </Text>
        ) : null}
        {expiresAt ? (
          <Text style={[a.text_xs, t.atoms.text_contrast_low]}>
            <Trans>Vence el {new Date(expiresAt).toLocaleDateString()}</Trans>
          </Text>
        ) : null}
      </View>
      <View style={[a.flex_row, a.gap_sm]}>{children}</View>
    </View>
  )
}
