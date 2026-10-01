import {type ReactNode} from 'react'
import {RefreshControl, ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {RAQ_AXES} from '#/lib/mock-data'
import {type NavigationProp} from '#/lib/routes/types'
import {useOpenQuestions} from '#/state/queries/useOpenQuestions'
import {useProposedQuestions} from '#/state/queries/useProposedQuestions'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {AddOpenQuestionDialog} from './components/AddOpenQuestionDialog'
import {AddRAQDialog} from './components/AddRAQDialog'
import {ProposalCard} from './components/ProposalCard'
import {QueryStatus} from './components/QueryStatus'
import {mapOpenQuestionPosts} from './open-questions-utils'
import {axisTitle, proposedAxes} from './raq-utils'

function Section({
  titleText,
  actions,
  children,
}: {
  titleText: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <View style={[a.gap_md, a.py_md]}>
      <View style={[a.flex_row, a.flex_wrap, a.align_center, a.gap_sm]}>
        <Text style={[a.flex_1, a.text_xl, a.font_bold]}>{titleText}</Text>
        {actions}
      </View>
      {children}
    </View>
  )
}

export default function RAQMenuScreen() {
  const {_} = useLingui()
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const add = Dialog.useDialogControl()
  const ask = Dialog.useDialogControl()
  const proposals = useProposedQuestions()
  const open = useOpenQuestions()
  const axes = proposedAxes(proposals.data ?? [])
  const questions = mapOpenQuestionPosts(open.data ?? [])
  const totalQuestions = RAQ_AXES.reduce(
    (sum, axis) => sum + axis.data.length,
    0,
  )
  const action = (label: string, onPress: () => void) => (
    <Button
      label={label}
      onPress={onPress}
      size="small"
      variant="solid"
      color="secondary">
      <ButtonText>{label}</ButtonText>
    </Button>
  )
  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>RAQ Menu</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>
      <Layout.Center style={a.flex_1}>
        <ScrollView
          style={a.flex_1}
          contentContainerStyle={{padding: 16, paddingBottom: 100, gap: 16}}
          refreshControl={
            <RefreshControl
              refreshing={proposals.isRefetching || open.isRefetching}
              onRefresh={() => {
                void proposals.refresh()
                void open.refetch()
              }}
            />
          }>
          <Section titleText={<Trans>Official RAQ Assessment</Trans>}>
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>
                Answer {totalQuestions} questions to explore your ideological
                alignment.
              </Trans>
            </Text>
            {action(_(msg`Start Assessment`), () =>
              navigation.navigate('RAQAssessment'),
            )}
            {action(_(msg`My RAQ`), () => navigation.navigate('MyRAQ'))}
          </Section>
          <Section
            titleText={<Trans>Official axes</Trans>}
            actions={action(_(msg`See all`), () =>
              navigation.navigate('AxesDiscoveryList', {
                initialTab: 'official',
              }),
            )}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={a.gap_sm}>
              {RAQ_AXES.map(axis => (
                <View key={axis.id} style={{width: 240}}>
                  <Button
                    label={axisTitle(axis.id)}
                    onPress={() =>
                      navigation.navigate('AxisDetail', {axisId: axis.id})
                    }
                    style={[a.p_md, a.rounded_md, t.atoms.bg_contrast_25]}>
                    <ButtonText>{axisTitle(axis.id)}</ButtonText>
                  </Button>
                </View>
              ))}
            </ScrollView>
          </Section>
          <Section
            titleText={<Trans>Unofficial axes</Trans>}
            actions={action(_(msg`See all`), () =>
              navigation.navigate('AxesDiscoveryList', {
                initialTab: 'unofficial',
              }),
            )}>
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>
                Axis targets from submitted proposals. These are not official
                questionnaire axes.
              </Trans>
            </Text>
            <QueryStatus
              loading={proposals.isLoading}
              error={proposals.isError}
              empty={!axes.length}
              emptyMessageText={<Trans>No proposed axes yet</Trans>}
              retry={proposals.refresh}
              refreshing={proposals.isRefetching}
            />
            {axes.slice(0, 6).map(axis => (
              <Button
                key={axis.id}
                label={axis.name}
                onPress={() =>
                  navigation.navigate('AxisDetail', {axisId: axis.id})
                }
                size="large"
                variant="solid"
                color="secondary">
                <ButtonText>{axis.name}</ButtonText>
              </Button>
            ))}
          </Section>
          <Section
            titleText={<Trans>Proposed questions</Trans>}
            actions={
              <>
                {action(_(msg`See all`), () =>
                  navigation.navigate('ProposedRAQList'),
                )}
                {action(_(msg`Add`), () => add.open())}
              </>
            }>
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>
                A vote shows support; it does not make a question official.
              </Trans>
            </Text>
            <QueryStatus
              loading={proposals.isLoading}
              error={proposals.isError}
              empty={!proposals.data?.length}
              emptyMessageText={<Trans>No proposed RAQs yet</Trans>}
              retry={proposals.refresh}
              refreshing={proposals.isRefetching}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={a.gap_sm}>
              {proposals.data?.slice(0, 8).map(proposal => (
                <View key={proposal.id} style={{width: 300}}>
                  <ProposalCard proposal={proposal} />
                </View>
              ))}
            </ScrollView>
          </Section>
          <Section
            titleText={<Trans>Open Questions</Trans>}
            actions={
              <>
                {action(_(msg`See all`), () =>
                  navigation.navigate('OpenQuestionsList'),
                )}
                {action(_(msg`Ask`), () => ask.open())}
              </>
            }>
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>
                Engage with questions that don't fit into the standard axes.
              </Trans>
            </Text>
            <QueryStatus
              loading={open.isLoading}
              error={open.isError}
              empty={!questions.length}
              emptyMessageText={<Trans>No open questions yet</Trans>}
              retry={open.refetch}
              refreshing={open.isRefetching}
            />
            {questions.slice(0, 4).map(question => (
              <Button
                key={question.id}
                label={question.text}
                onPress={() =>
                  navigation.navigate('OpenQuestionThread', {id: question.id})
                }
                style={[a.p_md, a.rounded_md, t.atoms.bg_contrast_25]}>
                <View style={[a.flex_1, a.gap_sm]}>
                  <Text style={a.font_bold}>{question.text}</Text>
                  <Text style={t.atoms.text_contrast_medium}>
                    @{question.author.handle}
                  </Text>
                  <Text style={t.atoms.text_contrast_medium}>
                    <Trans>{question.replyCount} replies</Trans>
                  </Text>
                </View>
              </Button>
            ))}
          </Section>
        </ScrollView>
      </Layout.Center>
      <AddRAQDialog control={add} />
      <AddOpenQuestionDialog control={ask} />
    </Layout.Screen>
  )
}
