import {useMemo} from 'react'
import {FlatList, StyleSheet, TouchableOpacity, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {OPEN_QUESTIONS as STARTER_OPEN_QUESTIONS} from '#/lib/mock-data'
import {type NavigationProp} from '#/lib/routes/types'
import {useOpenQuestions} from '#/state/queries/useOpenQuestions'
import {Text} from '#/view/com/util/text/Text'
import {TimeElapsed} from '#/view/com/util/TimeElapsed'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {
  mapOpenQuestionPosts,
  mapStarterOpenQuestions,
} from '#/screens/RAQ/open-questions-utils'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {ListMaybePlaceholder} from '#/components/Lists'
import {RedditVoteButton} from '#/components/PostControls/VoteButton'

export default function OpenQuestionsListScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const insets = useSafeAreaInsets()

  const {
    data: openQuestions = [],
    isFetched,
    isLoading,
    isError,
    refetch,
  } = useOpenQuestions()

  const questions = useMemo(() => {
    const liveQuestions = mapOpenQuestionPosts(openQuestions)
    if (liveQuestions.length || !isFetched || isError) {
      return liveQuestions
    }
    return mapStarterOpenQuestions(STARTER_OPEN_QUESTIONS)
  }, [isError, isFetched, openQuestions])

  const navigateToQuestion = (item: (typeof questions)[0]) => {
    if (item.isStarterPrompt) {
      navigation.navigate('CreatePost')
      return
    }
    navigation.navigate('OpenQuestionThread', {id: item.id})
  }

  const renderItem = ({item}: {item: (typeof questions)[0]}) => (
    <TouchableOpacity
      accessibilityRole="button"
      style={[styles.card, t.atoms.bg_contrast_25, t.atoms.border_contrast_low]}
      onPress={() => navigateToQuestion(item)}>
      <View style={styles.header}>
        <UserAvatar size={24} type="user" avatar={item.author.avatar} />
        <Text style={[t.atoms.text_contrast_medium, a.text_sm]}>
          @{item.author.handle} ·{' '}
          <TimeElapsed timestamp={item.timestamp}>
            {({timeElapsed}) => <>{timeElapsed}</>}
          </TimeElapsed>
        </Text>
      </View>
      <Text style={[t.atoms.text, a.text_md, a.font_bold, styles.questionText]}>
        {item.text.trim()}
      </Text>
      <View style={styles.footer}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
          <RedditVoteButton
            score={item.replyCount * 2}
            currentVote="none"
            hasBeenToggled={false}
            onUpvote={() => console.log('Upvote')}
            onDownvote={() => console.log('Downvote')}
          />
          <Text style={[t.atoms.text_contrast_medium, a.text_sm]}>
            {item.isStarterPrompt ? (
              <Trans>Starter prompt</Trans>
            ) : (
              <Trans>{item.replyCount} replies</Trans>
            )}
          </Text>
        </View>
        <Button
          label={_(msg`Reply`)}
          size="tiny"
          variant="ghost"
          color="secondary"
          onPress={() => navigateToQuestion(item)}>
          <ButtonText>
            <Trans>Reply</Trans>
          </ButtonText>
        </Button>
      </View>
    </TouchableOpacity>
  )

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Open Questions</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Button
          label={_(msg`Add`)}
          size="small"
          variant="solid"
          color="primary"
          onPress={() => navigation.navigate('CreatePost')}>
          <ButtonText>
            <Trans>Add</Trans>
          </ButtonText>
        </Button>
      </Layout.Header.Outer>

      <Layout.Center style={{flex: 1}}>
        {!questions.length ? (
          <ListMaybePlaceholder
            isLoading={isLoading || !isFetched}
            isError={isError}
            onRetry={refetch}
            emptyType="results"
            emptyTitle={_(msg`No open questions yet`)}
            emptyMessage={_(
              msg`No open questions were found for now. Pull to refresh or try again later.`,
            )}
          />
        ) : (
          <FlatList
            data={questions}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={[
              styles.container,
              {paddingBottom: insets.bottom + 100},
            ]}
          />
        )}
      </Layout.Center>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionText: {
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
})
