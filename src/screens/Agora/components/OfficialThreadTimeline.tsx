import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {type PlatformNavigationProp} from '#/lib/routes/types'
import {postUriToRelativePath} from '#/lib/strings/url-helpers'
import {useCabildeoQuery} from '#/state/queries/cabildeo'
import {type CommunityWikiPageView} from '#/state/queries/community-activities'
import {useConclusionQuery} from '#/state/queries/conclusion'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Link} from '#/components/Link'
import {H1, Text} from '#/components/Typography'
import {OfficialThreadPollSummary} from './OfficialThreadPollSummary'

export function OfficialThreadTimeline({
  page,
  canOrganize,
}: {
  page: CommunityWikiPageView
  canOrganize: boolean
}) {
  const {_, i18n} = useLingui()
  const t = useTheme()
  const navigation = useNavigation<PlatformNavigationProp>()
  const {record} = page
  const {pollUri} = record
  const {data: poll} = useCabildeoQuery(pollUri)
  const {data: conclusion} = useConclusionQuery(pollUri, {
    enabled: poll?.phase === 'resolved',
  })
  const discussionPath =
    record.threadUri && postUriToRelativePath(record.threadUri)
  const events = [{label: _(msg`Discussion pinned`), date: record.createdAt}]
  if (poll?.minimumViewTier === 'public') {
    if (poll.votingOpenedAt)
      events.push({label: _(msg`Voting opened`), date: poll.votingOpenedAt})
    if (poll.phase === 'resolved' && poll.votingClosedAt) {
      events.push({label: _(msg`Voting closed`), date: poll.votingClosedAt})
    }
  }
  for (const item of [conclusion?.conclusion, ...(conclusion?.earlier ?? [])]) {
    if (
      item?.officialThreadSlug === record.slug &&
      item.communityUri === record.communityUri
    ) {
      events.push({label: _(msg`Outcome published`), date: item.createdAt})
    }
  }

  return (
    <View style={a.gap_md}>
      <H1 emoji>{record.title}</H1>
      {record.body ? <Text emoji>{record.body}</Text> : null}
      {discussionPath ? (
        <Link
          to={discussionPath}
          label={_(msg`Open discussion and replies`)}
          size="small"
          color="secondary">
          <ButtonText>
            <Trans>Open discussion and replies</Trans>
          </ButtonText>
        </Link>
      ) : null}
      {pollUri ? (
        <>
          <OfficialThreadPollSummary
            uri={pollUri}
            communityUri={record.communityUri}
            slug={record.slug}
            canOrganize={canOrganize}
          />
          <Button
            label={_(msg`Open poll`)}
            color="primary_subtle"
            size="small"
            onPress={() =>
              navigation.navigate('CabildeoDetail', {cabildeoUri: pollUri})
            }>
            <ButtonText>
              <Trans>Open poll</Trans>
            </ButtonText>
          </Button>
        </>
      ) : null}
      {events
        .filter(event => Number.isFinite(Date.parse(event.date)))
        .sort((left, right) => Date.parse(left.date) - Date.parse(right.date))
        .map(({label, date}, index) => (
          <View
            key={`${label}-${date}-${index}`}
            style={[a.p_sm, a.border_t, t.atoms.border_contrast_low]}>
            <Text style={a.font_semi_bold}>{label}</Text>
            <Text style={t.atoms.text_contrast_medium}>
              {i18n.date(new Date(date), {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </Text>
          </View>
        ))}
    </View>
  )
}
