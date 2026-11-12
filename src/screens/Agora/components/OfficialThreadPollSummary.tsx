import {View} from 'react-native'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useCabildeoQuery} from '#/state/queries/cabildeo'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {OfficialThreadOutcome} from './OfficialThreadOutcome'

export function OfficialThreadPollSummary({
  uri,
  communityUri,
  slug,
  canOrganize,
}: {
  uri: string
  communityUri: string
  slug: string
  canOrganize: boolean
}) {
  const t = useTheme()
  const {i18n} = useLingui()
  const {data: poll, dataUpdatedAt} = useCabildeoQuery(uri, {trackVoting: true})
  // Agora-created polls are public. Other linked ballots retain their own
  // access checks in CabildeoDetail.
  if (!poll || poll.minimumViewTier !== 'public') return null

  const deadline = Date.parse(poll.phaseDeadline ?? '')
  const hasDeadline = Number.isFinite(deadline)
  const closed =
    poll.phase === 'resolved' || (hasDeadline && deadline <= dataUpdatedAt)
  const outcome = closed ? poll.outcome : undefined
  const winner = outcome && poll.options[outcome.winningOption]?.label

  return (
    <View
      style={[
        a.mx_md,
        a.mb_md,
        a.p_md,
        a.gap_xs,
        a.rounded_md,
        t.atoms.bg_contrast_25,
      ]}>
      <Text style={[a.text_sm, a.font_semi_bold]} emoji>
        {poll.title}
      </Text>
      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
        {closed ? (
          <Trans>Voting closed</Trans>
        ) : poll.phase === 'voting' ? (
          <Trans>Voting open</Trans>
        ) : (
          <Trans>Voting has not opened</Trans>
        )}
        {hasDeadline ? (
          <>
            {' · '}
            {i18n.date(new Date(deadline), {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </>
        ) : null}
      </Text>
      {outcome ? (
        <OfficialThreadOutcome
          pollUri={uri}
          communityUri={communityUri}
          slug={slug}
          canOrganize={canOrganize}
        />
      ) : null}
      {outcome ? (
        <>
          <Text style={[a.text_sm, a.font_semi_bold]} emoji>
            {winner ? (
              <Trans>Winning answer: {winner}</Trans>
            ) : (
              <Trans>No winning answer</Trans>
            )}
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>
              Participants: {i18n.number(outcome.totalParticipants)}
            </Trans>
          </Text>
        </>
      ) : closed ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>Final results pending</Trans>
        </Text>
      ) : null}
    </View>
  )
}
