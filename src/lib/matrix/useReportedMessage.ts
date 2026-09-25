import {useQuery} from '@tanstack/react-query'

import {fetchReportedMessage, type ReportedMessageView} from './reportedMessage'

/**
 * The reported message a moderator opened, read over the client-server API
 * with the chat's own Matrix session (the WebView engine has no other way in).
 */
export function useReportedMessage({
  roomId,
  eventId,
  session,
}: {
  roomId: string | undefined
  eventId: string | undefined
  session: {homeServer: string; accessToken: string} | undefined
}) {
  const query = useQuery<ReportedMessageView>({
    queryKey: ['reported-message', 'webview', roomId, eventId],
    enabled: !!roomId && !!eventId && !!session,
    retry: false,
    queryFn: () =>
      fetchReportedMessage({
        homeServer: session!.homeServer,
        accessToken: session!.accessToken,
        roomId: roomId!,
        eventId: eventId!,
      }),
  })
  return {view: query.data, retry: () => void query.refetch()}
}
