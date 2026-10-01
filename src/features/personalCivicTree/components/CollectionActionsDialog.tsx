import {useCallback, useState} from 'react'
import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  type CivicTreeCollection,
  useApplyCollectionOpMutation,
} from '#/state/queries/collections'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import * as Toast from '#/components/Toast'

/*
 * What a long-press on a shelf card opens: rename, describe, jump into the
 * collection, or delete it. Deleting hands off to the screen's confirmation
 * prompt so there is exactly one place that words the warning.
 */
export function CollectionActionsDialog({
  control,
  collection,
  onOpen,
  onDelete,
}: {
  control: Dialog.DialogControlProps
  collection?: CivicTreeCollection
  onOpen: (collectionId: string) => void
  onDelete: (collectionId: string) => void
}) {
  return (
    <Dialog.Outer control={control} testID="collectionActionsDialog">
      <Dialog.Handle />
      {collection ? (
        <CollectionActionsInner
          key={collection.id}
          control={control}
          collection={collection}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ) : null}
    </Dialog.Outer>
  )
}

function CollectionActionsInner({
  control,
  collection,
  onOpen,
  onDelete,
}: {
  control: Dialog.DialogControlProps
  collection: CivicTreeCollection
  onOpen: (collectionId: string) => void
  onDelete: (collectionId: string) => void
}) {
  const {_} = useLingui()
  const t = useTheme()
  const updateMutation = useApplyCollectionOpMutation()
  const [name, setName] = useState(collection.name)
  const [description, setDescription] = useState(collection.description ?? '')

  const canSave = !updateMutation.isPending && name.trim().length > 0

  const onSave = useCallback(() => {
    if (!canSave) return
    updateMutation.mutate(
      {
        collectionId: collection.id,
        op: {
          type: 'updateDetails',
          fields: {
            name: name.trim(),
            description: description.trim() || null,
          },
        },
      },
      {
        onSuccess: () => {
          control.close()
          Toast.show(_(msg`Collection updated`))
        },
        onError: (err: Error) => {
          Toast.show(err.message || _(msg`Failed to update collection`), {
            type: 'error',
          })
        },
      },
    )
  }, [canSave, collection, name, description, updateMutation, control, _])

  const inputBorder = {borderColor: t.palette.contrast_100}

  return (
    <Dialog.Inner label={_(msg`Collection options`)}>
      <Text style={[styles.title, t.atoms.text]}>
        <Trans>Collection options</Trans>
      </Text>
      <TextInput
        accessibilityLabel={_(msg`Collection name`)}
        accessibilityHint={_(msg`Renames this collection`)}
        value={name}
        onChangeText={setName}
        placeholder={_(msg`Collection name`)}
        placeholderTextColor={t.palette.contrast_400}
        style={[styles.input, t.atoms.text, inputBorder]}
      />
      <TextInput
        accessibilityLabel={_(msg`Collection description`)}
        accessibilityHint={_(msg`Describe what this collection is for`)}
        value={description}
        onChangeText={setDescription}
        placeholder={_(msg`Description (optional)`)}
        placeholderTextColor={t.palette.contrast_400}
        style={[styles.textArea, t.atoms.text, inputBorder]}
        multiline
        numberOfLines={3}
      />
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={_(msg`Save`)}
          accessibilityHint={_(msg`Saves the name and description`)}
          onPress={onSave}
          disabled={!canSave}>
          <Text
            style={[
              t.atoms.text,
              {fontWeight: '700'},
              !canSave && {opacity: 0.5},
            ]}>
            <Trans>Save</Trans>
          </Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.rows, {borderTopColor: t.palette.contrast_100}]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={_(msg`Open collection`)}
          accessibilityHint={_(msg`Opens this collection's items`)}
          onPress={() => control.close(() => onOpen(collection.id))}
          style={styles.row}>
          <Text style={[t.atoms.text, {fontWeight: '600'}]}>
            <Trans>Open collection</Trans>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={_(msg`Delete collection`)}
          accessibilityHint={_(msg`Asks to confirm deleting this collection`)}
          onPress={() => control.close(() => onDelete(collection.id))}
          style={styles.row}>
          <Text style={{color: t.palette.negative_500, fontWeight: '600'}}>
            <Trans>Delete collection</Trans>
          </Text>
        </TouchableOpacity>
      </View>
      <Dialog.Close />
    </Dialog.Inner>
  )
}

const styles = StyleSheet.create({
  title: {fontSize: 20, fontWeight: '800', marginBottom: 12},
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
  actions: {flexDirection: 'row', justifyContent: 'flex-end', paddingBottom: 8},
  rows: {borderTopWidth: 1, marginTop: 4},
  row: {paddingVertical: 14},
})
