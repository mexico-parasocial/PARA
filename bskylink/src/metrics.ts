import crypto from 'node:crypto'

import {httpLogger} from './logger.js'

type Events = {
  redirect: {
    link: string
    whitelisted: 'unknown' | 'yes'
    blocked: boolean
    warned: boolean
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
  }
  invalid_redirect: {
    link: string
  }
}

type Event<M extends Record<string, any>> = {
  time: number
  event: keyof M
  payload: M[keyof M]
  metadata: Record<string, any>
}

export type Config = {
  trackingEndpoint?: string
}

export class MetricsClient<M extends Record<string, any> = Events> {
  maxBatchSize = 100

  private disabled = false
  private started = false
  private queue: Event<M>[] = []
  private flushInterval: NodeJS.Timeout | null = null

  constructor(private config: Config) {
    this.disabled = !config.trackingEndpoint
  }

  start() {
    if (this.disabled || this.started) return

    this.started = true
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 10_000)
  }

  stop() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    this.flush()
  }

  track<E extends keyof M>(event: E, payload: M[E]) {
    if (this.disabled) return

    this.start()

    const anonId = `anon-${crypto.randomUUID()}`
    const queuedEvent = {
      source: 'blink',
      time: Date.now(),
      event,
      payload,
      metadata: {
        base: {
          deviceId: anonId,
          sessionId: anonId,
        },
        session: {
          did: undefined,
        },
      },
    }

    this.queue.push(queuedEvent)

    if (this.queue.length > this.maxBatchSize) {
      this.flush()
    }
  }

  flush() {
    if (this.disabled || !this.queue.length) return

    const events = this.queue.splice(0, this.queue.length)
    void this.sendBatch(events)
  }

  private async sendBatch(events: Event<M>[]) {
    if (this.disabled || !this.config.trackingEndpoint) return

    try {
      const res = await fetch(this.config.trackingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({events}),
        keepalive: true,
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error')
        httpLogger.error(
          {err: new Error(`${res.status} Failed to fetch - ${errorText}`)},
          'Failed to send metrics',
        )
      } else {
        await res.text().catch(() => {})
      }
    } catch (err) {
      httpLogger.error({err}, 'Failed to send metrics')
    }
  }
}
