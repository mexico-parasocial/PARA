import AsyncStorage from '@react-native-async-storage/async-storage'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {fetchParaIdentity, updateParaIdentity} from '#/lib/api/para-identity'
import {type ParaIdentityRecord} from '#/lib/api/para-lexicons'
import {STALE} from '#/state/queries'
import {useAppviewClient, usePdsClient, useSession} from '#/state/session'
import {LEGACY_STORAGE_KEYS, type PassportFlag} from './sections'

export const paraIdentityQueryKey = (did: string) => ['para-identity', did]

/** The owner's synced visibility record; null when they never set one. */
export function useParaIdentityQuery(did: string | undefined) {
  const {currentAccount} = useSession()
  const pdsClient = usePdsClient()
  const appviewClient = useAppviewClient()
  const isMe = Boolean(did) && did === currentAccount?.did

  return useQuery<ParaIdentityRecord | null>({
    staleTime: STALE.SECONDS.THIRTY,
    enabled: Boolean(did),
    queryKey: paraIdentityQueryKey(did ?? ''),
    queryFn: () => fetchParaIdentity(isMe ? pdsClient : appviewClient, did!),
  })
}

/** Turns one passport section on or off for the signed-in account. */
export function useSetPassportFlagMutation() {
  const {currentAccount} = useSession()
  const pdsClient = usePdsClient()
  const queryClient = useQueryClient()
  const did = currentAccount?.did ?? ''

  return useMutation({
    // Each write reads then merges the record; run them one at a time.
    scope: {id: 'para-identity-write'},
    mutationFn: async ({flag, value}: {flag: PassportFlag; value: boolean}) => {
      if (!did) throw new Error('Not signed in')
      await updateParaIdentity(pdsClient, did, {[flag]: value})
      const storageKey = LEGACY_STORAGE_KEYS[flag]
      if (storageKey) await AsyncStorage.setItem(storageKey, String(value))
    },
    onMutate: async ({flag, value}) => {
      const key = paraIdentityQueryKey(did)
      await queryClient.cancelQueries({queryKey: key})
      const previous = queryClient.getQueryData<ParaIdentityRecord | null>(key)
      queryClient.setQueryData<ParaIdentityRecord | null>(key, current => ({
        createdAt: new Date().toISOString(),
        isVerifiedPublicFigure: false,
        ...current,
        [flag]: value,
      }))
      return {previous}
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(paraIdentityQueryKey(did), context?.previous)
    },
    onSettled: () =>
      queryClient.invalidateQueries({queryKey: paraIdentityQueryKey(did)}),
  })
}
