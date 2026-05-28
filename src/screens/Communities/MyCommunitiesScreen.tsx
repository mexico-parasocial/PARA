import {useMemo, useState} from 'react'
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {PARTY_FEED_PROFILES} from '#/lib/party-feeds'
import {type NavigationProp} from '#/lib/routes/types'
import {
  type CommunityBoardView,
  useCommunityBoardsQuery,
} from '#/state/queries/community-boards'
import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {MagnifyingGlass_Stroke2_Corner0_Rounded as SearchIcon} from '#/components/icons/MagnifyingGlass'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getPartyColor(name: string): string | undefined {
  return PARTY_FEED_PROFILES.find(
    p => p.name.toLowerCase() === name.toLowerCase(),
  )?.color
}

function getRoleLabel(board: CommunityBoardView): string {
  if (board.viewerRoles && board.viewerRoles.length > 0) {
    return board.viewerRoles[0]
  }
  if (board.viewerMembershipState === 'active') return 'Member'
  if (board.viewerMembershipState === 'pending') return 'Pending'
  return 'Observer'
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export function MyCommunitiesScreen() {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const [activeTab, setActiveTab] = useState<'All' | 'Parties' | 'Geographic'>(
    'All',
  )
  const [searchQuery, setSearchQuery] = useState('')

  const {
    data: boardsData,
    isLoading,
    isError,
    refetch,
  } = useCommunityBoardsQuery({limit: 100})

  const joinedBoards = useMemo(() => {
    if (!boardsData?.boards) return []
    return boardsData.boards.filter(b => b.viewerMembershipState !== 'none')
  }, [boardsData])

  const filteredBoards = useMemo(() => {
    if (!searchQuery.trim()) return joinedBoards
    const q = searchQuery.toLowerCase()
    return joinedBoards.filter(
      b =>
        b.name.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.quadrant.toLowerCase().includes(q),
    )
  }, [joinedBoards, searchQuery])

  const partyBoards = useMemo(
    () => filteredBoards.filter(b => b.quadrant === 'political'),
    [filteredBoards],
  )

  const geographicBoards = useMemo(
    () => filteredBoards.filter(b => b.quadrant !== 'political'),
    [filteredBoards],
  )

  const displayBoards = useMemo(() => {
    switch (activeTab) {
      case 'Parties':
        return partyBoards
      case 'Geographic':
        return geographicBoards
      default:
        return filteredBoards
    }
  }, [activeTab, partyBoards, geographicBoards, filteredBoards])

  return (
    <Layout.Screen testID="myCommunitiesScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>My Communities</Trans>
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>
            <Trans>Organized by Parties and Geographic Regions</Trans>
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        stickyHeaderIndices={[0, 1]}>
        {/* Search Bar */}
        <View style={[styles.searchBar, t.atoms.bg]}>
          <Layout.Center>
            <View
              style={[
                styles.searchInputWrapper,
                {backgroundColor: t.palette.contrast_25},
              ]}>
              <SearchIcon
                size="sm"
                fill={t.palette.contrast_300}
                style={{marginRight: 8}}
              />
              <TextInput
                placeholder="Search your communities"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, t.atoms.text]}
                placeholderTextColor={t.palette.contrast_500}
                keyboardAppearance={t.name === 'light' ? 'light' : 'dark'}
                returnKeyType="search"
                clearButtonMode="while-editing"
                autoCorrect={false}
                autoCapitalize="none"
                accessibilityLabel="Search communities"
                accessibilityHint="Searches your joined communities"
              />
            </View>
          </Layout.Center>
        </View>

        {/* Tab Bar */}
        <View style={[styles.tabBar, t.atoms.bg]}>
          <Layout.Center>
            <View style={styles.tabRow}>
              {(['All', 'Parties', 'Geographic'] as const).map(tab => {
                const count =
                  tab === 'All'
                    ? filteredBoards.length
                    : tab === 'Parties'
                      ? partyBoards.length
                      : geographicBoards.length
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[
                      styles.tabItem,
                      activeTab === tab && {
                        borderBottomColor: t.palette.primary_500,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === tab
                          ? {color: t.palette.primary_500, fontWeight: '800'}
                          : t.atoms.text_contrast_medium,
                      ]}>
                      {tab} {count > 0 && `(${count})`}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </Layout.Center>
        </View>

        <Layout.Center style={styles.mainCenter}>
          {isLoading ? (
            <View style={styles.centered}>
              <Loader size="lg" />
            </View>
          ) : isError ? (
            <View style={styles.centered}>
              <Text
                style={[
                  styles.emptyTitle,
                  t.atoms.text,
                  {textAlign: 'center'},
                ]}>
                <Trans>Failed to load communities</Trans>
              </Text>
              <Text
                style={[
                  styles.emptyBody,
                  t.atoms.text_contrast_medium,
                  {textAlign: 'center'},
                ]}>
                <Trans>
                  We couldn't fetch your communities. Pull down to retry.
                </Trans>
              </Text>
              <Button
                label="Retry"
                onPress={() => refetch()}
                size="small"
                variant="solid"
                color="primary"
                style={{marginTop: 16}}>
                <ButtonText>Retry</ButtonText>
              </Button>
            </View>
          ) : displayBoards.length > 0 ? (
            <View style={styles.sectionContent}>
              {activeTab !== 'Geographic' && partyBoards.length > 0 && (
                <Section title="Parties" prefix="p/">
                  {partyBoards.map(board => (
                    <CommunityCard
                      key={board.uri}
                      board={board}
                      onPress={() =>
                        navigation.navigate('CommunityProfile', {
                          communityId: board.communityId,
                          communityName: board.name,
                        })
                      }
                    />
                  ))}
                </Section>
              )}

              {activeTab !== 'Parties' && geographicBoards.length > 0 && (
                <Section title="Geographic Regions" prefix="g/">
                  {geographicBoards.map(board => (
                    <CommunityCard
                      key={board.uri}
                      board={board}
                      onPress={() =>
                        navigation.navigate('CommunityProfile', {
                          communityId: board.communityId,
                          communityName: board.name,
                        })
                      }
                    />
                  ))}
                </Section>
              )}
            </View>
          ) : (
            <View style={styles.centered}>
              <Text
                style={[
                  styles.emptyTitle,
                  t.atoms.text,
                  {textAlign: 'center'},
                ]}>
                {searchQuery.trim() ? (
                  <Trans>No matches found</Trans>
                ) : (
                  <Trans>No communities yet</Trans>
                )}
              </Text>
              <Text
                style={[
                  styles.emptyBody,
                  t.atoms.text_contrast_medium,
                  {textAlign: 'center'},
                ]}>
                {searchQuery.trim() ? (
                  <Trans>Try a different search term.</Trans>
                ) : (
                  <Trans>
                    Join communities from the directory and they'll appear here.
                  </Trans>
                )}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => navigation.navigate('Communities')}
                style={styles.directoryLink}>
                <Text
                  style={[
                    styles.directoryText,
                    {color: t.palette.primary_500},
                  ]}>
                  Browse directory →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Actions */}
          {!isLoading && !isError && (
            <View style={styles.footer}>
              <Button
                label="Explore Compass"
                onPress={() => navigation.navigate('Compass')}
                size="large"
                variant="solid"
                color="primary"
                style={styles.footerButton}>
                <ButtonText>Explore the Compass</ButtonText>
              </Button>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => navigation.navigate('Communities')}
                style={styles.directoryLink}>
                <Text
                  style={[
                    styles.directoryText,
                    {color: t.palette.primary_500},
                  ]}>
                  View global directory →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Layout.Center>
      </ScrollView>
    </Layout.Screen>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Section({
  title,
  prefix,
  children,
}: {
  title: string
  prefix: string
  children: React.ReactNode
}) {
  const t = useTheme()
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, t.atoms.text]}>{title}</Text>
        <View style={[styles.prefixBadge, t.atoms.bg_contrast_25]}>
          <Text style={[styles.prefixText, t.atoms.text_contrast_medium]}>
            {prefix}
          </Text>
        </View>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  )
}

function CommunityCard({
  board,
  onPress,
}: {
  board: CommunityBoardView
  onPress: () => void
}) {
  const t = useTheme()
  const color = getPartyColor(board.name) || t.palette.primary_500
  const role = getRoleLabel(board)

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, t.atoms.bg_contrast_25]}>
      <View style={styles.cardMain}>
        <View style={[styles.colorBar, {backgroundColor: color}]} />
        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardName, t.atoms.text]} numberOfLines={1}>
              {board.name}
            </Text>
            <View
              style={[
                styles.rolePill,
                {backgroundColor: t.palette.primary_500 + '15'},
              ]}>
              <Text style={[styles.roleText, {color: t.palette.primary_500}]}>
                {role}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardUri, t.atoms.text_contrast_medium]}>
            {board.quadrant === 'political'
              ? `p/${board.slug}`
              : `g/${board.slug}`}
          </Text>

          <View style={styles.cardStats}>
            <Text style={[styles.statItem, t.atoms.text_contrast_medium]}>
              👥{' '}
              <Text style={[t.atoms.text, {fontWeight: '700'}]}>
                {board.memberCount}
              </Text>{' '}
              members
            </Text>
            <View style={styles.dotDivider} />
            <Text style={[styles.statItem, t.atoms.text_contrast_medium]}>
              🏛️{' '}
              <Text style={[t.atoms.text, {fontWeight: '700'}]}>
                {board.governanceSummary?.moderatorCount ?? 0}
              </Text>{' '}
              moderators
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.chevron, t.atoms.text_contrast_medium]}>›</Text>
    </TouchableOpacity>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingBottom: 60},

  // Search
  searchBar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },

  // Tabs
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  mainCenter: {paddingHorizontal: 16, paddingTop: 16},

  // Sections
  section: {marginBottom: 32},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  prefixBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  prefixText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  sectionContent: {gap: 12},

  // Cards
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorBar: {
    width: 6,
    alignSelf: 'stretch',
  },
  cardBody: {
    flex: 1,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardUri: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statItem: {
    fontSize: 12,
  },
  dotDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  chevron: {
    fontSize: 24,
    marginRight: 16,
    marginLeft: 8,
  },

  // Empty / Error
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Footer
  footer: {
    marginTop: 20,
    alignItems: 'center',
    gap: 16,
  },
  footerButton: {width: '100%', borderRadius: 16},
  directoryLink: {paddingVertical: 8},
  directoryText: {fontSize: 14, fontWeight: '700'},
})
