import {onAppStateChange} from '#/lib/appState'
import {isNetworkError} from '#/lib/strings/errors'
import {Logger} from '#/logger'
import * as env from '#/env'

type Event<M extends Record<string, unknown>> = {
  time: number
  event: keyof M
  payload: M[keyof M]
  metadata: Record<string, unknown>
}

// Privacy-first: default to local Umami, never Bluesky
const UMAMI_HOST = env.METRICS_API_HOST || 'http://localhost:3001'
const UMAMI_WEBSITE_ID = 'para-app'
const logger = Logger.create(Logger.Context.Metric, {})

export class MetricsClient<M extends Record<string, unknown>> {
  maxBatchSize = 100

  private started: boolean = false
  private queue: Event<M>[] = []
  private failedQueue: Event<M>[] = []
  private flushInterval: ReturnType<typeof setInterval> | null = null

  start() {
    if (this.started) return
    this.started = true
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 10_000)
    onAppStateChange(state => {
      if (state === 'active') {
        this.retryFailedLogs()
      } else {
        this.flush()
      }
    })
  }

  track<E extends keyof M>(
    event: E,
    payload: M[E],
    metadata: Record<string, unknown> = {},
  ) {
    this.start()

    const e = {
      time: Date.now(),
      event,
      payload,
      metadata,
    }
    this.queue.push(e)

    logger.info(`event: ${e.event as string}`, e)

    if (this.queue.length > this.maxBatchSize) {
      this.flush()
    }
  }

  flush() {
    if (!this.queue.length) return
    const events = this.queue.splice(0, this.queue.length)
    this.sendBatch(events)
  }

  private async sendBatch(events: Event<M>[], isRetry: boolean = false) {
    logger.debug(`sendBatch: ${events.length}`, {isRetry})

    // Send each event individually to local Umami (privacy-first, no third parties)
    for (const e of events) {
      try {
        const body = JSON.stringify({
          type: 'event',
          payload: {
            website: UMAMI_WEBSITE_ID,
            hostname: 'para.local',
            url: e.metadata?.screen || '/',
            referrer: '',
            name: String(e.event),
            data: {
              ...e.payload,
              ...e.metadata,
              time: e.time,
            },
          },
        })

        if (env.IS_WEB && 'navigator' in globalThis && navigator.sendBeacon) {
          navigator.sendBeacon(
            `${UMAMI_HOST}/api/collect`,
            new Blob([body], {type: 'application/json'}),
          )
        } else {
          await fetch(`${UMAMI_HOST}/api/collect`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body,
            keepalive: true,
          })
        }
      } catch (err: unknown) {
        if (isNetworkError(err)) {
          if (!isRetry) this.failedQueue.push(e)
        }
      }
    }
  }

  private retryFailedLogs() {
    if (!this.failedQueue.length) return
    const events = this.failedQueue.splice(0, this.failedQueue.length)
    this.sendBatch(events, true)
  }
}
