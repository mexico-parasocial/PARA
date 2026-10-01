import {useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {RAQ_AXES} from '#/lib/mock-data'
import {useSubmitProposedQuestionMutation} from '#/state/mutations/raq'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import * as Select from '#/components/Select'
import {Text} from '#/components/Typography'
import {axisTitle} from '../raq-utils'

export function AddRAQDialog({
  control,
  targetAxis,
  targetCommunity,
  communityName,
}: {
  control: Dialog.DialogOuterProps['control']
  targetAxis?: string
  targetCommunity?: string
  communityName?: string
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {hasSession} = useSession()
  const [question, setQuestion] = useState('')
  const [axis, setAxis] = useState('')
  const [axisChoice, setAxisChoice] = useState('__any__')
  const submit = useSubmitProposedQuestionMutation()
  return (
    <Dialog.Outer control={control} onOpen={() => submit.reset()}>
      <Dialog.Handle />
      <Dialog.ScrollableInner label={_(msg`Add Proposed Question`)}>
        <View style={[a.gap_md, a.pb_lg]}>
          <Text style={[a.text_xl, a.font_bold]}>
            <Trans>Propose a Question</Trans>
          </Text>
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>
              A vote shows support; it does not make a question official.
            </Trans>
          </Text>
          <View>
            <TextField.LabelText>
              <Trans>Question Text</Trans>
            </TextField.LabelText>
            <TextField.Root>
              <Dialog.Input
                label={_(msg`Question Text`)}
                value={question}
                onChangeText={setQuestion}
                multiline
                maxLength={1000}
                editable={!submit.isPending}
              />
            </TextField.Root>
          </View>
          {targetAxis ? (
            <Text>{axisTitle(targetAxis)}</Text>
          ) : (
            <View style={a.gap_sm}>
              <TextField.LabelText>
                <Trans>Target axis (optional)</Trans>
              </TextField.LabelText>
              <Select.Root
                value={axisChoice}
                onValueChange={setAxisChoice}
                disabled={submit.isPending}>
                <Select.Trigger label={_(msg`Select an axis`)}>
                  <Select.ValueText />
                  <Select.Icon />
                </Select.Trigger>
                <Select.Content
                  label={_(msg`Target axis (optional)`)}
                  items={[
                    {value: '__any__', label: _(msg`No specific axis`)},
                    ...RAQ_AXES.map(item => ({
                      value: item.id,
                      label: axisTitle(item.id),
                    })),
                    {value: '__new__', label: _(msg`Propose a new axis`)},
                  ]}
                  renderItem={({label, value}) => (
                    <Select.Item value={value} label={label}>
                      <Select.ItemIndicator />
                      <Select.ItemText>{label}</Select.ItemText>
                    </Select.Item>
                  )}
                />
              </Select.Root>
              {axisChoice === '__new__' && (
                <View>
                  <TextField.LabelText>
                    <Trans>Proposed axis name</Trans>
                  </TextField.LabelText>
                  <TextField.Root>
                    <Dialog.Input
                      label={_(msg`Proposed axis name`)}
                      value={axis}
                      onChangeText={setAxis}
                      maxLength={64}
                      editable={!submit.isPending}
                    />
                  </TextField.Root>
                </View>
              )}
            </View>
          )}
          {targetCommunity && (
            <Text>
              <Trans>Proposed for: {communityName ?? targetCommunity}</Trans>
            </Text>
          )}
          {!hasSession && (
            <Text>
              <Trans>Sign in to propose a question</Trans>
            </Text>
          )}
          {submit.isError && (
            <Text style={{color: t.palette.negative_400}}>
              <Trans>Something went wrong! Please try again.</Trans>
            </Text>
          )}
          <Button
            label={_(msg`Submit Proposal`)}
            size="large"
            variant="solid"
            color="primary"
            disabled={
              !hasSession ||
              !question.trim() ||
              (!targetAxis && axisChoice === '__new__' && !axis.trim()) ||
              submit.isPending
            }
            onPress={() =>
              submit.mutate(
                {
                  text: question.trim(),
                  targetAxis:
                    targetAxis ??
                    ((axisChoice === '__new__'
                      ? axis.trim()
                      : axisChoice === '__any__'
                        ? ''
                        : axisChoice) ||
                      undefined),
                  targetCommunity,
                },
                {
                  onSuccess: () => {
                    setQuestion('')
                    setAxis('')
                    setAxisChoice('__any__')
                    control.close()
                  },
                },
              )
            }>
            <ButtonText>
              {submit.isPending
                ? _(msg`Submitting...`)
                : _(msg`Submit Proposal`)}
            </ButtonText>
          </Button>
        </View>
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}
