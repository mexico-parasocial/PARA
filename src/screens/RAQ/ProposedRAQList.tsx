import {FlatList, StyleSheet, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  useAnswerProposedQuestionMutation,
  useVoteOnProposedQuestionMutation,
} from '#/state/mutations/raq'
import {
  type ProposedQuestionView,
  useProposedQuestions,
} from '#/state/queries/useProposedQuestions'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Layout from '#/components/Layout'
import {ListMaybePlaceholder} from '#/components/Lists'
import {RedditVoteButton} from '#/components/PostControls/VoteButton'
import {VotingButtonHorizontal} from '#/components/VotingButtonHorizontal'
import {AddRAQDialog} from './components/AddRAQDialog'

export default function ProposedRAQListScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const insets = useSafeAreaInsets()
  const addDialogControl = Dialog.useDialogControl()

  const {data: questions = [], isLoading, isError, refetch} = useProposedQuestions()
  const {mutate: voteOnProposal} = useVoteOnProposedQuestionMutation()
  const {mutate: answerProposal} = useAnswerProposedQuestionMutation()

  const renderItem = ({item}: {item: ProposedQuestionView}) => (
    <View style={[styles.itemCard, t.atoms.bg, t.atoms.border_contrast_low]}>
      <View style={styles.header}>
        <Text style={[styles.questionText, t.atoms.text]}>{item.text}</Text>
        {item.targetCommunity && (
          <Text style={[t.atoms.text_contrast_medium, styles.metaText]}>
            <Trans>Proposed for: {item.targetCommunity}</Trans>
          </Text>
        )}
      </View>

      <View style={styles.controlsRow}>
        {/* Promotion Vote */}
        <View style={styles.group}>
          <Text style={[t.atoms.text_contrast_medium, styles.label]}>
            <Trans>Promote:</Trans>
          </Text>
          <RedditVoteButton
            score={item.upvotes - item.downvotes}
            currentVote={
              item.viewerHasUpvoted
                ? 'upvote'
                : item.viewerHasDownvoted
                  ? 'downvote'
                  : 'none'
            }
            hasBeenToggled={false}
            onUpvote={() => voteOnProposal({uri: item.id, direction: 'up'})}
            onDownvote={() => voteOnProposal({uri: item.id, direction: 'down'})}
          />
        </View>

        {/* Answer Vote */}
        <View style={styles.group}>
          <Text style={[t.atoms.text_contrast_medium, styles.label]}>
            <Trans>Your Answer:</Trans>
          </Text>
          <VotingButtonHorizontal
            initialVote={item.viewerAnswer || 0}
            onVoteChange={value => answerProposal({uri: item.id, value})}
          />
        </View>
      </View>
    </View>
  )

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Proposed RAQs</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <Layout.Center style={{flex: 1}}>
        {!questions.length ? (
          isLoading || isError ? (
            <ListMaybePlaceholder
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
              emptyType="results"
            />
          ) : (
            <View style={[styles.emptyState, t.atoms.bg_contrast_25]}>
              <Text style={[styles.emptyTitle, t.atoms.text]}>
                <Trans>No proposed RAQs yet</Trans>
              </Text>
              <Text style={[styles.emptyText, t.atoms.text_contrast_medium]}>
                <Trans>
                  Proposed RAQs are loaded from the PARA backend. This space
                  will fill once people submit community questions.
                </Trans>
              </Text>
              <Button
                label={_(msg`Propose a question`)}
                onPress={() => addDialogControl.open()}
                size="large"
                variant="solid"
                color="primary"
                style={styles.emptyButton}>
                <ButtonText>
                  <Trans>Propose a question</Trans>
                </ButtonText>
              </Button>
            </View>
          )
        ) : (
          <FlatList
            data={questions}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={[
              styles.list,
              {paddingBottom: insets.bottom + 20},
            ]}
          />
        )}
      </Layout.Center>
      <AddRAQDialog control={addDialogControl} />
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 16,
  },
  itemCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#333',
    paddingTop: 12,
  },
  group: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
    width: '100%',
  },
})
