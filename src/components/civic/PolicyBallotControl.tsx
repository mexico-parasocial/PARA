import {useCallback, useEffect, useRef, useState} from 'react'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import {updatePostShadow} from '#/state/cache/post-shadow'
import {usePolicyVoteMutation} from '#/state/queries/policy-vote'
import {PublicBallotNotice} from '#/components/civic/PublicRecordNotice'
import {useDialogControl} from '#/components/Dialog'
import * as Toast from '#/components/Toast'
import {VotingButton} from '#/components/VotingButton'

/** How long the control waits for the person to stop adjusting. */
const SETTLE_MS = 1200

/**
 * The -3..+3 control on a policy post, wired to a real ballot.
 *
 * The button reports every step, so nothing is cast per tap: once the person
 * stops adjusting, the public-ballot notice opens with the chosen signal, and
 * only confirming it asks m8 for an authorization and writes the ballot.
 * Cancelling, or a failed write, puts the control back where it was.
 * docs/revocable-mandates-spec.md §4.0.
 */
export function PolicyBallotControl({
  policyUri,
  initialVote = 0,
}: {
  policyUri: string
  initialVote?: number
}) {
  const {_} = useLingui()
  const queryClient = useQueryClient()
  const noticeControl = useDialogControl()
  const castVote = usePolicyVoteMutation()
  const committed = useRef(initialVote)
  const confirmed = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [pending, setPending] = useState<number | null>(null)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => () => clearTimeout(timer.current), [])

  const showVote = useCallback(
    (vote: number) =>
      updatePostShadow(queryClient, policyUri, {
        voteScore: vote,
        voteUri: vote !== 0 ? 'optimistic-vote-uri' : undefined,
      }),
    [policyUri, queryClient],
  )

  const revert = useCallback(() => {
    showVote(committed.current)
    // Remount the button so its own state returns to the committed vote.
    setResetKey(key => key + 1)
  }, [showVote])

  const onVoteChange = useCallback(
    (vote: number) => {
      showVote(vote)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (vote === committed.current) return
        setPending(vote)
        noticeControl.open()
      }, SETTLE_MS)
    },
    [noticeControl, showVote],
  )

  const onConfirm = useCallback(() => {
    if (pending === null) return
    confirmed.current = true
    const signal = pending
    castVote.mutate(
      {policyUri, signal},
      {
        onSuccess: () => {
          committed.current = signal
          Toast.show(_(msg`Voto publicado`), {type: 'success'})
        },
        onError: () => {
          revert()
          Toast.show(_(msg`No se pudo publicar tu voto`), {type: 'error'})
        },
      },
    )
  }, [_, castVote, pending, policyUri, revert])

  const onClose = useCallback(() => {
    if (!confirmed.current) revert()
    confirmed.current = false
    setPending(null)
  }, [revert])

  return (
    <>
      <VotingButton
        key={resetKey}
        initialVote={committed.current}
        onVoteChange={onVoteChange}
      />
      <PublicBallotNotice
        control={noticeControl}
        kind="policy"
        onConfirm={onConfirm}
        onClose={onClose}
      />
    </>
  )
}
