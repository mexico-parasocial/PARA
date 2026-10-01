import {useCallback, useState} from 'react'
import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  type CivicTreeCollection,
  type CivicTreeItem,
  getCivicTreeItemKey,
  useApplyCollectionOpMutation,
} from '#/state/queries/collections'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import * as Toast from '#/components/Toast'

/*
 * Edits an item in place as an `updateItem` operation. The operation pins the
 * item's key before patching, so every relation that points at it stays
 * attached even when a legacy item's key is derived from the field being edited.
 */
export function EditTreeItemDialog({
  control,
  collection,
  item,
}: {
  control: Dialog.DialogControlProps
  collection?: CivicTreeCollection
  item?: CivicTreeItem
}) {
  return (
    <Dialog.Outer control={control} testID="editTreeItemDialog">
      <Dialog.Handle />
      {collection && item ? (
        <EditTreeItemDialogInner
          key={`${collection.id}:${getCivicTreeItemKey(item)}`}
          control={control}
          collection={collection}
          item={item}
        />
      ) : null}
    </Dialog.Outer>
  )
}

function EditTreeItemDialogInner({
  control,
  collection,
  item,
}: {
  control: Dialog.DialogControlProps
  collection: CivicTreeCollection
  item: CivicTreeItem
}) {
  const {_} = useLingui()
  const t = useTheme()
  const updateMutation = useApplyCollectionOpMutation()

  /*
   * A topic or policy picked from shared vocabulary is identified by its title
   * (its flair or policy record), so renaming it would silently detach it from
   * that vocabulary. Those keep a fixed title; everything else is free text.
   */
  const titleLocked = !!item.flairId || !!item.policyUri
  const [title, setTitle] = useState(item.title ?? item.policyTitle ?? '')
  const [description, setDescription] = useState(item.description ?? '')
  const [url, setUrl] = useState(item.url ?? '')

  const canSave =
    !updateMutation.isPending && (titleLocked || title.trim().length > 0)

  const onSave = useCallback(() => {
    if (!canSave) return
    updateMutation.mutate(
      {
        collectionId: collection.id,
        op: {
          type: 'updateItem',
          itemKey: getCivicTreeItemKey(item),
          patch: {
            ...(titleLocked ? {} : {title: title.trim()}),
            description: description.trim() || undefined,
            url: url.trim() || undefined,
          },
        },
      },
      {
        onSuccess: () => {
          control.close()
          Toast.show(_(msg`Item updated`))
        },
        onError: (err: Error) => {
          Toast.show(err.message || _(msg`Failed to update item`), {
            type: 'error',
          })
        },
      },
    )
  }, [
    canSave,
    collection,
    item,
    titleLocked,
    title,
    description,
    url,
    updateMutation,
    control,
    _,
  ])

  const inputBorder = {borderColor: t.palette.contrast_100}

  return (
    <Dialog.Inner label={_(msg`Edit item`)}>
      <Text style={[styles.title, t.atoms.text]}>
        <Trans>Edit item</Trans>
      </Text>
      <TextInput
        accessibilityLabel={_(msg`Item title`)}
        accessibilityHint={_(msg`Renames this item`)}
        value={title}
        onChangeText={setTitle}
        editable={!titleLocked}
        placeholder={_(msg`Title`)}
        placeholderTextColor={t.palette.contrast_400}
        style={[
          styles.input,
          t.atoms.text,
          inputBorder,
          titleLocked && {opacity: 0.55},
        ]}
      />
      {titleLocked ? (
        <Text style={[styles.hint, t.atoms.text_contrast_medium]}>
          <Trans>
            Topics and policies keep their shared name so they stay linked.
          </Trans>
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={_(msg`Item description`)}
        accessibilityHint={_(msg`Describes the evidence, link, note, or topic`)}
        value={description}
        onChangeText={setDescription}
        placeholder={_(msg`Description (optional)`)}
        placeholderTextColor={t.palette.contrast_400}
        style={[styles.textArea, t.atoms.text, inputBorder]}
        multiline
        numberOfLines={3}
      />
      <TextInput
        accessibilityLabel={_(msg`Item URL`)}
        accessibilityHint={_(msg`Changes the source link for this item`)}
        value={url}
        onChangeText={setUrl}
        placeholder={_(msg`URL (optional)`)}
        placeholderTextColor={t.palette.contrast_400}
        style={[styles.input, t.atoms.text, inputBorder]}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={_(msg`Cancel`)}
          accessibilityHint={_(msg`Closes without saving`)}
          onPress={() => control.close()}>
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>Cancel</Trans>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={_(msg`Save`)}
          accessibilityHint={_(msg`Saves your changes to this item`)}
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
      <Dialog.Close />
    </Dialog.Inner>
  )
}

const styles = StyleSheet.create({
  title: {fontSize: 20, fontWeight: '800', marginBottom: 12},
  hint: {fontSize: 12, marginTop: -4, marginBottom: 10},
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
