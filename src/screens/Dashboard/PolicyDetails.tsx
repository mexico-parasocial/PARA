import {useMemo} from 'react'
import {ScrollView, StyleSheet, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {
  type CabildeoCommunityBreakdown,
  type CabildeoPositionRecord,
} from '#/lib/api/para-lexicons'
import {
  type CabildeoView,
  fromCabildeoRouteParam,
} from '#/lib/cabildeo-client'
import {
  getCabildeoBadge,
  getCabildeoCommunities,
  getCabildeoPhaseMeta,
  getCabildeoTotalParticipants,
  getViewerParticipation,
} from '#/lib/cabildeo-display'
import {CIVIC_TREE_LABELS} from '#/lib/civic-tree-labels'
import {REPRESENTATIVES} from '#/lib/mock-data'
import {
  evaluateCabildeoAccess,
  getAccessTierLabel,
} from '#/lib/official-civic-accounts'
import {getCommunityConsensusPermissions} from '#/lib/policy-consensus'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {
  useCabildeoPositionsQuery,
  useCabildeoQuery,
} from '#/state/queries/cabildeo'
import {useCommunityGovernanceQuery} from '#/state/queries/community-governance'
import {useViewerOfficialAccountsQuery} from '#/state/queries/official-civic-accounts'
import {useSession} from '#/state/session'
import {usePoliticalAffiliation} from '#/state/shell/political-affiliation'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useBreakpoints, useTheme, web} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {CompassMini} from '#/components/CompassMini'
import {ContributeToCommunityTreeDialog} from '#/components/ContributeToCommunityTreeDialog'
import * as Dialog from '#/components/Dialog'
import {ArrowShareRight_Stroke2_Corner2_Rounded as ShareIcon} from '#/components/icons/ArrowShareRight'
import {Bookmark as BookmarkIcon} from '#/components/icons/Bookmark'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import * as Layout from '#/components/Layout'
import {LinearGradientBackground} from '#/components/LinearGradientBackground'
import {ListMaybePlaceholder} from '#/components/Lists'
import {SaveToCollectionDialog} from '#/components/SaveToCollectionDialog'
import {type PolicyItem} from './types'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'PolicyDetails'>

type DetailMetric = {
  label: string
  value: string
}

type DetailOptionRow = {
  key: string
  label: string
  description?: string
  valueLabel: string
  secondaryLabel?: string
  share: number
  isLeading?: boolean
}

type DetailPositionRow = {
  id: string
  stanceLabel: string
  stanceColor: string
  stanceBackground: string
  text: string
  optionLabel?: string
}

type DetailSummaryChip = {
  label: string
  value: string
  color: string
  background: string
}

type DetailModel = {
  eyebrow: string
  title: string
  phaseLabel?: string
  phaseColor?: string
  categoryLabel: string
  categoryColor: string
  categoryBackground: string
  summary: string
  metrics: DetailMetric[]
  communities: string[]
  summaryChips: DetailSummaryChip[]
  viewerParticipation?: ReturnType<typeof getViewerParticipation>
  options: DetailOptionRow[]
  positions: DetailPositionRow[]
  cabildeoUri?: string
  governanceCommunity?: string
  communityImpact?: CabildeoCommunityBreakdown[]
  canParticipate?: boolean
}

function getStanceMeta(
  t: ReturnType<typeof useTheme>,
): Record<
  CabildeoPositionRecord['stance'],
  {label: string; color: string; background: string}
> {
  return {
    for: {
      label: 'For',
      color: t.palette.positive_600,
      background: t.palette.positive_500 + '15',
    },
    against: {
      label: 'Against',
      color: t.palette.negative_600,
      background: t.palette.negative_500 + '15',
    },
    amendment: {
      label: 'Amendment',
      color: t.palette.yellow,
      background: t.palette.yellow + '15',
    },
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(Math.round(value))
}

export function PolicyDetailsScreen({route, navigation}: Props) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const cabildeoUri = route.params?.cabildeoUri
    ? fromCabildeoRouteParam(route.params.cabildeoUri)
    : undefined
  const legacyItem = route.params?.item as PolicyItem | undefined
  const {currentAccount} = useSession()
  const isLoggedIn = Boolean(currentAccount)
  const {affiliations} = usePoliticalAffiliation()
  const {data: viewerOfficialAccounts = []} = useViewerOfficialAccountsQuery(
    REPRESENTATIVES,
    currentAccount?.did,
  )

  const {
    data: cabildeo = null,
    isFetched,
    isLoading,
    isError,
    refetch,
  } = useCabildeoQuery(cabildeoUri)
  const {
    data: positions = [],
    isLoading: isPositionsLoading,
    isError: isPositionsError,
    refetch: refetchPositions,
  } = useCabildeoPositionsQuery(cabildeoUri)

  const governanceCommunityName =
    cabildeo?.community || legacyItem?.community || ''
  const {data: governance} = useCommunityGovernanceQuery({
    communityName: governanceCommunityName,
    enabled: Boolean(governanceCommunityName),
  })
  const permissions = getCommunityConsensusPermissions(
    governance,
    currentAccount?.did,
  )
  const viewerOfficialControllers = viewerOfficialAccounts
    .map(account => account.viewerController)
    .filter(controller => Boolean(controller))
  const participationAccess = cabildeo
    ? evaluateCabildeoAccess({
        tier: cabildeo.minimumParticipationTier ?? 'signed_in',
        viewerDid: currentAccount?.did,
        officialControllers: viewerOfficialControllers,
      })
    : {allowed: isLoggedIn}

  const model = useMemo(() => {
    if (cabildeo) {
      return buildLiveDetailModel({
        cabildeo,
        positions,
        formatCount,
        isLoggedIn,
        canMeetParticipationTier: participationAccess.allowed,
        t,
      })
    }
    if (legacyItem) {
      return buildFallbackDetailModel({
        item: legacyItem,
        formatCount,
      })
    }
    return null
  }, [cabildeo, isLoggedIn, legacyItem, participationAccess.allowed, positions, t])

  const {gtMobile} = useBreakpoints()

  if (cabildeoUri && !cabildeo && (isLoading || !isFetched)) {
    return (
      <Layout.Screen>
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Details</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}>
          <Layout.Center>
            <View style={[styles.skeletonHero, t.atoms.bg_contrast_25]} />
            <View style={styles.metricGrid}>
              {[1, 2, 3, 4].map(i => (
                <View
                  key={i}
                  style={[styles.skeletonMetric, t.atoms.bg_contrast_25]}
                />
              ))}
            </View>
            <View style={[styles.skeletonSection, t.atoms.bg_contrast_25]} />
          </Layout.Center>
        </ScrollView>
      </Layout.Screen>
    )
  }

  if (cabildeoUri && isError) {
    return (
      <Layout.Screen>
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Details</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <ListMaybePlaceholder
          isLoading={false}
          isError={true}
          emptyType="page"
          emptyTitle="Debate unavailable"
          emptyMessage="We could not load this debate."
          onRetry={async () => {
            await Promise.all([refetch(), refetchPositions()])
          }}
        />
      </Layout.Screen>
    )
  }

  if (!model) {
    return (
      <Layout.Screen>
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Details</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <ListMaybePlaceholder
          isLoading={false}
          isError={false}
          emptyType="page"
          emptyTitle="No detail available"
          emptyMessage="There is no policy or matter detail to show here yet."
        />
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Details</Trans>
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>
            {model.eyebrow}
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          <SaveButton
            policyUri={route.params?.cabildeoUri || ''}
            policyTitle={model.title}
            policyCategory={model.categoryLabel}
            policyColor={model.categoryColor}
          />
          <Button
            label="Share"
            size="small"
            variant="ghost"
            color="secondary"
            shape="round"
            onPress={() => {
              // Share logic
            }}>
            <ButtonIcon icon={ShareIcon} size="lg" />
          </Button>
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          {paddingBottom: insets.bottom + 48},
        ]}>
        <Layout.Center style={a.fade_in}>
          {/* HERO SECTION V2 */}
          <View style={[styles.heroWrapper, gtMobile && styles.heroWrapperWeb]}>
            <LinearGradientBackground
              colors={[
                model.categoryColor + '40',
                model.categoryColor + '10',
                t.palette.contrast_25,
              ]}
              style={[StyleSheet.absoluteFill, {borderRadius: 8}]}
            />
            <View style={styles.heroContent}>
              <View style={styles.heroTopRow}>
                <View
                  style={[
                    styles.heroBadge,
                    {backgroundColor: model.categoryBackground},
                  ]}>
                  <Text
                    style={[
                      styles.heroBadgeText,
                      {color: model.categoryColor},
                    ]}>
                    {model.categoryLabel}
                  </Text>
                </View>
                {model.phaseLabel ? (
                  <View
                    style={[
                      styles.phaseBadge,
                      {backgroundColor: model.phaseColor + '20'},
                    ]}>
                    <Text style={[styles.phaseText, {color: model.phaseColor}]}>
                      {model.phaseLabel}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.heroTitle, t.atoms.text]}>
                {model.title}
              </Text>
              <Text style={[styles.heroSummary, t.atoms.text_contrast_medium]}>
                {model.summary}
              </Text>

              <View style={styles.heroFooter}>
                {model.viewerParticipation ? (
                  <View
                    style={[
                      styles.viewerChip,
                      {
                        backgroundColor:
                          model.viewerParticipation.accentBackground,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.viewerChipText,
                        {color: model.viewerParticipation.accentColor},
                      ]}>
                      {model.viewerParticipation.optionLabel
                        ? `${model.viewerParticipation.label}: ${model.viewerParticipation.optionLabel}`
                        : model.viewerParticipation.label}
                    </Text>
                  </View>
                ) : null}

                {model.communities.length > 0 ? (
                  <View style={styles.communityWrap}>
                    {model.communities.map(value => (
                      <View
                        key={value}
                        style={[
                          styles.communityChip,
                          t.atoms.bg_contrast_25,
                          t.atoms.border_contrast_low,
                        ]}>
                        <Text style={[styles.communityChipText, t.atoms.text]}>
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* METRIC GRID V2 */}
          <View style={styles.metricGrid}>
            {model.metrics.map(metric => (
              <View
                key={metric.label}
                style={[
                  styles.metricCard,
                  t.atoms.bg_contrast_25,
                  t.atoms.border_contrast_low,
                  gtMobile && styles.metricCardWeb,
                ]}>
                <Text
                  style={[
                    styles.metricCardLabel,
                    t.atoms.text_contrast_medium,
                  ]}>
                  {metric.label}
                </Text>
                <Text style={[styles.metricCardValue, t.atoms.text]}>
                  {metric.value}
                </Text>
              </View>
            ))}
          </View>

          {cabildeo ? (
            <View
              style={[
                styles.accessCard,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_low,
              ]}>
              <View style={styles.accessCardRow}>
                <View style={styles.accessCardItem}>
                  <Text
                    style={[
                      styles.accessCardLabel,
                      t.atoms.text_contrast_medium,
                    ]}>
                    Ver
                  </Text>
                  <Text style={[styles.accessCardValue, t.atoms.text]}>
                    {getAccessTierLabel(cabildeo.minimumViewTier)}
                  </Text>
                </View>
                <View style={styles.accessCardItem}>
                  <Text
                    style={[
                      styles.accessCardLabel,
                      t.atoms.text_contrast_medium,
                    ]}>
                    Participar
                  </Text>
                  <Text style={[styles.accessCardValue, t.atoms.text]}>
                    {getAccessTierLabel(cabildeo.minimumParticipationTier)}
                  </Text>
                </View>
              </View>
              {!participationAccess.allowed ? (
                <Text style={[styles.accessCardNotice, t.atoms.text_contrast_medium]}>
                  {isLoggedIn
                    ? 'Este cabildeo puede leerse, pero requiere otro tier para votar o publicar posición.'
                    : 'Inicia sesión para votar, ceder voto o publicar una posición.'}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* QUICK PARTICIPATION V2.1 */}
          {model.canParticipate && (
            <View
              style={[
                styles.participationSection,
                t.atoms.border_contrast_low,
                t.atoms.bg_contrast_25,
              ]}>
              <View style={a.flex_1}>
                <Text style={[a.font_bold, a.text_lg, t.atoms.text, a.mb_xs]}>
                  <Trans>Have your voice heard</Trans>
                </Text>
                <Text
                  style={[t.atoms.text_contrast_medium, a.text_sm, a.mb_md]}>
                  <Trans>
                    You haven't participated in this debate yet. Weigh in to
                    influence the consensus.
                  </Trans>
                </Text>
              </View>
              <View style={[a.flex_row, a.gap_sm, a.flex_wrap]}>
                <Button
                  label="Vote now"
                  onPress={() => {
                    if (model.cabildeoUri) {
                      navigation.navigate('CabildeoDetail', {
                        cabildeoUri: model.cabildeoUri,
                      })
                    }
                  }}
                  size="small"
                  variant="solid"
                  color="primary">
                  <ButtonText>
                    <Trans>Vote now</Trans>
                  </ButtonText>
                </Button>
                <Button
                  label="Write position"
                  onPress={() => {
                    if (model.cabildeoUri) {
                      navigation.navigate('CreatePosition', {
                        cabildeoUri: model.cabildeoUri,
                      })
                    }
                  }}
                  size="small"
                  variant="outline"
                  color="secondary">
                  <ButtonText>
                    <Trans>Write position</Trans>
                  </ButtonText>
                </Button>
              </View>
            </View>
          )}

          {/* COMMUNITY IMPACT V2.1 */}
          {model.communityImpact && model.communityImpact.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                <Trans>Community alignment</Trans>
              </Text>
              <View
                style={[
                  styles.impactContainer,
                  t.atoms.bg_contrast_25,
                  t.atoms.border_contrast_low,
                ]}>
                {model.communityImpact.map(impact => (
                  <View key={impact.community} style={styles.impactRow}>
                    <View style={a.flex_1}>
                      <Text style={[a.font_bold, t.atoms.text]}>
                        {impact.community}
                      </Text>
                      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                        {impact.participation} participation
                      </Text>
                    </View>
                    <View style={[styles.impactBadge, t.atoms.bg_contrast_50]}>
                      <Text style={[styles.impactBadgeText, t.atoms.text]}>
                        Option #{impact.dominantOption + 1}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* OPTIONS V2 */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                <Trans>Option breakdown</Trans>
              </Text>
            </View>
            {model.options.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  t.atoms.bg_contrast_25,
                  t.atoms.border_contrast_low,
                ]}>
                <Text style={[styles.emptyStateTitle, t.atoms.text]}>
                  No option analytics yet
                </Text>
                <Text
                  style={[styles.emptyStateText, t.atoms.text_contrast_medium]}>
                  Once the backend publishes option-level vote totals, the
                  breakdown will appear here automatically.
                </Text>
              </View>
            ) : (
              <View style={styles.optionList}>
                {model.options.map(option => (
                  <View
                    key={option.key}
                    style={[
                      styles.optionCardV2,
                      t.atoms.bg_contrast_25,
                      t.atoms.border_contrast_low,
                    ]}>
                    <View style={styles.optionHeader}>
                      <View style={a.flex_1}>
                        <View style={styles.optionTitleRow}>
                          <Text style={[styles.optionTitle, t.atoms.text]}>
                            {option.label}
                          </Text>
                          {option.isLeading ? (
                            <View
                              style={[
                                styles.leadingBadge,
                                {
                                  backgroundColor:
                                    t.palette.positive_500 + '15',
                                },
                              ]}>
                              <Text
                                style={[
                                  styles.leadingBadgeText,
                                  {color: t.palette.positive_600},
                                ]}>
                                Leading
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {option.description ? (
                          <Text
                            style={[
                              styles.optionDescription,
                              t.atoms.text_contrast_medium,
                            ]}>
                            {option.description}
                          </Text>
                        ) : null}
                      </View>
                      <View style={a.align_end}>
                        <Text style={[styles.optionValue, t.atoms.text]}>
                          {Math.round(option.share * 100)}%
                        </Text>
                        <Text
                          style={[
                            styles.optionSecondary,
                            t.atoms.text_contrast_medium,
                          ]}>
                          {option.valueLabel.split(' ')[0]}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.optionBarTrack,
                        {backgroundColor: t.palette.contrast_100},
                      ]}>
                      <View
                        style={[
                          styles.optionBarFill,
                          {
                            width: `${Math.max(
                              option.share * 100,
                              option.share > 0 ? 8 : 0,
                            )}%`,
                            backgroundColor: model.categoryColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* POSITIONS V2 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, t.atoms.text]}>
              <Trans>Recent positions</Trans>
            </Text>
            {model.positions.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  t.atoms.bg_contrast_25,
                  t.atoms.border_contrast_low,
                ]}>
                <Text style={[styles.emptyStateTitle, t.atoms.text]}>
                  {cabildeoUri && isPositionsLoading
                    ? 'Loading positions...'
                    : 'No positions yet'}
                </Text>
                <Text
                  style={[styles.emptyStateText, t.atoms.text_contrast_medium]}>
                  {cabildeoUri && isPositionsError
                    ? 'We could not load the latest written positions for this debate.'
                    : 'As people publish positions, the latest ones will appear here.'}
                </Text>
              </View>
            ) : (
              <View style={styles.positionList}>
                {model.positions.map(position => (
                  <View
                    key={position.id}
                    style={[
                      styles.positionCardV2,
                      t.atoms.bg_contrast_25,
                      t.atoms.border_contrast_low,
                    ]}>
                    <View style={styles.positionHeader}>
                      <View
                        style={[
                          styles.positionBadge,
                          {backgroundColor: position.stanceBackground},
                        ]}>
                        <Text
                          style={[
                            styles.positionBadgeText,
                            {color: position.stanceColor},
                          ]}>
                          {position.stanceLabel}
                        </Text>
                      </View>
                      {position.optionLabel ? (
                        <Text
                          style={[
                            styles.positionOptionLabel,
                            t.atoms.text_contrast_medium,
                          ]}>
                          {position.optionLabel}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.positionText, t.atoms.text]}>
                      {position.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* GOVERNANCE V2 */}
          {model.governanceCommunity ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                <Trans>Governance permissions</Trans>
              </Text>
              <View
                style={[
                  styles.governanceCardV2,
                  t.atoms.bg_contrast_25,
                  t.atoms.border_contrast_low,
                ]}>
                <View style={[a.flex_row, a.align_center, a.gap_md, a.mb_md]}>
                  <CompassMini size={40} affiliations={affiliations} compact />
                  <View style={a.flex_1}>
                    <Text style={[a.font_bold, t.atoms.text]}>
                      {model.governanceCommunity}
                    </Text>
                    <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                      {governance
                        ? `Published governance is active.`
                        : `No published governance record found.`}
                    </Text>
                  </View>
                </View>

                <View style={styles.permissionChipRow}>
                  {(permissions.roles.length > 0
                    ? permissions.roles
                    : ['member']
                  ).map(role => (
                    <View
                      key={role}
                      style={[
                        styles.permissionChip,
                        t.atoms.bg_contrast_25,
                        t.atoms.border_contrast_low,
                      ]}>
                      <Text style={[styles.permissionChipText, t.atoms.text]}>
                        {role}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.permissionList}>
                  <PermissionItem
                    label={
                      permissions.canPropose
                        ? 'Can propose policy drafts'
                        : 'Cannot propose official policy drafts'
                    }
                    active={permissions.canPropose}
                  />
                  <PermissionItem
                    label={
                      permissions.canVote
                        ? 'Can vote in weighted consensus'
                        : 'Cannot cast weighted votes'
                    }
                    active={permissions.canVote}
                  />
                  <PermissionItem
                    label={
                      permissions.canCertify
                        ? 'Can certify outcomes'
                        : 'Cannot certify outcomes'
                    }
                    active={permissions.canCertify}
                  />
                </View>
              </View>
            </View>
          ) : null}

          {model.cabildeoUri ? (
            <View style={[styles.section, a.mt_lg]}>
              <Button
                label="Open full debate"
                onPress={() =>
                  navigation.navigate('CabildeoDetail', {
                    cabildeoUri: model.cabildeoUri!,
                  })
                }
                size="large"
                variant="solid"
                color="primary"
                shape="default"
                style={styles.fullDebateButton}>
                <ButtonText style={a.font_bold}>
                  <Trans>Open full debate</Trans>
                </ButtonText>
              </Button>
            </View>
          ) : null}
        </Layout.Center>
      </ScrollView>
    </Layout.Screen>
  )
}

function PermissionItem({label, active}: {label: string; active: boolean}) {
  const t = useTheme()
  return (
    <View style={[a.flex_row, a.align_center, a.gap_sm, a.py_xs]}>
      <View
        style={[
          {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: active
              ? t.palette.positive_500
              : t.palette.contrast_200,
          },
        ]}
      />
      <Text
        style={[
          a.text_sm,
          active ? t.atoms.text : t.atoms.text_contrast_medium,
        ]}>
        {label}
      </Text>
    </View>
  )
}

function buildLiveDetailModel({
  cabildeo,
  positions,
  formatCount,
  isLoggedIn,
  canMeetParticipationTier,
  t,
}: {
  cabildeo: CabildeoView
  positions: CabildeoPositionRecord[]
  formatCount: (value: number) => string
  isLoggedIn: boolean
  canMeetParticipationTier: boolean
  t: ReturnType<typeof useTheme>
}): DetailModel {
  const badge = getCabildeoBadge(cabildeo)
  const phase = getCabildeoPhaseMeta(cabildeo.phase)
  const communities = getCabildeoCommunities(cabildeo)
  const participants = getCabildeoTotalParticipants(cabildeo)
  const optionBase =
    cabildeo.outcome?.effectiveTotalPower ||
    cabildeo.voteTotals.total ||
    cabildeo.positionCounts.total ||
    1
  const leadingOptionIndex =
    cabildeo.outcome?.winningOption ??
    [...cabildeo.optionSummary].sort(
      (a, b) => b.votes - a.votes || b.positions - a.positions,
    )[0]?.optionIndex

  return {
    eyebrow: badge.kind === 'policy' ? 'Policy debate' : 'Matter debate',
    title: cabildeo.title,
    phaseLabel: phase.label,
    phaseColor: phase.color,
    categoryLabel: badge.label,
    categoryColor: badge.color,
    categoryBackground: badge.bgColor,
    summary: cabildeo.description,
    metrics: [
      {label: 'Participants', value: formatCount(participants)},
      {label: 'Votes', value: formatCount(cabildeo.voteTotals.total)},
      {label: 'Positions', value: formatCount(cabildeo.positionCounts.total)},
      {label: 'Ceded', value: formatCount(cabildeo.voteTotals.delegated)},
    ],
    communities,
    summaryChips: [
      {
        label: 'For',
        value: formatCount(cabildeo.positionCounts.for),
        color: t.palette.positive_600,
        background: t.palette.positive_500 + '15',
      },
      {
        label: 'Against',
        value: formatCount(cabildeo.positionCounts.against),
        color: t.palette.negative_600,
        background: t.palette.negative_500 + '15',
      },
      {
        label: 'Amendment',
        value: formatCount(cabildeo.positionCounts.amendment),
        color: t.palette.yellow,
        background: t.palette.yellow + '15',
      },
    ],
    viewerParticipation: getViewerParticipation(cabildeo) || undefined,
    options: cabildeo.options.map((option, index) => {
      const summary = cabildeo.optionSummary.find(
        item => item.optionIndex === index,
      )
      const resolved = cabildeo.outcome?.breakdown.find(
        item => item.optionIndex === index,
      )
      const primaryValue =
        typeof resolved?.effectiveVotes === 'number'
          ? resolved.effectiveVotes
          : summary?.votes || 0
      return {
        key: `${cabildeo.uri}:${index}`,
        label: option.label,
        description: option.description,
        valueLabel:
          cabildeo.outcome?.breakdown.length && resolved
            ? `${formatCount(resolved.effectiveVotes)} effective votes`
            : `${formatCount(summary?.votes || 0)} votes`,
        secondaryLabel:
          summary?.positions || 0
            ? `${formatCount(summary?.positions || 0)} positions`
            : undefined,
        share: primaryValue / optionBase,
        isLeading: leadingOptionIndex === index,
      }
    }),
    positions: [...positions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4)
      .map((position, index) => {
        const meta = getStanceMeta(t)[position.stance]
        return {
          id: `${position.createdAt}:${index}`,
          stanceLabel: meta.label,
          stanceColor: meta.color,
          stanceBackground: meta.background,
          text: position.text,
          optionLabel:
            typeof position.optionIndex === 'number'
              ? cabildeo.options[position.optionIndex]?.label
              : undefined,
        }
      }),
    cabildeoUri: cabildeo.uri,
    governanceCommunity: cabildeo.community,
    communityImpact: cabildeo.outcome?.communityBreakdown,
    canParticipate:
      isLoggedIn &&
      canMeetParticipationTier &&
      cabildeo.phase !== 'resolved' &&
      cabildeo.phase !== 'draft' &&
      !cabildeo.userContext?.viewerVoteOption,
  }
}

function buildFallbackDetailModel({
  item,
  formatCount,
}: {
  item: PolicyItem
  formatCount: (value: number) => string
}): DetailModel {
  const isPolicy = item.type === 'Policy'
  const categoryColor = item.color || (isPolicy ? '#2563EB' : '#EA580C')
  const categoryBackground = `${categoryColor}20`
  const metrics: DetailMetric[] = []

  if (typeof item.support === 'number') {
    metrics.push({label: 'Support', value: `${formatCount(item.support)}%`})
  }
  if (typeof item.mentions === 'number') {
    metrics.push({label: 'Mentions', value: formatCount(item.mentions)})
  }
  if (typeof item.match === 'number') {
    metrics.push({label: 'Match', value: `${formatCount(item.match)}%`})
  }
  metrics.push({label: 'Source', value: item.promotedBy})

  return {
    eyebrow: isPolicy ? 'Policy summary' : 'Matter summary',
    title: item.title,
    categoryLabel: item.category,
    categoryColor,
    categoryBackground,
    summary:
      item.type === 'Policy'
        ? 'This view is using feed-level summary data. Full debate analytics will appear automatically once this item is linked to a live backend debate record.'
        : 'This view is using feed-level matter summary data. Full backend debate details will appear here once a live record is available.',
    metrics,
    communities: [item.party, item.community, item.state].filter(
      (value): value is string => Boolean(value),
    ),
    summaryChips: [
      {
        label: 'Promoted by',
        value: item.promotedBy,
        color: categoryColor,
        background: categoryBackground,
      },
    ],
    options: [],
    positions: [],
    governanceCommunity: item.community,
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  heroWrapper: {
    borderRadius: 8,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  heroWrapperWeb: {
    padding: 8,
  },
  heroContent: {
    padding: 18,
    gap: 12,
    ...web({
      backdropFilter: 'blur(20px)',
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  phaseBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  phaseText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    letterSpacing: 0,
  },
  heroSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  viewerChip: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewerChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  communityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  communityChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  communityChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    ...web({
      transition: 'transform 0.2s ease',
      ':hover': {
        transform: 'translateY(-4px)',
      },
    }),
  },
  metricCardWeb: {
    minWidth: 120,
  },
  metricCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  metricCardValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  accessCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  accessCardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  accessCardItem: {
    flex: 1,
  },
  accessCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  accessCardValue: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
  accessCardNotice: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 12,
  },
  optionList: {
    gap: 12,
  },
  optionCardV2: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  leadingBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  leadingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  optionSecondary: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionBarTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  optionBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  positionList: {
    gap: 12,
  },
  positionCardV2: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  positionBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  positionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  positionOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  positionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  governanceCardV2: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  permissionChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  permissionChip: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  permissionChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  permissionList: {
    gap: 8,
  },
  fullDebateButton: {
    borderRadius: 8,
    height: 56,
  },
  emptyStateCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  skeletonHero: {
    height: 240,
    borderRadius: 8,
    marginBottom: 18,
  },
  skeletonMetric: {
    flex: 1,
    minWidth: 140,
    height: 100,
    borderRadius: 8,
  },
  skeletonSection: {
    height: 160,
    borderRadius: 8,
    marginBottom: 18,
  },
  participationSection: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    ...web({
      flexWrap: 'wrap',
    }),
  },
  impactContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  impactBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  impactBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
})

function SaveButton({
  policyUri,
  policyTitle,
  policyCategory,
  policyColor,
}: {
  policyUri: string
  policyTitle?: string
  policyCategory?: string
  policyColor?: string
}) {
  const control = Dialog.useDialogControl()
  const contributeControl = Dialog.useDialogControl()
  if (!policyUri) return null
  const title = policyTitle || policyUri
  return (
    <>
      <Button
        label={CIVIC_TREE_LABELS.savePersonal}
        size="small"
        variant="ghost"
        color="secondary"
        shape="round"
        onPress={control.open}>
        <ButtonIcon icon={BookmarkIcon} size="lg" />
      </Button>
      <SaveToCollectionDialog
        control={control}
        policyUri={policyUri}
        policyTitle={policyTitle}
        policyCategory={policyCategory}
        policyColor={policyColor}
      />
      <Button
        label={CIVIC_TREE_LABELS.contributeCommunity}
        size="small"
        variant="ghost"
        color="secondary"
        shape="round"
        onPress={contributeControl.open}>
        <ButtonIcon icon={TreeIcon} size="lg" />
      </Button>
      <ContributeToCommunityTreeDialog
        control={contributeControl}
        sourceUri={policyUri}
        title={title}
        category={policyCategory}
      />
    </>
  )
}
