import {type AppBskyFeedDefs} from '@atproto/api'

import {type Meme} from '#/lib/mock-data/types'

export type Mode = 'Memes'
export type ViewStyleMode = 'board' | 'deck'

export interface MemeMediaItem extends Meme {
  thumbUri?: string
  post?: AppBskyFeedDefs.PostView
  meta?: {
    uri?: string
    postType?: 'policy' | 'matter' | 'meme'
    official?: boolean
    party?: string
    community?: string
    category?: string
    tags?: string[]
    flairs?: string[]
    voteScore: number
    interactionMode?: 'policy_ballot' | 'reddit_votes'
    createdAt?: string
  }
}

export type MediaItem = MemeMediaItem
