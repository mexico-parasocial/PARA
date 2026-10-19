import {useCallback, useEffect, useRef, useState} from 'react'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {useQueryClient} from '@tanstack/react-query'

import {updatePostShadow} from '#/state/cache/post-shadow'
import {
  usePolicyVoteMutation,
  useViewerPolicySignalsQuery,
} from '#/state/queries/policy-vote'
import {PublicBallotNotice} from '#/components/civic/PublicRecordNotice'
import {useDialogControl} from '#/components/Dialog'
import * as Toast from '#/components/Toast'
import {VotingButton} from '#/components/VotingButton'
import {VotingButtonHorizontal} from '#/components/VotingButtonHorizontal'

/** How long the control waits for the person to stop adjusting. */
const SETTLE_MS = 1200
/** Without a notice to read, a shorter pause is enough. */
const CAST_SETTLE_MS = 600

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
  variant = 'vertical',
  showNotice = true,
}: {
  policyUri: string
  /** `vertical` is the feed's arrows; `horizontal` is the -3..+3 slider. */
  variant?: 'vertical' | 'horizontal'
  /** Ask for confirmation, with the public-ballot notice, before casting. */
  showNotice?: boolean
}) {
  const {_} = useLingui()
  const queryClient = useQueryClient()
  const noticeControl = useDialogControl()
  const castVote = usePolicyVoteMutation()
  const {data: signals} = useViewerPolicySignalsQuery()
  // The viewer's own ballot, read from their repo: the AppView never says who
  // voted what.
  const ownVote = signals?.[policyUri] ?? 0
  const committed = useRef(ownVote)
  const confirmed = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [pending, setPending] = useState<number | null>(null)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => () => clearTimeout(timer.current), [])

  // The viewer's ballot loads after the first render: adopt it unless they
  // are in the middle of choosing another one.
  useEffect(() => {
    if (pending !== null || committed.current === ownVote) return
    committed.current = ownVote
    setResetKey(key => key + 1)
  }, [ownVote, pending])

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

  const cast = useCallback(
    (signal: number, announce: boolean) => {
      confirmed.current = true
      castVote.mutate(
        {policyUri, signal},
        {
          onSuccess: () => {
            committed.current = signal
            if (announce) Toast.show(_(msg`Voto publicado`), {type: 'success'})
          },
          onError: () => {
            revert()
            Toast.show(_(msg`No se pudo publicar tu voto`), {type: 'error'})
          },
        },
      )
    },
    [_, castVote, policyUri, revert],
  )

  const onVoteChange = useCallback(
    (vote: number) => {
      showVote(vote)
      // Every tap reports a step: wait until the person stops adjusting.
      clearTimeout(timer.current)
      timer.current = setTimeout(
        () => {
          if (vote === committed.current) return
          if (!showNotice) {
            cast(vote, false)
            return
          }
          setPending(vote)
          noticeControl.open()
        },
        showNotice ? SETTLE_MS : CAST_SETTLE_MS,
      )
    },
    [cast, noticeControl, showNotice, showVote],
  )

  const onConfirm = useCallback(() => {
    if (pending !== null) cast(pending, true)
  }, [cast, pending])

  const onClose = useCallback(() => {
    if (!confirmed.current) revert()
    confirmed.current = false
    setPending(null)
  }, [revert])

  return (
    <>
      {variant === 'horizontal' ? (
        <VotingButtonHorizontal
          key={resetKey}
          initialVote={committed.current}
          disabled={castVote.isPending}
          saveFailed={castVote.isError}
          onVoteChange={onVoteChange}
        />
      ) : (
        <VotingButton
          key={resetKey}
          initialVote={committed.current}
          onVoteChange={onVoteChange}
        />
      )}
      {showNotice ? (
        <PublicBallotNotice
          control={noticeControl}
          kind="policy"
          onConfirm={onConfirm}
          onClose={onClose}
        />
      ) : null}
    </>
  )
}
