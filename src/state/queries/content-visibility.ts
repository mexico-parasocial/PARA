import {type AtIdentifierString} from '@atproto/syntax'
import {t} from '@lingui/core/macro'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {isRecordNotFoundError} from '#/lib/xrpc-error'
import {createQueryKey} from '#/state/queries/util'
import {usePdsClient, useSession} from '#/state/session'
import * as Toast from '#/components/Toast'
import {useAnalytics} from '#/analytics'
import {com} from '#/lexicons'

/**
 * The `app.bsky.actor.contentVisibilityDeclaration` record has no generated
 * lexicon module yet, so this module reads and writes the record through the
 * generic repo endpoints.
 */
const CONTENT_VISIBILITY_COLLECTION =
  'app.bsky.actor.contentVisibilityDeclaration'

export type ContentVisibilityDeclaration = {
  $type: typeof CONTENT_VISIBILITY_COLLECTION
  hideFromAlgorithmicRecommendations: boolean
}

export const contentVisibilityQueryKey = (did: string) =>
  createQueryKey('content-visibility', {did})

const fallbackRecord = (
  hideFromAlgorithmicRecommendations: boolean,
): ContentVisibilityDeclaration => ({
  $type: CONTENT_VISIBILITY_COLLECTION,
  hideFromAlgorithmicRecommendations,
})

export function useContentVisibilityQuery() {
  const client = usePdsClient()
  const {currentAccount} = useSession()
  const did = currentAccount?.did

  return useQuery({
    queryKey: contentVisibilityQueryKey(did ?? ''),
    queryFn: async () => {
      try {
        const response = await client.call(com.atproto.repo.getRecord, {
          repo: did! as AtIdentifierString,
          collection: CONTENT_VISIBILITY_COLLECTION,
          rkey: 'self',
        })
        const value = response.value
        if (
          typeof (value as {hideFromAlgorithmicRecommendations?: unknown})
            .hideFromAlgorithmicRecommendations === 'boolean'
        ) {
          return {
            $type: CONTENT_VISIBILITY_COLLECTION,
            hideFromAlgorithmicRecommendations: (
              value as {hideFromAlgorithmicRecommendations: boolean}
            ).hideFromAlgorithmicRecommendations,
          }
        }
        return fallbackRecord(false)
      } catch (error) {
        if (isRecordNotFoundError(error)) {
          return fallbackRecord(false)
        }
        throw error
      }
    },
    enabled: !!did,
  })
}

export function useContentVisibilityMutation() {
  const ax = useAnalytics()
  const client = usePdsClient()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  const did = currentAccount?.did
  const queryKey = contentVisibilityQueryKey(did ?? '')

  return useMutation({
    mutationFn: async (hideFromAlgorithmicRecommendations: boolean) => {
      if (!did) throw new Error('Not signed in')

      const record = fallbackRecord(hideFromAlgorithmicRecommendations)
      await client.call(com.atproto.repo.putRecord, {
        repo: did as AtIdentifierString,
        collection: CONTENT_VISIBILITY_COLLECTION,
        rkey: 'self',
        record: record,
      })
      return record
    },
    onMutate: async hideFromAlgorithmicRecommendations => {
      await queryClient.cancelQueries({queryKey})
      const previous =
        queryClient.getQueryData<ContentVisibilityDeclaration>(queryKey)
      queryClient.setQueryData(
        queryKey,
        fallbackRecord(hideFromAlgorithmicRecommendations),
      )
      return {previous}
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous)
      Toast.show(t`Failed to update content visibility`)
    },
    onSuccess: (_record, hide) => {
      ax.metric('contentVisibility:algorithmicRecommendations:change', {hide})
    },
    onSettled: () => {
      void queryClient.invalidateQueries({queryKey})
    },
  })
}
