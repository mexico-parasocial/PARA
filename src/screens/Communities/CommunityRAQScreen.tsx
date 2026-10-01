import {RefreshControl, ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type RouteProp, useNavigation, useRoute} from '@react-navigation/native'

import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {useCommunityAlignment} from '#/state/queries/raq'
import {useProposedQuestions} from '#/state/queries/useProposedQuestions'
import {AddRAQDialog} from '#/screens/RAQ/components/AddRAQDialog'
import {ProposalCard} from '#/screens/RAQ/components/ProposalCard'
import {QueryStatus} from '#/screens/RAQ/components/QueryStatus'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

export function CommunityRAQScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<RouteProp<CommonNavigatorParams, 'CommunityRAQ'>>()
  const {communityId, communityName} = route.params
  const add = Dialog.useDialogControl()
  const alignment = useCommunityAlignment(communityId)
  const proposals = useProposedQuestions(communityId)
  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>{communityName} RAQ</Layout.Header.TitleText>
        </Layout.Header.Content>
        <Button
          label={_(msg`Add`)}
          size="small"
          variant="solid"
          color="primary"
          onPress={() => add.open()}>
          <ButtonText>
            <Trans>Add</Trans>
          </ButtonText>
        </Button>
      </Layout.Header.Outer>
      <Layout.Center style={a.flex_1}>
        <ScrollView
          style={a.flex_1}
          contentContainerStyle={{padding: 16, paddingBottom: 100, gap: 16}}
          refreshControl={
            <RefreshControl
              refreshing={alignment.isRefetching || proposals.isRefetching}
              onRefresh={() => {
                void alignment.refetch()
                void proposals.refresh()
              }}
            />
          }>
          <Text style={[a.text_lg, a.font_bold]}>
            <Trans>Community alignment on official axes.</Trans>
          </Text>
          <QueryStatus
            loading={alignment.isLoading}
            error={alignment.isError}
            empty={!alignment.data?.axes.length}
            emptyMessageText={
              <Trans>No published community alignment yet</Trans>
            }
            retry={alignment.refetch}
            refreshing={alignment.isRefetching}
          />
          {alignment.data?.participantCount !== undefined && (
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>{alignment.data.participantCount} participants</Trans>
            </Text>
          )}
          {alignment.data?.axes.map(axis => (
            <View
              key={axis.axisId}
              style={[a.p_md, a.rounded_md, a.gap_sm, t.atoms.bg_contrast_25]}>
              <Text style={a.font_bold}>{axis.axisTitle}</Text>
              <Text>
                {axis.score}/100 · {axis.label}
              </Text>
              <Text style={t.atoms.text_contrast_medium}>
                {axis.labelLow} ↔ {axis.labelHigh}
              </Text>
            </View>
          ))}
          <Text style={[a.text_lg, a.font_bold]}>
            <Trans>Unofficial Appends (Proposals)</Trans>
          </Text>
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
          {proposals.data?.map(proposal => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
          {proposals.hasNextPage && (
            <Button
              label={_(msg`Load more`)}
              size="large"
              variant="solid"
              color="secondary"
              disabled={proposals.isFetching}
              onPress={() => void proposals.fetchNextPage()}>
              <ButtonText>
                <Trans>Load more</Trans>
              </ButtonText>
            </Button>
          )}
          <Button
            label={_(msg`Browse public open questions`)}
            onPress={() => navigation.navigate('OpenQuestionsList')}
            size="large"
            variant="solid"
            color="secondary">
            <ButtonText>
              <Trans>Browse public open questions</Trans>
            </ButtonText>
          </Button>
        </ScrollView>
      </Layout.Center>
      <AddRAQDialog
        control={add}
        targetCommunity={communityId}
        communityName={communityName}
      />
    </Layout.Screen>
  )
}
