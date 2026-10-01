import {useState} from 'react'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {logger} from '#/logger'
import {type Shadow} from '#/state/cache/types'
import {
  useMyMemeReactionsQuery,
  useSetMemeReaction,
} from '#/state/queries/para-meme-reactions'
import {useRequireAuth} from '#/state/session'
import * as Toast from '#/components/Toast'
import {type app} from '#/lexicons'
import {RedditVoteButton} from './VoteButton'

/**
 * Up/down vote for any post, stored as a public reaction (see
 * para-meme-reactions.ts). The score comes from the AppView; the viewer's
 * change shows immediately and is reconciled when the score refetches.
 */
export function ReactionVoteButton({
  subject,
  serverScore,
  hasLegacyLike,
  big,
  disabled,
}: {
  subject: string
  serverScore: number
  hasLegacyLike: boolean
  big?: boolean
  disabled?: boolean
}) {
  const {_} = useLingui()
  const {data: reactions} = useMyMemeReactionsQuery()
  const setReaction = useSetMemeReaction()
  const requireAuth = useRequireAuth()
  const [pending, setPending] = useState<{
    vote: -1 | 0 | 1
    score: number
    baseServerScore: number
  } | null>(null)

  // A signed reaction overrides a legacy like, as in the AppView's score.
  const savedVote: -1 | 0 | 1 =
    reactions?.get(subject)?.value ?? (hasLegacyLike ? 1 : 0)
  // Once the feed returns a new score, it already includes the change.
  const optimistic =
    pending && pending.baseServerScore === serverScore ? pending : null
  const vote = optimistic?.vote ?? savedVote
  const score = optimistic?.score ?? serverScore

  const change = (next: -1 | 0 | 1) => {
    setPending({
      vote: next,
      score: score - vote + next,
      baseServerScore: serverScore,
    })
    setReaction(subject, next).catch((e: unknown) => {
      setPending(null)
      logger.error('Vote failed', {safeMessage: e})
      Toast.show(_(msg`Could not save your vote`), {type: 'error'})
    })
  }

  return (
    <RedditVoteButton
      big={big}
      disabled={disabled}
      currentVote={vote === 1 ? 'upvote' : vote === -1 ? 'downvote' : 'none'}
      hasBeenToggled={pending !== null}
      onDownvote={() => requireAuth(() => change(vote === -1 ? 0 : -1))}
      onUpvote={() => requireAuth(() => change(vote === 1 ? 0 : 1))}
      score={score}
    />
  )
}

/**
 * Vote buttons for a post in a feed or thread. `post.voteScore` is the
 * AppView's net public reactions, which already includes the viewer's vote.
 * Against an AppView that predates it, fall back to `likeCount`, which only
 * counts legacy likes, with the viewer's signed reaction swapped in.
 */
export function PostVoteButton({
  post,
  big,
  disabled,
}: {
  post: Shadow<app.bsky.feed.defs.PostView>
  big?: boolean
  disabled?: boolean
}) {
  const {data: reactions} = useMyMemeReactionsQuery()
  const hasLegacyLike = Boolean(post.viewer?.like)
  const legacy = hasLegacyLike ? 1 : 0
  const saved = reactions?.get(post.uri)?.value ?? legacy
  const serverScore = post.voteScore ?? (post.likeCount ?? 0) - legacy + saved
  return (
    <ReactionVoteButton
      big={big}
      disabled={disabled}
      hasLegacyLike={hasLegacyLike}
      serverScore={serverScore}
      subject={post.uri}
    />
  )
}
