import {RefreshControl, ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {RAQ_AXES} from '#/lib/mock-data'
import {type NavigationProp} from '#/lib/routes/types'
import {useUserAlignment} from '#/state/queries/raq'
import {useLocalRaq} from '#/state/queries/useLocalRaq'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {QueryStatus} from './components/QueryStatus'
import {
  assessmentAnswers,
  matchingAssessmentAnswers,
  normalizeRaqResults,
} from './raq-utils'

export function MyRAQScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {currentAccount} = useSession()
  const local = useLocalRaq()
  const alignment = useUserAlignment(currentAccount?.did)
  const localResults = normalizeRaqResults(local.results)
  const publishedResults = normalizeRaqResults(alignment.data?.results)
  const totalQuestions = RAQ_AXES.reduce(
    (sum, axis) => sum + axis.data.length,
    0,
  )
  const answeredCount = assessmentAnswers(local.answers).length
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100)
  return (
    <Layout.Screen testID="myRaqScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>My RAQ</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>
      <Layout.Center style={a.flex_1}>
        <ScrollView
          style={a.flex_1}
          contentContainerStyle={{padding: 16, paddingBottom: 100, gap: 24}}
          refreshControl={
            currentAccount ? (
              <RefreshControl
                refreshing={alignment.isRefetching}
                onRefresh={() => void alignment.refetch()}
              />
            ) : undefined
          }>
          <View
            style={[a.p_md, a.rounded_md, a.gap_md, t.atoms.bg_contrast_25]}>
            <Text style={[a.text_xl, a.font_bold]}>
              <Trans>Assessment Status</Trans>
            </Text>
            <Text>
              <Trans>
                {answeredCount} of {totalQuestions} questions answered on this
                device
              </Trans>
            </Text>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: totalQuestions,
                now: answeredCount,
              }}
              style={[
                a.rounded_sm,
                a.overflow_hidden,
                t.atoms.bg_contrast_50,
                {height: 8},
              ]}>
              <View
                style={{
                  height: 8,
                  width: `${progressPercent}%`,
                  backgroundColor: t.palette.primary_500,
                }}
              />
            </View>
            <Button
              label={
                answeredCount
                  ? _(msg`Continue Assessment`)
                  : _(msg`Start Assessment`)
              }
              onPress={() => navigation.navigate('RAQAssessment')}
              size="large"
              variant="solid"
              color="primary">
              <ButtonText>
                {answeredCount
                  ? _(msg`Continue Assessment`)
                  : _(msg`Start Assessment`)}
              </ButtonText>
            </Button>
          </View>
          <Text style={[a.text_lg, a.font_bold]}>
            <Trans>Results on this device</Trans>
          </Text>
          {localResults.length ? (
            <Button
              label={_(msg`View full breakdown`)}
              onPress={() =>
                navigation.navigate('RAQResults', {
                  results: localResults,
                  answers: matchingAssessmentAnswers(
                    local.answers,
                    localResults,
                  ),
                })
              }
              size="large"
              variant="solid"
              color="secondary">
              <ButtonText>
                <Trans>View full breakdown</Trans>
              </ButtonText>
            </Button>
          ) : (
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>Complete the assessment to see your results.</Trans>
            </Text>
          )}
          <Text style={[a.text_lg, a.font_bold]}>
            <Trans>Published alignment</Trans>
          </Text>
          {currentAccount ? (
            <>
              <QueryStatus
                loading={alignment.isLoading}
                error={alignment.isError}
                empty={!publishedResults.length}
                emptyMessageText={<Trans>No published alignment yet</Trans>}
                retry={alignment.refetch}
                refreshing={alignment.isRefetching}
              />
              {alignment.data?.completedAt && (
                <Text style={t.atoms.text_contrast_medium}>
                  {new Date(alignment.data.completedAt).toLocaleDateString()}
                </Text>
              )}
              {publishedResults.map(result => (
                <View
                  key={result.id}
                  style={[
                    a.p_md,
                    a.rounded_md,
                    a.gap_sm,
                    t.atoms.bg_contrast_25,
                  ]}>
                  <Text style={a.font_bold}>{result.title}</Text>
                  <Text>
                    {result.score}/100 · {result.label}
                  </Text>
                  <Text style={t.atoms.text_contrast_medium}>
                    {result.labelLow} ↔ {result.labelHigh}
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>Sign in to see your published alignment</Trans>
            </Text>
          )}
          <Button
            label={_(msg`Browse proposed questions`)}
            onPress={() => navigation.navigate('ProposedRAQList')}
            size="large"
            variant="solid"
            color="secondary">
            <ButtonText>
              <Trans>Browse proposed questions</Trans>
            </ButtonText>
          </Button>
          <Button
            label={_(msg`Open Questions`)}
            onPress={() => navigation.navigate('OpenQuestionsList')}
            size="large"
            variant="solid"
            color="secondary">
            <ButtonText>
              <Trans>Open Questions</Trans>
            </ButtonText>
          </Button>
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}
