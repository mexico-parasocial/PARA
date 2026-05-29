import {useCallback, useMemo, useState} from 'react'
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {useBottomBarOffset} from '#/lib/hooks/useBottomBarOffset'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {type NavigationProp} from '#/lib/routes/types'
import {s} from '#/lib/styles'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {useCompassFilter} from '#/state/shell/compass-filter'
import {FAB} from '#/view/com/util/fab/FAB'
import {Text} from '#/view/com/util/text/Text'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {Logomark} from '#/view/icons/Logomark'
import {Logotype} from '#/view/icons/Logotype'
import {atoms as a, useBreakpoints, useGutters, useTheme} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import {
  CommunityFilterList,
  CompassSettingsButton as CompassFilterSettingsButton,
} from '#/components/CompassFilterControls'
import {CircleQuestion_Stroke2_Corner2_Rounded as QuestionIcon} from '#/components/icons/CircleQuestion'
import {CommunityIcon_Stroke as CommunityIcon} from '#/components/icons/Community'
import {Compass_Stroke2_Corner0_Rounded as CompassIcon} from '#/components/icons/Compass'
import {Globe_Stroke2_Corner0_Rounded as GlobeIcon} from '#/components/icons/Globe'
import {Image_Stroke2_Corner0_Rounded as ImageIcon} from '#/components/icons/Image'
import {Message_Stroke2_Corner0_Rounded as MessageIcon} from '#/components/icons/Message'
import {PageText_Stroke2_Corner0_Rounded as PageTextIcon} from '#/components/icons/PageText'
import {
  Pencil_Stroke2_Corner0_Rounded as PencilIcon,
  PencilLine_Stroke2_Corner2_Rounded as ComposeIcon,
} from '#/components/icons/Pencil'
import {Person_Stroke2_Corner0_Rounded as PersonIcon} from '#/components/icons/Person'
import {RaisingHand4Finger_Stroke2_Corner0_Rounded as RaisingHandIcon} from '#/components/icons/RaisingHand'
import {Verified_Stroke2_Corner2_Rounded as VerifiedIcon} from '#/components/icons/Verified'
import * as Layout from '#/components/Layout'
import {IS_WEB} from '#/env'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shallow sorted-array equality — replaces JSON.stringify on every render */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  for (let i = 0; i < sortedA.length; i++) {
    if (sortedA[i] !== sortedB[i]) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// DataCard — reusable tile for the Data tab grid (simple cards)
// ---------------------------------------------------------------------------
function DataCard({
  title,
  onPress,
  icon,
  cardBgColor,
}: {
  title: string
  onPress: () => void
  icon: React.ReactNode
  cardBgColor: object
}) {
  const t = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[styles.dataCard, cardBgColor]}
      onPress={onPress}>
      <Text style={[styles.dataCardTitle, t.atoms.text]}>{title}</Text>
      <View style={styles.dataCardIconWrap}>{icon}</View>
    </TouchableOpacity>
  )
}

// ---------------------------------------------------------------------------
// DataScreen
// ---------------------------------------------------------------------------
export function DataScreen() {
  const {_} = useLingui()
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const gutters = useGutters([0, 'base'])
  const bottomBarOffset = useBottomBarOffset(24)
  const {hasSession, currentAccount} = useSession()
  const navigation = useNavigation<NavigationProp>()
  const currentDid = currentAccount?.did
  const {data: currentProfile} = useProfileQuery({did: currentDid || ''})

  // Data Tab State (Official/Unofficial toggle)
  const [isOfficial, setIsOfficial] = useState(true)
  const {
    selectedFilters,
    activeFilters,
    selectedState,
    activeState,
    applyFilters,
  } = useCompassFilter()
  const handleApplyFilters = useCallback(() => {
    applyFilters()
  }, [applyFilters])

  // Memoized pending-changes check — avoids JSON.stringify every render
  const hasPendingChanges = useMemo(
    () =>
      !arraysEqual(selectedFilters, activeFilters) ||
      selectedState !== activeState,
    [selectedFilters, activeFilters, selectedState, activeState],
  )

  const handleMyBase = () => navigation.navigate('MyBase')
  const handleCommunities = () => navigation.navigate('Communities')
  const {openComposer} = useOpenComposer()
  const handleCreatePost = () => openComposer({logContext: 'Fab'})

  // Card background — shared across all Data cards
  const cardBgColor = {
    backgroundColor: t.palette.contrast_25 + '30',
    borderWidth: 1,
    borderColor: t.palette.contrast_50 + '40',
  }

  return (
    <Layout.Screen testID="dataScreen">
      {/* Top App Bar */}
      <Layout.Header.Outer noBottomBorder>
        {gtMobile ? <Layout.Header.Slot /> : <Layout.Header.MenuButton />}
        <Layout.Header.Content>
          <View style={[a.flex_1, a.align_center, a.justify_center]}>
            <View
              style={[
                a.align_center,
                a.justify_center,
                {
                  position: 'relative',
                  width: 140,
                  height: 50,
                },
              ]}>
              {/* Geometric Motif Background */}
              <View
                style={[
                  a.absolute,
                  a.align_center,
                  a.justify_center,
                  {
                    zIndex: 1,
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    ...(Platform.OS === 'web'
                      ? {
                          // @ts-ignore Web drop-shadow to trace SVG
                          filter:
                            'drop-shadow(0px 2px 5px rgba(71, 70, 82, 0.15))',
                        }
                      : {
                          shadowColor: '#474652',
                          shadowOpacity: 0.15,
                          shadowRadius: 5,
                          shadowOffset: {width: 0, height: 2},
                        }),
                  },
                ]}>
                <Logomark width={51} fill="#474652" />
              </View>

              {/* Ultra-Tight Text-Adjusted Diamond (Rombo) */}
              <View
                style={[
                  a.align_center,
                  a.justify_center,
                  {
                    zIndex: 2,
                    paddingHorizontal: 6,
                    paddingVertical: 4,
                  },
                ]}>
                {/* Rhombus Geometry Wrapper */}
                <View
                  style={[
                    a.absolute,
                    a.align_center,
                    a.justify_center,
                    {
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                      transform: [{scaleX: 3.15}, {scaleY: 0.65}],
                    },
                  ]}>
                  <View
                    style={[
                      t.atoms.bg,
                      {
                        width: 24,
                        height: 24,
                        opacity: 0.9,
                        transform: [{rotate: '45deg'}],
                      },
                    ]}
                  />
                </View>
                <View
                  style={{
                    ...(Platform.OS === 'web'
                      ? {
                          // @ts-ignore Web drop-shadow to trace SVG
                          filter: 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.2))',
                        }
                      : {
                          shadowColor: t.palette.black || '#000',
                          shadowOpacity: 0.2,
                          shadowRadius: 3,
                          shadowOffset: {width: 0, height: 2},
                        }),
                  }}>
                  <Logotype width={106} fill={t.atoms.text.color} />
                </View>
              </View>
            </View>
          </View>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          <Button
            label="Communities"
            size="small"
            variant="ghost"
            color="secondary"
            shape="round"
            onPress={handleCommunities}
            style={[
              a.justify_center,
              {transform: [{translateX: 8}, {translateY: 2}]},
            ]}>
            <ButtonIcon icon={CommunityIcon} size="lg" />
          </Button>
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      {/* Main Content */}
      <Layout.Center style={styles.flex1}>
        {/* Header row with My Base avatar and filter button */}
        <View style={[styles.tabBar, t.atoms.border_contrast_low, gutters]}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.myBaseButton}
            onPress={handleMyBase}>
            <UserAvatar
              avatar={currentProfile?.avatar}
              size={32}
              type={currentProfile?.associated?.labeler ? 'labeler' : 'user'}
            />
          </TouchableOpacity>
          <View style={a.flex_1} />
          <CompassFilterSettingsButton />
        </View>

        {/* Data grid */}
        <View style={[styles.flex1, t.atoms.bg]}>
          <CommunityFilterList
            hasPendingChanges={hasPendingChanges}
            applyFilters={handleApplyFilters}
            filterCount={selectedFilters.length}
          />
          <ScrollView
            style={styles.dataScreen}
            contentContainerStyle={[
              styles.dataScreenContent,
              {paddingBottom: bottomBarOffset},
            ]}>
            {/* Section 1: Civic Elements */}
            <View style={styles.firstDataSection}>
              <View
                style={[
                  a.flex_row,
                  a.align_center,
                  a.justify_between,
                  a.mb_md,
                ]}>
                <Text style={[styles.sectionTitle, t.atoms.text, a.mb_0]}>
                  <Trans>Civic Elements</Trans>
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => setIsOfficial(!isOfficial)}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                  style={[
                    a.flex_row,
                    a.align_center,
                    a.gap_xs,
                    a.px_sm,
                    a.py_xs,
                    {
                      borderRadius: 100,
                      backgroundColor: isOfficial
                        ? t.palette.primary_50
                        : t.palette.contrast_25,
                      borderWidth: 1,
                      borderColor: isOfficial
                        ? t.palette.primary_100
                        : t.palette.contrast_100,
                    },
                  ]}>
                  <Text
                    style={[
                      a.font_bold,
                      a.text_sm,
                      isOfficial
                        ? {color: t.palette.primary_500}
                        : t.atoms.text,
                    ]}>
                    {isOfficial ? 'Official' : 'Community'}
                  </Text>
                  <VerifiedIcon
                    size="md"
                    style={
                      isOfficial ? {color: t.palette.primary_500} : t.atoms.text
                    }
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.cardsGrid}>
                {/* Policies Card */}
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.dataCard, cardBgColor]}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate('PoliciesDashboard', {
                      filter: isOfficial ? 'Parties' : 'Communities',
                      mode: 'Policies',
                    })
                  }>
                  <View style={[a.w_full, a.align_start]}>
                    <View style={[a.flex_row, a.align_center, a.gap_xs]}>
                      <Text
                        style={[
                          styles.dataCardTitle,
                          t.atoms.text,
                          {textAlign: 'left'},
                        ]}>
                        Policies
                      </Text>
                      {isOfficial && (
                        <VerifiedIcon
                          size="md"
                          fill={t.palette.primary_500}
                          style={{color: t.palette.primary_500}}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        t.atoms.text_contrast_medium,
                        a.text_xs,
                        a.mt_xs,
                      ]}>
                      {isOfficial ? 'Official' : 'Community'}
                    </Text>
                  </View>
                  <View style={styles.dataCardIconWrap}>
                    <Text
                      style={[
                        a.font_bold,
                        styles.flairSymbol,
                        isOfficial
                          ? {color: t.palette.primary_500}
                          : t.atoms.text,
                      ]}>
                      ||#
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Matters Card */}
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.dataCard, cardBgColor]}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate('PoliciesDashboard', {
                      filter: isOfficial ? 'Parties' : 'Communities',
                      mode: 'Matters',
                    })
                  }>
                  <View style={[a.w_full, a.align_start]}>
                    <View style={[a.flex_row, a.align_center, a.gap_xs]}>
                      <Text
                        style={[
                          styles.dataCardTitle,
                          t.atoms.text,
                          {textAlign: 'left'},
                        ]}>
                        Matters
                      </Text>
                      {isOfficial && (
                        <VerifiedIcon
                          size="md"
                          fill={t.palette.primary_500}
                          style={{color: t.palette.primary_500}}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        t.atoms.text_contrast_medium,
                        a.text_xs,
                        a.mt_xs,
                      ]}>
                      {isOfficial ? 'Official' : 'Community'}
                    </Text>
                  </View>
                  <View style={styles.dataCardIconWrap}>
                    <Text
                      style={[
                        a.font_bold,
                        styles.flairSymbol,
                        isOfficial
                          ? {color: t.palette.primary_500}
                          : t.atoms.text,
                      ]}>
                      |#
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Simple cards — DataCard component */}
                <DataCard
                  title="Representatives"
                  onPress={() => navigation.navigate('Representatives', {})}
                  icon={
                    <PersonIcon
                      width={48}
                      style={{color: t.palette.primary_500}}
                    />
                  }
                  cardBgColor={cardBgColor}
                />
                <DataCard
                  title="RAQs and Open Questions"
                  onPress={() => navigation.navigate('RAQ')}
                  icon={
                    <View style={styles.raqIconWrap}>
                      <CompassIcon
                        width={54}
                        style={[
                          styles.raqIconBackMark,
                          {color: t.palette.primary_500},
                        ]}
                      />
                      <QuestionIcon
                        width={38}
                        style={{color: t.palette.primary_500}}
                      />
                    </View>
                  }
                  cardBgColor={cardBgColor}
                />
                <DataCard
                  title="Memes"
                  onPress={() => navigation.navigate('Memes', {})}
                  icon={
                    <ImageIcon
                      width={48}
                      style={{color: t.palette.primary_500}}
                    />
                  }
                  cardBgColor={cardBgColor}
                />
                <DataCard
                  title="Docs"
                  onPress={() => navigation.navigate('Documents', {})}
                  icon={
                    <PageTextIcon
                      width={48}
                      style={{color: t.palette.primary_500}}
                    />
                  }
                  cardBgColor={cardBgColor}
                />
                <DataCard
                  title="Highlights"
                  onPress={() => navigation.navigate('Highlights')}
                  icon={
                    <PencilIcon
                      width={48}
                      style={{color: t.palette.primary_500}}
                    />
                  }
                  cardBgColor={cardBgColor}
                />
                <DataCard
                  title="Lobbying"
                  onPress={() => navigation.navigate('CabildeoList')}
                  icon={
                    <RaisingHandIcon
                      width={48}
                      style={{color: t.palette.primary_500}}
                    />
                  }
                  cardBgColor={cardBgColor}
                />
              </View>
            </View>

            {/* Section 2: Visualizations */}
            <View style={styles.dataSection}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                <Trans>Visualizations</Trans>
              </Text>
              <View style={styles.cardsGrid}>
                <DataCard
                  title="VS"
                  onPress={() =>
                    navigation.navigate('VSScreenV2', {
                      entities: ['p/Jalisco', 'p/CDMX'],
                    })
                  }
                  icon={
                    <View style={styles.iconRow}>
                      <PersonIcon
                        width={56}
                        style={{color: t.palette.primary_500}}
                      />
                      <Text
                        style={[
                          a.font_bold,
                          a.text_md,
                          {
                            marginHorizontal: 8,
                            color: t.palette.primary_500,
                          },
                        ]}>
                        vs
                      </Text>
                      <CommunityIcon
                        width={56}
                        style={{color: t.palette.primary_500}}
                      />
                    </View>
                  }
                  cardBgColor={cardBgColor}
                />
                <DataCard
                  title="Discourse Analysis"
                  onPress={() => navigation.navigate('DiscourseAnalysis')}
                  icon={
                    <MessageIcon
                      width={48}
                      style={{color: t.palette.primary_500}}
                    />
                  }
                  cardBgColor={cardBgColor}
                />
                <DataCard
                  title="Map"
                  onPress={() => navigation.navigate('Map')}
                  icon={
                    <GlobeIcon
                      width={48}
                      style={{color: t.palette.primary_500}}
                    />
                  }
                  cardBgColor={cardBgColor}
                />
                <DataCard
                  title="Compass"
                  onPress={() => navigation.navigate('Compass')}
                  icon={
                    <CompassIcon
                      width={48}
                      style={{color: t.palette.primary_500}}
                    />
                  }
                  cardBgColor={cardBgColor}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Layout.Center>

      {/* Floating Apply Button — Mobile Only */}
      {!IS_WEB && hasPendingChanges && (
        <TouchableOpacity
          style={[
            styles.floatingApplyButton,
            {backgroundColor: t.palette.primary_500},
          ]}
          onPress={handleApplyFilters}
          accessibilityRole="button"
          accessibilityLabel={_(msg`Apply filters`)}
          accessibilityHint={_(
            msg`Applies the selected filters to the results`,
          )}>
          <Text style={styles.floatingApplyText}>
            <Trans>Apply ({selectedFilters.length})</Trans>
          </Text>
        </TouchableOpacity>
      )}

      {/* Floating Action Button */}
      {hasSession && (
        <FAB
          testID="composeFAB"
          onPress={handleCreatePost}
          icon={<ComposeIcon strokeWidth={1.5} size={29} style={s.white} />}
          accessibilityRole="button"
          accessibilityLabel={_(msg({message: `New post`, context: 'action'}))}
          accessibilityHint=""
        />
      )}
    </Layout.Screen>
  )
}

// ---------------------------------------------------------------------------
// Styles — only styles actually referenced above
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  myBaseButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: -14,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{translateY: -3}],
  },
  tabItem: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
    position: 'relative',
  },
  tabItemActive: {
    // Active state handled by text color
  },
  tabText: {
    // Font styling via atoms (a.text_md, a.font_semi_bold)
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 2,
  },
  feedSection: {
    flex: 1,
  },
  feedContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  dataScreen: {
    flex: 1,
  },
  dataScreenContent: {
    padding: 16,
  },
  dataSection: {
    marginBottom: 24,
  },
  firstDataSection: {
    marginBottom: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dataCard: {
    width: '48%',
    aspectRatio: 1.2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  emptyDataCard: {
    opacity: 0.35,
  },
  dataCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  dataCardIconWrap: {
    alignSelf: 'center',
    marginTop: -32,
  },
  raqIconWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  raqIconBackMark: {
    opacity: 0.16,
    position: 'absolute',
    transform: [{scale: 1.12}],
  },
  flairSymbol: {
    fontSize: 24,
    lineHeight: 32,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingApplyButton: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingApplyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
})
