import {useEffect, useState} from 'react'
import {View} from 'react-native'
import {useSift} from '@bsky.app/sift'
import {StackActions, useNavigation} from '@react-navigation/native'

import {type NavigationProp} from '#/lib/routes/types'
import {AdvancedSearchDialog} from '#/screens/Search/components/AdvancedSearchDialog'
import {
  countActiveFilters,
  countActiveParaFilters,
  definedFilterParams,
  getActiveParaFilterNames,
  readSearchFilters,
  type SearchFilters,
} from '#/screens/Search/searchParams'
import {atoms as a} from '#/alf'
import {
  Autocomplete as AutocompleteBase,
  type AutocompleteItem,
  useAutocomplete,
} from '#/components/Autocomplete'
import {SearchInput} from '#/components/forms/SearchInput'
import {useAnalytics} from '#/analytics'

function useDesktopSearchFilters(): SearchFilters {
  const navigation = useNavigation<NavigationProp>()
  const [filters, setFilters] = useState<SearchFilters>({})

  useEffect(() => {
    return navigation.addListener('state', e => {
      try {
        const {state} = e.data
        const lastRoute = state.routes[state.routes.length - 1]
        setFilters(readSearchFilters(lastRoute?.params))
      } catch {
        // Ignore malformed navigation state.
      }
    })
  }, [navigation])

  return filters
}

export function DesktopSearch() {
  const navigation = useNavigation<NavigationProp>()
  const [active, setActive] = useState(false)
  const [query, setQuery] = useState<string>('')
  const showResults = active && !!query.length
  const ax = useAnalytics()
  const routeFilters = useDesktopSearchFilters()

  const sift = useSift({
    offset: a.p_sm.padding,
    placement: 'bottom',
  })

  const onFocus = () => {
    if (query.length) setActive(true)
  }

  const onBlur = () => {
    setActive(false)
  }

  const onChangeText = (text: string) => {
    setQuery(text)
    if (!active) {
      setActive(true)
    }
  }

  const onClearText = () => {
    setQuery('')
    setActive(false)
  }

  const onSubmit = () => {
    if (!query.length) return
    onClearText()
    sift.elements.input.blur()
    navigation.dispatch(StackActions.push('Search', {q: query}))
  }

  const onSelect = (item: AutocompleteItem) => {
    if (item.type === 'profile') {
      onClearText()
      sift.elements.input.blur()
      navigation.navigate('Profile', {name: item.profile.handle})
    } else if (item.type === 'search') {
      onClearText()
      sift.elements.input.blur()
      navigation.navigate('Search', {q: item.value})
    }
  }

  return (
    <View collapsable={false} ref={sift.refs.setAnchor}>
      <View style={[a.flex_row, a.align_center, a.gap_sm]}>
        <View style={[a.flex_1]}>
          <SearchInput
            hotkey
            value={query}
            onFocus={onFocus}
            onBlur={onBlur}
            onChangeText={onChangeText}
            onClearText={onClearText}
            onSubmitEditing={onSubmit}
            {...sift.targetProps}
          />
        </View>
        <AdvancedSearchDialog
          q={query}
          filters={routeFilters}
          onSubmit={(q, nextFilters) => {
            const nextFilterCount = countActiveFilters(nextFilters)
            const nextParaFilterCount = countActiveParaFilters(nextFilters)
            ax.metric('search:advanced:press', {
              filterCount: nextFilterCount,
              paraFilterCount: nextParaFilterCount,
              paraFilters: getActiveParaFilterNames(nextFilters),
            })
            onClearText()
            sift.elements.input.blur()
            navigation.dispatch(
              StackActions.push('Search', {
                q,
                ...definedFilterParams(nextFilters),
              }),
            )
          }}
        />
      </View>
      {showResults && (
        <Inner
          query={query}
          sift={sift}
          onSelect={onSelect}
          onDismiss={() => setActive(false)}
        />
      )}
    </View>
  )
}

function Inner({
  query,
  sift,
  onSelect,
  onDismiss,
}: {
  query: string
  sift: ReturnType<typeof useSift>
  onSelect: (item: AutocompleteItem) => void
  onDismiss: () => void
}) {
  const {items} = useAutocomplete({
    type: 'profile',
    query,
    showSearchFallback: true,
  })

  return items && items.length ? (
    <AutocompleteBase
      sift={sift}
      data={items}
      onSelect={onSelect}
      onDismiss={onDismiss}
    />
  ) : null
}
