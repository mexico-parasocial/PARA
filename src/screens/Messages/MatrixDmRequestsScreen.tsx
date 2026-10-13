import {useCallback, useEffect, useRef, useState} from 'react'
import {ScrollView} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useFocusEffect} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'

import {declineDirectMessageRequest} from '#/lib/matrix/directMessages'
import {type DmIntro} from '#/lib/matrix/dmIntro'
import {
  listVerifiedDmRooms,
  reconcileDirectInvites,
  rememberVerifiedDmRoom,
  type VerifiedDmRoom,
} from '#/lib/matrix/dmRooms'
import {logger} from '#/logger'
import {useMatrixIdentityQuery} from '#/state/queries/matrix'
import {
  matrixDmRequestsQueryKey,
  useMatrixDmRequestsQuery,
} from '#/state/queries/matrix-dm-requests'
import {useSession} from '#/state/session'
import {atoms as a} from '#/alf'
import {MatrixDmConversationList} from '#/components/dms/MatrixDmConversationList'
import {MatrixDmRequestList} from '#/components/dms/MatrixDmRequestList'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {connectEncryptedChat} from '#/features/encryptedChat/client.native'
import {authorizeInBrowser} from '#/features/encryptedChat/oidc'
import {
  E2EE_ENGINE_ENABLED,
  type EncryptedChatClient,
} from '#/features/encryptedChat/types'

/**
 * Matrix DMs (native): conversations this device verified, and requests.
 * Accepting opens the encrypted direct room and sends the DM intro; while
 * one of our requests is accepted, direct invites are checked against their
 * intro (lib/matrix/dmRooms). Both need the native encrypted-chat engine.
 */
export function MatrixDmRequestsScreen() {
  const {currentAccount} = useSession()
  const did = currentAccount?.did
  const queryClient = useQueryClient()
  const {data: requests} = useMatrixDmRequestsQuery()
  const {data: identity} = useMatrixIdentityQuery({
    enabled: E2EE_ENGINE_ENABLED && !!did,
  })
  const [rooms, setRooms] = useState<VerifiedDmRoom[]>([])
  const checking = useRef(false)

  const refreshRooms = useCallback(async () => {
    if (did) setRooms(await listVerifiedDmRooms(did))
  }, [did])

  useFocusEffect(
    useCallback(() => {
      void refreshRooms()
    }, [refreshRooms]),
  )

  /** One encrypted-chat session for one job, closed afterwards. */
  const withClient = useCallback(
    async <T,>(job: (client: EncryptedChatClient) => Promise<T>) => {
      if (!did || !identity) throw new Error('NO_MATRIX_SESSION')
      const client = await connectEncryptedChat({
        scope: {
          accountId: did,
          homeserver: identity.homeServer,
          userId: identity.userId,
        },
        authorize: loginUrl => authorizeInBrowser(loginUrl),
      })
      try {
        return await job(client)
      } finally {
        await client.close()
      }
    },
    [did, identity],
  )

  const createRoom = useCallback(
    (inviteeMxid: string, intro: DmIntro) =>
      withClient(client => client.createDirectRoom(inviteeMxid, intro)),
    [withClient],
  )

  const onAccepted = useCallback(
    async (room: VerifiedDmRoom) => {
      if (!did) return
      await rememberVerifiedDmRoom(did, room)
      await refreshRooms()
    },
    [did, refreshRooms],
  )

  // The requester's side: once one of our requests is accepted, an invite
  // with its intro is on its way.
  const hasAccepted = !!requests?.outgoing.some(r => r.status === 'accepted')
  useEffect(() => {
    if (!E2EE_ENGINE_ENABLED || !did || !identity || !hasAccepted) return
    if (checking.current) return
    checking.current = true
    void withClient(async client =>
      reconcileDirectInvites(
        await client.listDirectInvites(),
        requests?.outgoing ?? [],
        {
          readIntro: roomId => client.readDmIntro(roomId),
          leave: roomId => client.leaveRoom(roomId),
          remember: room => rememberVerifiedDmRoom(did, room),
          dismissRequest: id => declineDirectMessageRequest(id),
        },
      ),
    )
      .then(async result => {
        if (result.verified.length) await refreshRooms()
        await queryClient.invalidateQueries({
          queryKey: matrixDmRequestsQueryKey(did),
        })
      })
      .catch(err =>
        logger.warn('Could not check Matrix direct invites', {
          safeMessage: String(err),
        }),
      )
      .finally(() => {
        checking.current = false
      })
  }, [
    did,
    hasAccepted,
    identity,
    queryClient,
    refreshRooms,
    requests,
    withClient,
  ])

  return (
    <Layout.Screen testID="matrixDmRequestsScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Mensajes cifrados</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Center style={[a.flex_1]}>
        <ScrollView>
          <MatrixDmConversationList
            rooms={rooms}
            canOpen={E2EE_ENGINE_ENABLED}
          />
          <MatrixDmRequestList
            createRoom={
              E2EE_ENGINE_ENABLED && identity ? createRoom : undefined
            }
            onAccepted={onAccepted}
            notice={
              E2EE_ENGINE_ENABLED ? undefined : (
                <Text>
                  <Trans>
                    Para aceptar solicitudes, esta versión de la app necesita el
                    chat cifrado nativo.
                  </Trans>
                </Text>
              )
            }
          />
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}
