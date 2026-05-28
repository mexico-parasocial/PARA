import {useCallback, useState} from 'react'
import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {CIVIC_TREE_LABELS} from '#/lib/civic-tree-labels'
import {
  useAddToCollectionMutation,
  useCollectionsQuery,
  useCreateCollectionMutation,
} from '#/state/queries/collections'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import {Bookmark as BookmarkIcon} from '#/components/icons/Bookmark'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import * as Toast from '#/components/Toast'

export function SaveToCollectionDialog({
  control,
  policyUri,
  policyCid,
  policyTitle,
  policyCategory,
  policyColor,
}: {
  control: Dialog.DialogControlProps
  policyUri: string
  policyCid?: string
  policyTitle?: string
  policyCategory?: string
  policyColor?: string
}) {
  return (
    <Dialog.Outer control={control} testID="saveToCivicTreeDialog">
      <Dialog.Handle />
      <SaveToCollectionDialogInner
        control={control}
        policyUri={policyUri}
        policyCid={policyCid}
        policyTitle={policyTitle}
        policyCategory={policyCategory}
        policyColor={policyColor}
      />
    </Dialog.Outer>
  )
}

function SaveToCollectionDialogInner({
  control,
  policyUri,
  policyCid,
  policyTitle,
  policyCategory,
  policyColor,
}: {
  control: Dialog.DialogControlProps
  policyUri: string
  policyCid?: string
  policyTitle?: string
  policyCategory?: string
  policyColor?: string
}) {
  const {_} = useLingui()
  const t = useTheme()
  const {data: collections = []} = useCollectionsQuery()
  const addMutation = useAddToCollectionMutation()
  const createMutation = useCreateCollectionMutation()

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [note, setNote] = useState('')

  const onSelect = useCallback(
    (collectionId: string) => {
      const existingItems =
        collections.find(c => c.id === collectionId)?.items || []
      addMutation.mutate(
        {
          collectionId,
          item: {
            policyUri,
            policyCid,
            policyTitle,
            policyCategory,
            policyColor,
            note: note.trim() || undefined,
            addedAt: new Date().toISOString(),
          },
          existingItems,
        },
        {
          onSuccess: () => {
            control.close()
            Toast.show(_(msg`Added to your personal civic tree`))
          },
          onError: () => {
            Toast.show(_(msg`Failed to add`), {type: 'error'})
          },
        },
      )
    },
    [
      addMutation,
      collections,
      control,
      policyUri,
      policyCid,
      policyTitle,
      policyCategory,
      policyColor,
      note,
      _,
    ],
  )

  const onCreate = useCallback(() => {
    if (!newName.trim()) return
    createMutation.mutate(
      {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      },
      {
        onSuccess: data => {
          setNewName('')
          setNewDescription('')
          setShowCreate(false)
          onSelect(data.id)
        },
        onError: () => {
          Toast.show(_(msg`Failed to create collection`), {type: 'error'})
        },
      },
    )
  }, [createMutation, newDescription, newName, onSelect, _])

  const previewTitle = policyTitle || policyUri

  return (
    <Dialog.Inner label={CIVIC_TREE_LABELS.savePersonal}>
      <Text style={[styles.title, t.atoms.text]}>
        {CIVIC_TREE_LABELS.savePersonal}
      </Text>
      <View style={styles.previewWrap}>
        <View
          style={[
            styles.previewDot,
            {backgroundColor: policyColor || t.palette.primary_500},
          ]}
        />
        <Text style={[styles.previewText, t.atoms.text]} numberOfLines={2}>
          {previewTitle}
        </Text>
      </View>
      <TextInput
        accessibilityLabel={_(msg`Personal note`)}
        accessibilityHint={_(msg`Adds a private note to this saved item`)}
        value={note}
        onChangeText={setNote}
        placeholder={_(msg`Note (optional)`)}
        placeholderTextColor={t.palette.contrast_400}
        style={[
          styles.noteInput,
          t.atoms.text,
          {borderWidth: 1, borderColor: t.palette.contrast_100},
        ]}
        multiline
        numberOfLines={2}
      />
      <View style={styles.list}>
        {collections.length === 0 && !showCreate ? (
          <Text style={[styles.empty, t.atoms.text_contrast_medium]}>
            <Trans>You do not have any collections yet. Create one to start your personal civic tree.</Trans>
          </Text>
        ) : (
          collections.map(col => (
            <TouchableOpacity
              key={col.id}
              accessibilityRole="button"
              accessibilityLabel={_(msg`Add to ${col.name}`)}
              accessibilityHint={_(msg`Adds this item to the selected collection`)}
              onPress={() => onSelect(col.id)}
              disabled={addMutation.isPending}
              style={[
                styles.collectionRow,
                t.atoms.bg_contrast_25,
                {borderWidth: 1, borderColor: t.palette.contrast_100},
              ]}>
              <BookmarkIcon
                size="sm"
                style={{color: col.color || t.palette.primary_500}}
              />
              <Text style={[styles.collectionName, t.atoms.text]}>
                {col.name}
              </Text>
              <Text style={[styles.count, t.atoms.text_contrast_low]}>
                {col.items.length}
              </Text>
            </TouchableOpacity>
          ))
        )}

        {showCreate ? (
          <View style={styles.createWrap}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              accessibilityLabel={_(msg`Collection name`)}
              accessibilityHint={_(msg`Write the name of the new collection`)}
              placeholder={_(msg`Collection name`)}
              placeholderTextColor={t.palette.contrast_400}
              style={[
                styles.nameInput,
                t.atoms.text,
                {borderWidth: 1, borderColor: t.palette.contrast_100},
              ]}
              onSubmitEditing={onCreate}
              autoFocus
            />
            <TextInput
              value={newDescription}
              onChangeText={setNewDescription}
              accessibilityLabel={_(msg`Collection description`)}
              accessibilityHint={_(msg`Describe what this collection is for`)}
              placeholder={_(msg`Description (optional)`)}
              placeholderTextColor={t.palette.contrast_400}
              style={[
                styles.descriptionInput,
                t.atoms.text,
                {borderWidth: 1, borderColor: t.palette.contrast_100},
              ]}
              multiline
              numberOfLines={2}
            />
            <View style={styles.createActions}>
              <TouchableOpacity accessibilityRole="button"
                onPress={() => {
                  setShowCreate(false)
                  setNewName('')
                  setNewDescription('')
                }}>
                <Text style={t.atoms.text_contrast_medium}>
                  <Trans>Cancel</Trans>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                onPress={onCreate}
                disabled={!newName.trim() || createMutation.isPending}>
                <Text
                  style={[
                    t.atoms.text,
                    {fontWeight: '700'},
                    (!newName.trim() || createMutation.isPending) && {
                      opacity: 0.5,
                    },
                  ]}>
                  <Trans>Create and add</Trans>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={_(msg`New collection`)}
            accessibilityHint={_(msg`Opens the form to create a collection`)}
            onPress={() => setShowCreate(true)}
            style={styles.newBtn}>
            <PlusIcon size="sm" style={{color: t.palette.primary_500}} />
            <Text style={[styles.newBtnText, {color: t.palette.primary_500}]}>
              <Trans>New collection</Trans>
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <Dialog.Close />
    </Dialog.Inner>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  previewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginBottom: 12,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  noteInput: {
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 4,
  },
  list: {
    gap: 8,
    paddingVertical: 8,
  },
  empty: {
    textAlign: 'center',
    padding: 16,
    fontSize: 14,
  },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
  },
  collectionName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  count: {
    fontSize: 13,
    minWidth: 20,
    textAlign: 'right',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    justifyContent: 'center',
  },
  newBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  createWrap: {
    gap: 10,
    paddingTop: 4,
  },
  nameInput: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  descriptionInput: {
    minHeight: 64,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
})
