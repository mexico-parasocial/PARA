import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {
  acceptDirectMessageRequest,
  declineDirectMessageRequest,
  listDirectMessageRequests,
  requestDirectMessage,
} from '#/lib/matrix/directMessages'
import {type DmIntro} from '#/lib/matrix/dmIntro'
import {useSession} from '#/state/session'
import {MATRIX_DMS_ENABLED} from '#/env'

const RQKEY_ROOT = 'matrix-dm-requests'
export const matrixDmRequestsQueryKey = (did: string | undefined) => [
  RQKEY_ROOT,
  did,
]

/**
 * Accepting returned the requester's MXID but the room could not be created.
 * The bridge request is already gone, so the caller keeps this to retry the
 * room creation without asking again.
 */
export class DirectRoomCreationError extends Error {
  constructor(
    public requestId: string,
    public requesterDid: string,
    public requesterMxid: string,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause))
    this.name = 'DirectRoomCreationError'
  }
}

export function useMatrixDmRequestsQuery() {
  const {currentAccount} = useSession()
  return useQuery({
    queryKey: matrixDmRequestsQueryKey(currentAccount?.did),
    queryFn: listDirectMessageRequests,
    enabled: MATRIX_DMS_ENABLED && !!currentAccount,
    refetchInterval: 60_000,
  })
}

export function useRequestMatrixDmMutation() {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()
  return useMutation({
    mutationFn: (recipientDid: string) => requestDirectMessage(recipientDid),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: matrixDmRequestsQueryKey(currentAccount?.did),
      }),
  })
}

export function useDeclineMatrixDmRequestMutation() {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()
  return useMutation({
    mutationFn: (id: string) => declineDirectMessageRequest(id),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: matrixDmRequestsQueryKey(currentAccount?.did),
      }),
  })
}

/**
 * Accept a request and open the encrypted direct room with `createRoom`
 * (the platform's own Matrix session). Throws DirectRoomCreationError when
 * only the room creation failed.
 */
export function useAcceptMatrixDmRequestMutation(
  createRoom: (inviteeMxid: string, intro: DmIntro) => Promise<string>,
) {
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentAccount) throw new Error('NOT_SIGNED_IN')
      const {requesterDid, requesterMxid} = await acceptDirectMessageRequest(id)
      try {
        // The intro names this request and the recipient (this account), so
        // the requester can tell this room apart from any other invite.
        const roomId = await createRoom(requesterMxid, {
          requestId: id,
          did: currentAccount.did,
        })
        return {requesterDid, roomId}
      } catch (cause) {
        throw new DirectRoomCreationError(
          id,
          requesterDid,
          requesterMxid,
          cause,
        )
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: matrixDmRequestsQueryKey(currentAccount?.did),
      }),
  })
}
