import {useLingui} from '@lingui/react/macro'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'

import {MOD_PROXY_SERVICE} from '#/lib/constants'
import {isNetworkError} from '#/lib/strings/errors'
import {logger} from '#/logger'
import {STALE} from '#/state/queries'
import {createQueryKey} from '#/state/queries/util'
import {useAppviewClient, useSession} from '#/state/session'
import * as Toast from '#/components/Toast'
import {tools} from '#/lexicons'

const QUERY_KEY_ROOT = 'moderation-inbox'

export function useModerationInboxNotificationPreferencesQuery(
  isEnabled = true,
) {
  const client = useAppviewClient()
  const {currentAccount, hasSession} = useSession()
  const did = currentAccount?.did

  return useQuery({
    queryKey: createQueryKey(QUERY_KEY_ROOT, {
      did,
      endpoint: 'notificationPreferences',
    }),
    queryFn: async () =>
      await client.call(
        tools.ozone.inbox.getNotificationPreferences,
        {},
        {service: MOD_PROXY_SERVICE},
      ),
    staleTime: STALE.MINUTES.ONE,
    enabled: isEnabled && hasSession && !!did,
  })
}

export function useUpdateModerationInboxNotificationPreferencesMutation() {
  const {t: l} = useLingui()
  const client = useAppviewClient()
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()
  const queryKey = createQueryKey(QUERY_KEY_ROOT, {
    did: currentAccount?.did,
    endpoint: 'notificationPreferences',
  })

  return useMutation({
    mutationFn: async (
      preferences: tools.ozone.inbox.putNotificationPreferences.$InputBody,
    ) =>
      await client.call(
        tools.ozone.inbox.putNotificationPreferences,
        preferences,
        {service: MOD_PROXY_SERVICE},
      ),
    onMutate: async () => {
      await queryClient.cancelQueries({queryKey})
    },
    onSuccess: data => {
      queryClient.setQueryData(queryKey, data)
    },
    onError: error => {
      if (!isNetworkError(error)) {
        logger.error(
          'Could not update moderation inbox notification settings',
          {
            safeMessage: error,
          },
        )
      }
      Toast.show(l`Could not update notification settings`, {type: 'error'})
    },
  })
}
