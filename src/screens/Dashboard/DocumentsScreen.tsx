import {useMemo, useRef, useState} from 'react'
import {Pressable, ScrollView, StyleSheet, View} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {DOCUMENTS as MOCK_DOCS} from '#/lib/mock-data'
import {type Document as DocItem} from '#/lib/mock-data/types'
import {useBaseFilter} from '#/state/shell/base-filter'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {ActiveFiltersStackButton} from '#/components/BaseFilterControls'
import {SearchInput} from '#/components/forms/SearchInput'
import {CalendarDays_Stroke2_Corner0_Rounded as CalendarIcon} from '#/components/icons/CalendarDays'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/MagnifyingGlass'
import {PageText_Stroke2_Corner0_Rounded as DocIcon} from '#/components/icons/PageText'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import * as Layout from '#/components/Layout'
import * as Toast from '#/components/Toast'
import {IS_WEB} from '#/env'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORIES = ['All', 'Official', 'Policy Drafts', 'Campaign'] as const
type Category = (typeof CATEGORIES)[number]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function matchesSearch(values: Array<string | undefined>, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return values.some(value => value?.toLowerCase().includes(normalized))
}

function matchesCompassFilter(
  item: Pick<DocItem, 'community' | 'party' | 'state'>,
  activeFilters: string[],
) {
  if (!activeFilters.length) return true
  return activeFilters.some(filter => {
    return (
      item.community === filter ||
      item.party === filter ||
      item.state === filter
    )
  })
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
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
  const {activeFilters} = useBaseFilter()

  const [activeCategory, setActiveCategory] = useState<Category>(() => {
    const initial = route.params?.category
    if (initial && CATEGORIES.includes(initial as Category)) {
      return initial as Category
    }
    return 'All'
  })
  const [query, setQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const isSearchOpen = showSearch || Boolean(query)
  const [uploadedDocs, setUploadedDocs] = useState<DocItem[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const documents = useMemo(
    () =>
      [...uploadedDocs, ...MOCK_DOCS].sort(
        (a, b) => Date.parse(b.date) - Date.parse(a.date),
      ),
    [uploadedDocs],
  )

  const filteredDocuments = useMemo(() => {
    return documents.filter(item => {
      const categoryMatch =
        activeCategory === 'All' || item.category === activeCategory
      return (
        categoryMatch &&
        matchesCompassFilter(item, activeFilters) &&
        matchesSearch(
          [item.title, item.category, item.community, item.party, item.state],
          query,
        )
      )
    })
  }, [activeCategory, activeFilters, documents, query])

  const categoryCountMap = useMemo(() => {
    const map: Record<string, number> = {All: documents.length}
    for (const doc of documents) {
      map[doc.category] = (map[doc.category] || 0) + 1
    }
    return map
  }, [documents])

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
                  placeholder={_(msg`Search documents, communities, or states`)}
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
            <UploadButton
              onUpload={doc => setUploadedDocs(prev => [doc, ...prev])}
              fileInputRef={fileInputRef}
            />
            <ActiveFiltersStackButton />
          </View>
        </Layout.Header.Outer>

        {/* Category Tabs */}
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
            {CATEGORIES.map(cat => {
              const isActive = cat === activeCategory
              return (
                <Pressable
                  key={cat}
                  accessibilityRole="button"
                  accessibilityLabel={cat}
                  accessibilityHint={_(msg`Selects this document category`)}
                  accessibilityState={{selected: isActive}}
                  onPress={() => setActiveCategory(cat)}
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
                    {cat}
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
                      {categoryCountMap[cat] ?? 0}
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
            {filteredDocuments.length === 1
              ? '1 document'
              : `${filteredDocuments.length} documents`}
          </Text>
          <Text style={[styles.summarySubtext, t.atoms.text_contrast_medium]}>
            {activeCategory === 'All'
              ? 'across all categories'
              : `in ${activeCategory}`}
          </Text>
        </Layout.Center>
      </View>

      {/* Hidden file input for web */}
      {IS_WEB && (
        <input
          ref={fileInputRef}
          type="file"
          style={{display: 'none'}}
          onChange={e => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (file) {
              const newDoc: DocItem = {
                id: `upload-${Date.now()}`,
                type: 'Doc',
                title: file.name,
                category: 'Official',
                size: formatFileSize(file.size),
                color: '#6366F1',
                party: 'Independent',
                state: 'National',
                community: 'General',
                date: new Date().toISOString().split('T')[0],
                votes: 0,
                comments: 0,
              }
              setUploadedDocs(prev => [newDoc, ...prev])
              Toast.show(`Documento subido: ${file.name}`)
            }
            // Reset input so the same file can be selected again
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
            }
          }}
        />
      )}

      {/* Document List */}
      <Layout.Content
        bounces
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator>
        {filteredDocuments.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              t.atoms.bg_contrast_25,
              t.atoms.border_contrast_low,
            ]}>
            <DocIcon size="xl" style={t.atoms.text_contrast_low} />
            <Text style={[styles.emptyTitle, t.atoms.text]}>
              No documents found
            </Text>
            <Text
              style={[styles.emptyDescription, t.atoms.text_contrast_medium]}>
              Try changing the category or clearing your search filters.
            </Text>
          </View>
        ) : (
          <View style={styles.documentList}>
            {filteredDocuments.map(doc => (
              <DocumentCard key={doc.id} doc={doc} />
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
function DocumentCard({doc}: {doc: DocItem}) {
  const t = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={doc.title}
      accessibilityHint="Opens this document"
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
      {/* Color Accent Strip */}
      <View style={[styles.docAccentStrip, {backgroundColor: doc.color}]}>
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
            <Text
              style={[styles.docCategoryText, t.atoms.text_contrast_medium]}>
              {doc.category}
            </Text>
          </View>
          <Text style={[styles.docSize, t.atoms.text_contrast_medium]}>
            {doc.size}
          </Text>
        </View>

        <Text style={[styles.docTitle, t.atoms.text]} numberOfLines={2}>
          {doc.title}
        </Text>

        <View style={styles.docMetaRow}>
          <View style={styles.docMetaItem}>
            <View style={[styles.docPartyDot, {backgroundColor: doc.color}]} />
            <Text style={[styles.docMetaText, t.atoms.text_contrast_medium]}>
              {doc.party}
            </Text>
          </View>
          <Text style={[styles.docMetaDot, t.atoms.text_contrast_low]}>·</Text>
          <Text style={[styles.docMetaText, t.atoms.text_contrast_medium]}>
            {doc.state}
          </Text>
          <Text style={[styles.docMetaDot, t.atoms.text_contrast_low]}>·</Text>
          <Text style={[styles.docMetaText, t.atoms.text_contrast_medium]}>
            {doc.community}
          </Text>
        </View>

        <View style={styles.docBottomRow}>
          <View style={styles.docDateRow}>
            <CalendarIcon size="xs" style={t.atoms.text_contrast_low} />
            <Text style={[styles.docDateText, t.atoms.text_contrast_medium]}>
              {formatDateLabel(doc.date)}
            </Text>
          </View>

          <View style={styles.docStatsRow}>
            <View style={styles.docStatItem}>
              <Text
                style={[styles.docStatValue, {color: t.palette.primary_500}]}>
                {doc.votes}
              </Text>
              <Text style={[styles.docStatLabel, t.atoms.text_contrast_medium]}>
                votes
              </Text>
            </View>
            <View
              style={[
                styles.docStatDivider,
                {backgroundColor: t.palette.contrast_100},
              ]}
            />
            <View style={styles.docStatItem}>
              <Text style={[styles.docStatValue, t.atoms.text_contrast_medium]}>
                {doc.comments}
              </Text>
              <Text style={[styles.docStatLabel, t.atoms.text_contrast_medium]}>
                comments
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  )
}

// ---------------------------------------------------------------------------
// UploadButton
// ---------------------------------------------------------------------------
function UploadButton({
  onUpload,
  fileInputRef,
}: {
  onUpload: (doc: DocItem) => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}) {
  const t = useTheme()

  const handlePress = async () => {
    if (IS_WEB && fileInputRef.current) {
      fileInputRef.current.click()
      return
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
      })

      if (result.canceled) return

      const asset = result.assets[0]
      if (!asset) return

      const newDoc: DocItem = {
        id: `upload-${Date.now()}`,
        type: 'Doc',
        title: asset.name,
        category: 'Official',
        size: formatFileSize(asset.size ?? 0),
        color: '#6366F1',
        party: 'Independent',
        state: 'National',
        community: 'General',
        date: new Date().toISOString().split('T')[0],
        votes: 0,
        comments: 0,
      }

      onUpload(newDoc)
      Toast.show(`Documento subido: ${asset.name}`)
    } catch (e) {
      Toast.show('Error al seleccionar documento')
      console.error(e)
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Subir documento"
      accessibilityHint={_(msg`Upload a new document`)}
      onPress={handlePress}
      style={[
        styles.headerSearchButton,
        {
          backgroundColor: t.palette.primary_500,
          borderRadius: 10,
        },
      ]}>
      <PlusIcon size="md" style={{color: '#fff'}} />
    </Pressable>
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
  docSize: {
    fontSize: 12,
    fontWeight: '600',
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  docMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  docMetaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  docPartyDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
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
  docStatsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  docStatItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  docStatValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  docStatLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  docStatDivider: {
    height: 14,
    width: 1,
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
