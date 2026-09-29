import {useEffect, useRef, useState} from 'react'
import {
  Animated,
  type LayoutChangeEvent,
  PanResponder,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {AtUri} from '@atproto/syntax'
import {Trans, useLingui} from '@lingui/react/macro'
import {useIsFocused, useNavigation} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'

import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {type NavigationProp} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {
  createMemesFeedQueryKey,
  useMemesFeedQuery,
} from '#/state/queries/para-memes'
import {truncateAndInvalidate} from '#/state/queries/util'
import {useSession} from '#/state/session'
import {useCompassFilter} from '#/state/shell/compass-filter'
import {useMinimalShellMode} from '#/state/shell/minimal-mode'
import {FAB} from '#/view/com/util/fab/FAB'
import {List} from '#/view/com/util/List'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {ActiveFiltersStackButton} from '#/components/CompassFilterControls'
import {SearchInput} from '#/components/forms/SearchInput'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/MagnifyingGlass'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {SquareBehindSquare4_Stroke2_Corner0_Rounded as DeckIcon} from '#/components/icons/SquareBehindSquare4'
import {TimesLarge_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'
import * as Layout from '#/components/Layout'
import {ListFooter} from '#/components/Lists'
import {Loader} from '#/components/Loader'
import {IS_WEB} from '#/env'
import {DeckCommandCenter} from './MemesScreen/cardPrimitives'
import {ExpandedMediaCardModal} from './MemesScreen/ExpandedMediaCardModal/ExpandedMediaCardModal'
import {
  DECK_CURRENT_X_DRIFT,
  DECK_MAX_WIDTH,
  DECK_OVERLAP,
  DECK_PREFETCH_THRESHOLD,
  DECK_STACK_INSET,
  DECK_STACK_X_DRIFT,
  DECK_VELOCITY_SCALE,
  matchesCompassFilter,
  matchesSearch,
} from './MemesScreen/helpers'
import {MediaBoardCard} from './MemesScreen/MediaBoardCard/MediaBoardCard'
import {MediaDeckCard} from './MemesScreen/MediaDeckCard/MediaDeckCard'
import {styles} from './MemesScreen/styles'
import {type MediaItem, type ViewStyleMode} from './MemesScreen/types'

export function MemesScreen({
  route,
}: {
  route: {params?: {view?: ViewStyleMode}}
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const queryClient = useQueryClient()
  const {currentAccount} = useSession()
  const {openComposer} = useOpenComposer()
  const {width} = useWindowDimensions()
  const {activeFilters} = useCompassFilter()
  const isFocused = useIsFocused()
  const {footerMode} = useMinimalShellMode()

  const [viewStyle, setViewStyle] = useState<ViewStyleMode>(
    route.params?.view === 'deck' ? 'deck' : 'board',
  )
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const isSearchOpen = showSearch || Boolean(query)
  const [focusedItemId, setFocusedItemId] = useState<string | undefined>()
  const [expandedItem, setExpandedItem] = useState<MediaItem | null>(null)
  const [isPTRing, setIsPTRing] = useState(false)

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMemesFeedQuery()

  const memes = data?.pages.flatMap(page => page.items) ?? []
  const filteredMemes = memes.filter(item => {
    return (
      matchesCompassFilter(item, activeFilters) &&
      matchesSearch(
        [item.title, item.author, item.community, item.party, item.state],
        query,
      )
    )
  })
  const isFiltered = Boolean(query.trim()) || activeFilters.length > 0

  // The web List is always constrained to the center column.
  const columns = !IS_WEB && width >= 700 ? 2 : 1
  const rows: MediaItem[][] = []
  for (let i = 0; i < filteredMemes.length; i += columns) {
    rows.push(filteredMemes.slice(i, i + columns))
  }

  const setNextView = (next: ViewStyleMode) => {
    setViewStyle(next)
    navigation.setParams({view: next})
  }

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage && !error) {
      void fetchNextPage()
    }
  }

  const onRefresh = async () => {
    setIsPTRing(true)
    try {
      await truncateAndInvalidate(
        queryClient,
        createMemesFeedQueryKey(currentAccount?.did),
      )
    } finally {
      setIsPTRing(false)
    }
  }

  const openComments = (item: MediaItem) => {
    if (!item.post) return
    const postUri = new AtUri(item.post.uri)
    navigation.navigate('PostThread', {
      name: item.post.author.did,
      rkey: postUri.rkey,
    })
  }

  const openCommentsFromModal = (item: MediaItem) => {
    // The modal must be gone before navigating, or it stays on top on native.
    setExpandedItem(null)
    requestAnimationFrame(() => openComments(item))
  }

  useEffect(() => {
    if (!isFocused) return
    footerMode.set(viewStyle === 'deck' ? 1 : 0)
    return () => {
      footerMode.set(0)
    }
  }, [isFocused, viewStyle, footerMode])

  const emptyContent = isLoading ? (
    <View style={styles.centeredState}>
      <Loader size="xl" />
    </View>
  ) : error && !memes.length ? (
    <EmptyState
      title={l`Could not load memes`}
      description={cleanError(error)}
      actionLabel={l`Try again`}
      onAction={() => void refetch()}
    />
  ) : isFiltered ? (
    <EmptyState
      title={l`No memes match those filters`}
      description={l`Try a different search or clear your compass filters.`}
    />
  ) : (
    <EmptyState
      title={l`No memes yet`}
      description={l`Be the first to share one with your community.`}
      actionLabel={l`Create a meme`}
      onAction={() => openComposer({logContext: 'Fab'})}
    />
  )

  return (
    <Layout.Screen testID="memesScreen">
      <View style={[styles.topChrome, t.atoms.bg]}>
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            {isSearchOpen ? (
              <View style={styles.headerSearchContent}>
                <SearchInput
                  value={query}
                  onChangeText={setQuery}
                  onClearText={() => setQuery('')}
                  placeholder={l`Search memes, authors, or communities`}
                />
              </View>
            ) : (
              <Layout.Header.TitleText>
                <Trans>Memes</Trans>
              </Layout.Header.TitleText>
            )}
          </Layout.Header.Content>

          <View style={styles.headerActions}>
            {isSearchOpen ? (
              <HeaderIconButton
                label={l`Close search`}
                hint={l`Clears the search and closes it`}
                onPress={() => {
                  setQuery('')
                  setShowSearch(false)
                }}>
                <CloseIcon size="md" style={t.atoms.text} />
              </HeaderIconButton>
            ) : (
              <>
                <HeaderIconButton
                  label={
                    viewStyle === 'deck'
                      ? l`Switch to board view`
                      : l`Switch to deck view`
                  }
                  hint={l`Changes the card presentation`}
                  active={viewStyle === 'deck'}
                  onPress={() =>
                    setNextView(viewStyle === 'board' ? 'deck' : 'board')
                  }>
                  <DeckIcon
                    size="md"
                    style={
                      viewStyle === 'deck'
                        ? {color: t.palette.white}
                        : t.atoms.text
                    }
                  />
                </HeaderIconButton>
                <HeaderIconButton
                  label={l`Search memes`}
                  hint={l`Opens the search field`}
                  onPress={() => setShowSearch(true)}>
                  <SearchIcon size="md" style={t.atoms.text} />
                </HeaderIconButton>
                <ActiveFiltersStackButton />
              </>
            )}
          </View>
        </Layout.Header.Outer>
      </View>

      <View style={styles.contentShell}>
        {viewStyle === 'board' ? (
          <List
            testID="memesBoard"
            data={rows}
            keyExtractor={boardRowKey}
            renderItem={({item: row}: {item: MediaItem[]}) => (
              <View style={styles.boardRow}>
                {row.map(item => (
                  <View key={item.id} style={styles.boardCell}>
                    <MediaBoardCard
                      item={item}
                      onExpand={() => setExpandedItem(item)}
                      onOpenComments={() => openComments(item)}
                    />
                  </View>
                ))}
                {row.length < columns ? (
                  <View style={styles.boardCell} />
                ) : null}
              </View>
            )}
            contentContainerStyle={styles.contentContainer}
            ListEmptyComponent={emptyContent}
            ListFooterComponent={
              rows.length ? (
                <ListFooter
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  error={cleanError(error)}
                  onRetry={fetchNextPage}
                  showEndMessage
                  endMessageText={l`You’ve seen every meme`}
                  style={a.border_0}
                />
              ) : undefined
            }
            onEndReached={loadMore}
            onEndReachedThreshold={2}
            refreshing={isPTRing}
            onRefresh={onRefresh}
            showsVerticalScrollIndicator
          />
        ) : (
          <Layout.Center style={a.flex_1}>
            {filteredMemes.length === 0 ? (
              <View style={styles.contentContainer}>{emptyContent}</View>
            ) : (
              <DeckChain
                anchorId={focusedItemId}
                isExpanded={Boolean(expandedItem)}
                items={filteredMemes}
                hasNextPage={Boolean(hasNextPage)}
                isFetchingNextPage={isFetchingNextPage}
                onNearEnd={loadMore}
                onExpandItem={setExpandedItem}
                onFocusChange={setFocusedItemId}
                onOpenComments={openComments}
              />
            )}
          </Layout.Center>
        )}
      </View>

      <ExpandedMediaCardModal
        item={expandedItem}
        onClose={() => setExpandedItem(null)}
        onOpenComments={openCommentsFromModal}
      />

      {viewStyle === 'board' ? (
        <FAB
          testID="memesComposeFAB"
          onPress={() => openComposer({logContext: 'Fab'})}
          icon={<PlusIcon size="lg" fill={t.palette.white} />}
          accessibilityRole="button"
          accessibilityLabel={l`Create meme`}
          accessibilityHint={l`Opens the composer`}
        />
      ) : null}
    </Layout.Screen>
  )
}

function boardRowKey(row: MediaItem[]) {
  return row.map(item => item.id).join('|')
}

function HeaderIconButton({
  label,
  hint,
  active = false,
  onPress,
  children,
}: {
  label: string
  hint: string
  active?: boolean
  onPress: () => void
  children: React.ReactNode
}) {
  const t = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{selected: active}}
      hitSlop={6}
      onPress={onPress}
      style={({pressed}) => [
        styles.headerIconButton,
        active
          ? {backgroundColor: t.palette.primary_500}
          : pressed && t.atoms.bg_contrast_25,
      ]}>
      {children}
    </Pressable>
  )
}

function DeckChain({
  items,
  anchorId,
  isExpanded,
  hasNextPage,
  isFetchingNextPage,
  onNearEnd,
  onFocusChange,
  onExpandItem,
  onOpenComments,
}: {
  items: MediaItem[]
  anchorId?: string
  isExpanded: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onNearEnd: () => void
  onFocusChange: (id?: string) => void
  onExpandItem: (item: MediaItem) => void
  onOpenComments: (item: MediaItem) => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const isFocused = useIsFocused()
  const [animation] = useState(() => new Animated.Value(0))
  const {bottom} = useSafeAreaInsets()
  const [stageSize, setStageSize] = useState({width: 0, height: 0})
  // Fit both cards into the viewport, including the home indicator.
  const cardHeight = Math.max(
    160,
    (stageSize.height - bottom - 24 + DECK_OVERLAP) / 2,
  )
  const secondaryTop = cardHeight - DECK_OVERLAP
  const secondaryTopRef = useRef(secondaryTop)
  useEffect(() => {
    secondaryTopRef.current = secondaryTop
  }, [secondaryTop])
  const [boundaryNotice, setBoundaryNotice] = useState<string | null>(null)
  const isAnimatingRef = useRef(false)
  const progressRef = useRef(0)
  const boundaryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /*
   * The position is derived from the focused item's id rather than stored as
   * an index, so new pages or filter changes never shift or reset the deck.
   */
  const anchorIndex = anchorId
    ? items.findIndex(item => item.id === anchorId)
    : 0
  const startIndex = anchorIndex < 0 ? 0 : anchorIndex

  const prev = items[startIndex - 1]
  const current = items[startIndex]
  const next = items[startIndex + 1]
  const third = items[startIndex + 2]

  const frameWidth = Math.min(Math.max(stageSize.width - 24, 0), DECK_MAX_WIDTH)
  const cardWidth = Math.max(frameWidth - DECK_STACK_INSET, 0)

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

  const remaining = items.length - 1 - startIndex
  useEffect(() => {
    if (remaining <= DECK_PREFETCH_THRESHOLD) {
      onNearEnd()
    }
  }, [remaining, onNearEnd])

  const springTo = (toValue: number, velocity = 0, onComplete?: () => void) => {
    animation.stopAnimation()
    Animated.spring(animation, {
      damping: 24,
      mass: 0.9,
      overshootClamping: true,
      restDisplacementThreshold: 0.001,
      restSpeedThreshold: 0.001,
      stiffness: 220,
      toValue,
      useNativeDriver: !IS_WEB,
      velocity,
    }).start(({finished}) => {
      if (finished) {
        onComplete?.()
      } else {
        // Never leave the deck locked if an animation is interrupted.
        animation.setValue(0)
        isAnimatingRef.current = false
      }
    })
  }

  const advance = (releaseVelocity = 0) => {
    if (!next || isAnimatingRef.current) return
    isAnimatingRef.current = true
    springTo(1, releaseVelocity, () => {
      onFocusChange(next.id)
      animation.setValue(0)
      isAnimatingRef.current = false
    })
  }

  const retreat = (releaseVelocity = 0) => {
    if (!prev || isAnimatingRef.current) return
    isAnimatingRef.current = true
    springTo(-1, releaseVelocity, () => {
      onFocusChange(prev.id)
      animation.setValue(0)
      isAnimatingRef.current = false
    })
  }

  const showBoundaryMessage = (message: string) => {
    if (boundaryTimeoutRef.current) {
      clearTimeout(boundaryTimeoutRef.current)
    }
    setBoundaryNotice(message)
    boundaryTimeoutRef.current = setTimeout(() => {
      setBoundaryNotice(null)
      boundaryTimeoutRef.current = null
    }, 1200)
  }

  // Stable handles for the PanResponder and key listener, which outlive renders.
  const handlersRef = useRef({advance, retreat, showBoundaryMessage})
  useEffect(() => {
    handlersRef.current = {advance, retreat, showBoundaryMessage}
  })
  const edgesRef = useRef({hasNext: false, hasPrev: false})
  useEffect(() => {
    edgesRef.current = {hasNext: Boolean(next), hasPrev: Boolean(prev)}
  })

  useEffect(() => {
    if (!IS_WEB || !isFocused || isExpanded || typeof document === 'undefined')
      return
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        handlersRef.current.advance()
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        handlersRef.current.retreat()
      }
    }
    let lastWheelAt = 0
    const handleWheel = (e: WheelEvent) => {
      if (
        !(e.target instanceof Element) ||
        !e.target.closest('[data-testid="memesDeck"]')
      )
        return
      e.preventDefault()
      if (Math.abs(e.deltaY) < 12 || Date.now() - lastWheelAt < 450) return
      lastWheelAt = Date.now()
      if (e.deltaY > 0) handlersRef.current.advance()
      else handlersRef.current.retreat()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('wheel', handleWheel, {passive: false})
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('wheel', handleWheel)
    }
  }, [isFocused, isExpanded])

  const [panResponder] = useState(() => {
    const shouldCapture = (dx: number, dy: number) =>
      !isAnimatingRef.current &&
      (edgesRef.current.hasNext || edgesRef.current.hasPrev) &&
      Math.abs(dy) > 6 &&
      Math.abs(dy) > Math.abs(dx)
    const reset = (velocity = 0) => {
      Animated.spring(animation, {
        damping: 24,
        mass: 0.9,
        overshootClamping: true,
        stiffness: 220,
        toValue: 0,
        useNativeDriver: !IS_WEB,
        velocity,
      }).start()
    }
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => shouldCapture(g.dx, g.dy),
      onMoveShouldSetPanResponder: (_e, g) => shouldCapture(g.dx, g.dy),
      onPanResponderMove: (_e, g) => {
        const {hasNext, hasPrev} = edgesRef.current
        const progress =
          g.dy < 0 && hasNext
            ? Math.max(0, Math.min(1, -g.dy / secondaryTopRef.current))
            : g.dy > 0 && hasPrev
              ? -Math.max(
                  0,
                  Math.min(1, g.dy / (secondaryTopRef.current * 0.55)),
                )
              : 0
        animation.setValue(progress)
      },
      onPanResponderRelease: (_e, g) => {
        const {hasNext} = edgesRef.current
        const handlers = handlersRef.current
        const velocity = -g.vy * DECK_VELOCITY_SCALE
        if (progressRef.current > 0.18 || (g.vy < -0.45 && hasNext)) {
          handlers.advance(velocity)
        } else if (progressRef.current < -0.08 || g.vy > 0.18) {
          if (progressRef.current < 0 || edgesRef.current.hasPrev) {
            handlers.retreat(velocity)
          } else {
            reset(velocity)
          }
        } else {
          if ((g.dy < -24 || g.vy < -0.3) && !hasNext) {
            handlers.showBoundaryMessage(l`You’ve reached the last card`)
          }
          reset(velocity)
        }
      },
      onPanResponderTerminate: () => reset(),
      onPanResponderTerminationRequest: () => false,
    })
  })

  const onLayout = (e: LayoutChangeEvent) => {
    setStageSize(e.nativeEvent.layout)
  }

  if (!current) return null

  const prevStyle = {
    opacity: animation.interpolate({
      inputRange: [-1, -0.12, 0, 1],
      outputRange: [1, 0.68, 0, 0],
    }),
    transform: [
      {
        translateX: animation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0, -DECK_STACK_X_DRIFT, -DECK_STACK_X_DRIFT * 1.5],
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0, -secondaryTop, -secondaryTop],
        }),
      },
    ],
  }

  const currentStyle = {
    opacity: animation.interpolate({
      inputRange: [-1, 0, 0.8, 1],
      outputRange: [1, 1, 0.18, 0],
    }),
    transform: [
      {
        translateX: animation.interpolate({
          inputRange: [-1, 0, 1],
          // Retreating slides the front card into the "next" slot exactly.
          outputRange: [DECK_STACK_INSET, 0, -DECK_CURRENT_X_DRIFT],
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [secondaryTop, 0, -secondaryTop],
        }),
      },
    ],
  }

  const nextStyle = {
    opacity: animation.interpolate({
      inputRange: [-1, -0.1, 0, 1],
      outputRange: [0, 0.58, 1, 1],
    }),
    transform: [
      {
        translateX: animation.interpolate({
          inputRange: [-1, 0, 1],
          // Lands exactly on the front card's slot so nothing snaps on commit.
          outputRange: [DECK_STACK_X_DRIFT * 0.4, 0, -DECK_STACK_INSET],
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [secondaryTop, 0, -secondaryTop],
        }),
      },
    ],
  }

  const thirdStyle = {
    opacity: animation.interpolate({
      inputRange: [-1, 0, 0.25, 1],
      outputRange: [0, 0, 0.15, 1],
    }),
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [secondaryTop, 0, -secondaryTop],
        }),
      },
    ],
  }

  const cardBorder = {borderColor: t.palette.contrast_300}

  return (
    <View testID="memesDeck" style={styles.deckShell} onLayout={onLayout}>
      {cardWidth > 0 ? (
        <View
          {...panResponder.panHandlers}
          style={[styles.deckStage, {width: frameWidth}]}>
          {boundaryNotice ? (
            <View pointerEvents="none" style={styles.deckBoundaryNotice}>
              <View style={styles.deckBoundaryNoticeInner}>
                <Text style={styles.deckBoundaryNoticeText}>
                  {boundaryNotice}
                </Text>
              </View>
            </View>
          ) : null}

          {prev ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.deckCard,
                styles.deckPrevIncoming,
                t.atoms.border_contrast_low,
                {width: cardWidth},
                prevStyle,
              ]}>
              <MediaDeckCard item={prev} height={cardHeight} />
            </Animated.View>
          ) : null}

          {third ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.deckCard,
                styles.deckHidden,
                {top: secondaryTop * 2},
                cardBorder,
                {width: cardWidth},
                thirdStyle,
              ]}>
              <MediaDeckCard item={third} height={cardHeight} />
            </Animated.View>
          ) : null}

          {next ? (
            <Animated.View
              style={[
                styles.deckCard,
                styles.deckSecondary,
                {top: secondaryTop},
                cardBorder,
                {width: cardWidth},
                nextStyle,
              ]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={next.title}
                accessibilityHint={l`Opens this card in a larger view`}
                onPress={() => onExpandItem(next)}>
                <MediaDeckCard item={next} height={cardHeight} />
              </Pressable>
            </Animated.View>
          ) : (
            <View
              style={[
                styles.deckEndCard,
                {width: cardWidth, top: secondaryTop + 16},
              ]}>
              {isFetchingNextPage || hasNextPage ? (
                <Loader size="md" style={{color: '#F8FAFC'}} />
              ) : (
                <>
                  <Text style={styles.deckEndTitle}>
                    <Trans>That’s everything for now</Trans>
                  </Text>
                  <Text style={styles.deckEndBody}>
                    <Trans>Swipe down to revisit earlier cards.</Trans>
                  </Text>
                </>
              )}
            </View>
          )}

          <Animated.View
            style={[
              styles.deckCard,
              styles.deckPrimary,
              cardBorder,
              {width: cardWidth},
              currentStyle,
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={current.title}
              accessibilityHint={l`Opens this card in a larger view`}
              onPress={() => onExpandItem(current)}>
              <MediaDeckCard item={current} height={cardHeight} />
            </Pressable>

            <DeckCommandCenter
              activeItem={current}
              top={secondaryTop - 44}
              left={26}
              width={cardWidth - 52}
              onOpenComments={() => onOpenComments(current)}
              onExpand={() => onExpandItem(current)}
            />
          </Animated.View>
        </View>
      ) : null}
    </View>
  )
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
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
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          size="small"
          color="primary"
          onPress={onAction}
          style={a.mt_sm}>
          <ButtonText>{actionLabel}</ButtonText>
        </Button>
      ) : null}
    </View>
  )
}
