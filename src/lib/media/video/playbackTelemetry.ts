import {Sentry} from '#/logger/sentry/lib'

/**
 * Playback telemetry for video surfaces.
 *
 * One instance tracks a player across repeated activation windows (e.g. a
 * feed video becoming active/inactive as the user scrolls). Each activation
 * opens a root `video.playback` span; ready/first-play timings and the final
 * outcome are recorded as span attributes.
 */

type Span = ReturnType<typeof Sentry.startInactiveSpan>

export type PlaybackTelemetry = {
  activated: (opts?: {preloaded?: boolean}) => void
  ready: () => void
  playing: () => void
  deactivated: () => void
  error: (message: string) => void
}

export function createPlaybackTelemetry(config: {
  surface: string
  presentation: string
}): PlaybackTelemetry {
  let span: Span | null = null
  let activatedAt = 0
  let readyRecorded = false
  let playingRecorded = false

  const elapsedMs = () => Math.round(Date.now() - activatedAt)

  const endSpan = (outcome: 'ok' | 'error', errorMessage?: string) => {
    if (!span) return
    if (errorMessage !== undefined) {
      span.setAttribute('errorMessage', errorMessage)
    }
    span.setAttribute('outcome', outcome)
    span.end()
    span = null
  }

  return {
    activated(opts) {
      // Duplicate activations within an open window are ignored.
      if (span) return
      activatedAt = Date.now()
      readyRecorded = false
      playingRecorded = false
      const attributes: Record<string, string | boolean> = {
        surface: config.surface,
        presentation: config.presentation,
      }
      if (opts && opts.preloaded !== undefined) {
        attributes.preloaded = opts.preloaded
      }
      span = Sentry.startInactiveSpan({
        name: 'video.playback',
        op: 'video.playback',
        attributes,
      })
    },
    ready() {
      if (!span || readyRecorded) return
      readyRecorded = true
      span.setAttribute('timeToReadyMs', elapsedMs())
    },
    playing() {
      if (!span || playingRecorded) return
      playingRecorded = true
      span.setAttribute('timeToFirstPlayMs', elapsedMs())
    },
    deactivated() {
      endSpan('ok')
    },
    error(message) {
      endSpan('error', message)
    },
  }
}
