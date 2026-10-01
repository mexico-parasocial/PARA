import {ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type RouteProp, useNavigation, useRoute} from '@react-navigation/native'

import {RAQ_AXES_BY_ID} from '#/lib/mock-data'
import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {useProposedQuestions} from '#/state/queries/useProposedQuestions'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {AddRAQDialog} from './components/AddRAQDialog'
import {ProposalCard} from './components/ProposalCard'
import {QueryStatus} from './components/QueryStatus'
import {axisTitle} from './raq-utils'

export default function AxisDetailScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<RouteProp<CommonNavigatorParams, 'AxisDetail'>>()
  const {axisId} = route.params
  const axis = RAQ_AXES_BY_ID[axisId]
  const query = useProposedQuestions()
  const proposals = query.data?.filter(p => p.targetAxis === axisId) ?? []
  const add = Dialog.useDialogControl()
  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>{axisTitle(axisId)}</Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>
      <Layout.Center style={a.flex_1}>
        <ScrollView
          style={a.flex_1}
          contentContainerStyle={{padding: 16, paddingBottom: 100, gap: 16}}>
          {axis ? (
            <>
              <View
                style={[
                  a.p_md,
                  a.rounded_md,
                  a.gap_sm,
                  t.atoms.bg_contrast_25,
                ]}>
                <Text style={a.font_bold}>
                  {axis.labelLow} ↔ {axis.labelHigh}
                </Text>
                <Button
                  label={_(msg`Start Assessment`)}
                  onPress={() => navigation.navigate('RAQAssessment')}
                  size="large"
                  variant="solid"
                  color="primary">
                  <ButtonText>
                    <Trans>Start Assessment</Trans>
                  </ButtonText>
                </Button>
              </View>
              <Text style={[a.text_lg, a.font_bold]}>
                <Trans>Questions</Trans>
              </Text>
              {axis.data.map((question, i) => (
                <View
                  key={question.id}
                  style={[
                    a.p_md,
                    a.rounded_md,
                    a.gap_sm,
                    t.atoms.bg_contrast_25,
                  ]}>
                  <Text style={t.atoms.text_contrast_medium}>{i + 1}</Text>
                  <Text>{question.text}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>
                This axis is proposed and is not part of the official
                assessment.
              </Trans>
            </Text>
          )}
          <Text style={[a.text_lg, a.font_bold]}>
            <Trans>Proposed questions</Trans>
          </Text>
          <Button
            label={_(msg`Propose a Question`)}
            onPress={() => add.open()}
            size="large"
            variant="solid"
            color="secondary">
            <ButtonText>
              <Trans>Propose a Question</Trans>
            </ButtonText>
          </Button>
          <QueryStatus
            loading={query.isLoading}
            error={query.isError}
            empty={!proposals.length}
            emptyMessageText={
              <Trans>No questions proposed for this axis yet</Trans>
            }
            retry={query.refresh}
            refreshing={query.isRefetching}
          />
          {proposals.map(proposal => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
          {query.hasNextPage && (
            <Button
              label={_(msg`Load more`)}
              disabled={query.isFetching}
              onPress={() => void query.fetchNextPage()}
              size="large"
              variant="solid"
              color="secondary">
              <ButtonText>
                <Trans>Load more</Trans>
              </ButtonText>
            </Button>
          )}
        </ScrollView>
      </Layout.Center>
      <AddRAQDialog control={add} targetAxis={axisId} />
    </Layout.Screen>
  )
}
