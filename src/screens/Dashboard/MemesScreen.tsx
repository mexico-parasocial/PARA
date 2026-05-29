import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  Animated,
  type GestureResponderEvent,
  PanResponder,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {useWebMediaQueries} from '#/lib/hooks/useWebMediaQueries'
import {MEMES as MOCK_MEMES} from '#/lib/mock-data'
import {type NavigationProp} from '#/lib/routes/types'
import {useCompassFilter} from '#/state/shell/compass-filter'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {ActiveFiltersStackButton} from '#/components/CompassFilterControls'
import {SearchInput} from '#/components/forms/SearchInput'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/MagnifyingGlass'
import {SquareBehindSquare4_Stroke2_Corner0_Rounded as DeckIcon} from '#/components/icons/SquareBehindSquare4'
import * as Layout from '#/components/Layout'
import {RedditVoteButton} from '#/components/PostControls/VoteButton'
import {ExpandedMediaCardModal} from './MemesScreen/ExpandedMediaCardModal/ExpandedMediaCardModal'
import {
  DECK_CARD_HEIGHT,
  DECK_CURRENT_X_DRIFT,
  DECK_SECONDARY_TOP,
  DECK_STACK_X_DRIFT,
  DECK_VELOCITY_SCALE,
  matchesCompassFilter,
  matchesSearch,
} from './MemesScreen/helpers'
import {MediaBoardCard} from './MemesScreen/MediaBoardCard/MediaBoardCard'
import {MediaDeckCard} from './MemesScreen/MediaDeckCard/MediaDeckCard'
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
  const {isDesktop, isTablet} = useWebMediaQueries()

  const activeMode: Mode = 'Memes'
  const [viewStyle, setViewStyle] = useState<ViewStyleMode>(
    route.params?.view === 'deck' ? 'deck' : 'board',
  )
  const [query, setQuery] = useState('')
  const [itemVotes, setItemVotes] = useState<Record<string, 1 | -1 | 0>>({})
  const [focusedItemId, setFocusedItemId] = useState<string | undefined>()
  const [expandedItem, setExpandedItem] = useState<MediaItem | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const isSearchOpen = showSearch || Boolean(query)

  const memes = useMemo(
    () => [...MOCK_MEMES].sort((a, b) => b.votes - a.votes),
    [],
  )

  const filteredMemes = useMemo(() => {
    return memes.filter(item => {
      return (
        matchesCompassFilter(item, activeFilters) &&
        matchesSearch(
          [item.title, item.author, item.community, item.party, item.state],
          query,
        )
      )
    })
  }, [activeFilters, memes, query])

  const activeItems = filteredMemes
  const boardWidth = width > 900 ? (width - 44) / 2 : undefined

  const setNextView = (next: ViewStyleMode) => {
    setViewStyle(next)
    navigation.setParams({view: next})
  }

  return (
    <Layout.Screen testID="memesScreen">
      <View style={[styles.topChrome, t.atoms.bg]}>
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          {isSearchOpen ? (
            <Layout.Header.Content>
              <View style={styles.headerSearchContent}>
                <SearchInput
                  value={query}
                  onChangeText={setQuery}
                  onClearText={() => setQuery('')}
                  placeholder={_(msg`Search memes, authors, or communities`)}
                />
              </View>
            </Layout.Header.Content>
          ) : (
            <Layout.Header.Content>
              <Layout.Header.TitleText>
                <Trans>Memes</Trans>
              </Layout.Header.TitleText>
            </Layout.Header.Content>
          )}

          <View style={styles.headerActions}>
            <Pressable
              accessibilityHint={_(msg`Change the card presentation`)}
              accessibilityLabel={_(msg`Switch between board and deck view`)}
              accessibilityRole="button"
              onPress={() =>
                setNextView(viewStyle === 'board' ? 'deck' : 'board')
              }
              style={[
                styles.headerViewToggleButton,
                t.atoms.bg_contrast_25,
                viewStyle === 'deck' && styles.headerViewToggleButtonActive,
              ]}>
              <DeckIcon
                size="md"
                style={viewStyle === 'deck' ? {color: '#fff'} : t.atoms.text}
              />
            </Pressable>
            <Pressable
              accessibilityHint={_(msg`Open or close search`)}
              accessibilityLabel={_(msg`Toggle search`)}
              accessibilityRole="button"
              onPress={() => {
                if (isSearchOpen) {
                  setQuery('')
                  setShowSearch(false)
                } else {
                  setShowSearch(true)
                }
              }}
              style={styles.headerSearchButton}>
              <SearchIcon size="lg" style={t.atoms.text} />
            </Pressable>
            <ActiveFiltersStackButton />
          </View>
        </Layout.Header.Outer>
      </View>

      <View style={styles.contentShell}>
        {viewStyle === 'board' ? (
          <Layout.Content
            bounces
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator>
            {activeItems.length === 0 ? (
              <EmptyState
                description={_(
                  msg`Open more communities or clear search to fill this view.`,
                )}
                title={_(msg`No memes match those filters`)}
              />
            ) : (
              <View style={styles.boardGrid}>
                {activeItems.map(item => (
                  <MediaBoardCard
                    key={item.id}
                    item={item}
                    mode={activeMode}
                    onVoteChange={vote =>
                      setItemVotes(prev => ({...prev, [item.id]: vote}))
                    }
                    onExpand={() => setExpandedItem(item)}
                    vote={itemVotes[item.id] ?? 0}
                    width={boardWidth}
                  />
                ))}
              </View>
            )}
          </Layout.Content>
        ) : (
          <View style={styles.deckContentShell}>
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
                isDesktop={isDesktop}
                isTablet={isTablet}
                items={activeItems}
                mode={activeMode}
                onExpandItem={setExpandedItem}
                onFocusChange={setFocusedItemId}
                onVoteChange={(id, vote) =>
                  setItemVotes(prev => ({...prev, [id]: vote}))
                }
                votes={itemVotes}
              />
            )}
          </View>
        )}
      </View>

      <ExpandedMediaCardModal
        item={expandedItem}
        mode={activeMode}
        onClose={() => setExpandedItem(null)}
        onVoteChange={vote => {
          if (!expandedItem) return
          setItemVotes(prev => ({...prev, [expandedItem.id]: vote}))
        }}
        vote={expandedItem ? (itemVotes[expandedItem.id] ?? 0) : 0}
      />
    </Layout.Screen>
  )
}

function DeckChain({
  items,
  mode,
  anchorId,
  onFocusChange,
  onExpandItem,
  votes,
  onVoteChange,
  isDesktop,
  isTablet,
}: {
  items: MediaItem[]
  mode: Mode
  anchorId?: string
  onFocusChange: (id?: string) => void
  onExpandItem: (item: MediaItem) => void
  votes: Record<string, 1 | -1 | 0>
  onVoteChange: (id: string, vote: 1 | -1 | 0) => void
  isDesktop: boolean
  isTablet: boolean
}) {
  const t = useTheme()
  const {width} = useWindowDimensions()
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

  const isLargeScreen = isDesktop || isTablet
  const deckMaxWidth = isDesktop ? 520 : isTablet ? 480 : undefined
  const deckHorizontalMargin = isLargeScreen
    ? Math.max(0, (width - (deckMaxWidth ?? 0)) / 2)
    : 0

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

  const panResponder = useMemo(
    () =>
      // PanResponder invokes these callbacks after render during gestures.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          return (
            !isAnimatingRef.current &&
            (Boolean(next) || Boolean(prev)) &&
            Math.abs(gestureState.dy) > 4 &&
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
          )
        },
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            !isAnimatingRef.current &&
            (Boolean(next) || Boolean(prev)) &&
            Math.abs(gestureState.dy) > 4 &&
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
            showBoundaryMessage('You have reached the last card')
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
      next,
      prev,
      resetPosition,
      retreat,
      showBoundaryMessage,
    ],
  )

  const handleDeckPress = useCallback(
    (e: GestureResponderEvent) => {
      if (typeof e?.nativeEvent?.locationY !== 'number') return
      const tapY = e.nativeEvent.locationY
      const stageHeight = DECK_CARD_HEIGHT + DECK_SECONDARY_TOP
      if (tapY > stageHeight * 0.55 && next) {
        advance()
      } else if (tapY < stageHeight * 0.25 && prev) {
        retreat()
      }
    },
    [advance, retreat, next, prev],
  )

  const handleWebClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const clickY = e.clientY - rect.top
      const stageHeight = DECK_CARD_HEIGHT + DECK_SECONDARY_TOP
      if (clickY > stageHeight * 0.55 && next) {
        advance()
      } else if (clickY < stageHeight * 0.25 && prev) {
        retreat()
      }
    },
    [advance, retreat, next, prev],
  )

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
          outputRange: [0, -DECK_SECONDARY_TOP, -DECK_SECONDARY_TOP],
        }),
      },
    ],
  }

  const currentStyle = {
    opacity: animation.interpolate({
      inputRange: [-1, -0.2, 0, 0.8, 1],
      outputRange: [0.16, 0.62, 1, 0.18, 0],
    }),
    transform: [
      {
        translateX: animation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [34 + DECK_CURRENT_X_DRIFT, 0, -DECK_CURRENT_X_DRIFT],
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [DECK_CARD_HEIGHT * 0.72, 0, -170],
        }),
      },
    ],
  }

  const nextStyle = {
    opacity: animation.interpolate({
      inputRange: [-1, -0.1, 0, 1],
      outputRange: [0.18, 0.58, 1, 1],
    }),
    transform: [
      {
        translateX: animation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [DECK_STACK_X_DRIFT * 0.4, 0, -10 - DECK_STACK_X_DRIFT],
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [DECK_SECONDARY_TOP, 0, -DECK_SECONDARY_TOP],
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
        translateX: animation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [DECK_STACK_X_DRIFT * 0.4, 0, 10 + DECK_STACK_X_DRIFT],
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [DECK_SECONDARY_TOP, 0, -DECK_SECONDARY_TOP],
        }),
      },
    ],
  }

  const currentRailStyle = {
    opacity: animation.interpolate({
      inputRange: [-1, -0.1, 0, 0.8, 1],
      outputRange: [0, 0.2, 1, 0.45, 0],
    }),
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [18, 0, 0],
        }),
      },
    ],
  }

  const nextAccessoryStyle = {
    opacity: animation.interpolate({
      inputRange: [-1, -0.1, 0, 1],
      outputRange: [0, 0.15, 1, 1],
    }),
    transform: nextStyle.transform,
  }

  return (
    <View
      {...panResponder.panHandlers}
      onTouchEnd={handleDeckPress}
      // @ts-expect-error web only
      onClick={handleWebClick}
      style={[
        styles.deckStage,
        isLargeScreen && {
          minHeight: DECK_CARD_HEIGHT + DECK_SECONDARY_TOP + 28,
          maxWidth: deckMaxWidth,
          marginHorizontal: deckHorizontalMargin,
          alignSelf: 'center',
        },
      ]}>
      {boundaryNotice ? (
        <View style={styles.deckBoundaryNotice}>
          <Text style={styles.deckBoundaryNoticeText}>{boundaryNotice}</Text>
        </View>
      ) : null}

      {prev ? (
        <Animated.View
          style={[
            styles.deckPrevIncoming,
            t.atoms.border_contrast_low,
            isLargeScreen && {right: 34 + deckHorizontalMargin * 0.1},
            prevStyle,
          ]}>
          <Pressable
            accessibilityHint="Bring this card to the front"
            accessibilityLabel="Previous card"
            accessibilityRole="button"
            onPress={() => setTopLayer('current')}
            style={styles.deckCardPressable}>
            <MediaDeckCard
              item={prev}
              mode={mode}
              showExpand={false}
              showOptions={false}
            />
          </Pressable>
        </Animated.View>
      ) : null}

      {third ? (
        <Animated.View
          style={[
            styles.deckHidden,
            {borderColor: t.palette.contrast_300},
            isLargeScreen && {left: 52 + deckHorizontalMargin * 0.15},
            thirdStyle,
          ]}>
          <MediaDeckCard item={third} mode={mode} showOptions={false} />
        </Animated.View>
      ) : null}

      {next ? (
        <Animated.View
          style={[
            styles.deckSecondary,
            {borderColor: t.palette.contrast_300},
            isLargeScreen && {left: 52 + deckHorizontalMargin * 0.15},
            nextStyle,
            topLayer === 'next' && {zIndex: 5},
          ]}>
          <Pressable
            accessibilityHint="Bring this card to the front"
            accessibilityLabel="Next card"
            accessibilityRole="button"
            onPress={() => setTopLayer('next')}
            style={styles.deckCardPressable}>
            <MediaDeckCard
              expandPlacement="top-left"
              item={next}
              mode={mode}
              onExpand={() => onExpandItem(next)}
              showExpand
              showOptions
            />
          </Pressable>
        </Animated.View>
      ) : null}

      <Animated.View
        style={[
          styles.deckPrimary,
          {borderColor: t.palette.contrast_300},
          isLargeScreen && {right: 52 + deckHorizontalMargin * 0.05},
          currentStyle,
          topLayer === 'next' && {zIndex: 1},
        ]}>
        <MediaDeckCard
          expandPlacement="bottom-right"
          item={current}
          mode={mode}
          onExpand={() => onExpandItem(current)}
          showOptions
        />
      </Animated.View>

      <Animated.View style={[styles.deckPrimaryRail, currentRailStyle]}>
        <DeckEngagementRail
          align="left"
          item={current}
          onVoteChange={vote => onVoteChange(current.id, vote)}
          vote={votes[current.id] ?? 0}
        />
      </Animated.View>

      {next ? (
        <Animated.View style={[styles.deckSecondaryRail, nextAccessoryStyle]}>
          <DeckEngagementRail
            align="right"
            item={next}
            onVoteChange={vote => onVoteChange(next.id, vote)}
            vote={votes[next.id] ?? 0}
          />
        </Animated.View>
      ) : null}

      {!next ? (
        <View
          style={[
            styles.deckEndCard,
            isLargeScreen && {
              left: 34 + deckHorizontalMargin * 0.1,
              right: 34 + deckHorizontalMargin * 0.1,
            },
          ]}>
          <Text style={styles.deckEndTitle}>That is everything for now</Text>
          <Text style={styles.deckEndBody}>
            Swipe down to revisit earlier cards.
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function DeckEngagementRail({
  align,
  item,
  vote,
  onVoteChange,
}: {
  align: 'left' | 'right'
  item: MediaItem
  vote: 1 | -1 | 0
  onVoteChange: (vote: 1 | -1 | 0) => void
}) {
  const score = item.votes + vote
  const voteState = vote === 1 ? 'upvote' : vote === -1 ? 'downvote' : 'none'

  return (
    <View
      style={[
        styles.deckEngagementRail,
        align === 'right' && styles.deckEngagementRailRight,
      ]}>
      <RedditVoteButton
        currentVote={voteState}
        hasBeenToggled={vote !== 0}
        onDownvote={() => onVoteChange(vote === -1 ? 0 : -1)}
        onUpvote={() => onVoteChange(vote === 1 ? 0 : 1)}
        score={score}
      />
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
