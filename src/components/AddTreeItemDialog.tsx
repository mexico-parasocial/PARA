import {useCallback, useState} from 'react'
import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  type CivicTreeCollection,
  type CivicTreeItem,
  createCivicTreeItemId,
  useAddToCollectionMutation,
} from '#/state/queries/collections'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import * as Toast from '#/components/Toast'

type TreeItemKind = NonNullable<CivicTreeItem['kind']>

const KIND_OPTIONS: TreeItemKind[] = ['evidence', 'link', 'note']

export function AddTreeItemDialog({
  control,
  collection,
}: {
  control: Dialog.DialogControlProps
  collection?: CivicTreeCollection
}) {
  return (
    <Dialog.Outer control={control} testID="addTreeItemDialog">
      <Dialog.Handle />
      <AddTreeItemDialogInner control={control} collection={collection} />
    </Dialog.Outer>
  )
}

function AddTreeItemDialogInner({
  control,
  collection,
}: {
  control: Dialog.DialogControlProps
  collection?: CivicTreeCollection
}) {
  const {_} = useLingui()
  const t = useTheme()
  const addMutation = useAddToCollectionMutation()

  const [kind, setKind] = useState<TreeItemKind>('evidence')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')

  const onSave = useCallback(() => {
    if (!collection || !title.trim()) return

    const trimmedUrl = url.trim()
    const item: CivicTreeItem = {
      itemId: createCivicTreeItemId(),
      kind: trimmedUrl ? 'link' : kind,
      title: title.trim(),
      description: description.trim() || undefined,
      url: trimmedUrl || undefined,
      addedAt: new Date().toISOString(),
    }

    addMutation.mutate(
      {
        collectionId: collection.id,
        item,
        existingItems: collection.items,
      },
      {
        onSuccess: () => {
          setKind('evidence')
          setTitle('')
          setDescription('')
          setUrl('')
          control.close()
          Toast.show(_(msg`Added to your personal civic tree`))
        },
        onError: (err: Error) => {
          Toast.show(err.message || _(msg`Failed to add item`), {type: 'error'})
        },
      },
    )
  }, [addMutation, collection, control, description, kind, title, url, _])

  return (
    <Dialog.Inner label={_(msg`Add item to civic tree`)}>
      <Text style={[styles.title, t.atoms.text]}>
        <Trans>Add item</Trans>
      </Text>
      <Text style={[styles.subtitle, t.atoms.text_contrast_medium]}>
        <Trans>Save evidence, links, notes, and references into this collection.</Trans>
      </Text>

      <View style={styles.kindRow}>
        {KIND_OPTIONS.map(option => (
          <TouchableOpacity
            key={option}
            accessibilityRole="button"
            accessibilityState={{selected: kind === option}}
            onPress={() => setKind(option)}
            style={[
              styles.kindBtn,
              {borderColor: t.palette.contrast_100},
              kind === option && {backgroundColor: t.palette.primary_500},
            ]}>
            <Text
              style={[
                styles.kindText,
                kind === option ? {color: 'white'} : t.atoms.text,
              ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        accessibilityLabel={_(msg`Item title`)}
        accessibilityHint={_(msg`Names the item saved in this collection`)}
        value={title}
        onChangeText={setTitle}
        placeholder={_(msg`Title`)}
        placeholderTextColor={t.palette.contrast_400}
        style={[
          styles.input,
          t.atoms.text,
          {borderColor: t.palette.contrast_100},
        ]}
        autoFocus
      />
      <TextInput
        accessibilityLabel={_(msg`Item description`)}
        accessibilityHint={_(msg`Describes the evidence, link, note, or reference`)}
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
      <TextInput
        accessibilityLabel={_(msg`Item URL`)}
        accessibilityHint={_(msg`Adds an optional source link to this item`)}
        value={url}
        onChangeText={setUrl}
        placeholder={_(msg`URL (optional)`)}
        placeholderTextColor={t.palette.contrast_400}
        style={[
          styles.input,
          t.atoms.text,
          {borderColor: t.palette.contrast_100},
        ]}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.actions}>
        <TouchableOpacity accessibilityRole="button" onPress={() => control.close()}>
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>Cancel</Trans>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onSave}
          disabled={!collection || !title.trim() || addMutation.isPending}>
          <Text
            style={[
              t.atoms.text,
              {fontWeight: '700'},
              (!collection || !title.trim() || addMutation.isPending) && {
                opacity: 0.5,
              },
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
  kindRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kindBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  kindText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
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
