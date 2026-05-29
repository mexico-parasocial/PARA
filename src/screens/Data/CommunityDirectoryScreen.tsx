import {useMemo} from 'react'
import {ScrollView, StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {COMPASS_COLORS} from '#/lib/compass/compassColors'
import {PressableScale} from '#/lib/custom-animations/PressableScale'
import {type NavigationProp} from '#/lib/routes/types'
import {
  type CommunityBoardView,
  useCommunityBoardsQuery,
} from '#/state/queries/community-boards'
import {atoms as a, useTheme} from '#/alf'
import {EmptyStateError, EmptyStateNoData} from '#/components/EmptyStates'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

// ═══════════════════════════════════════════════════════════════════════════════
// ═══ Community Card ════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

function CommunityDirectoryCard({
  board,
  onPress,
}: {
  board: CommunityBoardView
  onPress: () => void
}) {
  const t = useTheme()
  const quadrantColor = COMPASS_COLORS[board.quadrant as keyof typeof COMPASS_COLORS] ?? t.palette.primary_500

  return (
    <PressableScale
      onPress={onPress}
      targetScale={0.98}
      style={[
        styles.card,
        t.atoms.bg,
        {borderColor: t.atoms.border_contrast_low.borderColor},
      ]}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconWrap,
            {backgroundColor: quadrantColor + '15'},
          ]}>
          <TreeIcon size="md" style={{color: quadrantColor}} />
        </View>
        <View style={a.flex_1}>
          <Text style={[styles.cardTitle, t.atoms.text]} numberOfLines={1}>
            {board.name}
          </Text>
          <Text
            style={[styles.cardMeta, t.atoms.text_contrast_medium]}
            numberOfLines={1}>
            {board.memberCount.toLocaleString()} members · {board.quadrant}
          </Text>
        </View>
        <Text style={[styles.cardArrow, t.atoms.text_contrast_medium]}>→</Text>
      </View>
      {board.description ? (
        <Text
          style={[styles.cardDesc, t.atoms.text_contrast_medium]}
          numberOfLines={2}>
          {board.description}
        </Text>
      ) : null}
    </PressableScale>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══ Screen ════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

export function CommunityDirectoryScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()

  const {
    data: boardsData,
    isLoading,
    isError,
    refetch,
  } = useCommunityBoardsQuery({limit: 100})

  const myBoards = useMemo(() => {
    return boardsData?.boards?.filter(b => b.viewerMembershipState === 'active') ?? []
  }, [boardsData])

  const handlePressCommunity = (board: CommunityBoardView) => {
    navigation.navigate('CommunityCivicTree', {
      communityUri: board.uri,
      communityName: board.name,
    })
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Community Directory</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <Layout.Center style={a.flex_1}>
        {isLoading ? (
          <View style={styles.centered}>
            <Loader size="lg" />
          </View>
        ) : isError ? (
          <EmptyStateError
            message={_(msg`Couldn't load communities. Tap to retry.`)}
            onRetry={refetch}
          />
        ) : myBoards.length === 0 ? (
          <EmptyStateNoData
            icon="🌐"
            title={_(msg`No communities yet`)}
            message={_(msg`Join a community to see its civic tree.`)}
          />
        ) : (
          <ScrollView
            style={a.flex_1}
            contentContainerStyle={styles.scrollContent}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  t.atoms.text,
                  {
                    fontSize: 14,
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  },
                ]}>
                <Trans>Your Communities</Trans>
              </Text>
              <Text style={[t.atoms.text_contrast_medium, {fontSize: 13}]}>
                {myBoards.length}{' '}
                {myBoards.length === 1 ? (
                  <Trans>community</Trans>
                ) : (
                  <Trans>communities</Trans>
                )}
              </Text>
            </View>

            <View style={styles.list}>
              {myBoards.map(board => (
                <CommunityDirectoryCard
                  key={board.uri}
                  board={board}
                  onPress={() => handlePressCommunity(board)}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </Layout.Center>
    </Layout.Screen>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══ Styles ════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  cardArrow: {
    fontSize: 18,
    fontWeight: '400',
  },
})
