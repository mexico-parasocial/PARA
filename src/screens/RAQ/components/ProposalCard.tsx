import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {useVoteOnProposedQuestionMutation} from '#/state/mutations/raq'
import {type ProposedQuestionView} from '#/state/queries/useProposedQuestions'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {RedditVoteButton} from '#/components/PostControls/VoteButton'
import {Text} from '#/components/Typography'
import {axisTitle} from '../raq-utils'

export function ProposalCard({proposal}: {proposal: ProposedQuestionView}) {
  const t = useTheme()
  const {hasSession} = useSession()
  const vote = useVoteOnProposedQuestionMutation()
  const currentVote = proposal.viewerHasUpvoted
    ? 'upvote'
    : proposal.viewerHasDownvoted
      ? 'downvote'
      : 'none'
  const submit = (direction: 'up' | 'down') => {
    if (!hasSession || vote.isPending) return
    vote.mutate({
      uri: proposal.id,
      direction:
        (direction === 'up' && currentVote === 'upvote') ||
        (direction === 'down' && currentVote === 'downvote')
          ? 'none'
          : direction,
    })
  }
  return (
    <View style={[a.p_md, a.rounded_md, a.gap_sm, t.atoms.bg_contrast_25]}>
      <Text style={[a.text_md, a.font_bold]}>{proposal.text}</Text>
      {proposal.targetAxis && (
        <Text style={t.atoms.text_contrast_medium}>
          {axisTitle(proposal.targetAxis)}
        </Text>
      )}
      {proposal.targetCommunity && (
        <Text style={t.atoms.text_contrast_medium}>
          <Trans>Proposed for: {proposal.targetCommunity}</Trans>
        </Text>
      )}
      <RedditVoteButton
        score={proposal.upvotes - proposal.downvotes}
        currentVote={currentVote}
        hasBeenToggled={false}
        disabled={!hasSession || vote.isPending}
        onUpvote={() => submit('up')}
        onDownvote={() => submit('down')}
      />
      {!hasSession && (
        <Text style={t.atoms.text_contrast_medium}>
          <Trans>Sign in to vote</Trans>
        </Text>
      )}
      {vote.isError && (
        <Text style={{color: t.palette.negative_400}}>
          <Trans>Something went wrong! Please try again.</Trans>
        </Text>
      )}
    </View>
  )
}
