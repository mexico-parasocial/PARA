import {useMemo} from 'react'
import {ScrollView, StyleSheet, View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {RAQ_AXES} from '#/lib/mock-data'
import {type NavigationProp} from '#/lib/routes/types'
import * as persisted from '#/state/persisted'
import {useUserAlignment} from '#/state/queries/raq'
import {useSession} from '#/state/session'
import {usePoliticalAffiliation} from '#/state/shell/political-affiliation'
import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {CircleQuestion_Stroke2_Corner2_Rounded as QuestionIcon} from '#/components/icons/CircleQuestion'
import {Compass_Stroke2_Corner0_Rounded as CompassIcon} from '#/components/icons/Compass'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

export function MyRAQScreen() {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const {currentAccount} = useSession()
  const {affiliations} = usePoliticalAffiliation()

  // Fetch published alignment from server
  const {
    data: serverAlignment,
    isLoading: _alignmentLoading,
  } = useUserAlignment(currentAccount?.did)

  const answers = persisted.get('raqAnswers') as Record<string, number> | undefined
  const rawResults = persisted.get('raqResults') as Array<
    | {id: string; title: string; score: number; label: string; labelLow?: string; labelHigh?: string; rawScore?: number}
    | {axisId: string; axisTitle: string; score: number; label: string; labelLow: string; labelHigh: string; rawScore: number}
  > | undefined

  // Normalize old format (axisId/axisTitle) to new format (id/title)
  const localResults = useMemo(() => {
    if (!rawResults) return undefined
    return rawResults.map(r => ({
      id: 'id' in r ? r.id : r.axisId,
      title: 'title' in r ? r.title : r.axisTitle,
      score: r.score,
      label: r.label,
      labelLow: 'labelLow' in r && r.labelLow !== undefined ? r.labelLow : '',
      labelHigh: 'labelHigh' in r && r.labelHigh !== undefined ? r.labelHigh : '',
      rawScore: 'rawScore' in r && r.rawScore !== undefined ? r.rawScore : 0,
    }))
  }, [rawResults])

  // Prefer server alignment if available, fallback to local results
  const results = useMemo(() => {
    if (serverAlignment?.results) {
      return serverAlignment.results.map(
        (r: {
          axisId: string
          axisTitle: string
          score: number
          label: string
          labelLow?: string
          labelHigh?: string
          rawScore?: number
        }) => ({
          id: r.axisId,
          title: r.axisTitle,
          score: r.score,
          label: r.label,
          labelLow: r.labelLow || '',
          labelHigh: r.labelHigh || '',
          rawScore: r.rawScore || 0,
        }),
      )
    }
    return localResults
  }, [serverAlignment, localResults])

  const totalQuestions = useMemo(
    () => RAQ_AXES.reduce((acc, axis) => acc + axis.data.length, 0),
    [],
  )
  const answeredCount = answers ? Object.keys(answers).length : 0
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100)

  const latestResult = results && results.length > 0 ? results[0] : null
  const hasResults = results && results.length > 0
  const averageScore = useMemo(() => {
    if (!results?.length) return progressPercent
    return Math.round(
      results.reduce((sum, result) => sum + result.score, 0) / results.length,
    )
  }, [progressPercent, results])
  const communityLabel =
    affiliations.find(affiliation => affiliation.type === 'party')?.name ??
    affiliations[0]?.name ??
    'your community'
  const communityMatch = Math.max(
    0,
    Math.min(100, Math.round(100 - Math.abs(averageScore - 52) * 1.4)),
  )
  const regionalDelta = averageScore - 48

  return (
    <Layout.Screen testID="myRaqScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>My RAQ</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}>
        <Layout.Center style={styles.center}>
          {/* Main Assessment CTA */}
          <View style={[styles.mainCard, t.atoms.bg_contrast_25]}>
            <View
              style={[
                styles.iconCircle,
                {backgroundColor: t.palette.primary_500 + '14'},
              ]}>
              <CompassIcon
                size="xl"
                style={[styles.iconBackMark, {color: t.palette.primary_500}]}
              />
              <QuestionIcon
                size="lg"
                style={{color: t.palette.primary_500}}
              />
            </View>
            <Text style={[styles.cardTitle, t.atoms.text]}>
              Assessment Status
            </Text>
            <Text style={[styles.cardDesc, t.atoms.text_contrast_medium]}>
              You have completed {answeredCount} of {totalQuestions} questions
              in the Official RAQ.
            </Text>

            {/* Progress Bar */}
            <View style={[styles.progressBarBg, t.atoms.bg_contrast_50]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: t.palette.primary_500,
                    width: `${progressPercent}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, t.atoms.text_contrast_medium]}>
              {progressPercent}% Complete
            </Text>

            <Button
              label={answeredCount > 0 ? 'Continue Assessment' : 'Start Assessment'}
              onPress={() => navigation.navigate('RAQAssessment')}
              size="large"
              variant="solid"
              color="primary"
              style={styles.ctaButton}>
              <ButtonText>
                {answeredCount > 0 ? 'Resume RAQ Assessment' : 'Start RAQ Assessment'}
              </ButtonText>
            </Button>
          </View>

          {/* Results Summary */}
          {hasResults && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                Latest Results
              </Text>
              <View style={[styles.resultCard, t.atoms.bg_contrast_25]}>
                <View style={styles.resultHeader}>
                  <Text
                    style={[styles.resultType, {color: t.palette.primary_500}]}>
                    OFFICIAL AXES
                  </Text>
                  {serverAlignment && (
                    <View style={[styles.publishedBadge, {backgroundColor: t.palette.primary_500}]}>
                      <Text style={styles.publishedBadgeText}>Published</Text>
                    </View>
                  )}
                  <Text style={[styles.resultDate, t.atoms.text_contrast_medium]}>
                    {new Date().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Text style={[styles.resultTitle, t.atoms.text]}>
                  {latestResult?.label ?? 'Centrist / Pragmatic'}
                </Text>
                <Text style={[styles.resultDesc, t.atoms.text_contrast_medium]}>
                  Based on your current progress, your strongest alignment is on
                  the {latestResult?.title ?? 'Economic Coordination'} axis.
                </Text>
                <Button
                  label="View full breakdown"
                  onPress={() => navigation.navigate('RAQResults', {results})}
                  size="large"
                  variant="outline"
                  color="primary"
                  style={styles.resultButton}>
                  <ButtonText>View full breakdown</ButtonText>
                </Button>
              </View>
            </View>
          )}

          {/* Participation Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, t.atoms.text]}>
              Community Questions
            </Text>
            <View style={styles.participationRow}>
              <View style={[styles.participationItem, t.atoms.bg_contrast_25]}>
                <Text style={[styles.pCount, t.atoms.text]}>{answeredCount}</Text>
                <Text style={[styles.pLabel, t.atoms.text_contrast_medium]}>
                  Answered
                </Text>
              </View>
              <View style={[styles.participationItem, t.atoms.bg_contrast_25]}>
                <Text style={[styles.pCount, t.atoms.text]}>0</Text>
                <Text style={[styles.pLabel, t.atoms.text_contrast_medium]}>
                  Proposed
                </Text>
              </View>
            </View>

            <View style={styles.comparisonRow}>
              <View style={[styles.comparisonItem, t.atoms.bg_contrast_25]}>
                <Text
                  style={[styles.comparisonValue, {color: t.palette.primary_500}]}>
                  {communityMatch}%
                </Text>
                <Text style={[styles.comparisonLabel, t.atoms.text]}>
                  <Trans>Match vs {communityLabel}</Trans>
                </Text>
              </View>
              <View style={[styles.comparisonItem, t.atoms.bg_contrast_25]}>
                <Text
                  style={[styles.comparisonValue, {color: t.palette.primary_500}]}>
                  {regionalDelta >= 0 ? '+' : ''}
                  {regionalDelta}
                </Text>
                <Text style={[styles.comparisonLabel, t.atoms.text]}>
                  <Trans>Regional lean</Trans>
                </Text>
              </View>
            </View>

            <Button
              label="Manage proposed questions"
              onPress={() => navigation.navigate('ProposedRAQList')}
              size="large"
              variant="solid"
              color="secondary"
              style={styles.manageButton}>
              <ButtonText>Manage proposed questions</ButtonText>
            </Button>
          </View>
        </Layout.Center>
      </ScrollView>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingBottom: 80},
  center: {paddingHorizontal: 16, paddingTop: 16},
  mainCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  iconBackMark: {
    opacity: 0.18,
    position: 'absolute',
    transform: [{scale: 1.7}],
  },
  cardTitle: {fontSize: 22, fontWeight: '800', marginBottom: 8},
  cardDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {fontSize: 12, fontWeight: '700', marginBottom: 24},
  ctaButton: {width: '100%', borderRadius: 14},
  section: {marginBottom: 32},
  sectionTitle: {fontSize: 18, fontWeight: '800', marginBottom: 12},
  resultCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultType: {fontSize: 11, fontWeight: '900', letterSpacing: 0.5},
  resultDate: {fontSize: 11, fontWeight: '600'},
  publishedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  publishedBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
  },
  resultTitle: {fontSize: 17, fontWeight: '800', marginBottom: 4},
  resultDesc: {fontSize: 13, lineHeight: 18, marginBottom: 16},
  resultButton: {width: '100%', borderRadius: 14},
  participationRow: {flexDirection: 'row', gap: 12, marginBottom: 12},
  participationItem: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  pCount: {fontSize: 20, fontWeight: '900'},
  pLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  comparisonRow: {flexDirection: 'row', gap: 12, marginBottom: 12},
  comparisonItem: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  comparisonLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  manageButton: {width: '100%', borderRadius: 14},
})
