import {FlatList} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useProposedQuestions} from '#/state/queries/useProposedQuestions'
import {atoms as a} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Layout from '#/components/Layout'
import {AddRAQDialog} from './components/AddRAQDialog'
import {ProposalCard} from './components/ProposalCard'
import {QueryStatus} from './components/QueryStatus'

export default function ProposedRAQListScreen() {
  const {_} = useLingui()
  const add = Dialog.useDialogControl()
  const query = useProposedQuestions()
  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Proposed RAQs</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Button
          label={_(msg`Add`)}
          onPress={() => add.open()}
          size="small"
          variant="solid"
          color="primary">
          <ButtonText>
            <Trans>Add</Trans>
          </ButtonText>
        </Button>
      </Layout.Header.Outer>
      <Layout.Center style={a.flex_1}>
        <FlatList
          style={a.flex_1}
          data={query.data ?? []}
          keyExtractor={item => item.id}
          renderItem={({item}) => <ProposalCard proposal={item} />}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refresh()}
          contentContainerStyle={{padding: 16, paddingBottom: 100, gap: 16}}
          ListHeaderComponent={
            <QueryStatus
              loading={query.isLoading}
              error={query.isError}
              empty={!query.data?.length}
              emptyMessageText={<Trans>No proposed RAQs yet</Trans>}
              retry={query.refresh}
              refreshing={query.isRefetching}
            />
          }
          ListFooterComponent={
            query.hasNextPage ? (
              <Button
                label={_(msg`Load more`)}
                size="large"
                variant="solid"
                color="secondary"
                disabled={query.isFetching}
                onPress={() => void query.fetchNextPage()}>
                <ButtonText>
                  <Trans>Load more</Trans>
                </ButtonText>
              </Button>
            ) : undefined
          }
        />
      </Layout.Center>
      <AddRAQDialog control={add} />
    </Layout.Screen>
  )
}
