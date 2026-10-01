import {useMemo, useState} from 'react'
import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useCommunityBoardsQuery} from '#/state/queries/community-boards'
import {useCreateCommunityTreeContributionMutation} from '#/state/queries/community-civic-tree'
import {useSession} from '#/state/session'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import * as Toast from '#/components/Toast'
import {
  BOOK_SOURCE_TYPE,
  buildBookMetadata,
  parsePublishedYear,
} from '#/features/civicTree/books'
import {BookTitleField} from '#/features/civicTree/components/BookTitleField'
import {CommunityPicker} from '#/features/communityCivicTree/components/CommunityPicker'

const HTTP_URL = /^https?:\/\/\S+$/i

/*
 * Books are community civic-tree contributions of type `book`, so adding one
 * goes through the same community review as any other contribution. The
 * dialog therefore asks for a community, and tells the viewer it will be
 * reviewed rather than pretending the book is in the library immediately.
 */
export function AddBookDialog({
  control,
  defaultCommunityUris,
}: {
  control: Dialog.DialogControlProps
  /** Preselects the first of these the viewer belongs to, e.g. the community
   * the Documents list is scoped to. */
  defaultCommunityUris?: string[]
}) {
  return (
    <Dialog.Outer control={control} testID="addBookDialog">
      <Dialog.Handle />
      <AddBookDialogInner
        control={control}
        defaultCommunityUris={defaultCommunityUris}
      />
    </Dialog.Outer>
  )
}

function AddBookDialogInner({
  control,
  defaultCommunityUris,
}: {
  control: Dialog.DialogControlProps
  defaultCommunityUris?: string[]
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const {data: boardsData, isLoading} = useCommunityBoardsQuery({limit: 50})
  const createContribution = useCreateCommunityTreeContributionMutation()
  const [pickedCommunityUri, setCommunityUri] = useState<string>()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [year, setYear] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')

  const activeBoards = useMemo(
    () =>
      (boardsData?.boards ?? []).filter(
        board => board.viewerMembershipState === 'active',
      ),
    [boardsData],
  )

  // Only a community the viewer can actually post to may be preselected.
  const communityUri =
    pickedCommunityUri ??
    activeBoards.find(board => defaultCommunityUris?.includes(board.uri))?.uri

  const trimmedUrl = url.trim()
  const urlInvalid = trimmedUrl.length > 0 && !HTTP_URL.test(trimmedUrl)
  const publishedYear = parsePublishedYear(year)
  const yearInvalid = year.length > 0 && publishedYear === undefined
  const canSubmit =
    !!communityUri &&
    !!currentAccount?.did &&
    title.trim().length > 0 &&
    !urlInvalid &&
    !yearInvalid &&
    !createContribution.isPending

  const onSubmit = () => {
    if (!canSubmit || !communityUri || !currentAccount?.did) return
    createContribution.mutate(
      {
        communityUri,
        authorDid: currentAccount.did,
        title: title.trim(),
        content: note.trim() || undefined,
        sourceUrl: trimmedUrl || undefined,
        sourceType: BOOK_SOURCE_TYPE,
        metadata: buildBookMetadata({author, publishedYear}),
      },
      {
        onSuccess: () => {
          Toast.show(_(msg`Book sent for community review`))
          control.close()
          setTitle('')
          setAuthor('')
          setYear('')
          setUrl('')
          setNote('')
          setCommunityUri(undefined)
        },
        onError: (err: Error) => {
          Toast.show(err.message || _(msg`Could not add the book`), {
            type: 'error',
          })
        },
      },
    )
  }

  const inputStyle = [
    styles.input,
    t.atoms.text,
    {borderColor: t.palette.contrast_100},
  ]

  return (
    <Dialog.ScrollableInner label={_(msg`Add a book`)}>
      <Text style={[styles.title, t.atoms.text]}>
        <Trans>Add a book</Trans>
      </Text>
      <Text style={[styles.description, t.atoms.text_contrast_medium]}>
        <Trans>
          Books are shared with a community and reviewed by its members before
          they appear in the library.
        </Trans>
      </Text>

      <View style={styles.section}>
        <Text style={[styles.label, t.atoms.text]}>
          <Trans>Community</Trans>
        </Text>
        {isLoading ? (
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>Loading communities...</Trans>
          </Text>
        ) : activeBoards.length === 0 ? (
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>Join a community to add books to its library.</Trans>
          </Text>
        ) : (
          <CommunityPicker
            boards={activeBoards}
            selectedUri={communityUri}
            onSelect={setCommunityUri}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, t.atoms.text]}>
          <Trans>Title</Trans>
        </Text>
        <BookTitleField
          value={title}
          onChangeText={setTitle}
          onPick={book => {
            setTitle(book.title)
            setAuthor(book.author ?? '')
            setYear(book.year ? String(book.year) : '')
          }}
          inputStyle={inputStyle}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, t.atoms.text]}>
          <Trans>Author</Trans>
        </Text>
        <TextInput
          value={author}
          onChangeText={setAuthor}
          accessibilityLabel={_(msg`Author`)}
          accessibilityHint={_(msg`Enter the author of the book`)}
          placeholder={_(msg`Optional`)}
          placeholderTextColor={t.palette.contrast_400}
          maxLength={200}
          style={inputStyle}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, t.atoms.text]}>
          <Trans>Year published</Trans>
        </Text>
        <TextInput
          value={year}
          onChangeText={text =>
            setYear(text.replace(/[^0-9]/g, '').slice(0, 4))
          }
          accessibilityLabel={_(msg`Year published`)}
          accessibilityHint={_(
            msg`Enter the year the book was first published`,
          )}
          placeholder={_(msg`Optional`)}
          placeholderTextColor={t.palette.contrast_400}
          keyboardType="number-pad"
          maxLength={4}
          style={[
            inputStyle,
            yearInvalid && {borderColor: t.palette.negative_500},
          ]}
        />
        {yearInvalid ? (
          <Text style={{color: t.palette.negative_500, fontSize: 12}}>
            <Trans>Enter a four-digit year, or leave it blank.</Trans>
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, t.atoms.text]}>
          <Trans>Link</Trans>
        </Text>
        <TextInput
          value={url}
          onChangeText={setUrl}
          accessibilityLabel={_(msg`Link to the book`)}
          accessibilityHint={_(
            msg`Enter a web link where the book can be found`,
          )}
          placeholder="https://"
          placeholderTextColor={t.palette.contrast_400}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[
            inputStyle,
            urlInvalid && {borderColor: t.palette.negative_500},
          ]}
        />
        {urlInvalid ? (
          <Text style={{color: t.palette.negative_500, fontSize: 12}}>
            <Trans>Enter a link starting with http:// or https://</Trans>
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.label, t.atoms.text]}>
          <Trans>Why it matters</Trans>
        </Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          accessibilityLabel={_(msg`Public note`)}
          accessibilityHint={_(
            msg`Adds public context about why this book matters`,
          )}
          placeholder={_(msg`Optional public context`)}
          placeholderTextColor={t.palette.contrast_400}
          multiline
          maxLength={2000}
          style={[inputStyle, styles.noteInput]}
        />
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={_(msg`Send book for review`)}
        accessibilityHint={_(msg`Submits the book for community review`)}
        accessibilityState={{disabled: !canSubmit}}
        disabled={!canSubmit}
        onPress={onSubmit}
        style={[
          styles.submitButton,
          {backgroundColor: t.palette.primary_500},
          !canSubmit && {opacity: 0.5},
        ]}>
        <Text style={styles.submitText}>
          <Trans>Send for review</Trans>
        </Text>
      </TouchableOpacity>

      <Dialog.Close />
    </Dialog.ScrollableInner>
  )
}

const styles = StyleSheet.create({
  title: {fontSize: 20, fontWeight: '800', marginBottom: 8},
  description: {fontSize: 14, lineHeight: 20, marginBottom: 14},
  section: {gap: 8, marginBottom: 12},
  label: {fontSize: 13, fontWeight: '800'},
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  noteInput: {
    minHeight: 82,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  submitButton: {
    minHeight: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitText: {color: 'white', fontSize: 15, fontWeight: '800'},
})
