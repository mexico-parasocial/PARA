import {useCallback, useState} from 'react'
import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useCreateCollectionMutation} from '#/state/queries/collections'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import * as Toast from '#/components/Toast'

/*
 * Creating a collection used to live only in the list view's footer, so from
 * the graph (the default view) there was no way to make one. It is a dialog
 * now so the header menu and the empty states can all open the same form.
 */
export function NewCollectionDialog({
  control,
  onCreated,
}: {
  control: Dialog.DialogControlProps
  onCreated?: () => void
}) {
  return (
    <Dialog.Outer control={control} testID="newCollectionDialog">
      <Dialog.Handle />
      <NewCollectionDialogInner control={control} onCreated={onCreated} />
    </Dialog.Outer>
  )
}

function NewCollectionDialogInner({
  control,
  onCreated,
}: {
  control: Dialog.DialogControlProps
  onCreated?: () => void
}) {
  const {_} = useLingui()
  const t = useTheme()
  const createMutation = useCreateCollectionMutation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const canCreate = !!name.trim() && !createMutation.isPending

  const onCreate = useCallback(() => {
    if (!name.trim()) return
    createMutation.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setName('')
          setDescription('')
          control.close()
          onCreated?.()
          Toast.show(_(msg`Collection created`))
        },
        onError: (err: Error) => {
          Toast.show(err.message || _(msg`Failed to create collection`), {
            type: 'error',
          })
        },
      },
    )
  }, [name, description, createMutation, control, onCreated, _])

  return (
    <Dialog.Inner label={_(msg`New collection`)}>
      <Text style={[styles.title, t.atoms.text]}>
        <Trans>New collection</Trans>
      </Text>
      <Text style={[styles.subtitle, t.atoms.text_contrast_medium]}>
        <Trans>
          A collection groups the topics, policies, evidence, links and notes
          you file together.
        </Trans>
      </Text>
      <TextInput
        accessibilityLabel={_(msg`Collection name`)}
        accessibilityHint={_(msg`Write the name of the new collection`)}
        value={name}
        onChangeText={setName}
        placeholder={_(msg`Collection name`)}
        placeholderTextColor={t.palette.contrast_400}
        style={[
          styles.input,
          t.atoms.text,
          {borderColor: t.palette.contrast_100},
        ]}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onCreate}
      />
      <TextInput
        accessibilityLabel={_(msg`Collection description`)}
        accessibilityHint={_(msg`Describe what this collection is for`)}
        value={description}
        onChangeText={setDescription}
        placeholder={_(msg`Description (optional)`)}
        placeholderTextColor={t.palette.contrast_400}
        style={[
          styles.textArea,
          t.atoms.text,
          {borderColor: t.palette.contrast_100},
        ]}
        multiline
        numberOfLines={3}
      />
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={_(msg`Cancel`)}
          accessibilityHint={_(msg`Closes without creating a collection`)}
          onPress={() => control.close()}>
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>Cancel</Trans>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={_(msg`Create collection`)}
          accessibilityHint={_(
            msg`Creates a new collection in your personal civic tree`,
          )}
          onPress={onCreate}
          disabled={!canCreate}>
          <Text
            style={[
              t.atoms.text,
              {fontWeight: '700'},
              !canCreate && {opacity: 0.5},
            ]}>
            <Trans>Create</Trans>
          </Text>
        </TouchableOpacity>
      </View>
      <Dialog.Close />
    </Dialog.Inner>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 18,
    paddingTop: 8,
  },
})
