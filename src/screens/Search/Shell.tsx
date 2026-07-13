import {
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type StyleProp,
  type TextInput,
  View,
  type ViewStyle,
} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'

import {HITSLOP_10, HITSLOP_20} from '#/lib/constants'
import {useNonReactiveCallback} from '#/lib/hooks/useNonReactiveCallback'
import {MagnifyingGlassIcon} from '#/lib/icons'
import {type NavigationProp, type SearchParams} from '#/lib/routes/types'
import {shareUrl} from '#/lib/sharing'
import {listenSoftReset} from '#/state/events'
import {useActorAutocompleteQuery} from '#/state/queries/actor-autocomplete'
import {
  unstableCacheProfileView,
  useProfilesQuery,
} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {
  countActiveFilters,
  countActiveParaFilters,
  definedFilterParams,
  filtersToLegacyParams,
  filtersToRouteParams,
  getActiveParaFilterNames,
  hasActiveFilters,
  parseHistoryEntry,
  readSearchFilters,
  type SearchFilters,
  serializeHistoryEntry,
  withoutFilterParams,
} from '#/screens/Search/searchParams'
import {makeSearchQuery} from '#/screens/Search/utils'
import {atoms as a, tokens, useBreakpoints, useTheme, web} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {SearchInput} from '#/components/forms/SearchInput'
import {ArrowShareRight_Stroke2_Corner2_Rounded as ShareIcon} from '#/components/icons/ArrowShareRight'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {useAnalytics} from '#/analytics'
import {IS_WEB} from '#/env'
import {account, useStorage} from '#/storage'
import type * as bsky from '#/types/bsky'
import {AdvancedSearchDialog} from './components/AdvancedSearchDialog'
import {AutocompleteResults} from './components/AutocompleteResults'
import {SearchHistory} from './components/SearchHistory'
import {SearchLanguageDropdown} from './components/SearchLanguageDropdown'
import {Explore} from './Explore'
import {SearchResults} from './SearchResults'

type TabParam = SearchParams['tab']

// Map tab parameter to tab index
function getTabIndex(tabParam?: TabParam) {
  switch (tabParam) {
    case 'feed':
      return 3 // Feeds tab
    case 'user':
    case 'profile':
      return 2 // People tab
    case 'latest':
      return 1 // Latest tab
    default:
      return 0 // Top tab
  }
}

export function SearchScreenShell({
  queryParam,
  testID,
  fixedParams,
  navButton = 'menu',
  inputPlaceholder,
  isExplore,
}: {
  queryParam: string
  testID: string
  fixedParams?: SearchFilters
  navButton?: 'back' | 'menu'
  inputPlaceholder?: string
  isExplore?: boolean
}) {
  const ax = useAnalytics()
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute()
  const textInput = useRef<TextInput>(null)
  const {t: l} = useLingui()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()

  // Get tab parameter from route params
  const routeParams = useMemo<SearchParams>(() => {
    return {...(route.params ?? {})}
  }, [route.params])
  const tabParam = routeParams.tab
  const [activeTab, setActiveTab] = useState(() => getTabIndex(tabParam))

  // Structured filters come from the route params, merged with any fixed filters
  // (e.g. the author filter in ProfileSearch).
  const routeFilters = useMemo(
    () => readSearchFilters(routeParams),
    [routeParams],
  )
  const filters = useMemo<SearchFilters>(() => {
    return {...routeFilters, ...fixedParams}
  }, [routeFilters, fixedParams])
  const filterCount = useMemo(() => countActiveFilters(filters), [filters])

  // Query terms
  const [searchText, setSearchText] = useState<string>(queryParam)
  const searchTextRef = useRef(searchText)
  const updateSearchText = useCallback((text: string) => {
    searchTextRef.current = text
    setSearchText(text)
  }, [])
  const {data: autocompleteData, isFetching: isAutocompleteFetching} =
    useActorAutocompleteQuery(searchText, true)

  const [showAutocomplete, setShowAutocomplete] = useState(false)

  const [termHistory = [], setTermHistory] = useStorage(account, [
    currentAccount?.did ?? 'pwi',
    'searchTermHistory',
  ] as const)
  const [accountHistory = [], setAccountHistory] = useStorage(account, [
    currentAccount?.did ?? 'pwi',
    'searchAccountHistory',
  ])

  const {data: accountHistoryProfiles} = useProfilesQuery({
    handles: accountHistory,
    maintainData: true,
  })

  const updateSearchHistory = useCallback(
    (q: string, appliedFilters: SearchFilters) => {
      if (!q && !hasActiveFilters(appliedFilters)) return
      const entry = serializeHistoryEntry(q, appliedFilters)
      const newSearchHistory = [
        entry,
        ...termHistory.filter(search => search !== entry),
      ].slice(0, 6)
      setTermHistory(newSearchHistory)
    },
    [termHistory, setTermHistory],
  )

  const updateProfileHistory = useCallback(
    (item: bsky.profile.AnyProfileView) => {
      const newAccountHistory = [
        item.did,
        ...accountHistory.filter(p => p !== item.did),
      ].slice(0, 10)
      setAccountHistory(newAccountHistory)
    },
    [accountHistory, setAccountHistory],
  )

  const deleteSearchHistoryItem = useCallback(
    (item: string) => {
      setTermHistory(termHistory.filter(search => search !== item))
    },
    [termHistory, setTermHistory],
  )
  const deleteProfileHistoryItem = useCallback(
    (item: bsky.profile.AnyProfileView) => {
      setAccountHistory(accountHistory.filter(p => p !== item.did))
    },
    [accountHistory, setAccountHistory],
  )

  const query = searchText
  // The legacy v1 path still expects a single query string with embedded
  // operators. Build it from the raw text plus legacy filter operators.
  const queryWithParams = useMemo(() => {
    return makeSearchQuery(query, filtersToLegacyParams(filters))
  }, [query, filters])
  const hasQuery = Boolean(query || hasActiveFilters(filters))
  const showFilters = hasQuery && !showAutocomplete

  // web only - measure header height for sticky positioning
  const [headerHeight, setHeaderHeight] = useState(0)
  const headerRef = useRef(null)
  useLayoutEffect(() => {
    if (IS_WEB) {
      if (!headerRef.current) return
      const measurement = (headerRef.current as Element).getBoundingClientRect()
      setHeaderHeight(measurement.height)
    }
  }, [])

  useFocusEffect(
    useNonReactiveCallback(() => {
      if (IS_WEB) {
        updateSearchText(queryParam)
      }
    }),
  )

  const applyParams = useCallback(
    (q: string, nextFilters: SearchFilters, tab?: TabParam) => {
      if (IS_WEB) {
        const base = withoutFilterParams(routeParams)
        delete base.q
        delete base.tab
        const params = {
          ...base,
          ...(q ? {q} : {}),
          ...definedFilterParams(nextFilters),
          ...(tab ? {tab} : {}),
        }
        // @ts-expect-error route params are dynamic
        navigation.push(route.name, params)
      } else {
        navigation.setParams({
          q,
          tab,
          ...filtersToRouteParams(nextFilters),
        })
      }
    },
    [navigation, route.name, routeParams],
  )

  const onPressClearQuery = useCallback(() => {
    scrollToTopWeb()
    updateSearchText('')
    textInput.current?.focus()
  }, [updateSearchText])

  const onChangeText = useCallback(
    (text: string) => {
      scrollToTopWeb()
      updateSearchText(text)
    },
    [updateSearchText],
  )

  const navigateToItem = useCallback(
    (item: string) => {
      scrollToTopWeb()
      setShowAutocomplete(false)
      const entry = parseHistoryEntry(item)
      updateSearchText(entry.q)
      updateSearchHistory(entry.q, entry.filters)
      applyParams(entry.q, entry.filters)
    },
    [applyParams, updateSearchHistory, updateSearchText],
  )

  const onPressCancelSearch = useCallback(() => {
    scrollToTopWeb()
    textInput.current?.blur()
    setShowAutocomplete(false)
    if (IS_WEB) {
      const base = withoutFilterParams(routeParams)
      delete base.q
      delete base.tab
      // @ts-expect-error route params are dynamic
      navigation.replace(route.name, base)
    } else {
      updateSearchText('')
      navigation.setParams({q: '', tab: undefined, ...filtersToRouteParams({})})
    }
  }, [setShowAutocomplete, updateSearchText, navigation, route.name, routeParams])

  const onSubmit = (source: 'typed' | 'autocomplete') => () => {
    ax.metric('search:query', {
      source,
      filterCount,
      paraFilterCount: countActiveParaFilters(filters),
      paraFilters: getActiveParaFilterNames(filters),
    })
    scrollToTopWeb()
    setShowAutocomplete(false)
    updateSearchHistory(searchText, filters)
    applyParams(searchText, filters)
  }

  const onAutocompleteResultPress = useCallback(() => {
    if (IS_WEB) {
      setShowAutocomplete(false)
    } else {
      textInput.current?.blur()
    }
  }, [])

  const handleHistoryItemClick = useCallback(
    (item: string) => {
      navigateToItem(item)
    },
    [navigateToItem],
  )

  const handleProfileClick = useCallback(
    (profile: bsky.profile.AnyProfileView) => {
      unstableCacheProfileView(queryClient, profile)
      // Slight delay to avoid updating during push nav animation.
      setTimeout(() => {
        updateProfileHistory(profile)
      }, 400)
    },
    [updateProfileHistory, queryClient],
  )

  const onSoftReset = useCallback(() => {
    if (IS_WEB) {
      const base = withoutFilterParams(routeParams)
      delete base.q
      delete base.tab
      // @ts-expect-error route is not typesafe
      navigation.replace(route.name, base)
    } else {
      updateSearchText('')
      navigation.setParams({q: '', tab: undefined, ...filtersToRouteParams({})})
      textInput.current?.focus()
    }
  }, [navigation, route.name, routeParams, updateSearchText])

  useFocusEffect(
    useCallback(() => {
      return listenSoftReset(onSoftReset)
    }, [onSoftReset]),
  )

  const onSearchInputFocus = useCallback(() => {
    if (IS_WEB) {
      // Prevent a jump on iPad by ensuring that
      // the initial focused render has no result list.
      requestAnimationFrame(() => {
        setShowAutocomplete(true)
      })
    } else {
      setShowAutocomplete(true)
    }
  }, [setShowAutocomplete])

  const focusSearchInput = useCallback(
    (tab?: TabParam) => {
      textInput.current?.focus()

      // If a tab is specified, set the tab parameter
      if (tab) {
        if (IS_WEB) {
          navigation.setParams({...route.params, tab})
        } else {
          navigation.setParams({tab})
        }
      }
    },
    [navigation, route],
  )

  const onChangeFilters = useCallback(
    (nextFilters: SearchFilters) => {
      const merged = {...filters, ...nextFilters}
      const nextFilterCount = countActiveFilters(merged)
      if (nextFilterCount > filterCount) {
        ax.metric('search:addFilter:press', {filterCount: nextFilterCount})
      }
      applyParams(searchText, merged)
    },
    [applyParams, ax, filterCount, filters, searchText],
  )

  const onShareLink = useCallback(() => {
    ax.metric('search:shareLink:press', {
      filterCount,
      paraFilterCount: countActiveParaFilters(filters),
      paraFilters: getActiveParaFilterNames(filters),
    })
    if (IS_WEB) {
      void shareUrl(window.location.href)
    }
  }, [ax, filterCount, filters])

  const showHeader = !gtMobile || navButton !== 'menu'

  const filterBar = (
    <View style={[a.flex_row, a.align_center, a.gap_sm, a.flex_wrap]}>
      <SearchLanguageDropdown
        value={filters.lang ?? ''}
        onChange={value => onChangeFilters({lang: value || undefined})}
      />
      <AdvancedSearchDialog
        q={searchText}
        filters={filters}
        onSubmit={(q, nextFilters) => {
          const nextFilterCount = countActiveFilters(nextFilters)
          const nextParaFilterCount = countActiveParaFilters(nextFilters)
          ax.metric('search:advanced:press', {
            filterCount: nextFilterCount,
            paraFilterCount: nextParaFilterCount,
            paraFilters: getActiveParaFilterNames(nextFilters),
          })
          if (nextFilterCount > filterCount) {
            ax.metric('search:addFilter:press', {filterCount: nextFilterCount})
          }
          updateSearchText(q)
          updateSearchHistory(q, nextFilters)
          applyParams(q, nextFilters)
        }}
      />
      {IS_WEB && (
        <Button
          label={l`Share search link`}
          size="small"
          color="secondary"
          variant="solid"
          shape="round"
          onPress={onShareLink}>
          <ButtonIcon icon={ShareIcon} />
        </Button>
      )}
    </View>
  )

  return (
    <Layout.Screen testID={testID}>
      <View
        ref={headerRef}
        onLayout={evt => {
          if (IS_WEB) setHeaderHeight(evt.nativeEvent.layout.height)
        }}
        style={[
          a.relative,
          a.z_10,
          web({
            position: 'sticky',
            top: 0,
          }),
        ]}>
        <Layout.Center style={t.atoms.bg}>
          {showHeader && (
            <View
              // HACK: shift up search input. we can't remove the top padding
              // on the search input because it messes up the layout animation
              // if we add it only when the header is hidden
              style={{marginBottom: tokens.space.xs * -1}}>
              <Layout.Header.Outer noBottomBorder>
                {navButton === 'menu' ? (
                  <Layout.Header.MenuButton />
                ) : (
                  <Layout.Header.BackButton />
                )}
                <Layout.Header.Content align="left">
                  <Layout.Header.TitleText>
                    {isExplore ? <Trans>Explore</Trans> : <Trans>Search</Trans>}
                  </Layout.Header.TitleText>
                </Layout.Header.Content>
                {showFilters ? (
                  <Layout.Header.Slot>{filterBar}</Layout.Header.Slot>
                ) : (
                  <Layout.Header.Slot />
                )}
              </Layout.Header.Outer>
            </View>
          )}
          <View style={[a.px_lg, a.pt_sm, a.pb_sm, a.overflow_hidden]}>
            <View style={[a.gap_sm]}>
              <View style={[a.w_full, a.flex_row, a.align_stretch, a.gap_xs]}>
                <View style={[a.flex_1]}>
                  <SearchInput
                    ref={textInput}
                    value={searchText}
                    onFocus={onSearchInputFocus}
                    onChangeText={onChangeText}
                    onClearText={onPressClearQuery}
                    onSubmitEditing={onSubmit('typed')}
                    placeholder={
                      inputPlaceholder ?? l`Search for posts, users, or feeds`
                    }
                    hitSlop={{...HITSLOP_20, top: 0}}
                    hotkey={true}
                  />
                </View>
                {showAutocomplete && (
                  <Button
                    label={l`Cancel search`}
                    size="large"
                    variant="ghost"
                    color="secondary"
                    shape="rectangular"
                    style={[a.px_sm]}
                    onPress={onPressCancelSearch}
                    hitSlop={HITSLOP_10}>
                    <ButtonText>
                      <Trans>Cancel</Trans>
                    </ButtonText>
                  </Button>
                )}
              </View>

              {showFilters && !showHeader && filterBar}
            </View>
          </View>
        </Layout.Center>
      </View>

      <View
        style={{
          display: showAutocomplete && !fixedParams ? 'flex' : 'none',
          flex: 1,
        }}>
        {searchText.length > 0 ? (
          <AutocompleteResults
            isAutocompleteFetching={isAutocompleteFetching}
            autocompleteData={autocompleteData}
            searchText={searchText}
            onSubmit={onSubmit('autocomplete')}
            onResultPress={onAutocompleteResultPress}
            onProfileClick={handleProfileClick}
          />
        ) : (
          <SearchHistory
            searchHistory={termHistory}
            selectedProfiles={
              accountHistoryProfiles?.profiles.filter(p =>
                accountHistory.includes(p.did),
              ) ?? []
            }
            onItemClick={handleHistoryItemClick}
            onProfileClick={handleProfileClick}
            onRemoveItemClick={deleteSearchHistoryItem}
            onRemoveProfileClick={deleteProfileHistoryItem}
          />
        )}
      </View>
      <View
        style={{
          display: showAutocomplete ? 'none' : 'flex',
          flex: 1,
        }}>
        <SearchScreenInner
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          query={query}
          queryWithParams={queryWithParams}
          filters={filters}
          hasFilters={filterCount > 0}
          headerHeight={headerHeight}
          focusSearchInput={focusSearchInput}
          onChangeFilters={onChangeFilters}
        />
      </View>
    </Layout.Screen>
  )
}

let SearchScreenInner = ({
  activeTab,
  setActiveTab,
  query,
  queryWithParams,
  filters,
  hasFilters,
  headerHeight,
  focusSearchInput,
  onChangeFilters,
}: {
  activeTab: number
  setActiveTab: React.Dispatch<React.SetStateAction<number>>
  query: string
  queryWithParams: string
  filters: SearchFilters
  hasFilters: boolean
  headerHeight: number
  focusSearchInput: (tab?: TabParam) => void
  onChangeFilters: (filters: SearchFilters) => void
}): React.ReactNode => {
  const t = useTheme()
  const {hasSession} = useSession()
  const {gtTablet} = useBreakpoints()

  const onPageSelected = (index: number) => {
    setActiveTab(index)
  }

  return queryWithParams ? (
    <SearchResults
      query={query}
      queryWithParams={queryWithParams}
      filters={filters}
      hasFilters={hasFilters}
      activeTab={activeTab}
      headerHeight={headerHeight}
      onPageSelected={onPageSelected}
      onChangeFilters={onChangeFilters}
      initialPage={activeTab}
    />
  ) : hasSession ? (
    <Explore focusSearchInput={focusSearchInput} headerHeight={headerHeight} />
  ) : (
    <Layout.Center>
      <View style={a.flex_1}>
        {gtTablet && (
          <View
            style={[
              a.border_b,
              t.atoms.border_contrast_low,
              a.px_lg,
              a.pt_sm,
              a.pb_lg,
            ]}>
            <Text style={[a.text_2xl, a.font_bold]}>
              <Trans>Search</Trans>
            </Text>
          </View>
        )}

        <View style={[a.align_center, a.justify_center, a.py_4xl, a.gap_lg]}>
          <MagnifyingGlassIcon
            strokeWidth={3}
            size={60}
            style={t.atoms.text_contrast_medium as StyleProp<ViewStyle>}
          />
          <Text style={[t.atoms.text_contrast_medium, a.text_md]}>
            <Trans>Find posts, users, and feeds on Bluesky</Trans>
          </Text>
        </View>
      </View>
    </Layout.Center>
  )
}
SearchScreenInner = memo(SearchScreenInner)

function scrollToTopWeb() {
  if (IS_WEB) {
    window.scrollTo(0, 0)
  }
}
