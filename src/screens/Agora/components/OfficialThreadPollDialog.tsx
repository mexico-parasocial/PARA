import {useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {cleanError} from '#/lib/strings/errors'
import {type CommunityWikiPageView} from '#/state/queries/community-activities'
import {useCreateOfficialThreadPollMutation} from '#/state/queries/official-thread-poll'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import {H2, Text} from '#/components/Typography'

export function OfficialThreadPollDialog({
  control,
  page,
  communityName,
  onPublished,
  onClose,
}: {
  control: Dialog.DialogControlProps
  page: CommunityWikiPageView
  communityName: string
  onPublished: (pollUri: string) => void
  onClose: () => void
}) {
  const {_} = useLingui()
  const t = useTheme()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const poll = useCreateOfficialThreadPollMutation()
  const answers = options.map(option => option.trim())
  const valid =
    question.trim() &&
    answers.every(Boolean) &&
    new Set(answers.map(answer => answer.toLowerCase())).size === answers.length

  return (
    <Dialog.Outer
      control={control}
      onClose={onClose}
      preventDismiss={poll.isPending}>
      <Dialog.Handle />
      <Dialog.ScrollableInner label={_(msg`Add a poll`)}>
        <View style={[a.gap_md, a.pb_lg]}>
          <H2>
            <Trans>Add a poll</Trans>
          </H2>
          <Text emoji>{page.record.title}</Text>
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>
              Participants choose one answer. Voting opens immediately and
              follows PARA’s public ballot rules.
            </Trans>
          </Text>
          <View>
            <TextField.LabelText>
              <Trans>Question</Trans>
            </TextField.LabelText>
            <TextField.Root>
              <TextField.Input
                label={_(msg`Question`)}
                value={question}
                onChangeText={setQuestion}
                maxLength={300}
                editable={!poll.isPending}
              />
            </TextField.Root>
          </View>
          {options.map((option, index) => {
            const label = _(msg`Answer ${index + 1}`)
            return (
              <View key={index} style={a.gap_xs}>
                <TextField.LabelText>{label}</TextField.LabelText>
                <TextField.Root>
                  <TextField.Input
                    label={label}
                    value={option}
                    maxLength={100}
                    editable={!poll.isPending}
                    onChangeText={value =>
                      setOptions(prev =>
                        prev.map((item, i) => (i === index ? value : item)),
                      )
                    }
                  />
                </TextField.Root>
              </View>
            )
          })}
          {options.length < 10 ? (
            <Button
              label={_(msg`Add answer`)}
              size="small"
              color="secondary"
              disabled={poll.isPending}
              onPress={() => setOptions(prev => [...prev, ''])}>
              <ButtonText>
                <Trans>Add answer</Trans>
              </ButtonText>
            </Button>
          ) : null}
          {options.length > 2 ? (
            <Button
              label={_(msg`Remove last answer`)}
              size="small"
              color="secondary"
              disabled={poll.isPending}
              onPress={() => setOptions(prev => prev.slice(0, -1))}>
              <ButtonText>
                <Trans>Remove last answer</Trans>
              </ButtonText>
            </Button>
          ) : null}
          {poll.error ? (
            <Text style={t.atoms.text}>{cleanError(poll.error)}</Text>
          ) : null}
          <Button
            label={_(msg`Open voting`)}
            color="primary"
            disabled={!valid || poll.isPending}
            onPress={() =>
              poll.mutate(
                {page, communityName, question: question.trim(), answers},
                {
                  onSuccess: pollUri => {
                    onPublished(pollUri)
                    control.close()
                  },
                },
              )
            }>
            <ButtonText>
              {poll.isPending ? (
                <Trans>Publishing…</Trans>
              ) : (
                <Trans>Open voting</Trans>
              )}
            </ButtonText>
          </Button>
        </View>
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}
