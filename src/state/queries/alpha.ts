import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'
import {com} from '#/lexicons'

const RQKEY_ROOT = 'alpha'

export type AlphaAccessResponse = {
  hasAccess: boolean
  state?: string
  waitlistPosition?: number
}

export type AlphaRequestAccessInput = {
  state: string
  inviteCode?: string
}

export type AlphaRequestAccessResponse = {
  status: 'approved' | 'waitlisted' | 'rejected' | 'already_has_access'
  position?: number
  state?: string
}

export type AlphaRolloutState = {
  state: string
  totalSlots: number
  usedSlots: number
  isOpen: boolean
  openedAt?: string
}

export type AlphaRolloutStatusResponse = {
  states: AlphaRolloutState[]
}

export const alphaAccessQueryKey = () => [RQKEY_ROOT, 'access']

export const alphaRolloutStatusQueryKey = () => [RQKEY_ROOT, 'rollout']

export function useAlphaAccessQuery() {
  const agent = useAgent()

  return useQuery<AlphaAccessResponse>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: alphaAccessQueryKey(),
    queryFn: async () => {
      const res = await agent.appviewClient.call(com.para.alpha.getAccess, {})
      return res
    },
  })
}

export function useRequestAlphaAccessMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation<
    AlphaRequestAccessResponse,
    Error,
    AlphaRequestAccessInput
  >({
    mutationFn: async input => {
      const res = await agent.appviewClient.call(com.para.alpha.requestAccess, {
        state: input.state,
        inviteCode: input.inviteCode,
      })
      return res as AlphaRequestAccessResponse
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: alphaAccessQueryKey()})
      void queryClient.invalidateQueries({
        queryKey: alphaRolloutStatusQueryKey(),
      })
    },
  })
}

export function useAlphaRolloutStatusQuery() {
  const agent = useAgent()

  return useQuery<AlphaRolloutStatusResponse>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: alphaRolloutStatusQueryKey(),
    queryFn: async () => {
      const res = await agent.appviewClient.call(
        com.para.alpha.getRolloutStatus,
        {},
      )
      return res
    },
  })
}
