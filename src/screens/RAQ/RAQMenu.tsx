import {useCallback, useMemo, useRef} from 'react'
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {
  OPEN_QUESTIONS as MOCK_OPEN_QUESTIONS,
  RAQ_AXES as RAQ_DATA,
} from '#/lib/mock-data'
import {type NavigationProp} from '#/lib/routes/types'
import {
  useAnswerProposedQuestionMutation,
  useVoteOnCommunityAxisMutation,
  useVoteOnProposedQuestionMutation,
} from '#/state/mutations/raq'
import {useCommunityAxes} from '#/state/queries/useCommunityAxes'
import {useOpenQuestions} from '#/state/queries/useOpenQuestions'
import {useProposedQuestions} from '#/state/queries/useProposedQuestions'
import {Text} from '#/view/com/util/text/Text'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {
  mapOpenQuestionPosts,
  mapStarterOpenQuestions,
} from '#/screens/RAQ/open-questions-utils'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Layout from '#/components/Layout'
import {RedditVoteButton} from '#/components/PostControls/VoteButton'
import {VotingButtonHorizontal} from '#/components/VotingButtonHorizontal'
import {WebScrollControls} from '#/components/WebScrollControls'

// Helper for chunking data
function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({length: Math.ceil(arr.length / size)}, (_, i) =>
    arr.slice(i * size, i * size + size),
  )
}

export default function RAQMenuScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const insets = useSafeAreaInsets()
  const addDialogControl = Dialog.useDialogControl()
  const officialScrollRef = useRef<ScrollView>(null)
  const unofficialScrollRef = useRef<ScrollView>(null)
  const proposedScrollRef = useRef<ScrollView>(null)
  const openQuestionsScrollRef = useRef<ScrollView>(null)

  const {mutate: voteOnProposal} = useVoteOnProposedQuestionMutation()
  const {mutate: answerProposal} = useAnswerProposedQuestionMutation()
  const {mutate: voteOnAxis} = useVoteOnCommunityAxisMutation()

  const {data: communityAxes = []} = useCommunityAxes()
  const {data: proposedQuestions = []} = useProposedQuestions()
  const {
    data: openQuestionPosts = [],
    isFetched: openQuestionsFetched,
    isError: openQuestionsError,
  } = useOpenQuestions()

  const openQuestions = useMemo(() => {
    const liveQuestions = mapOpenQuestionPosts(openQuestionPosts)
    if (liveQuestions.length || !openQuestionsFetched || openQuestionsError) {
      return liveQuestions
    }
    return mapStarterOpenQuestions(MOCK_OPEN_QUESTIONS)
  }, [openQuestionPosts, openQuestionsError, openQuestionsFetched])

  const onOfficialPress = useCallback(() => {
    navigation.navigate('RAQAssessment')
  }, [navigation])

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

      <Layout.Center style={[a.flex_1]}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            {paddingBottom: insets.bottom + 100},
          ]}>
          {/* OFFICIAL RAQ SECTION */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, t.atoms.text]}>
              <Trans>Official RAQ Assessment</Trans>
            </Text>
            <Text
              style={[styles.sectionDescription, t.atoms.text_contrast_medium]}>
              <Trans>
                Take the standard 96-question assessment to determine your
                ideological alignment.
              </Trans>
            </Text>
            <Button
              label={_(msg`Start Assessment`)}
              onPress={onOfficialPress}
              size="large"
              variant="solid"
              color="primary"
              style={styles.button}>
              <ButtonText>
                <Trans>Start Assessment</Trans>
              </ButtonText>
            </Button>
          </View>

          {/* COMMUNITY RAQS SECTION */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, t.atoms.text]}>
              <Trans>Community RAQ appends</Trans>
            </Text>
            <Text
              style={[styles.sectionDescription, t.atoms.text_contrast_medium]}>
              <Trans>
                See official values and active proposals for your communities.
              </Trans>
            </Text>

            {/* OFFICIAL SUBSECTION */}
            <View style={{marginTop: 12}}>
              <View style={[styles.sectionHeaderRow, {marginBottom: 8}]}>
                <Text style={[t.atoms.text, a.text_md, a.font_bold]}>
                  <Trans>Official axes</Trans>
                </Text>
                <Button
                  label={_(msg`See all`)}
                  onPress={() => navigation.navigate('AxesDiscoveryList', {})}
                  size="tiny"
                  variant="ghost"
                  color="secondary">
                  <ButtonText>
                    <Trans>See all</Trans>
                  </ButtonText>
                </Button>
              </View>

              <View style={{position: 'relative'}}>
                <ScrollView
                  ref={officialScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{gap: 12, paddingRight: 40}}>
                  {chunk(RAQ_DATA, 3).map((column, colIndex) => (
                    <View key={colIndex} style={{gap: 12, width: 260}}>
                      {column.map(item => {
                        const displayTitle = item.title
                          .replace(/^\d+\.\s*/, '')
                          .toLowerCase()
                          .replace(/^\w/, c => c.toUpperCase())
                        return (
                          <Button
                            key={item.id}
                            label={displayTitle}
                            onPress={() =>
                              navigation.navigate('CommunityRAQ', {
                                communityId: item.id,
                                communityName: displayTitle,
                              })
                            }
                            style={[
                              t.atoms.bg_contrast_25,
                              {
                                paddingVertical: 14,
                                paddingLeft: 16,
                                paddingRight: 10,
                                borderRadius: 10,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              },
                            ]}>
                            <View style={{flex: 1, marginRight: 8}}>
                              <Text
                                style={[
                                  t.atoms.text,
                                  {fontWeight: '600', fontSize: 14},
                                ]}
                                numberOfLines={1}>
                                {displayTitle}
                              </Text>
                            </View>
                            <Text style={[t.atoms.text_contrast_medium]}>
                              ›
                            </Text>
                          </Button>
                        )
                      })}
                    </View>
                  ))}
                </ScrollView>
                <WebScrollControls
                  scrollViewRef={officialScrollRef}
                  style={{left: -12, right: -12}}
                />
              </View>
            </View>

            {/* UNOFFICIAL SUBSECTION */}
            <View style={{marginTop: 24}}>
              <View style={[styles.sectionHeaderRow, {marginBottom: 8}]}>
                <Text style={[t.atoms.text, a.text_md, a.font_bold]}>
                  <Trans>Unofficial axes</Trans>
                </Text>
                <Button
                  label={_(msg`See all`)}
                  onPress={() =>
                    navigation.navigate('AxesDiscoveryList', {
                      initialTab: 'unofficial',
                    })
                  }
                  size="tiny"
                  variant="ghost"
                  color="secondary">
                  <ButtonText>
                    <Trans>See all</Trans>
                  </ButtonText>
                </Button>
              </View>

              <View style={{position: 'relative'}}>
                <ScrollView
                  ref={unofficialScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{gap: 12, paddingRight: 40}}>
                  {chunk(communityAxes, 3).map((column, colIndex) => (
                    <View key={colIndex} style={{gap: 12, width: 260}}>
                      {column.map(item => (
                        <Button
                          key={item.id}
                          label={item.name}
                          onPress={() =>
                            navigation.navigate('CommunityRAQ', {
                              communityId: item.id,
                              communityName: item.name,
                            })
                          }
                          style={[
                            t.atoms.bg_contrast_25,
                            {
                              paddingVertical: 14,
                              paddingLeft: 16,
                              paddingRight: 10,
                              borderRadius: 10,
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            },
                          ]}>
                          <View style={{flex: 1, marginRight: 8}}>
                            <Text
                              style={[
                                t.atoms.text,
                                {fontWeight: '600', fontSize: 14},
                              ]}
                              numberOfLines={1}>
                              {item.name}
                            </Text>
                            <TouchableOpacity
                              accessibilityRole="button"
                              onPress={() => voteOnAxis({axisId: item.id, value: 1})}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                              <Text
                                style={[
                                  t.atoms.text_contrast_medium,
                                  item.viewerHasVoted && {
                                    color: t.palette.primary_500,
                                  },
                                  {fontSize: 11},
                                ]}
                                numberOfLines={1}>
                                {item.votes} votes
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={[t.atoms.text_contrast_medium]}>›</Text>
                        </Button>
                      ))}
                    </View>
                  ))}
                </ScrollView>
                <WebScrollControls
                  scrollViewRef={unofficialScrollRef}
                  style={{left: -12, right: -12}}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={{flex: 1}}>
                <Text style={[styles.sectionTitle, t.atoms.text]}>
                  <Trans>Centrist RAQ Appends</Trans>
                </Text>
                <Text
                  style={[
                    styles.sectionDescription,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>
                    Vote on questions proposed by the community. Upvote to help
                    them become mainstream.
                  </Trans>
                </Text>
              </View>
              <Button
                label={_(msg`See all`)}
                onPress={() => navigation.navigate('ProposedRAQList')}
                size="small"
                variant="ghost"
                color="secondary">
                <ButtonText>
                  <Trans>See all</Trans>
                </ButtonText>
              </Button>
              <Button
                label={_(msg`Add`)}
                onPress={() => addDialogControl.open()}
                size="small"
                variant="solid"
                color="primary">
                <ButtonText>
                  <Trans>Add</Trans>
                </ButtonText>
              </Button>
            </View>

            {/* Horizontal List */}
            <View style={{position: 'relative'}}>
              <ScrollView
                ref={proposedScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: 12,
                  paddingVertical: 10,
                  paddingRight: 40,
                }}>
                {/* Add Button Card */}
                <Button
                  label={_(msg`Propose a Question`)}
                  onPress={() => addDialogControl.open()}
                  style={[
                    styles.addItemCard,
                    t.atoms.bg_contrast_25,
                    t.atoms.border_contrast_low,
                  ]}>
                  <View style={{alignItems: 'center', gap: 8}}>
                    <View
                      style={[
                        styles.plusIconCircle,
                        {backgroundColor: t.palette.primary_500},
                      ]}>
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 24,
                          fontWeight: 'bold',
                        }}>
                        +
                      </Text>
                    </View>
                    <Text style={[t.atoms.text, {fontWeight: '600'}]}>
                      <Trans>Propose New</Trans>
                    </Text>
                  </View>
                </Button>

                {proposedQuestions.map(item => (
                  <View
                    key={item.id}
                    style={[styles.proposedItemCard, t.atoms.bg_contrast_25]}>
                    <Text
                      style={[styles.proposedItemText, t.atoms.text]}
                      numberOfLines={3}>
                      {item.text}
                    </Text>

                    {/* Voting on the Proposal (Promotion) */}
                    <View style={styles.promotionRow}>
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
                        onUpvote={() =>
                          voteOnProposal({uri: item.id, direction: 'up'})
                        }
                        onDownvote={() =>
                          voteOnProposal({uri: item.id, direction: 'down'})
                        }
                      />
                    </View>

                    {/* Answer Vote */}
                    <View style={{marginTop: 'auto'}}>
                      <Text
                        style={[
                          t.atoms.text_contrast_medium,
                          {fontSize: 10, marginBottom: 4},
                        ]}>
                        <Trans>Your Answer:</Trans>
                      </Text>
                      <VotingButtonHorizontal
                        initialVote={item.viewerAnswer || 0}
                        onVoteChange={val =>
                          answerProposal({uri: item.id, value: val})
                        }
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>
              <WebScrollControls
                scrollViewRef={proposedScrollRef}
                style={{left: -12, right: -12}}
              />
            </View>
          </View>

          {/* OPEN QUESTIONS SECTION */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={{flex: 1}}>
                <Text style={[styles.sectionTitle, t.atoms.text]}>
                  <Trans>Open Questions</Trans>
                </Text>
                <Text
                  style={[
                    styles.sectionDescription,
                    t.atoms.text_contrast_medium,
                  ]}>
                  <Trans>
                    Engage with questions that don't fit into the standard axes.
                  </Trans>
                </Text>
              </View>
              <Button
                label={_(msg`See all`)}
                onPress={() => navigation.navigate('OpenQuestionsList')}
                size="small"
                variant="ghost"
                color="secondary">
                <ButtonText>
                  <Trans>See all</Trans>
                </ButtonText>
              </Button>
            </View>

            <View style={{position: 'relative'}}>
              <ScrollView
                ref={openQuestionsScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: 12,
                  paddingVertical: 10,
                  paddingRight: 40,
                }}>
                {openQuestions.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    accessibilityRole="button"
                    style={[styles.proposedItemCard, t.atoms.bg_contrast_25]}
                    onPress={() => {
                      if (item.isStarterPrompt) {
                        navigation.navigate('CreatePost')
                        return
                      }
                      navigation.navigate('OpenQuestionThread', {id: item.id})
                    }}>
                    <View
                      style={{flexDirection: 'row', gap: 8, marginBottom: 8}}>
                      <UserAvatar
                        size={24}
                        type="user"
                        avatar={item.author.avatar}
                      />
                      <Text style={[t.atoms.text_contrast_medium, a.text_sm]}>
                        @{item.author.handle}
                      </Text>
                    </View>
                    <Text
                      style={[styles.proposedItemText, t.atoms.text]}
                      numberOfLines={3}>
                      {item.text}
                    </Text>
                    <View style={styles.promotionRow}>
                      <RedditVoteButton
                        score={item.replyCount * 2} // Mock score based on replies
                        currentVote="none"
                        hasBeenToggled={false}
                        onUpvote={() => console.log('Upvoted', item.id)}
                        onDownvote={() => console.log('Downvoted', item.id)}
                      />
                      <Text
                        style={[
                          t.atoms.text_contrast_medium,
                          a.text_sm,
                          {marginLeft: 8},
                        ]}>
                        {item.isStarterPrompt
                          ? _(msg`Starter prompt`)
                          : _(msg`${item.replyCount} replies`)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <WebScrollControls
                scrollViewRef={openQuestionsScrollRef}
                style={{left: -12, right: -12}}
              />
            </View>
          </View>
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  section: {
    paddingVertical: 12,
    marginTop: 12,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
  },
  placeholderBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#333', // fallback
    borderRadius: 8,
    opacity: 0.5,
  },
  proposedItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  proposedItemText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  proposedItemCard: {
    width: 310,
    height: 260,
    padding: 16,
    borderRadius: 12,
    justifyContent: 'space-between',
  },
  addItemCard: {
    width: 140,
    height: 260,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promotionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginVertical: 8,
  },
})
