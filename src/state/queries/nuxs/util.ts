import {type AppBskyActorDefs, nuxSchema} from '@atproto/api'

import {logger} from '#/logger'
import {
  type AppNux,
  type Nux,
  nuxNames,
  NuxSchemas,
} from '#/state/queries/nuxs/definitions'

export function parseAppNux(nux: AppBskyActorDefs.Nux): AppNux | undefined {
  if (!nuxNames.has(nux.id as Nux)) return
  if (!nuxSchema.safeParse(nux).success) return

  const {data, ...rest} = nux

  const schema = NuxSchemas[nux.id as Nux]

  if (schema && data) {
    // `data` is a server-controlled string, don't let a malformed value throw
    let parsedData: unknown
    try {
      parsedData = JSON.parse(data)
    } catch (e) {
      logger.error(`nuxs: failed to parse data for nux "${nux.id}"`, {
        message: e,
      })
      return
    }

    if (!schema.safeParse(parsedData).success) return

    return {
      ...rest,
      data: parsedData,
    } as AppNux
  }

  return {
    ...rest,
    data: undefined,
  } as AppNux
}

export function serializeAppNux(nux: AppNux): AppBskyActorDefs.Nux {
  const {data, ...rest} = nux
  const schema = NuxSchemas[nux.id]

  const result: AppBskyActorDefs.Nux = {
    ...rest,
    data: undefined,
  }

  if (schema) {
    schema.parse(data)
    result.data = JSON.stringify(data)
  }

  nuxSchema.parse(result)

  return result
}
