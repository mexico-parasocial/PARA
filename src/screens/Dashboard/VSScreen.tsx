import {useEffect, useMemo, useState} from 'react'
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {useLingui} from '@lingui/react'

import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {ArrowRotateCounterClockwise_Stroke2_Corner0_Rounded as RotateIcon} from '#/components/icons/ArrowRotateCounterClockwise'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {TimesLarge_Stroke2_Corner0_Rounded as RemoveIcon} from '#/components/icons/Times'
import * as Layout from '#/components/Layout'
import {IS_WEB} from '#/env'

const {width} = Dimensions.get('window')

import {
  PARTIES as ALL_PARTIES,
  type Party,
  TOPICS as MOCK_TOPICS,
} from '#/lib/mock-data'

const CATEGORIES = [
  'Tax',
  'Economy',
  'Welfare',
  'Law & Order',
  'Public Services',
  'Transport',
  'Foreign Policy',
]

// --- UI Components ---

const ComparisonCard = ({party, score}: {party: Party; score: number}) => {
  const theme = useTheme()
  // Map -3 to 3 onto 0% to 100% for the graphical bar
  const normalized = ((score + 3) / 6) * 100

  return (
    <View style={[styles.compCard, theme.atoms.bg_contrast_25]}>
      <View style={[styles.cardLogoLarge, {backgroundColor: party.color}]}>
        <Text style={styles.cardLogoText}>{party.logo}</Text>
      </View>
      <Text style={[styles.cardPartyName, theme.atoms.text]} numberOfLines={1}>
        {party.name}
      </Text>

      <View style={styles.scoreContainer}>
        <Text
          style={[
            styles.scoreBig,
            {color: score > 0 ? '#34C759' : score < 0 ? '#FF3B30' : '#8E8E93'},
          ]}>
          {score > 0 ? '+' : ''}
          {score.toFixed(1)}
        </Text>
        <Text style={[styles.scoreLabel, theme.atoms.text_contrast_medium]}>
          VOTE SCORE
        </Text>
      </View>

      <View style={styles.gaugeArea}>
        <View style={[styles.gaugeTrack, theme.atoms.bg_contrast_50]} />
        <View style={styles.gaugeCenter} />
        <View
          style={[
            styles.gaugeFill,
            {
              left: score >= 0 ? '50%' : `${normalized}%`,
              width: `${Math.abs(score / 6) * 100}%`,
              backgroundColor:
                score > 0 ? '#34C759' : score < 0 ? '#FF3B30' : '#8E8E93',
            },
          ]}
        />
      </View>

      <View style={styles.cardStatus}>
        <Text
          style={[
            styles.statusText,
            {color: score > 1 ? '#34C759' : score < -1 ? '#FF3B30' : '#8E8E93'},
          ]}>
          {score > 1.5
            ? 'Strong Support'
            : score > 0.5
              ? 'Lean Support'
              : score < -1.5
                ? 'Strongly Against'
                : score < -0.5
                  ? 'Lean Against'
                  : 'Neutral'}
        </Text>
      </View>
    </View>
  )
}

export function VSScreen() {
  useLingui()
  const t = useTheme()

  // --- State ---
  const [selectedType, setSelectedType] = useState<'Policy' | 'Matter'>(
    'Policy',
  )
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[1]) // Economy default
  const [selectedTopic, setSelectedTopic] = useState(MOCK_TOPICS[3]) // Clean Energy default
  const [selectedParties, setSelectedParties] = useState<string[]>([
    'PRI',
    'PAN',
    'MORENA',
  ])

  // --- Derived ---
  const filteredTopics = useMemo(() => {
    return MOCK_TOPICS.filter(
      topic =>
        topic.type === selectedType && topic.category === selectedCategory,
    )
  }, [selectedType, selectedCategory])

  // Auto-select first valid topic when type or category changes
  useEffect(() => {
    const validTopics = MOCK_TOPICS.filter(
      topic =>
        topic.type === selectedType && topic.category === selectedCategory,
    )
    if (
      validTopics.length > 0 &&
      !validTopics.find(t => t.id === selectedTopic.id)
    ) {
      setSelectedTopic(validTopics[0])
    }
  }, [selectedType, selectedCategory, selectedTopic.id])

  const toggleParty = (id: string) => {
    if (selectedParties.includes(id)) {
      if (selectedParties.length > 2)
        setSelectedParties(selectedParties.filter(p => p !== id))
    } else {
      if (selectedParties.length < 4)
        setSelectedParties([...selectedParties, id])
    }
  }

  // Mock scores
  const getScore = (id: string) => {
    const seeds: Record<string, number> = {
      PRI: 1.2,
      PAN: -2.3,
      MORENA: 2.8,
      MC: 0.1,
      PRD: -0.5,
      DERECHA: -2.9,
    }
    return seeds[id] || 0
  }

  return (
    <Layout.Screen testID="vsScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>Comparison</Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        <Layout.Center>
          {/* Step 1: Type Selection (Dropdown-like Toggle) */}
          <View style={styles.selectionSection}>
            <Text style={[styles.sectionLabel, t.atoms.text_contrast_medium]}>
              1. Compare by:
            </Text>
            <View style={[styles.typeToggle, t.atoms.bg_contrast_25]}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.typeBtn,
                  selectedType === 'Policy' && {
                    backgroundColor: t.palette.primary_500,
                  },
                ]}
                onPress={() => setSelectedType('Policy')}>
                <Text
                  style={[
                    styles.typeBtnText,
                    selectedType === 'Policy'
                      ? {color: '#fff'}
                      : t.atoms.text_contrast_medium,
                  ]}>
                  Policy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.typeBtn,
                  selectedType === 'Matter' && {
                    backgroundColor: t.palette.primary_500,
                  },
                ]}
                onPress={() => setSelectedType('Matter')}>
                <Text
                  style={[
                    styles.typeBtnText,
                    selectedType === 'Matter'
                      ? {color: '#fff'}
                      : t.atoms.text_contrast_medium,
                  ]}>
                  Matter
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Step 2: Category Selection */}
          <View style={styles.selectionSection}>
            <Text style={[styles.sectionLabel, t.atoms.text_contrast_medium]}>
              2. Category:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pillScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.pill,
                    selectedCategory === cat
                      ? {backgroundColor: t.palette.primary_500}
                      : t.atoms.bg_contrast_25,
                  ]}>
                  <Text
                    style={[
                      styles.pillText,
                      selectedCategory === cat ? {color: '#fff'} : t.atoms.text,
                    ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Step 3: Topic Selection */}
          <View style={styles.selectionSection}>
            <Text style={[styles.sectionLabel, t.atoms.text_contrast_medium]}>
              3. Specific Topic:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pillScroll}>
              {filteredTopics.length > 0 ? (
                filteredTopics.map(topic => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={topic.id}
                    onPress={() => setSelectedTopic(topic)}
                    style={[
                      styles.pill,
                      selectedTopic.id === topic.id
                        ? {backgroundColor: t.palette.primary_500}
                        : t.atoms.bg_contrast_25,
                    ]}>
                    <Text
                      style={[
                        styles.pillText,
                        selectedTopic.id === topic.id
                          ? {color: '#fff'}
                          : t.atoms.text,
                      ]}>
                      {topic.title}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyPill}>
                  <Text style={t.atoms.text_contrast_medium}>
                    No topics found
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Party Selector with Bigger Logos */}
          <View style={styles.partySelectorSection}>
            <Text style={[styles.sectionLabel, t.atoms.text_contrast_medium]}>
              Selected Parties ({selectedParties.length}/4):
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.partyLogoRow}>
              {ALL_PARTIES.map(p => {
                const isSelected = selectedParties.includes(p.id)
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={p.id}
                    onPress={() => toggleParty(p.id)}
                    style={[
                      styles.partyLogoBtn,
                      isSelected && {borderColor: p.color},
                    ]}>
                    <View
                      style={[styles.logoCircle, {backgroundColor: p.color}]}>
                      <Text style={styles.logoText}>{p.logo}</Text>
                    </View>
                    <View style={styles.selectionIndicator}>
                      {isSelected ? (
                        <View
                          style={[
                            styles.checkCircle,
                            {backgroundColor: t.palette.primary_500},
                          ]}>
                          <RemoveIcon size="xs" style={{color: '#fff'}} />
                        </View>
                      ) : (
                        <View
                          style={[styles.addCircle, t.atoms.bg_contrast_50]}>
                          <PlusIcon size="xs" style={t.atoms.text} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>

          <View style={styles.divider} />
          <View style={styles.resultsHeader}>
            <RotateIcon size="sm" style={t.atoms.text_contrast_medium} />
            <Text style={[styles.resultsTitle, t.atoms.text]}>
              Side-by-Side Comparison
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={IS_WEB}
            snapToInterval={IS_WEB ? 296 : width * 0.75 + 16}
            decelerationRate="fast"
            style={styles.tableScroll}
            contentContainerStyle={styles.tableContent}>
            {selectedParties.map(id => {
              const party = ALL_PARTIES.find(p => p.id === id)
              if (!party) return null
              return (
                <ComparisonCard key={id} party={party} score={getScore(id)} />
              )
            })}
          </ScrollView>

          <View style={styles.footerNote}>
            <Text style={[styles.footerText, t.atoms.text_contrast_medium]}>
              Swipe to see more parties →
            </Text>
          </View>
        </Layout.Center>
      </ScrollView>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  selectionSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pillScroll: {
    flexDirection: 'row',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 4,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  partySelectorSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  partyLogoRow: {
    flexDirection: 'row',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  partyLogoBtn: {
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 40,
    padding: 2,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  selectionIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  addCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 24,
    marginHorizontal: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableScroll: {
    paddingLeft: 16,
  },
  tableContent: {
    paddingRight: 32,
    gap: 16,
  },
  compCard: {
    width: IS_WEB ? 280 : width * 0.75,
    padding: 24,
    borderRadius: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardLogoLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardLogoText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  cardPartyName: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 20,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreBig: {
    fontSize: 48,
    fontWeight: '900',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: -4,
  },
  gaugeArea: {
    width: '100%',
    height: 20,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  gaugeTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
  },
  gaugeCenter: {
    position: 'absolute',
    left: '50%',
    width: 2,
    height: 14,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  gaugeFill: {
    position: 'absolute',
    height: 10,
    borderRadius: 5,
  },
  cardStatus: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
  },
  footerNote: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
})
