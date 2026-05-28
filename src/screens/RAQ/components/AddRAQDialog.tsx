import {useCallback, useState} from 'react'
import {StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useSubmitProposedQuestionMutation} from '#/state/mutations/raq'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'

export function AddRAQDialog({
  control,
}: {
  control: Dialog.DialogOuterProps['control']
}) {
  const t = useTheme()
  const {_} = useLingui()
  const [question, setQuestion] = useState('')
  const [community, setCommunity] = useState('')
  const [error, setError] = useState('')

  const {mutate: submitProposal, isPending} = useSubmitProposedQuestionMutation()

  const onSubmit = useCallback(() => {
    const trimmed = question.trim()
    if (!trimmed) {
      setError(_(msg`Please enter a question`))
      return
    }
    setError('')
    submitProposal(
      {text: trimmed, targetCommunity: community || undefined},
      {
        onSuccess: () => {
          setQuestion('')
          setCommunity('')
          control.close()
        },
      },
    )
  }, [question, submitProposal, control, _])

  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner label={_(msg`Add Proposed Question`)}>
        <View style={styles.container}>
          <Text style={[styles.title, t.atoms.text]}>
            <Trans>Propose a Question</Trans>
          </Text>

          <View style={styles.inputGroup}>
            <TextField.Root>
              <TextField.LabelText>
                <Trans>Question Text</Trans>
              </TextField.LabelText>
              <TextField.Input
                value={question}
                onChangeText={text => {
                  setQuestion(text)
                  if (error) setError('')
                }}
                placeholder={_(msg`e.g., Should we implement UBI?`)}
                label="Question Text"
              />
            </TextField.Root>
          </View>

          <View style={styles.inputGroup}>
            <TextField.Root>
              <TextField.LabelText>
                <Trans>Target Community (Optional)</Trans>
              </TextField.LabelText>
              <TextField.Input
                value={community}
                onChangeText={setCommunity}
                placeholder={_(msg`e.g., Economics`)}
                label="Target Community"
              />
            </TextField.Root>
          </View>

          {error ? (
            <Text style={{color: t.palette.negative_400, fontSize: 13}}>
              {error}
            </Text>
          ) : null}

          <Button
            label={_(msg`Submit Proposal`)}
            onPress={onSubmit}
            size="large"
            variant="solid"
            color="primary"
            disabled={isPending}
            style={styles.btn}>
            <ButtonText>
              {isPending ? _(msg`Submitting...`) : _(msg`Submit Proposal`)}
            </ButtonText>
          </Button>
        </View>
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  btn: {
    marginTop: 10,
  },
})
