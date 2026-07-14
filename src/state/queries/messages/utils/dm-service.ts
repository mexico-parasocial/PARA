import {type AtpAgent} from '@atproto/api'

import {getDmServiceHeadersForServiceUrl} from '#/lib/constants'

export function getAgentDmServiceHeaders(agent: AtpAgent) {
  return getDmServiceHeadersForServiceUrl(agent.serviceUrl?.toString())
}
