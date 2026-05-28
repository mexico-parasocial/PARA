import {type BskyAgent} from '@atproto/api'

import {getDmServiceHeadersForServiceUrl} from '#/lib/constants'

export function getAgentDmServiceHeaders(agent: BskyAgent) {
  return getDmServiceHeadersForServiceUrl(agent.serviceUrl?.toString())
}
