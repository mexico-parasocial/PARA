import {useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useSubmitOpenQuestionMutation} from '#/state/mutations/raq'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import {Text} from '#/components/Typography'

export function AddOpenQuestionDialog({
  control,
}: {
  control: Dialog.DialogOuterProps['control']
}) {
  const {_} = useLingui()
  const t = useTheme()
  const {hasSession} = useSession()
  const [text, setText] = useState('')
  const submit = useSubmitOpenQuestionMutation()
  return (
    <Dialog.Outer
      control={control}
      onOpen={() => submit.reset()}
      nativeOptions={{preventExpansion: true}}>
      <Dialog.Handle />
      <Dialog.ScrollableInner label={_(msg`Ask an open question`)}>
        <View style={[a.gap_md, a.pb_lg]}>
          <Text style={[a.text_xl, a.font_bold]}>
            <Trans>Ask an open question</Trans>
          </Text>
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>Your question will be published as a public post.</Trans>
          </Text>
          <View>
            <TextField.LabelText>
              <Trans>Question Text</Trans>
            </TextField.LabelText>
            <TextField.Root>
              <Dialog.Input
                label={_(msg`Question Text`)}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={280}
                editable={!submit.isPending}
              />
            </TextField.Root>
          </View>
          {!hasSession && (
            <Text>
              <Trans>Sign in to ask a question</Trans>
            </Text>
          )}
          {submit.isError && (
            <Text style={{color: t.palette.negative_400}}>
              <Trans>Something went wrong! Please try again.</Trans>
            </Text>
          )}
          <Button
            label={_(msg`Publish question`)}
            size="large"
            variant="solid"
            color="primary"
            disabled={!hasSession || !text.trim() || submit.isPending}
            onPress={() =>
              submit.mutate(text.trim(), {
                onSuccess: () => {
                  setText('')
                  control.close()
                },
              })
            }>
            <ButtonText>
              {submit.isPending
                ? _(msg`Submitting...`)
                : _(msg`Publish question`)}
            </ButtonText>
          </Button>
        </View>
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}
