import {useState} from 'react'
import {
  type StyleProp,
  StyleSheet,
  TextInput,
  type TextStyle,
  TouchableOpacity,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {
  type BookSuggestion,
  useBookSearchQuery,
} from '#/state/queries/book-search'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'

/*
 * A book title input that suggests matches as you type. A suggestion shows the
 * title, the author and the year of first publication - nothing else, and no
 * cover. Picking one fills the title and hands the author and year to the form;
 * ignoring the list leaves a hand-typed title untouched, which matters because
 * the catalogue is incomplete (small presses, Spanish-language titles).
 */
export function BookTitleField({
  value,
  onChangeText,
  onPick,
  inputStyle,
  autoFocus,
}: {
  value: string
  onChangeText: (text: string) => void
  onPick: (book: {title: string; author?: string; year?: number}) => void
  inputStyle?: StyleProp<TextStyle>
  autoFocus?: boolean
}) {
  const t = useTheme()
  const {_} = useLingui()
  const {suggestions} = useBookSearchQuery(value)
  // The title just chosen from the list; suggestions stay hidden until the
  // text changes again.
  const [picked, setPicked] = useState<string>()
  const showList = suggestions.length > 0 && value !== picked

  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={text => {
          setPicked(undefined)
          onChangeText(text)
        }}
        accessibilityLabel={_(msg`Book title`)}
        accessibilityHint={_(msg`Type to search for a book or enter your own`)}
        placeholder={_(msg`Book title`)}
        placeholderTextColor={t.palette.contrast_400}
        maxLength={300}
        autoFocus={autoFocus}
        style={inputStyle}
      />
      {showList ? (
        <View
          style={[
            styles.list,
            t.atoms.bg,
            {borderColor: t.palette.contrast_100},
          ]}>
          {suggestions.map(book => (
            <SuggestionRow
              key={book.key}
              book={book}
              onPress={() => {
                setPicked(book.title)
                onPick({
                  title: book.title,
                  author: book.authors.join(', ') || undefined,
                  year: book.firstPublishYear,
                })
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function SuggestionRow({
  book,
  onPress,
}: {
  book: BookSuggestion
  onPress: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const byline = [book.authors.join(', '), book.firstPublishYear]
    .filter(Boolean)
    .join(' · ')
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={byline ? `${book.title}, ${byline}` : book.title}
      accessibilityHint={_(msg`Fills in the title, author and year`)}
      onPress={onPress}
      style={[styles.row, {borderBottomColor: t.palette.contrast_100}]}>
      <Text style={[styles.rowTitle, t.atoms.text]} numberOfLines={1}>
        {book.title}
      </Text>
      {byline ? (
        <Text
          style={[styles.rowByline, t.atoms.text_contrast_medium]}
          numberOfLines={1}>
          {byline}
        </Text>
      ) : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrap: {gap: 4},
  list: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: {fontSize: 14, fontWeight: '700'},
  rowByline: {fontSize: 12},
})
