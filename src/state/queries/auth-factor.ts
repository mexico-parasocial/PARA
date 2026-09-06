import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {STALE} from '#/state/queries'
import {useAgent} from '#/state/session'

const RQKEY_ROOT = 'auth-factor'

export type AuthFactorType = 'im8'

export type AuthFactorResponse = {
  authFactorType?: AuthFactorType
}

export type SetAuthFactorInput = {
  authFactorType: AuthFactorType | null
}

export const authFactorQueryKey = () => [RQKEY_ROOT]

export function useAuthFactorQuery() {
  const agent = useAgent()

  return useQuery<AuthFactorResponse>({
    staleTime: STALE.SECONDS.THIRTY,
    queryKey: authFactorQueryKey(),
    queryFn: async () => {
      const res = await agent.call('com.para.account.getAuthFactor', {})
      return res.data as AuthFactorResponse
    },
  })
}

export function useSetAuthFactorMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation<AuthFactorResponse, Error, SetAuthFactorInput>({
    mutationFn: async input => {
      const res = await agent.call('com.para.account.setAuthFactor', {
        ...(input.authFactorType ? {authFactorType: input.authFactorType} : {}),
      })
      return res.data as AuthFactorResponse
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({queryKey: authFactorQueryKey()})
    },
  })
}
