import {useCallback, useEffect, useState} from 'react'

import {fetchReportedMessage, type ReportedMessageView} from './reportedMessage'

type ReadMessage = () => Promise<ReportedMessageView>

/** Keeps review content inside the open screen, scoped to its reader/session. */
export function useReportedMessageReader(read: ReadMessage | undefined) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    read: ReadMessage
    attempt: number
    view: ReportedMessageView
  }>()

  useEffect(() => {
    if (!read) {
      setResult(undefined)
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      let view: ReportedMessageView
      try {
        view = await read()
      } catch {
        view = {state: 'unavailable', reason: 'error'}
      }
      if (cancelled) return
      setResult({read, attempt, view})
      // Recheck while reviewing: a redaction must replace the displayed text.
      timer = setTimeout(() => void refresh(), 15_000)
    }
    void refresh()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [read, attempt])

  return {
    view:
      read && result?.read === read && result.attempt === attempt
        ? result.view
        : undefined,
    retry: () => setAttempt(value => value + 1),
  }
}

/** Reads with the current Matrix session, without a shared plaintext cache. */
export function useReportedMessage({
  roomId,
  eventId,
  session,
}: {
  roomId: string | undefined
  eventId: string | undefined
  session: {homeServer: string; accessToken: string} | undefined
}) {
  const homeServer = session?.homeServer
  const accessToken = session?.accessToken
  const read = useCallback(
    () =>
      fetchReportedMessage({
        homeServer: homeServer!,
        accessToken: accessToken!,
        roomId: roomId!,
        eventId: eventId!,
      }),
    [homeServer, accessToken, roomId, eventId],
  )
  return useReportedMessageReader(
    roomId && eventId && homeServer && accessToken ? read : undefined,
  )
}
