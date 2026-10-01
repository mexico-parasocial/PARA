import {useEffect, useMemo, useState} from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type CommunityBriefingPackStatus} from '#/lib/api/para-lexicons'
import {COMPASS_POSITION_NAMES} from '#/lib/compass/compassColors'
import {
  type PartyLobbyingBriefingPackView,
  useBriefingPacksListQuery,
} from '#/state/queries/briefing-packs'
import {
  useCommunityBoardsQuery,
  useCommunityTreeDirectoryQuery,
} from '#/state/queries/community-boards'
import {useCommunityBooksQuery} from '#/state/queries/community-books'
import {Text} from '#/view/com/util/text/Text'
import {
  type DocumentsScope,
  resolveDocumentsScope,
  scopeFromBoard,
} from '#/screens/Dashboard/documentsScope'
import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {EmptyStateError} from '#/components/EmptyStates'
import {SearchInput} from '#/components/forms/SearchInput'
import {CalendarDays_Stroke2_Corner0_Rounded as CalendarIcon} from '#/components/icons/CalendarDays'
import {Library_Stroke2_Corner0_Rounded as BookIcon} from '#/components/icons/Library'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/MagnifyingGlass'
import {PageText_Stroke2_Corner0_Rounded as DocIcon} from '#/components/icons/PageText'
import * as Layout from '#/components/Layout'
import {type BookView} from '#/features/civicTree/books'
import {PERSONAL_ITEM_KIND_COLORS} from '#/features/civicTree/colors'
import {collapseCommunityTreeTwins} from '#/features/communityCivicTree/communitySelection'
import {AddBookDialog} from '#/features/communityCivicTree/components/AddBookDialog'
import {CommunityTreeSelector} from '#/features/communityCivicTree/components/CommunityTreeSelector'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TABS = ['All', 'Published', 'Drafts', 'Archived', 'Books'] as const
type Tab = (typeof TABS)[number]

const TAB_TO_STATUS: Record<
  Exclude<Tab, 'All' | 'Books'>,
  CommunityBriefingPackStatus
> = {
  Published: 'published',
  Drafts: 'draft',
  Archived: 'archived',
}

const STATUS_COLORS: Record<CommunityBriefingPackStatus, string> = {
  published: '#16A34A',
  draft: '#D97706',
  archived: '#6B7280',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function matchesSearch(values: Array<string | undefined>, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return values.some(value => value?.toLowerCase().includes(normalized))
}

function formatDateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

/** Derive a display label from a community at-uri (last path segment). */
function communityLabel(communityUri: string): string {
  const rkey = communityUri.split('/').filter(Boolean).pop()
  return rkey ?? communityUri
}

/** Map the legacy route param (`category`) onto the status tabs. */
function initialTab(param: string | undefined): Tab {
  if (!param) return 'All'
  const normalized = param.trim().toLowerCase()
  if (normalized === 'published') return 'Published'
  if (normalized === 'draft' || normalized === 'drafts') return 'Drafts'
  if (normalized === 'archived') return 'Archived'
  if (normalized === 'books' || normalized === 'book') return 'Books'
  return 'All'
}

// ---------------------------------------------------------------------------
// DocumentsScreen
// ---------------------------------------------------------------------------
export function DocumentsScreen({
  route,
}: {
  route: {
    params?: {
      category?: string
      communityUri?: string
      communityName?: string
    }
  }
}) {
  const t = useTheme()
  const {_} = useLingui()

  const [activeTab, setActiveTab] = useState<Tab>(() =>
    initialTab(route.params?.category),
  )
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const isSearchOpen = showSearch || Boolean(query)

  // Which community's documents to show. A party is a community, so opening
  // Documents from a party profile scopes it to that party; everywhere else it
  // starts global and the dropdown narrows it. `override` holds the viewer's
  // own pick: `undefined` defers to the route, `null` means "all".
  const routeCommunityUri = route.params?.communityUri
  const routeCommunityName = route.params?.communityName
  const directory = useCommunityTreeDirectoryQuery()
  const needsNameLookup = !routeCommunityUri && !!routeCommunityName
  const nameLookup = useCommunityBoardsQuery(
    {limit: 100, query: routeCommunityName},
    needsNameLookup,
  )
  const boards = useMemo(() => {
    const all = [
      ...(directory.data?.pages.flatMap(page => page.boards) ?? []),
      ...(nameLookup.data?.boards ?? []),
    ]
    return Array.from(new Map(all.map(board => [board.uri, board])).values())
  }, [directory.data, nameLookup.data])
  const [override, setOverride] = useState<DocumentsScope | null | undefined>()
  // This screen stays mounted in the stack, so a new profile's params must win
  // over a filter picked for the previous one.
  useEffect(() => {
    setOverride(undefined)
  }, [routeCommunityUri, routeCommunityName])
  const routeScope = useMemo(
    () =>
      resolveDocumentsScope(
        {communityUri: routeCommunityUri, communityName: routeCommunityName},
        boards,
      ),
    [routeCommunityUri, routeCommunityName, boards],
  )
  const scope = override === undefined ? routeScope : (override ?? undefined)
  // A scope with no boards is "not found", but only once we have looked.
  const isScopeResolving =
    !!scope &&
    scope.uris.length === 0 &&
    override === undefined &&
    (directory.isFetching || nameLookup.isFetching)
  const isScopeMissing = !!scope && scope.uris.length === 0 && !isScopeResolving
  const scopeBoards = useMemo(
    () => (scope ? boards.filter(b => scope.uris.includes(b.uri)) : []),
    [boards, scope],
  )
  const selectedBoard = collapseCommunityTreeTwins(scopeBoards)[0]

  // NOTE: the compass filter is intentionally not offered here — the backend
  // listBriefingPacks handler currently returns `party: ''` for every pack,
  // so compass filtering would silently hide everything. Scoping is by
  // community, which the handler does honor.
  const {
    packs,
    isPending: isPacksPending,
    isError,
    refetch,
  } = useBriefingPacksListQuery({communityUris: scope?.uris})
  const isPending = isPacksPending || isScopeResolving
  const communityNames = useMemo(
    () => new Map(boards.map(b => [b.uri, b.name])),
    [boards],
  )

  // Books live in community civic trees, not in briefing packs, so they have
  // their own query and are only ever listed under the Books tab.
  const booksQuery = useCommunityBooksQuery()
  const addBookControl = Dialog.useDialogControl()
  const isBooksTab = activeTab === 'Books'

  const tabCountMap = useMemo(() => {
    const map: Record<Tab, number> = {
      All: packs.length,
      Published: 0,
      Drafts: 0,
      Archived: 0,
      Books: scope
        ? booksQuery.books.filter(b => scope.uris.includes(b.communityUri))
            .length
        : booksQuery.books.length,
    }
    for (const pack of packs) {
      if (pack.status === 'published') map.Published += 1
      else if (pack.status === 'draft') map.Drafts += 1
      else if (pack.status === 'archived') map.Archived += 1
    }
    return map
  }, [packs, booksQuery.books, scope])

  const filteredPacks = useMemo(() => {
    if (activeTab === 'Books') return []
    const status = activeTab === 'All' ? undefined : TAB_TO_STATUS[activeTab]
    return packs.filter(pack => {
      if (status && pack.status !== status) return false
      return matchesSearch(
        [
          pack.title,
          pack.summary,
          pack.party,
          communityNames.get(pack.communityUri) ??
            communityLabel(pack.communityUri),
        ],
        query,
      )
    })
  }, [activeTab, packs, query, communityNames])

  const filteredBooks = useMemo(
    () =>
      booksQuery.books.filter(
        book =>
          (!scope || scope.uris.includes(book.communityUri)) &&
          matchesSearch(
            [book.title, book.author, book.note, book.communityName],
            query,
          ),
      ),
    [booksQuery.books, query, scope],
  )
  const visibleCount = isBooksTab ? filteredBooks.length : filteredPacks.length

  return (
    <Layout.Screen testID="documentsScreen">
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
                  placeholder={_(
                    msg`Search documents, books, parties, or communities`,
                  )}
                />
              </View>
            </Layout.Header.Content>
          ) : (
            <Layout.Header.Content>
              <Layout.Header.TitleText>
                <Trans>Documents</Trans>
              </Layout.Header.TitleText>
            </Layout.Header.Content>
          )}

          <View style={styles.headerActions}>
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
          </View>
        </Layout.Header.Outer>

        {/* Community filter */}
        <Layout.Center style={styles.scopeRow}>
          <CommunityTreeSelector
            boards={boards}
            selectedCommunity={selectedBoard}
            selectedUri={selectedBoard?.uri}
            selectedName={scope?.name}
            onSelect={uri => {
              const board = boards.find(b => b.uri === uri)
              if (board) setOverride(scopeFromBoard(board, boards))
            }}
            onSelectNinth={ninth =>
              setOverride(
                resolveDocumentsScope(
                  {communityName: COMPASS_POSITION_NAMES[ninth]},
                  boards,
                ),
              )
            }
            onSelectAll={() => setOverride(null)}
            allLabel={_(msg`All communities`)}
            defaultCategory="official"
            collapseTwins
            isLoading={directory.isFetching}
            isError={directory.isError}
            onRetry={() => void directory.refetch()}
            hasNextPage={directory.hasNextPage}
            onLoadMore={() => void directory.fetchNextPage()}
          />
        </Layout.Center>

        {/* Status Tabs */}
        <Layout.Center
          style={[
            t.atoms.border_contrast_low,
            {borderBottomWidth: StyleSheet.hairlineWidth},
          ]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
            style={styles.categoryBar}>
            {TABS.map(tab => {
              const isActive = tab === activeTab
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="button"
                  accessibilityLabel={tab}
                  accessibilityHint={_(msg`Filters documents by this status`)}
                  accessibilityState={{selected: isActive}}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.categoryChip,
                    isActive && {
                      backgroundColor: t.palette.primary_500,
                    },
                    !isActive && {
                      backgroundColor:
                        t.scheme === 'dark'
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(15,23,42,0.05)',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.categoryChipText,
                      isActive ? {color: '#fff'} : t.atoms.text_contrast_medium,
                    ]}>
                    {tab}
                  </Text>
                  <View
                    style={[
                      styles.categoryCountBadge,
                      isActive
                        ? {backgroundColor: 'rgba(255,255,255,0.25)'}
                        : {
                            backgroundColor:
                              t.scheme === 'dark'
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(15,23,42,0.06)',
                          },
                    ]}>
                    <Text
                      style={[
                        styles.categoryCountText,
                        isActive
                          ? {color: '#fff'}
                          : t.atoms.text_contrast_medium,
                      ]}>
                      {tabCountMap[tab]}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>
        </Layout.Center>
      </View>

      {/* Summary Bar */}
      {/*
       * The background and border sit on the centered column itself. Wrapping
       * this in a full-width View painted the bar edge to edge on web, past the
       * center-column borders that Layout.Screen draws.
       */}
      <Layout.Center
        style={[
          styles.summaryBar,
          t.atoms.bg_contrast_25,
          t.atoms.border_contrast_low,
          {borderBottomWidth: StyleSheet.hairlineWidth},
        ]}>
        <DocIcon size="sm" style={t.atoms.text_contrast_medium} />
        <Text style={[styles.summaryText, t.atoms.text]}>
          {isBooksTab
            ? plural(visibleCount, {one: '# book', other: '# books'})
            : plural(visibleCount, {
                one: '# document',
                other: '# documents',
              })}
        </Text>
        <Text
          style={[
            styles.summarySubtext,
            styles.summarySubtextFlex,
            t.atoms.text_contrast_medium,
          ]}
          numberOfLines={1}>
          {isBooksTab
            ? _(msg`from your communities`)
            : activeTab === 'All'
              ? _(msg`across all statuses`)
              : _(msg`in ${activeTab}`)}
        </Text>
        {isBooksTab ? (
          <Button
            label={_(msg`Add a book`)}
            size="small"
            color="primary"
            onPress={() => addBookControl.open()}>
            <ButtonText>
              <Trans>Add book</Trans>
            </ButtonText>
          </Button>
        ) : null}
      </Layout.Center>

      {/* Document List */}
      <Layout.Content
        bounces
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator>
        {isScopeMissing ? (
          <View
            style={[
              styles.emptyState,
              t.atoms.bg_contrast_25,
              t.atoms.border_contrast_low,
            ]}>
            <DocIcon size="xl" style={t.atoms.text_contrast_low} />
            <Text style={[styles.emptyTitle, t.atoms.text]}>
              <Trans>No community found</Trans>
            </Text>
            <Text
              style={[styles.emptyDescription, t.atoms.text_contrast_medium]}>
              <Trans>
                There is no community for {scope?.name} yet, so there are no
                documents to show. Pick another community above.
              </Trans>
            </Text>
          </View>
        ) : isBooksTab ? (
          <BooksList
            books={filteredBooks}
            isPending={booksQuery.isPending}
            isError={booksQuery.isError}
            hasCommunities={booksQuery.hasCommunities}
            isFiltering={query.trim().length > 0}
            onRetry={booksQuery.refetch}
          />
        ) : isPending ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={t.palette.primary_500} />
          </View>
        ) : isError ? (
          <EmptyStateError
            message={_(
              msg`Documents could not be loaded. Check your connection and try again.`,
            )}
            onRetry={() => {
              void refetch()
            }}
          />
        ) : filteredPacks.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              t.atoms.bg_contrast_25,
              t.atoms.border_contrast_low,
            ]}>
            <DocIcon size="xl" style={t.atoms.text_contrast_low} />
            <Text style={[styles.emptyTitle, t.atoms.text]}>
              <Trans>No documents found</Trans>
            </Text>
            <Text
              style={[styles.emptyDescription, t.atoms.text_contrast_medium]}>
              <Trans>
                Try changing the status filter or clearing your search.
              </Trans>
            </Text>
          </View>
        ) : (
          <View style={styles.documentList}>
            {filteredPacks.map(pack => (
              <DocumentCard
                key={pack.uri}
                pack={pack}
                communityName={communityNames.get(pack.communityUri)}
              />
            ))}
          </View>
        )}
      </Layout.Content>
      <AddBookDialog
        control={addBookControl}
        defaultCommunityUris={scope?.uris}
      />
    </Layout.Screen>
  )
}

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------
function BooksList({
  books,
  isPending,
  isError,
  hasCommunities,
  isFiltering,
  onRetry,
}: {
  books: BookView[]
  isPending: boolean
  isError: boolean
  hasCommunities: boolean
  isFiltering: boolean
  onRetry: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  if (isPending) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={t.palette.primary_500} />
      </View>
    )
  }
  if (isError) {
    return (
      <EmptyStateError
        message={_(
          msg`Books could not be loaded. Check your connection and try again.`,
        )}
        onRetry={onRetry}
      />
    )
  }
  if (books.length === 0) {
    return (
      <View
        style={[
          styles.emptyState,
          t.atoms.bg_contrast_25,
          t.atoms.border_contrast_low,
        ]}>
        <BookIcon size="xl" style={t.atoms.text_contrast_low} />
        <Text style={[styles.emptyTitle, t.atoms.text]}>
          <Trans>No books found</Trans>
        </Text>
        <Text style={[styles.emptyDescription, t.atoms.text_contrast_medium]}>
          {isFiltering ? (
            <Trans>Try clearing your search.</Trans>
          ) : hasCommunities ? (
            <Trans>
              Books added to your communities appear here. Use Add book to share
              the first one.
            </Trans>
          ) : (
            <Trans>Join a community to see and add its books.</Trans>
          )}
        </Text>
      </View>
    )
  }
  return (
    <View style={styles.documentList}>
      {books.map(book => (
        <BookCard key={`${book.status}:${book.id}`} book={book} />
      ))}
    </View>
  )
}

function BookCard({book}: {book: BookView}) {
  const t = useTheme()
  const {_} = useLingui()
  const isPending = book.status === 'pending'
  const accent = PERSONAL_ITEM_KIND_COLORS.book

  return (
    <View
      accessible
      accessibilityLabel={
        book.author ? _(msg`${book.title} by ${book.author}`) : book.title
      }
      accessibilityHint={_(msg`Book shared in ${book.communityName}`)}
      style={[
        styles.docCard,
        t.atoms.bg,
        {
          borderWidth: 1,
          borderColor:
            t.scheme === 'dark'
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(15,23,42,0.08)',
        },
      ]}>
      <View style={[styles.docAccentStrip, {backgroundColor: accent}]}>
        <BookIcon size="md" style={{color: '#fff'}} />
      </View>
      <View style={styles.docContent}>
        <View style={styles.docTopRow}>
          <View
            style={[
              styles.docCategoryBadge,
              {
                backgroundColor:
                  t.scheme === 'dark'
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(15,23,42,0.05)',
              },
            ]}>
            <Text
              style={[
                styles.docCategoryText,
                {color: isPending ? STATUS_COLORS.draft : accent},
              ]}>
              {isPending ? _(msg`Pending review`) : _(msg`Book`)}
            </Text>
          </View>
          <Text
            style={[styles.docPackType, t.atoms.text_contrast_medium]}
            numberOfLines={1}>
            {book.communityName}
          </Text>
        </View>

        <Text style={[styles.docTitle, t.atoms.text]} numberOfLines={2}>
          {book.title}
        </Text>
        {book.author || book.publishedYear ? (
          <Text style={[styles.docMetaText, t.atoms.text_contrast_medium]}>
            {[
              book.author ? _(msg`by ${book.author}`) : undefined,
              book.publishedYear,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
        {book.note ? (
          <Text
            style={[styles.docSummary, t.atoms.text_contrast_medium]}
            numberOfLines={3}>
            {book.note}
          </Text>
        ) : null}

        {book.url ? (
          <Text
            style={[styles.docMetaText, {color: t.palette.primary_500}]}
            numberOfLines={1}
            accessibilityRole="link"
            onPress={() => {
              void Linking.openURL(book.url!)
            }}>
            {book.url}
          </Text>
        ) : null}

        {book.createdAt && formatDateLabel(book.createdAt) ? (
          <View style={styles.docDateRow}>
            <CalendarIcon size="xs" style={t.atoms.text_contrast_low} />
            <Text style={[styles.docDateText, t.atoms.text_contrast_medium]}>
              {formatDateLabel(book.createdAt)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// DocumentCard
// ---------------------------------------------------------------------------
function DocumentCard({
  pack,
  communityName,
}: {
  pack: PartyLobbyingBriefingPackView
  communityName?: string
}) {
  const t = useTheme()
  const {_} = useLingui()
  const statusColor = STATUS_COLORS[pack.status] ?? t.palette.primary_500

  return (
    <View
      accessible
      accessibilityLabel={pack.title}
      accessibilityHint={_(msg`Briefing pack, status ${pack.status}`)}
      style={[
        styles.docCard,
        t.atoms.bg,
        {
          borderWidth: 1,
          borderColor:
            t.scheme === 'dark'
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(15,23,42,0.08)',
        },
      ]}>
      {/* Status Accent Strip */}
      <View style={[styles.docAccentStrip, {backgroundColor: statusColor}]}>
        <DocIcon size="md" style={{color: '#fff'}} />
      </View>

      {/* Content */}
      <View style={styles.docContent}>
        <View style={styles.docTopRow}>
          <View
            style={[
              styles.docCategoryBadge,
              {
                backgroundColor:
                  t.scheme === 'dark'
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(15,23,42,0.05)',
              },
            ]}>
            <Text style={[styles.docCategoryText, {color: statusColor}]}>
              {pack.status}
            </Text>
          </View>
          <Text style={[styles.docPackType, t.atoms.text_contrast_medium]}>
            {_(msg`Lobbying pack`)}
          </Text>
        </View>

        <Text style={[styles.docTitle, t.atoms.text]} numberOfLines={2}>
          {pack.title}
        </Text>

        {pack.summary ? (
          <Text
            style={[styles.docSummary, t.atoms.text_contrast_medium]}
            numberOfLines={2}>
            {pack.summary}
          </Text>
        ) : null}

        <View style={styles.docMetaRow}>
          <Text style={[styles.docMetaText, t.atoms.text_contrast_medium]}>
            {communityName ?? communityLabel(pack.communityUri)}
          </Text>
          {pack.party ? (
            <>
              <Text style={[styles.docMetaDot, t.atoms.text_contrast_low]}>
                ·
              </Text>
              <Text style={[styles.docMetaText, t.atoms.text_contrast_medium]}>
                {pack.party}
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.docBottomRow}>
          <View style={styles.docDateRow}>
            <CalendarIcon size="xs" style={t.atoms.text_contrast_low} />
            <Text style={[styles.docDateText, t.atoms.text_contrast_medium]}>
              {formatDateLabel(pack.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  topChrome: {
    elevation: 20,
    zIndex: 20,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  headerSearchContent: {
    paddingRight: 8,
    width: '100%',
  },
  headerSearchButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  categoryBar: {
    maxHeight: 56,
  },
  categoryScroll: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  categoryChip: {
    alignItems: 'center',
    borderRadius: 100,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryCountBadge: {
    borderRadius: 100,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignItems: 'center',
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scopeRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  summaryBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '800',
  },
  summarySubtext: {
    fontSize: 13,
  },
  summarySubtextFlex: {
    flex: 1,
  },
  contentContainer: {
    gap: 12,
    padding: 16,
    paddingBottom: 48,
    paddingTop: 8,
  },
  centerState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  documentList: {
    gap: 12,
  },
  docCard: {
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  docAccentStrip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
  },
  docContent: {
    flex: 1,
    gap: 8,
    padding: 14,
  },
  docTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  docCategoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  docCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  docPackType: {
    fontSize: 12,
    fontWeight: '600',
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  docSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  docMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  docMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  docMetaDot: {
    fontSize: 12,
  },
  docBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  docDateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  docDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 320,
    textAlign: 'center',
  },
})
