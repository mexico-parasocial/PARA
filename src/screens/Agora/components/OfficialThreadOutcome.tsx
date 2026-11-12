import {useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type ConclusionView} from '#/lib/api/conclusion'
import {useConclusionQuery} from '#/state/queries/conclusion'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {ConclusionComposer} from '#/features/conclusion/components/ConclusionComposer'

export function OfficialThreadOutcome({
  pollUri,
  communityUri,
  slug,
  canOrganize,
}: {
  pollUri: string
  communityUri: string
  slug: string
  canOrganize: boolean
}) {
  const {_} = useLingui()
  const [editing, setEditing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const {data} = useConclusionQuery(pollUri)
  if (data?.communityUri !== communityUri) return null

  const outcome =
    data.conclusion?.officialThreadSlug === slug ? data.conclusion : undefined
  const earlier = data.earlier.filter(item => item.officialThreadSlug === slug)

  return (
    <View style={a.gap_sm}>
      {outcome ? <OutcomeStatement outcome={outcome} /> : null}
      {earlier.length ? (
        <Button
          label={_(msg`Earlier outcomes`)}
          size="small"
          color="secondary"
          onPress={() => setShowHistory(value => !value)}>
          <ButtonText>
            <Trans>Earlier outcomes</Trans>
          </ButtonText>
        </Button>
      ) : null}
      {showHistory
        ? earlier.map(item => (
            <OutcomeStatement key={item.uri} outcome={item} />
          ))
        : null}
      {canOrganize && editing ? (
        <ConclusionComposer
          cabildeoUri={pollUri}
          communityUri={communityUri}
          officialThreadSlug={slug}
          positions={[]}
          onDone={() => setEditing(false)}
        />
      ) : canOrganize ? (
        <Button
          label={
            outcome ? _(msg`Publish a correction`) : _(msg`Publish outcome`)
          }
          size="small"
          color="primary_subtle"
          onPress={() => setEditing(true)}>
          <ButtonText>
            {outcome ? (
              <Trans>Publish a correction</Trans>
            ) : (
              <Trans>Publish outcome</Trans>
            )}
          </ButtonText>
        </Button>
      ) : null}
    </View>
  )
}

function OutcomeStatement({outcome}: {outcome: ConclusionView}) {
  const t = useTheme()
  const {i18n} = useLingui()
  return (
    <View style={[a.gap_xs, a.p_sm]}>
      <Text style={a.font_bold}>
        <Trans>Organizer outcome</Trans>
      </Text>
      <Text emoji>{outcome.text}</Text>
      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
        {outcome.author} ·{' '}
        {i18n.date(new Date(outcome.createdAt), {dateStyle: 'medium'})}
      </Text>
      {outcome.reviewDate ? (
        <Text>
          <Trans>Review date: {outcome.reviewDate}</Trans>
        </Text>
      ) : null}
    </View>
  )
}
