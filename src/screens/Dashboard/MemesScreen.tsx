import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  Animated,
  PanResponder,
  Pressable,
  type TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import Reanimated from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {AtUri} from '@atproto/syntax'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useIsFocused, useNavigation} from '@react-navigation/native'

import {HITSLOP_10} from '#/lib/constants'
import {useMinimalShellFabTransform} from '#/lib/hooks/useMinimalShellTransform'
import {clamp} from '#/lib/numbers'
import {type NavigationProp} from '#/lib/routes/types'
import {useMemesFeedQuery} from '#/state/queries/para-memes'
import {useCompassFilter} from '#/state/shell/compass-filter'
import {useMinimalShellMode} from '#/state/shell/minimal-mode'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useBreakpoints, useTheme, web} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import {SearchInput} from '#/components/forms/SearchInput'
import {ArrowLeft_Stroke2_Corner0_Rounded as ArrowLeftIcon} from '#/components/icons/Arrow'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/MagnifyingGlass'
import {SquareBehindSquare4_Stroke2_Corner0_Rounded as DeckIcon} from '#/components/icons/SquareBehindSquare4'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {IS_WEB} from '#/env'
import {DeckCommandCenter} from './MemesScreen/cardPrimitives'
import {ExpandedMediaCardModal} from './MemesScreen/ExpandedMediaCardModal/ExpandedMediaCardModal'
import {
  DECK_GUTTER,
  DECK_INACTIVE_DIM,
  DECK_SECONDARY_TOP,
  DECK_STAGGER,
  DECK_VELOCITY_SCALE,
  matchesCompassFilter,
  matchesSearch,
} from './MemesScreen/helpers'
import {MediaBoardCard} from './MemesScreen/MediaBoardCard/MediaBoardCard'
import {MediaDeckCard} from './MemesScreen/MediaDeckCard/MediaDeckCard'
import {MemeSearchAutocomplete} from './MemesScreen/MemeSearchAutocomplete/MemeSearchAutocomplete'
import {styles} from './MemesScreen/styles'
import {
  type MediaItem,
  type Mode,
  type ViewStyleMode,
} from './MemesScreen/types'

export function MemesScreen({
  route,
}: {
  route: {params?: {view?: ViewStyleMode}}
}) {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {width} = useWindowDimensions()
  const {activeFilters} = useCompassFilter()

  const activeMode: Mode = 'Memes'
  const [viewStyle, setViewStyle] = useState<ViewStyleMode>(
    route.params?.view === 'deck' ? 'deck' : 'board',
  )
  const isFocused = useIsFocused()
  const {footerMode} = useMinimalShellMode()
  const fabMinimalShellTransform = useMinimalShellFabTransform()
  const insets = useSafeAreaInsets()
  const {gtMobile} = useBreakpoints()
  const [query, setQuery] = useState('')
  const [focusedItemId, setFocusedItemId] = useState<string | undefined>()
  const [expandedItem, setExpandedItem] = useState<MediaItem | null>(null)
  // Search follows the Explore screen: the FAB opens it, the bar takes over
  // the header, and while it is focused an autocomplete panel replaces the
  // memes. Submitting applies `query`; the back arrow cancels the search.
  const searchInputRef = useRef<React.ComponentRef<typeof TextInput>>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const isSearchOpen = isSearching || Boolean(query)

  const openSearch = useCallback(() => {
    setIsSearching(true)
    setShowAutocomplete(true)
    searchInputRef.current?.focus()
  }, [])

  const cancelSearch = useCallback(() => {
    searchInputRef.current?.blur()
    setShowAutocomplete(false)
    setIsSearching(false)
    setSearchText('')
    setQuery('')
  }, [])

  const applySearch = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) {
        cancelSearch()
        return
      }
      searchInputRef.current?.blur()
      setSearchText(trimmed)
      setQuery(trimmed)
      setShowAutocomplete(false)
    },
    [cancelSearch],
  )

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMemesFeedQuery()

  const memes = useMemo(
    () => data?.pages.flatMap(page => page.items) ?? [],
    [data],
  )

  const filteredMemes = useMemo(() => {
    return memes.filter(item => {
      return (
        matchesCompassFilter(item, activeFilters) &&
        matchesSearch(
          [
            item.title,
            item.author,
            item.category,
            item.community,
            item.party,
            item.state,
          ],
          query,
        )
      )
    })
  }, [activeFilters, memes, query])

  const activeItems = filteredMemes
  // Two columns on wide native screens. On web the board lives in the 600px
  // center column, so cards take its full width.
  const boardWidth = !IS_WEB && width > 900 ? (width - 44) / 2 : undefined

  // Same behavior as the header back button this replaces.
  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate('Home' as never)
    }
  }, [navigation])

  const setNextView = (next: ViewStyleMode) => {
    setViewStyle(next)
    navigation.setParams({view: next})
  }

  const handleOpenComments = useCallback(
    (item: MediaItem) => {
      if (!item.post) {
        Toast.show(_(msg`Comments are not available for this item`), {
          type: 'info',
        })
        return
      }
      const postUri = new AtUri(item.post.uri)
      // Memes are com.para.post records; without the collection the thread
      // screen looks up app.bsky.feed.post and reports "post not found".
      navigation.navigate('PostThread', {
        name: item.post.author.did,
        rkey: postUri.rkey,
        collection: postUri.collection,
      })
    },
    [navigation, _],
  )

  useEffect(() => {
    if (!isFocused) {
      footerMode.set(0)
      return
    }
    const hideFooter = viewStyle === 'deck'
    footerMode.set(hideFooter ? 1 : 0)
    return () => {
      footerMode.set(0)
    }
  }, [isFocused, viewStyle, footerMode])

  const floatingButtons = (
    <>
      <Pressable
        accessibilityHint={_(msg`Returns to the previous screen`)}
        accessibilityLabel={_(msg`Go back`)}
        accessibilityRole="button"
        hitSlop={HITSLOP_10}
        onPress={onPressBack}
        style={styles.floatingButton}>
        <ArrowLeftIcon size="md" style={styles.floatingButtonIcon} />
      </Pressable>
      <Pressable
        accessibilityHint={_(msg`Change the card presentation`)}
        accessibilityLabel={_(msg`Switch between board and deck view`)}
        accessibilityRole="button"
        hitSlop={HITSLOP_10}
        onPress={() => setNextView(viewStyle === 'board' ? 'deck' : 'board')}
        style={[
          styles.floatingButton,
          viewStyle === 'deck' && styles.floatingButtonActive,
        ]}>
        <DeckIcon size="md" style={styles.floatingButtonIcon} />
      </Pressable>
    </>
  )
  const floatingChrome = isSearchOpen ? null : (
    <View pointerEvents="box-none" style={styles.floatingChrome}>
      {floatingButtons}
    </View>
  )
  // Positioned like bsky's FAB on phones: clear of the home indicator, and
  // lifted above the bottom bar whenever the bar is showing.
  const searchFab = showAutocomplete ? null : (
    <Reanimated.View
      style={[
        styles.fabPosition,
        !gtMobile && [
          {bottom: clamp(insets.bottom, 15, 60) + 15},
          fabMinimalShellTransform,
        ],
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={_(msg`Search memes`)}
        accessibilityHint={_(msg`Opens the meme search`)}
        onPress={openSearch}
        style={[styles.fab, t.atoms.bg, {borderColor: t.palette.contrast_200}]}>
        <SearchIcon size="lg" style={t.atoms.text} />
      </Pressable>
    </Reanimated.View>
  )
  // On native the buttons float over the screen. The web page scrolls with the
  // window (and `sticky` would bind to the non-scrolling ScrollView), so there
  // they are `fixed` to the viewport, wrapped in a Layout.Center that applies
  // the center column's width and offsets so they never leave the column.
  const webFixedChrome = IS_WEB ? (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.webFixedRow, web({position: 'fixed', top: 0})]}>
        <Layout.Center pointerEvents="box-none">{floatingChrome}</Layout.Center>
      </View>
      <View
        pointerEvents="box-none"
        style={[styles.webFixedRow, web({position: 'fixed', bottom: 0})]}>
        <Layout.Center pointerEvents="box-none">{searchFab}</Layout.Center>
      </View>
    </>
  ) : null

  return (
    <Layout.Screen testID="memesScreen">
      {/* The header only exists while searching; otherwise the back arrow and
          view toggle float over the cards so they can use the full height. */}
      {isSearchOpen ? (
        <View style={[styles.topChrome, t.atoms.bg, web([a.sticky, {top: 0}])]}>
          <Layout.Header.Outer noBottomBorder>
            {/* Not Layout.Header.BackButton: on native it navigates even when
                the press event is default-prevented, so it would leave the
                screen instead of cancelling the search. */}
            <Layout.Header.Slot>
              <Button
                color="secondary"
                hitSlop={HITSLOP_10}
                label={_(msg`Cancel search`)}
                onPress={cancelSearch}
                shape="round"
                size="small"
                variant="ghost">
                <ButtonIcon icon={ArrowLeftIcon} size="lg" />
              </Button>
            </Layout.Header.Slot>
            <View style={styles.headerSearchContent}>
              <SearchInput
                ref={searchInputRef}
                autoFocus={!query}
                onChangeText={setSearchText}
                onClearText={() => {
                  setSearchText('')
                  setQuery('')
                  searchInputRef.current?.focus()
                }}
                onFocus={() => setShowAutocomplete(true)}
                onSubmitEditing={() => applySearch(searchText)}
                placeholder={_(msg`Search memes, authors, or communities`)}
                returnKeyType="search"
                value={searchText}
              />
            </View>
          </Layout.Header.Outer>
        </View>
      ) : null}

      <View style={styles.contentShell}>
        {viewStyle === 'board' ? (
          <Layout.Content
            bounces
            contentContainerStyle={[
              styles.contentContainer,
              // Start the first card below the floating buttons so they don't
              // cover its party shield; they still float over it on scroll.
              !isSearchOpen && styles.contentContainerUnderChrome,
            ]}
            showsVerticalScrollIndicator>
            <View style={IS_WEB ? styles.webColumnPadding : undefined}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Loader size="xl" />
                </View>
              ) : error ? (
                <EmptyState
                  description={_(msg`Could not load memes.`)}
                  title={_(msg`Something went wrong`)}
                />
              ) : activeItems.length === 0 ? (
                <EmptyState
                  description={_(
                    msg`Open more communities or clear search to fill this view.`,
                  )}
                  title={_(msg`No memes match those filters`)}
                />
              ) : (
                <>
                  <View style={styles.boardGrid}>
                    {activeItems.map(item => (
                      <MediaBoardCard
                        key={item.id}
                        item={item}
                        mode={activeMode}
                        onExpand={() => setExpandedItem(item)}
                        width={boardWidth}
                      />
                    ))}
                  </View>
                  {hasNextPage && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={_(msg`Load more memes`)}
                      accessibilityHint={_(msg`Loads more memes`)}
                      onPress={() => fetchNextPage()}
                      style={[styles.loadMoreButton, t.atoms.bg_contrast_25]}
                      disabled={isFetchingNextPage}>
                      <Text style={t.atoms.text}>
                        {isFetchingNextPage
                          ? _(msg`Loading...`)
                          : _(msg`Load more`)}
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </Layout.Content>
        ) : (
          <Layout.Center style={styles.deckContentShell}>
            {activeItems.length === 0 ? (
              <View style={styles.contentContainer}>
                <EmptyState
                  description={_(
                    msg`Open more communities or clear search to fill this view.`,
                  )}
                  title={_(msg`No memes match those filters`)}
                />
              </View>
            ) : (
              <DeckChain
                anchorId={focusedItemId}
                items={activeItems}
                mode={activeMode}
                onExpandItem={setExpandedItem}
                onFocusChange={setFocusedItemId}
                onOpenComments={handleOpenComments}
              />
            )}
          </Layout.Center>
        )}

        {IS_WEB ? null : floatingChrome}

        {showAutocomplete ? (
          <MemeSearchAutocomplete
            memes={memes}
            onSelectMeme={item => {
              searchInputRef.current?.blur()
              setExpandedItem(item)
            }}
            onSelectTerm={applySearch}
            onSubmit={() => applySearch(searchText)}
            searchText={searchText}
          />
        ) : null}
      </View>

      <ExpandedMediaCardModal
        item={expandedItem}
        mode={activeMode}
        onClose={() => setExpandedItem(null)}
        onOpenComments={
          expandedItem ? () => handleOpenComments(expandedItem) : undefined
        }
      />

      {IS_WEB ? webFixedChrome : searchFab}
    </Layout.Screen>
  )
}

/**
 * Horizontal stagger between the current and next card. The shared band spans
 * the width both cards overlap, so on narrow phones the stagger shrinks until
 * the band is wide enough for its votes and comments; elsewhere it stays at
 * DECK_STAGGER. Web needs more room because its vote button reserves a fixed
 * width for the score.
 */
function getDeckStagger(stageWidth: number) {
  if (!stageWidth) return DECK_STAGGER
  const minBandWidth = IS_WEB ? 252 : 236
  const fitting = (stageWidth - 2 * DECK_GUTTER - minBandWidth) / 2
  return Math.round(Math.max(40, Math.min(DECK_STAGGER, fitting)))
}

function DeckChain({
  items,
  mode,
  anchorId,
  onFocusChange,
  onExpandItem,
  onOpenComments,
}: {
  items: MediaItem[]
  mode: Mode
  anchorId?: string
  onFocusChange: (id?: string) => void
  onExpandItem: (item: MediaItem) => void
  onOpenComments: (item: MediaItem) => void
}) {
  const t = useTheme()
  const [stageWidth, setStageWidth] = useState(0)
  const stagger = getDeckStagger(stageWidth)
  const {_} = useLingui()
  const animation = useMemo(() => new Animated.Value(0), [])
  const [startIndex, setStartIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const isAnimatingRef = useRef(isAnimating)
  useEffect(() => {
    isAnimatingRef.current = isAnimating
  }, [isAnimating])
  const [boundaryNotice, setBoundaryNotice] = useState<string | null>(null)
  const [topLayer, setTopLayer] = useState<'current' | 'next'>('current')
  const progressRef = useRef(0)
  const boundaryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const id = animation.addListener(({value}) => {
      progressRef.current = value
    })
    return () => animation.removeListener(id)
  }, [animation])

  useEffect(() => {
    return () => {
      if (boundaryTimeoutRef.current) {
        clearTimeout(boundaryTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const index = anchorId
      ? Math.max(
          0,
          items.findIndex(item => item.id === anchorId),
        )
      : 0
    setStartIndex(index)
    animation.setValue(0)
  }, [anchorId, animation, items])

  const prev = items[startIndex - 1]
  const current = items[startIndex]
  const next = items[startIndex + 1]
  const third = items[startIndex + 2]

  const springTo = useCallback(
    (toValue: number, velocity = 0, onComplete?: () => void) => {
      animation.stopAnimation()
      Animated.spring(animation, {
        damping: 24,
        mass: 0.9,
        overshootClamping: true,
        restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.001,
        stiffness: 220,
        toValue,
        useNativeDriver: true,
        velocity,
      }).start(({finished}) => {
        if (finished) {
          onComplete?.()
        }
      })
    },
    [animation],
  )

  const advance = useCallback(
    (releaseVelocity = 0) => {
      if (!next || isAnimatingRef.current) return
      setIsAnimating(true)
      springTo(1, releaseVelocity, () => {
        setStartIndex(prevIndex =>
          Math.min(prevIndex + 1, Math.max(items.length - 1, 0)),
        )
        onFocusChange(next.id)
        animation.setValue(0)
        setIsAnimating(false)
        setTopLayer('current')
      })
    },
    [animation, items.length, next, onFocusChange, springTo],
  )

  const retreat = useCallback(
    (releaseVelocity = 0) => {
      if (!prev || isAnimatingRef.current) return
      setIsAnimating(true)
      springTo(-1, releaseVelocity, () => {
        setStartIndex(prevIndex => Math.max(prevIndex - 1, 0))
        onFocusChange(prev.id)
        animation.setValue(0)
        setIsAnimating(false)
        setTopLayer('current')
      })
    },
    [animation, onFocusChange, prev, springTo],
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        advance()
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        retreat()
      }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [advance, retreat])

  const resetPosition = useCallback(
    (releaseVelocity = 0) => {
      springTo(0, releaseVelocity)
    },
    [springTo],
  )

  const showBoundaryMessage = useCallback((message: string) => {
    if (boundaryTimeoutRef.current) {
      clearTimeout(boundaryTimeoutRef.current)
    }
    setBoundaryNotice(message)
    boundaryTimeoutRef.current = setTimeout(() => {
      setBoundaryNotice(null)
      boundaryTimeoutRef.current = null
    }, 1200)
  }, [])

  const lastCardMessage = _(msg`You have reached the last card`)

  // Below this the gesture is still a tap. A smaller slop let slight finger
  // movement on a vote button start a swipe and swallow the press.
  const DECK_SWIPE_SLOP = 12

  const panResponder = useMemo(
    () =>
      // PanResponder invokes these callbacks after render during gestures.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          return (
            !isAnimatingRef.current &&
            (Boolean(next) || Boolean(prev)) &&
            Math.abs(gestureState.dy) > DECK_SWIPE_SLOP &&
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
          )
        },
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            !isAnimatingRef.current &&
            (Boolean(next) || Boolean(prev)) &&
            Math.abs(gestureState.dy) > DECK_SWIPE_SLOP &&
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
          )
        },
        onPanResponderMove: (_, gestureState) => {
          const progress =
            gestureState.dy < 0 && next
              ? Math.max(0, Math.min(1, -gestureState.dy / DECK_SECONDARY_TOP))
              : gestureState.dy > 0 && prev
                ? -Math.max(
                    0,
                    Math.min(1, gestureState.dy / (DECK_SECONDARY_TOP * 0.55)),
                  )
                : 0
          animation.setValue(progress)
        },
        onPanResponderRelease: (_, gestureState) => {
          const normalizedVelocity = -gestureState.vy * DECK_VELOCITY_SCALE

          if (progressRef.current > 0.18 || gestureState.vy < -0.45) {
            advance(normalizedVelocity)
          } else if (progressRef.current < -0.08 || gestureState.vy > 0.18) {
            retreat(normalizedVelocity)
          } else if (
            (gestureState.dy < -24 || gestureState.vy < -0.3) &&
            !next
          ) {
            showBoundaryMessage(lastCardMessage)
            resetPosition(normalizedVelocity)
          } else {
            resetPosition(normalizedVelocity)
          }
        },
        onPanResponderTerminate: () => {
          resetPosition()
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [
      advance,
      animation,
      lastCardMessage,
      next,
      prev,
      resetPosition,
      retreat,
      showBoundaryMessage,
    ],
  )

  const activeSide = topLayer === 'next' && next ? 'next' : 'current'
  const activeItem = activeSide === 'next' && next ? next : current

  // Tapping an inactive card makes it the target of the shared command band;
  // tapping the active one opens it.
  const handleCardPress = useCallback(
    (side: 'current' | 'next') => {
      const item = side === 'next' ? next : current
      if (!item) return
      if (activeSide === side) {
        onExpandItem(item)
      } else {
        setTopLayer(side)
      }
    },
    [activeSide, current, next, onExpandItem],
  )

  if (!current) return null

  const clampedDim = (
    inputRange: number[],
    outputRange: number[],
  ): Animated.AnimatedInterpolation<number> =>
    animation.interpolate({inputRange, outputRange, extrapolate: 'clamp'})

  const prevStyle = {
    opacity: clampedDim([-1, -0.12, 0], [1, 0.68, 0]),
    transform: [{translateY: clampedDim([-1, 0], [0, -DECK_SECONDARY_TOP])}],
  }

  // Advancing lifts the current card away; retreating drops it exactly into
  // the next-card slot so the hand-off after the spring has no jump.
  const currentStyle = {
    opacity: clampedDim([-1, 0, 0.8, 1], [1, 1, 0.18, 0]),
    transform: [
      {translateX: clampedDim([-1, 0, 1], [stagger, 0, -12])},
      {translateY: clampedDim([-1, 0, 1], [DECK_SECONDARY_TOP, 0, -170])},
    ],
  }

  const nextStyle = {
    opacity: clampedDim([-1, -0.1, 0], [0.18, 0.58, 1]),
    transform: [
      {translateX: clampedDim([0, 1], [0, -stagger])},
      {
        translateY: clampedDim(
          [-1, 0, 1],
          [DECK_SECONDARY_TOP, 0, -DECK_SECONDARY_TOP],
        ),
      },
    ],
  }

  const thirdStyle = {
    opacity: clampedDim([0, 0.25, 1], [0, 0.15, 1]),
    transform: [{translateY: clampedDim([0, 1], [0, -DECK_SECONDARY_TOP])}],
  }

  const bandStyle = {
    opacity: clampedDim([-0.25, 0, 0.25], [0, 1, 0]),
  }

  const currentDim =
    activeSide === 'next'
      ? DECK_INACTIVE_DIM
      : clampedDim([-1, 0], [DECK_INACTIVE_DIM, 0])
  const nextDim =
    activeSide === 'next' ? 0 : clampedDim([0, 1], [DECK_INACTIVE_DIM, 0])
  const dimColor = t.atoms.bg.backgroundColor
  const innerBorder = {borderColor: t.palette.contrast_100}
  // The active card is raised above the other one where they overlap.
  const currentRaised = activeSide === 'current'
  const nextRaised = activeSide === 'next'

  return (
    <View
      {...panResponder.panHandlers}
      onLayout={e => setStageWidth(e.nativeEvent.layout.width)}
      style={styles.deckStage}>
      {boundaryNotice ? (
        <View style={styles.deckBoundaryNotice}>
          <Text style={styles.deckBoundaryNoticeText}>{boundaryNotice}</Text>
        </View>
      ) : null}

      {prev ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.deckSlot,
            styles.deckSlotPrev,
            {right: DECK_GUTTER + stagger},
            styles.deckSlotRaised,
            prevStyle,
          ]}>
          <View style={[styles.deckSlotInner, innerBorder]}>
            <MediaDeckCard item={prev} mode={mode} />
          </View>
        </Animated.View>
      ) : null}

      {third ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.deckSlot,
            styles.deckSlotThird,
            {left: DECK_GUTTER + stagger},
            thirdStyle,
          ]}>
          <View style={[styles.deckSlotInner, innerBorder]}>
            <MediaDeckCard item={third} mode={mode} />
            <View
              style={[
                styles.deckDim,
                {backgroundColor: dimColor, opacity: DECK_INACTIVE_DIM},
              ]}
            />
          </View>
        </Animated.View>
      ) : null}

      {next ? (
        <Animated.View
          style={[
            styles.deckSlot,
            styles.deckSlotNext,
            {left: DECK_GUTTER + stagger},
            {zIndex: nextRaised ? 4 : 2},
            nextRaised && styles.deckSlotRaised,
            nextStyle,
          ]}>
          <Pressable
            accessibilityHint={
              nextRaised
                ? _(msg`Opens this card in a larger view`)
                : _(msg`Brings this card to the front`)
            }
            accessibilityLabel={next.title}
            accessibilityRole="button"
            onPress={() => handleCardPress('next')}
            style={[styles.deckSlotInner, innerBorder]}>
            <MediaDeckCard item={next} mode={mode} />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.deckDim,
                {backgroundColor: dimColor, opacity: nextDim},
              ]}
            />
          </Pressable>
        </Animated.View>
      ) : (
        <View
          style={[
            styles.deckEndCard,
            {left: DECK_GUTTER + stagger, borderColor: t.palette.contrast_200},
          ]}>
          <Text style={[styles.deckEndTitle, t.atoms.text]}>
            <Trans>That is everything for now</Trans>
          </Text>
          <Text style={[styles.deckEndBody, t.atoms.text_contrast_medium]}>
            <Trans>Swipe down to revisit earlier cards.</Trans>
          </Text>
        </View>
      )}

      <Animated.View
        style={[
          styles.deckSlot,
          styles.deckSlotCurrent,
          {right: DECK_GUTTER + stagger},
          {zIndex: currentRaised ? 3 : 1},
          currentRaised && styles.deckSlotRaised,
          currentStyle,
        ]}>
        <Pressable
          accessibilityHint={
            currentRaised
              ? _(msg`Opens this card in a larger view`)
              : _(msg`Brings this card to the front`)
          }
          accessibilityLabel={current.title}
          accessibilityRole="button"
          onPress={() => handleCardPress('current')}
          style={[styles.deckSlotInner, innerBorder]}>
          <MediaDeckCard item={current} mode={mode} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.deckDim,
              {backgroundColor: dimColor, opacity: currentDim},
            ]}
          />
        </Pressable>
      </Animated.View>

      <Animated.View
        pointerEvents={isAnimating ? 'none' : 'box-none'}
        style={[styles.deckBandLayer, bandStyle]}>
        <DeckCommandCenter
          inset={DECK_GUTTER + stagger}
          activeItem={activeItem}
          activeSide={activeSide}
          onOpenComments={() => onOpenComments(activeItem)}
          onPressCurrent={() => onExpandItem(current)}
          onPressNext={next ? () => onExpandItem(next) : undefined}
        />
      </Animated.View>
    </View>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const t = useTheme()

  return (
    <View
      style={[
        styles.emptyState,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
      ]}>
      <Text style={[styles.emptyTitle, t.atoms.text]}>{title}</Text>
      <Text style={[styles.emptyDescription, t.atoms.text_contrast_medium]}>
        {description}
      </Text>
    </View>
  )
}
