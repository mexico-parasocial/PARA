import {useMemo, useState} from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type CommunityBriefingPackStatus} from '#/lib/api/para-lexicons'
import {
  type PartyLobbyingBriefingPackView,
  useBriefingPacksListQuery,
} from '#/state/queries/briefing-packs'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {EmptyStateError} from '#/components/EmptyStates'
import {SearchInput} from '#/components/forms/SearchInput'
import {CalendarDays_Stroke2_Corner0_Rounded as CalendarIcon} from '#/components/icons/CalendarDays'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/MagnifyingGlass'
import {PageText_Stroke2_Corner0_Rounded as DocIcon} from '#/components/icons/PageText'
import * as Layout from '#/components/Layout'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TABS = ['All', 'Published', 'Drafts', 'Archived'] as const
type Tab = (typeof TABS)[number]

const TAB_TO_STATUS: Record<
  Exclude<Tab, 'All'>,
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
  return 'All'
}

// ---------------------------------------------------------------------------
// DocumentsScreen
// ---------------------------------------------------------------------------
export function DocumentsScreen({
  route,
}: {
  route: {params?: {category?: string}}
}) {
  const t = useTheme()
  const {_} = useLingui()

  const [activeTab, setActiveTab] = useState<Tab>(() =>
    initialTab(route.params?.category),
  )
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const isSearchOpen = showSearch || Boolean(query)

  // NOTE: the compass filter is intentionally not offered here — the backend
  // listBriefingPacks handler currently returns `party: ''` for every pack,
  // so compass filtering would silently hide everything.
  const {data, isPending, isError, refetch} = useBriefingPacksListQuery({})
  const packs = useMemo(() => data?.packs ?? [], [data])

  const tabCountMap = useMemo(() => {
    const map: Record<Tab, number> = {
      All: packs.length,
      Published: 0,
      Drafts: 0,
      Archived: 0,
    }
    for (const pack of packs) {
      if (pack.status === 'published') map.Published += 1
      else if (pack.status === 'draft') map.Drafts += 1
      else if (pack.status === 'archived') map.Archived += 1
    }
    return map
  }, [packs])

  const filteredPacks = useMemo(() => {
    const status = activeTab === 'All' ? undefined : TAB_TO_STATUS[activeTab]
    return packs.filter(pack => {
      if (status && pack.status !== status) return false
      return matchesSearch(
        [
          pack.title,
          pack.summary,
          pack.party,
          communityLabel(pack.communityUri),
        ],
        query,
      )
    })
  }, [activeTab, packs, query])

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
                    msg`Search documents, parties, or communities`,
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
      <View
        style={[
          t.atoms.bg_contrast_25,
          t.atoms.border_contrast_low,
          {borderBottomWidth: StyleSheet.hairlineWidth},
        ]}>
        <Layout.Center style={styles.summaryBar}>
          <DocIcon size="sm" style={t.atoms.text_contrast_medium} />
          <Text style={[styles.summaryText, t.atoms.text]}>
            {plural(filteredPacks.length, {
              one: '# document',
              other: '# documents',
            })}
          </Text>
          <Text style={[styles.summarySubtext, t.atoms.text_contrast_medium]}>
            {activeTab === 'All'
              ? _(msg`across all statuses`)
              : _(msg`in ${activeTab}`)}
          </Text>
        </Layout.Center>
      </View>

      {/* Document List */}
      <Layout.Content
        bounces
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator>
        {isPending ? (
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
              <DocumentCard key={pack.uri} pack={pack} />
            ))}
          </View>
        )}
      </Layout.Content>
    </Layout.Screen>
  )
}

// ---------------------------------------------------------------------------
// DocumentCard
// ---------------------------------------------------------------------------
function DocumentCard({pack}: {pack: PartyLobbyingBriefingPackView}) {
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
            {communityLabel(pack.communityUri)}
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
