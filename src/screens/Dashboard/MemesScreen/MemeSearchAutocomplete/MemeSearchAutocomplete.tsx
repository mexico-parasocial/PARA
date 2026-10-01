import {type ReactNode, useMemo} from 'react'
import {Pressable, ScrollView, View} from 'react-native'
import {Image} from 'expo-image'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {Hashtag_Stroke2_Corner0_Rounded as HashtagIcon} from '#/components/icons/Hashtag'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/MagnifyingGlass'
import {Person_Stroke2_Corner0_Rounded as PersonIcon} from '#/components/icons/Person'
import * as Layout from '#/components/Layout'
import {matchesSearch} from '../helpers'
import {styles} from '../styles'
import {type MediaItem} from '../types'

type Term = {kind: 'topic' | 'author'; value: string}

const MAX_TERMS = 6
const MAX_MEMES = 8
const MAX_CHIPS = 12

/**
 * Community ids end in a record key (`morena-3mwosqhgkxo2m`). Drop it for
 * display; searching the readable name still matches the full id.
 */
function readableCommunity(community: string) {
  return community.replace(/-[a-z2-7]{13}$/, '')
}

/**
 * Suggestions shown in place of the memes while the search bar is focused,
 * like the Explore screen's autocomplete: topics (categories and communities)
 * and authors to search by, plus memes that already match what was typed.
 */
export function MemeSearchAutocomplete({
  memes,
  searchText,
  onSubmit,
  onSelectTerm,
  onSelectMeme,
}: {
  memes: MediaItem[]
  searchText: string
  onSubmit: () => void
  onSelectTerm: (term: string) => void
  onSelectMeme: (item: MediaItem) => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const normalized = searchText.trim().toLowerCase()

  const {topics, authors} = useMemo(() => {
    const topicSet = new Set<string>()
    const authorSet = new Set<string>()
    for (const item of memes) {
      if (item.category) topicSet.add(item.category)
      if (item.community) topicSet.add(readableCommunity(item.community))
      if (item.author) authorSet.add(item.author)
    }
    return {topics: [...topicSet], authors: [...authorSet]}
  }, [memes])

  const matchingTerms = useMemo<Term[]>(() => {
    if (!normalized) return []
    const matches = (value: string) => value.toLowerCase().includes(normalized)
    return [
      ...topics.filter(matches).map(value => ({kind: 'topic' as const, value})),
      ...authors
        .filter(matches)
        .map(value => ({kind: 'author' as const, value})),
    ].slice(0, MAX_TERMS)
  }, [authors, normalized, topics])

  const matchingMemes = useMemo(() => {
    if (!normalized) return []
    return memes
      .filter(item =>
        matchesSearch(
          [item.title, item.author, item.category, item.community],
          normalized,
        ),
      )
      .slice(0, MAX_MEMES)
  }, [memes, normalized])

  return (
    <ScrollView
      contentContainerStyle={styles.searchSuggestContent}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      style={[styles.searchSuggest, t.atoms.bg]}>
      <Layout.Center>
        {normalized ? (
          <>
            <SuggestionRow
              icon={
                <SearchIcon size="md" style={t.atoms.text_contrast_medium} />
              }
              label={_(msg`Search for “${searchText.trim()}”`)}
              onPress={onSubmit}
            />
            {matchingTerms.map(term => (
              <SuggestionRow
                key={`${term.kind}:${term.value}`}
                icon={
                  term.kind === 'author' ? (
                    <PersonIcon
                      size="md"
                      style={t.atoms.text_contrast_medium}
                    />
                  ) : (
                    <HashtagIcon
                      size="md"
                      style={t.atoms.text_contrast_medium}
                    />
                  )
                }
                label={term.value}
                onPress={() => onSelectTerm(term.value)}
              />
            ))}

            {matchingMemes.length ? (
              <>
                <SectionTitleText>
                  <Trans>Memes</Trans>
                </SectionTitleText>
                {matchingMemes.map(item => (
                  <Pressable
                    key={item.id}
                    accessibilityHint={_(msg`Opens this meme in full screen`)}
                    accessibilityLabel={item.title}
                    accessibilityRole="button"
                    onPress={() => onSelectMeme(item)}
                    style={({pressed}) => [
                      styles.searchMemeRow,
                      pressed && t.atoms.bg_contrast_25,
                    ]}>
                    <View
                      style={[
                        styles.searchMemeThumb,
                        {backgroundColor: item.color},
                      ]}>
                      {item.thumbUri ? (
                        <Image
                          accessibilityIgnoresInvertColors
                          cachePolicy="memory-disk"
                          contentFit="cover"
                          source={{uri: item.thumbUri}}
                          style={a.flex_1}
                        />
                      ) : null}
                    </View>
                    <View style={a.flex_1}>
                      <Text
                        numberOfLines={1}
                        style={[a.text_md, a.font_semi_bold, t.atoms.text]}>
                        {item.title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[a.text_sm, t.atoms.text_contrast_medium]}>
                        {[item.author, item.category]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </>
            ) : matchingTerms.length === 0 ? (
              <Text
                style={[
                  a.text_md,
                  a.px_lg,
                  a.py_lg,
                  t.atoms.text_contrast_medium,
                ]}>
                <Trans>No memes match that search yet.</Trans>
              </Text>
            ) : null}
          </>
        ) : (
          <>
            {topics.length ? (
              <>
                <SectionTitleText>
                  <Trans>Topics</Trans>
                </SectionTitleText>
                <ChipRow
                  icon={
                    <HashtagIcon
                      size="sm"
                      style={t.atoms.text_contrast_medium}
                    />
                  }
                  onSelect={onSelectTerm}
                  values={topics.slice(0, MAX_CHIPS)}
                />
              </>
            ) : null}
            {authors.length ? (
              <>
                <SectionTitleText>
                  <Trans>Authors</Trans>
                </SectionTitleText>
                <ChipRow
                  icon={
                    <PersonIcon
                      size="sm"
                      style={t.atoms.text_contrast_medium}
                    />
                  }
                  onSelect={onSelectTerm}
                  values={authors.slice(0, MAX_CHIPS)}
                />
              </>
            ) : null}
            {!topics.length && !authors.length ? (
              <Text
                style={[
                  a.text_md,
                  a.px_lg,
                  a.py_lg,
                  t.atoms.text_contrast_medium,
                ]}>
                <Trans>Search memes by title, author, or community.</Trans>
              </Text>
            ) : null}
          </>
        )}
      </Layout.Center>
    </ScrollView>
  )
}

function SectionTitleText({children}: {children: ReactNode}) {
  const t = useTheme()
  return (
    <Text
      style={[
        a.text_sm,
        a.font_bold,
        a.px_lg,
        a.pt_lg,
        a.pb_sm,
        t.atoms.text_contrast_medium,
      ]}>
      {children}
    </Text>
  )
}

function SuggestionRow({
  icon,
  label,
  onPress,
}: {
  icon: ReactNode
  label: string
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <Pressable
      accessibilityHint=""
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.searchSuggestRow,
        pressed && t.atoms.bg_contrast_25,
      ]}>
      {icon}
      <Text numberOfLines={1} style={[a.flex_1, a.text_md, t.atoms.text]}>
        {label}
      </Text>
    </Pressable>
  )
}

function ChipRow({
  values,
  icon,
  onSelect,
}: {
  values: string[]
  icon: ReactNode
  onSelect: (value: string) => void
}) {
  const t = useTheme()
  return (
    <View style={styles.searchChipRow}>
      {values.map(value => (
        <Pressable
          key={value}
          accessibilityHint=""
          accessibilityLabel={value}
          accessibilityRole="button"
          onPress={() => onSelect(value)}
          style={[styles.searchChip, t.atoms.bg_contrast_25]}>
          {icon}
          <Text numberOfLines={1} style={[a.text_sm, t.atoms.text]}>
            {value}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
