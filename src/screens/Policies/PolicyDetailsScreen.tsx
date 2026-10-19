import {useEffect} from 'react'
import {ScrollView, StyleSheet, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {AtUri} from '@atproto/syntax'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {
  fromCabildeoRouteParam,
  toCabildeoRouteParams,
} from '#/lib/cabildeo-client'
import {resolveMatter} from '#/lib/matter-filter'
import {
  formatSignal,
  getMatterTag,
  getSignalColor,
  getSignalLabel,
} from '#/lib/policy-display'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {useCommunityBoardQuery} from '#/state/queries/community-boards'
import {
  usePolicyPostQuery,
  usePolicyTallyQuery,
} from '#/state/queries/policy-tally'
import {useViewerPolicySignalsQuery} from '#/state/queries/policy-vote'
import {SaveButton} from '#/screens/Dashboard/SaveButton'
import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {PolicyBallotControl} from '#/components/civic/PolicyBallotControl'
import {
  PolicyConsensusPanel,
  PolicyStanding,
} from '#/components/civic/PolicyConsensus'
import * as Layout from '#/components/Layout'
import {LinearGradientBackground} from '#/components/LinearGradientBackground'
import {ListMaybePlaceholder} from '#/components/Lists'
import {Text} from '#/components/Typography'
import {formatPolicyDate, getPolicyPostParts} from './PolicyCard'
import {PolicyCommunityVotes} from './PolicyCommunityVotes'
import {RelatedPolicies} from './RelatedPolicies'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'PolicyDetails'>

const DEFAULT_ACCENT = '#2563EB'
const CABILDEO_COLLECTION = 'com.para.civic.cabildeo'

function safeCollection(uri: string) {
  try {
    return new AtUri(uri).collection
  } catch {
    return ''
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(Math.round(value))
}

function Card({children}: {children: React.ReactNode}) {
  const t = useTheme()
  return (
    <View
      style={[
        a.rounded_md,
        a.border,
        a.p_lg,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
      ]}>
      {children}
    </View>
  )
}

function SectionTitleText({children}: {children: React.ReactNode}) {
  const t = useTheme()
  return (
    <Text style={[a.text_lg, a.font_bold, a.mb_md, t.atoms.text]}>
      {children}
    </Text>
  )
}

/**
 * Policy details. A policy is voted on from -3 to +3, so the page leads with
 * the vote and the community's standing instead of the options, phases and
 * governance of a debate, which belong to Lobbying.
 */
export function PolicyDetailsScreen({route, navigation}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const insets = useSafeAreaInsets()
  const {gtMobile} = useBreakpoints()

  const rawUri = route.params?.policyUri ?? route.params?.cabildeoUri
  const subjectUri = route.params?.policyUri
    ? route.params.policyUri
    : rawUri
      ? fromCabildeoRouteParam(rawUri)
      : undefined
  // Older links and saved items reach this route with a debate's URI.
  const isDebate =
    subjectUri !== undefined &&
    safeCollection(subjectUri) === CABILDEO_COLLECTION
  const policyUri = isDebate ? undefined : subjectUri

  useEffect(() => {
    if (isDebate && subjectUri) {
      navigation.replace('CabildeoDetail', {
        cabildeoUri: toCabildeoRouteParams({uri: subjectUri}).cabildeoUri,
      })
    }
  }, [isDebate, navigation, subjectUri])

  const {
    data: post,
    isLoading,
    isError,
    refetch,
  } = usePolicyPostQuery(policyUri)
  const {data: tally, isLoading: isTallyLoading} =
    usePolicyTallyQuery(policyUri)
  const {data: signals} = useViewerPolicySignalsQuery()
  const viewerSignal = policyUri ? signals?.[policyUri] : undefined
  const {data: board} = useCommunityBoardQuery({
    communityId: tally?.community || undefined,
  })

  const header = (
    <Layout.Header.Outer>
      <Layout.Header.BackButton />
      <Layout.Header.Content>
        <Layout.Header.TitleText>
          <Trans>Policy</Trans>
        </Layout.Header.TitleText>
      </Layout.Header.Content>
      {post && policyUri ? (
        <View style={[a.flex_row, a.align_center, a.z_50]}>
          <SaveButton
            policyUri={policyUri}
            policyTitle={getPolicyPostParts(post).title}
            policyCategory={getPolicyPostParts(post).badges[0]?.label}
            policyColor={getPolicyPostParts(post).badges[0]?.color}
          />
        </View>
      ) : (
        <Layout.Header.Slot />
      )}
    </Layout.Header.Outer>
  )

  if (isDebate || isLoading) {
    return (
      <Layout.Screen>
        {header}
        <ListMaybePlaceholder isLoading isError={false} />
      </Layout.Screen>
    )
  }

  if (isError) {
    return (
      <Layout.Screen>
        {header}
        <ListMaybePlaceholder
          isLoading={false}
          isError
          onRetry={refetch}
          emptyType="page"
          errorTitle={_(msg`No se pudo cargar la policy`)}
          errorMessage={_(msg`Revisa tu conexión e inténtalo de nuevo.`)}
        />
      </Layout.Screen>
    )
  }

  if (!post || !policyUri) {
    return (
      <Layout.Screen>
        {header}
        <ListMaybePlaceholder
          isLoading={false}
          isError={false}
          emptyType="page"
          emptyTitle={_(msg`Policy no disponible`)}
          emptyMessage={_(msg`Esta policy ya no existe o no se puede mostrar.`)}
        />
      </Layout.Screen>
    )
  }

  const {record, title, body, badges} = getPolicyPostParts(post)
  const accent = badges[0]?.color ?? DEFAULT_ACCENT
  const matterTag = getMatterTag(record.flairs)
  // Only matters from the catalog's six groups are shown; a flair outside them
  // is not a matter the app recognises.
  const resolved = matterTag ? resolveMatter(matterTag) : undefined
  const matter = resolved?.official ? resolved : undefined
  const author = post.author.displayName || `@${post.author.handle}`
  const meta = [board?.board.name, author, formatPolicyDate(record.createdAt)]
    .filter(Boolean)
    .join(' · ')
  const metrics = tally
    ? [
        {label: _(msg`Votos`), value: formatCount(tally.voteCount)},
        {label: _(msg`Directos`), value: formatCount(tally.directVoteCount)},
        {
          label: _(msg`Delegados`),
          value: formatCount(tally.delegatedVoteCount),
        },
      ]
    : []

  return (
    <Layout.Screen>
      {header}
      <Layout.Center style={[styles.center, a.fade_in]}>
        <ScrollView
          style={styles.center}
          contentContainerStyle={[
            styles.content,
            {paddingBottom: insets.bottom + 100},
          ]}>
          <View style={[styles.hero, gtMobile && styles.heroWide]}>
            <LinearGradientBackground
              colors={[accent + '40', accent + '10', t.palette.contrast_25]}
              style={[StyleSheet.absoluteFill, {borderRadius: 8}]}
            />
            <View style={[a.p_xl, a.gap_md]}>
              <View style={[a.flex_row, a.align_center, a.gap_sm, a.flex_wrap]}>
                {badges.slice(0, 2).map(badge => (
                  <View
                    key={badge.key}
                    style={[
                      a.rounded_xs,
                      {
                        backgroundColor: badge.bgColor,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      },
                    ]}>
                    <Text
                      style={[a.text_xs, a.font_bold, {color: badge.color}]}>
                      {badge.label}
                    </Text>
                  </View>
                ))}
                {matter ? (
                  <View
                    style={[
                      a.rounded_xs,
                      {
                        backgroundColor: matter.color + '22',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      },
                    ]}>
                    <Text
                      style={[a.text_xs, a.font_bold, {color: matter.color}]}>
                      {matter.label}
                    </Text>
                  </View>
                ) : null}
                {tally?.official ? (
                  <Text
                    style={[
                      a.text_xs,
                      a.font_bold,
                      {color: t.palette.primary_500},
                    ]}>
                    <Trans>OFICIAL</Trans>
                  </Text>
                ) : null}
                {tally?.certified ? (
                  <Text
                    style={[
                      a.text_xs,
                      a.font_bold,
                      {color: t.palette.positive_600},
                    ]}>
                    <Trans>CERTIFICADA</Trans>
                  </Text>
                ) : null}
              </View>
              <Text
                style={[
                  {fontSize: 24, lineHeight: 30, fontWeight: '900'},
                  t.atoms.text,
                ]}>
                {title}
              </Text>
              {body ? (
                <Text
                  style={[
                    a.text_md,
                    a.leading_relaxed,
                    t.atoms.text_contrast_medium,
                  ]}>
                  {body}
                </Text>
              ) : null}
              {meta ? (
                <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  {meta}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={[a.gap_xl]}>
            <View>
              <SectionTitleText>
                <Trans>Tu posición</Trans>
              </SectionTitleText>
              <Card>
                <View style={[a.flex_row, a.align_center, a.gap_lg]}>
                  <PolicyBallotControl
                    policyUri={policyUri}
                    variant="vertical"
                    showNotice={false}
                  />
                  <View style={[a.flex_1, a.gap_xs]}>
                    {viewerSignal === undefined ? (
                      <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                        <Trans>Aún no votas</Trans>
                      </Text>
                    ) : (
                      <Text
                        style={[
                          a.text_md,
                          a.font_bold,
                          {color: getSignalColor(viewerSignal)},
                        ]}>
                        {formatSignal(viewerSignal)} ·{' '}
                        {getSignalLabel(viewerSignal)}
                      </Text>
                    )}
                    <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                      <Trans>
                        Sube o baja de -3 a +3. Solo cuenta tu voto más
                        reciente.
                      </Trans>
                    </Text>
                  </View>
                </View>
                {viewerSignal !== undefined && tally && tally.voteCount > 0 ? (
                  <View style={[a.mt_lg]}>
                    <PolicyStanding viewerSignal={viewerSignal} tally={tally} />
                  </View>
                ) : null}
              </Card>
            </View>

            <View>
              <SectionTitleText>
                <Trans>En tu comunidad</Trans>
              </SectionTitleText>
              <Card>
                <PolicyCommunityVotes
                  policyUri={policyUri}
                  policyCommunity={tally?.community}
                />
              </Card>
            </View>

            <View>
              <SectionTitleText>
                <Trans>Consenso</Trans>
              </SectionTitleText>
              <Card>
                {isTallyLoading ? (
                  <View
                    style={[
                      a.rounded_xs,
                      t.atoms.bg_contrast_50,
                      {height: 160, opacity: 0.6},
                    ]}
                  />
                ) : (
                  <PolicyConsensusPanel tally={tally ?? null} />
                )}
              </Card>
            </View>

            {metrics.length > 0 ? (
              <View style={styles.metricGrid}>
                {metrics.map(metric => (
                  <View
                    key={metric.label}
                    style={[
                      styles.metric,
                      a.rounded_md,
                      a.border,
                      t.atoms.bg_contrast_25,
                      t.atoms.border_contrast_low,
                    ]}>
                    <Text
                      style={[
                        a.text_xs,
                        a.font_bold,
                        t.atoms.text_contrast_medium,
                      ]}>
                      {metric.label}
                    </Text>
                    <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
                      {metric.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {matter ? (
              <RelatedPolicies
                matter={matter}
                excludeUri={policyUri}
                onOpen={uri =>
                  navigation.push('PolicyDetails', {policyUri: uri})
                }
              />
            ) : null}

            <Button
              label={_(msg`Ver discusión`)}
              size="large"
              variant="outline"
              color="secondary"
              onPress={() =>
                navigation.navigate('PostThread', {
                  name: post.author.did,
                  rkey: new AtUri(post.uri).rkey,
                  collection: new AtUri(post.uri).collection,
                })
              }>
              <ButtonText>
                <Trans>Ver discusión</Trans>
              </ButtonText>
            </Button>
          </View>
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  center: {flex: 1},
  content: {padding: 16},
  hero: {
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroWide: {padding: 8},
  metricGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  metric: {flexGrow: 1, flexBasis: '45%', padding: 14, gap: 4},
})
