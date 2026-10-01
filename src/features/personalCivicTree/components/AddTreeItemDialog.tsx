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
import {parsePublishedYear} from '#/features/civicTree/books'
import {BookTitleField} from '#/features/civicTree/components/BookTitleField'
import {CivicNodeResults} from '#/features/personalCivicTree/components/CivicNodePicker'

type TreeItemKind = NonNullable<CivicTreeItem['kind']>

/*
 * Kind first, because it decides what the rest of the form is. `topic` and
 * `policy` are pickers over vocabulary that already exists; the other three are
 * things the user types. Ordering puts the subject kinds first: an item is
 * easier to place once its subject is in the tree.
 */
const KIND_OPTIONS: TreeItemKind[] = [
  'topic',
  'policy',
  'evidence',
  'book',
  'link',
  'note',
]

const KIND_LABELS: Record<string, string> = {
  topic: 'Topic',
  policy: 'Policy',
  evidence: 'Evidence',
  book: 'Book',
  link: 'Link',
  note: 'Note',
}

/** Kinds that are chosen from existing vocabulary rather than typed. */
const PICKED_KINDS = new Set<TreeItemKind>(['topic', 'policy'])

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

  const [kind, setKind] = useState<TreeItemKind>('topic')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [author, setAuthor] = useState('')
  const [year, setYear] = useState('')
  const publishedYear = parsePublishedYear(year)
  const yearInvalid = kind === 'book' && year.length > 0 && !publishedYear

  const save = useCallback(
    (item: CivicTreeItem) => {
      if (!collection) return
      addMutation.mutate(
        {collectionId: collection.id, item, existingItems: collection.items},
        {
          onSuccess: () => {
            setKind('topic')
            setTitle('')
            setDescription('')
            setUrl('')
            setAuthor('')
            setYear('')
            control.close()
            Toast.show(_(msg`Added to your personal civic tree`))
          },
          onError: (err: Error) => {
            Toast.show(err.message || _(msg`Failed to add item`), {
              type: 'error',
            })
          },
        },
      )
    },
    [addMutation, collection, control, _],
  )

  const onPickNode = useCallback((item: CivicTreeItem) => save(item), [save])

  const onSave = useCallback(() => {
    if (!collection || !title.trim()) return

    const trimmedUrl = url.trim()
    const item: CivicTreeItem = {
      itemId: createCivicTreeItemId(),
      kind,
      title: title.trim(),
      description: description.trim() || undefined,
      url: trimmedUrl || undefined,
      sourceLabel: (kind === 'book' && author.trim()) || undefined,
      publishedYear: kind === 'book' ? publishedYear : undefined,
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
          setKind('topic')
          setTitle('')
          setDescription('')
          setUrl('')
          setAuthor('')
          setYear('')
          control.close()
          Toast.show(_(msg`Added to your personal civic tree`))
        },
        onError: (err: Error) => {
          Toast.show(err.message || _(msg`Failed to add item`), {type: 'error'})
        },
      },
    )
  }, [
    addMutation,
    collection,
    control,
    description,
    kind,
    title,
    url,
    author,
    publishedYear,
    _,
  ])

  return (
    <Dialog.Inner label={_(msg`Add item to civic tree`)}>
      <Text style={[styles.title, t.atoms.text]}>
        <Trans>Add item</Trans>
      </Text>
      <Text style={[styles.subtitle, t.atoms.text_contrast_medium]}>
        <Trans>
          Save evidence, links, notes, books, and references into this
          collection.
        </Trans>
      </Text>
      {kind === 'book' ? (
        <Text style={[styles.bookHint, t.atoms.text_contrast_medium]}>
          <Trans>
            Books here show what you read and how it shapes your politics. They
            stay in your personal tree and do not appear in Documents unless you
            choose to contribute one to a community.
          </Trans>
        </Text>
      ) : null}

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
              {KIND_LABELS[option] ?? option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {PICKED_KINDS.has(kind) ? (
        <CivicNodeResults
          kind={kind === 'policy' ? 'policy' : 'topic'}
          onPick={onPickNode}
        />
      ) : (
        <>
          {kind === 'book' ? (
            <View style={styles.bookTitle}>
              <BookTitleField
                value={title}
                onChangeText={setTitle}
                onPick={book => {
                  setTitle(book.title)
                  setAuthor(book.author ?? '')
                  setYear(book.year ? String(book.year) : '')
                }}
                inputStyle={[
                  styles.input,
                  t.atoms.text,
                  {borderColor: t.palette.contrast_100},
                ]}
                autoFocus
              />
            </View>
          ) : (
            <TextInput
              accessibilityLabel={_(msg`Item title`)}
              accessibilityHint={_(
                msg`Names the item saved in this collection`,
              )}
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
          )}
          {kind === 'book' ? (
            <TextInput
              accessibilityLabel={_(msg`Book author`)}
              accessibilityHint={_(msg`Names the author of this book`)}
              value={author}
              onChangeText={setAuthor}
              placeholder={_(msg`Author (optional)`)}
              placeholderTextColor={t.palette.contrast_400}
              style={[
                styles.input,
                t.atoms.text,
                {borderColor: t.palette.contrast_100},
              ]}
            />
          ) : null}
          {kind === 'book' ? (
            <TextInput
              accessibilityLabel={_(msg`Year published`)}
              accessibilityHint={_(msg`The year this book was first published`)}
              value={year}
              onChangeText={text =>
                setYear(text.replace(/[^0-9]/g, '').slice(0, 4))
              }
              placeholder={_(msg`Year published (optional)`)}
              placeholderTextColor={t.palette.contrast_400}
              keyboardType="number-pad"
              maxLength={4}
              style={[
                styles.input,
                t.atoms.text,
                {
                  borderColor: yearInvalid
                    ? t.palette.negative_500
                    : t.palette.contrast_100,
                },
              ]}
            />
          ) : null}
          <TextInput
            accessibilityLabel={_(msg`Item description`)}
            accessibilityHint={_(
              msg`Describes the evidence, link, note, or reference`,
            )}
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
            accessibilityHint={_(
              msg`Adds an optional source link to this item`,
            )}
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
        </>
      )}

      {/*
       * Cancel and Close sit outside the branch: picking a topic saves on tap,
       * so that path has no Save button, but it still needs a way out.
       */}
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
        {PICKED_KINDS.has(kind) ? null : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={_(msg`Save`)}
            accessibilityHint={_(msg`Adds the item to the selected collection`)}
            onPress={onSave}
            disabled={
              !collection ||
              !title.trim() ||
              yearInvalid ||
              addMutation.isPending
            }>
            <Text
              style={[
                t.atoms.text,
                {fontWeight: '700'},
                (!collection ||
                  !title.trim() ||
                  yearInvalid ||
                  addMutation.isPending) && {
                  opacity: 0.5,
                },
              ]}>
              <Trans>Save</Trans>
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  bookTitle: {
    marginBottom: 10,
  },
  bookHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
