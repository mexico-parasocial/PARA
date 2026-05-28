import {memo, useCallback, useState} from 'react'
import {Alert, SectionList, StyleSheet, View} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {
  type QuestionType,
  RAQ_AXES as RAQ_DATA,
  type RAQAxisSection as AxisSection,
} from '#/lib/mock-data'
import {type NavigationProp} from '#/lib/routes/types'
import * as persisted from '#/state/persisted'
import {Text} from '#/view/com/util/text/Text'
import {calculateRAQResults} from '#/screens/RAQ/logic/scoring'
import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {VotingButtonHorizontal} from '#/components/VotingButtonHorizontal'

// ------------------------------------------------------------------
// 1. PERFORMANCE OPTIMIZATION
// We wrap the individual question row in React.memo.
// This prevents all 96 buttons from re-rendering when one changes.
// ------------------------------------------------------------------
const QuestionRow = memo(
  ({
    item,
    onVote,
    initialVote,
    index,
  }: {
    item: QuestionType
    onVote: (id: string, val: number) => void
    initialVote: number
    index: number
  }) => {
    const t = useTheme()
    return (
      <View
        style={[
          styles.questionContainer,
          t.atoms.bg,
          t.atoms.border_contrast_low,
        ]}>
        <Text style={[styles.questionText, t.atoms.text]}>
          <Text style={t.atoms.text_contrast_medium}>{index}. </Text>
          {item.text}
        </Text>
        <View style={styles.voteWrapper}>
          <VotingButtonHorizontal
            initialVote={initialVote}
            onVoteChange={val => onVote(item.id, val)}
          />
        </View>
      </View>
    )
  },
)
QuestionRow.displayName = 'QuestionRow'

export default function RAQScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  // State to hold answers: { '1_1': 2, '1_2': -1, ... }
  const [answers, setAnswers] = useState<Record<string, number>>(
    persisted.get('raqAnswers') || {},
  )

  // ------------------------------------------------------------------
  // 2. STATE MANAGEMENT
  // Using useCallback ensures this function reference stays stable
  // so QuestionRow doesn't re-render unnecessarily.
  // ------------------------------------------------------------------
  const handleVote = useCallback((questionId: string, voteValue: number) => {
    setAnswers(prev => {
      const next = {
        ...prev,
        [questionId]: voteValue,
      }
      void persisted.write('raqAnswers', next)
      return next
    })
  }, [])

  // ------------------------------------------------------------------
  // 3. THE MATH ENGINE (SCORING)
  // ------------------------------------------------------------------
  const totalQuestions = RAQ_DATA.reduce(
    (acc, axis) => acc + axis.data.length,
    0,
  )

  const calculateResults = () => {
    const answeredCount = Object.keys(answers).length

    if (answeredCount < totalQuestions) {
      Alert.alert(
        _(msg`Incomplete`),
        _(
          msg`You have answered ${answeredCount}/${totalQuestions} questions. Skipped questions will be treated as Neutral (0).`,
        ),
        [
          {text: _(msg`Cancel`), style: 'cancel'},
          {text: _(msg`Calculate Anyway`), onPress: () => performCalculation()},
        ],
      )
    } else {
      performCalculation()
    }
  }

  const performCalculation = () => {
    const results = calculateRAQResults(answers, RAQ_DATA)
    console.log('FINAL RESULTS:', JSON.stringify(results, null, 2))
    void persisted.write('raqResults', results)
    // @ts-ignore
    navigation.navigate('RAQResults', {results})
  }

  // ------------------------------------------------------------------
  // 4. UI RENDERING
  // ------------------------------------------------------------------
  // ------------------------------------------------------------------
  // 4. UI RENDERING (MEMOIZED)
  // ------------------------------------------------------------------
  const renderSectionHeader = useCallback(
    ({section}: {section: AxisSection}) => (
      <View
        style={[
          styles.sectionHeader,
          t.atoms.bg_contrast_25,
          t.atoms.border_contrast_low,
        ]}>
        <Text style={[styles.sectionTitle, t.atoms.text]}>{section.title}</Text>
        <View style={styles.axisLabels}>
          <Text style={[styles.axisLabel, {color: t.palette.primary_500}]}>
            {section.labelLow}
          </Text>
          <Text
            emoji
            style={[styles.axisArrow, {color: t.palette.contrast_500}]}>
            ↔
          </Text>
          <Text style={[styles.axisLabel, {color: t.palette.primary_500}]}>
            {section.labelHigh}
          </Text>
        </View>
      </View>
    ),
    [
      t.atoms.bg_contrast_25,
      t.atoms.border_contrast_low,
      t.atoms.text,
      t.palette.primary_500,
      t.palette.contrast_500,
    ],
  )

  const renderItem = useCallback(
    ({
      item,
      index,
      section,
    }: {
      item: QuestionType
      index: number
      section: AxisSection
    }) => {
      // Calculate absolute index by summing lengths of preceding sections
      const sectionIndex = RAQ_DATA.indexOf(section)
      const previousTotal = RAQ_DATA.slice(0, sectionIndex).reduce(
        (acc, sec) => acc + sec.data.length,
        0,
      )
      const absoluteIndex = previousTotal + index + 1

      return (
        <QuestionRow
          item={item}
          onVote={handleVote}
          initialVote={answers[item.id] || 0}
          index={absoluteIndex}
        />
      )
    },
    [handleVote, answers],
  )

  const insets = useSafeAreaInsets()

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>RAQ Assessment</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <Layout.Center style={[styles.container, t.atoms.bg]}>
        <View style={[styles.header, t.atoms.bg, t.atoms.border_contrast_low]}>
          <Text style={[styles.headerSubtitle, t.atoms.text_contrast_medium]}>
            <Trans>Drag left to disagree (-3), right to agree (+3).</Trans>
          </Text>
        </View>

        <SectionList
          sections={RAQ_DATA}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={true}
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: insets.bottom + 132},
          ]}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={11}
          removeClippedSubviews={false} // Disable on web manually if needed, or false generally due to SectionList issues
          extraData={answers}
          ListFooterComponent={<View style={styles.footerSpacer} />}
        />

        <View
          style={[
            styles.stickyFooter,
            t.atoms.bg,
            t.atoms.border_contrast_low,
            {paddingBottom: insets.bottom > 0 ? insets.bottom : 20},
          ]}>
          {/* Progress Indicator */}
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, t.atoms.bg_contrast_50]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: t.palette.primary_500,
                    width: `${(Object.keys(answers).length / totalQuestions) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, t.atoms.text_contrast_medium]}>
              {Object.keys(answers).length}/{totalQuestions}
            </Text>
          </View>

          <Button
            label={_(msg`See Results`)}
            onPress={calculateResults}
            size="large"
            variant="solid"
            color="primary"
            style={styles.calculateButton}>
            <ButtonText>
              <Trans>See Results</Trans>
            </ButtonText>
          </Button>
        </View>
      </Layout.Center>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 120,
  },
  sectionHeader: {
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  axisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  axisLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  axisArrow: {
    fontSize: 16,
  },
  questionContainer: {
    padding: 24,
    borderBottomWidth: 1,
    flexDirection: 'column',
    alignItems: 'center',
  },
  questionText: {
    width: '100%',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 8,
  },
  voteWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSpacer: {
    height: 12,
  },
  stickyFooter: {
    padding: 16,
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
  calculateButton: {
    width: '100%',
    maxWidth: 400,
  },
})
