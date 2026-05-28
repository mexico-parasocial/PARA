import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import Svg, {G, Line, Polygon, Text as SvgText} from 'react-native-svg'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {usePublishRaqAssessmentMutation} from '#/state/queries/raq'
import {useSession} from '#/state/session'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import type {AxisResult} from './logic/scoring'
import {
  calculateCompassXY,
  calculateIdeology,
  calculatePartyMatches,
  getNinth,
  NINTHS_COLORS,
} from './logic/scoring'

const {width} = Dimensions.get('window')
const CHART_SIZE = Math.min(width - 40, 350)
const CENTER = CHART_SIZE / 2
const RADIUS = CENTER - 40

type Props = NativeStackScreenProps<CommonNavigatorParams, 'RAQResults'>

export default function RAQResultsScreen({route}: Props) {
  const t = useTheme()

  // Fix: Memoize results to prevent dependency issues
  const results = useMemo(
    () => route.params?.results || [],
    [route.params?.results],
  )

  // Extract scores for the vector [0-100]
  const userVector = useMemo(
    () => results.map((r: AxisResult) => r.score),
    [results],
  )
  const {primary, secondary} = useMemo(
    () => calculateIdeology(userVector),
    [userVector],
  )
  const {x, y} = useMemo(() => calculateCompassXY(userVector), [userVector])
  const ninthMatch = useMemo(() => getNinth(x, y), [x, y])
  const partyMatches = useMemo(
    () => calculatePartyMatches(userVector),
    [userVector],
  )

  // Publish state
  const {currentAccount} = useSession()
  const publishMutation = usePublishRaqAssessmentMutation()
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [isPublishing, setIsPublishing] = useState(false)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const publishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelRef = useRef(false)
  const {_} = useLingui()

  const clearPublishTimers = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    if (publishTimeoutRef.current) {
      clearTimeout(publishTimeoutRef.current)
      publishTimeoutRef.current = null
    }
  }, [])

  const handleCancelPublish = useCallback(() => {
    cancelRef.current = true
    clearPublishTimers()
    setShowCountdown(false)
    setCountdown(5)
    setIsPublishing(false)
  }, [clearPublishTimers])

  const handlePublish = useCallback(() => {
    if (!currentAccount) return
    cancelRef.current = false
    setShowCountdown(true)
    setCountdown(5)
    setIsPublishing(true)

    // Visible countdown: 5 seconds
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Actual publish with 6.6s timeout buffer
    publishTimeoutRef.current = setTimeout(() => {
      if (cancelRef.current) return

      const assessmentRecord = {
        answers: results.map((r: AxisResult) => ({
          questionId: r.id,
          value: r.rawScore,
        })),
        results: results.map((r: AxisResult) => ({
          axisId: r.id,
          axisTitle: r.title,
          score: r.score,
          label: r.label,
          labelLow: r.labelLow,
          labelHigh: r.labelHigh,
          rawScore: r.rawScore,
        })),
        compass: {
          x: Math.round(x * 1000),
          y: Math.round(y * 1000),
          ninth: ninthMatch,
        },
        ideology: {
          name: primary.name,
          description: primary.description,
          matchPercent: 100, // calculated as best match
        },
        secondaryIdeology: {
          name: secondary.name,
          description: secondary.description,
          matchPercent: 90, // approximate
        },
        partyMatches: partyMatches.slice(0, 3).map(m => ({
          partyId: m.party.id,
          partyName: m.party.name,
          partyFullName: m.party.fullName,
          partyColor: m.party.color,
          matchPercent: m.matchPercent,
        })),
        isPublic: true,
        completedAt: new Date().toISOString(),
        version: '1.0',
      }

      publishMutation.mutate(assessmentRecord, {
        onSuccess: () => {
          setShowCountdown(false)
          setIsPublishing(false)
          setCountdown(5)
        },
        onError: (err: Error) => {
          setShowCountdown(false)
          setIsPublishing(false)
          setCountdown(5)
          // eslint-disable-next-line no-console
          console.error('Failed to publish RAQ assessment:', err)
        },
      })
    }, 6600)
  }, [
    currentAccount,
    results,
    x,
    y,
    ninthMatch,
    primary,
    secondary,
    partyMatches,
    publishMutation,
    clearPublishTimers,
  ])

  useEffect(() => {
    return () => {
      clearPublishTimers()
    }
  }, [clearPublishTimers])

  const insets = useSafeAreaInsets()

  // Radar Chart calculation
  const points = useMemo(() => {
    const angleStep = (Math.PI * 2) / 12
    return results
      .map((res: AxisResult, i: number) => {
        const angle = i * angleStep - Math.PI / 2
        const r = (res.score / 100) * RADIUS
        // Fix: Rename variables to avoid shadowing
        const pointX = CENTER + r * Math.cos(angle)
        const pointY = CENTER + r * Math.sin(angle)
        return `${pointX},${pointY}`
      })
      .join(' ')
  }, [results])

  const gridCircles = [0.25, 0.5, 0.75, 1]

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Your Results</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <ScrollView
        style={[styles.container, t.atoms.bg]}
        contentContainerStyle={{paddingBottom: insets.bottom + 150}}>
        {/* Ideology Hero */}
        <View style={styles.heroSection}>
          <Text style={[styles.ideologyLabel, {color: t.palette.primary_500}]}>
            {primary.name}
          </Text>
          <Text style={[styles.description, t.atoms.text]}>
            {primary.description}
          </Text>
          <Text style={[styles.secondaryMatch, t.atoms.text_contrast_medium]}>
            Secondary alignment: {secondary.name}
          </Text>

          <View
            style={[
              styles.ninthBadge,
              {
                backgroundColor:
                  (NINTHS_COLORS as Record<string, string>)[ninthMatch] ||
                  t.palette.primary_500,
              },
            ]}>
            <Text style={styles.ninthBadgeText}>{ninthMatch}</Text>
          </View>
        </View>

        {/* Political Compass (9ths) - MOVED TO TOP */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, t.atoms.text]}>
            Political Compass (9ths)
          </Text>
        </View>
        <View style={styles.compassContainer}>
          <View
            style={[styles.compassGrid, {borderColor: t.palette.contrast_200}]}>
            {/* 3x3 Grid */}
            <View style={styles.gridRow}>
              <View
                style={[
                  styles.gridCell,
                  {backgroundColor: NINTHS_COLORS['Auth Left']},
                ]}
              />
              <View
                style={[
                  styles.gridCell,
                  {backgroundColor: NINTHS_COLORS['Auth Econocenter']},
                ]}
              />
              <View
                style={[
                  styles.gridCell,
                  {backgroundColor: NINTHS_COLORS['Auth Right']},
                ]}
              />
            </View>
            <View style={styles.gridRow}>
              <View
                style={[
                  styles.gridCell,
                  {backgroundColor: NINTHS_COLORS['Center Left']},
                ]}
              />
              <View
                style={[
                  styles.gridCell,
                  {backgroundColor: NINTHS_COLORS['Center Econocenter']},
                ]}
              />
              <View
                style={[
                  styles.gridCell,
                  {backgroundColor: NINTHS_COLORS['Center Right']},
                ]}
              />
            </View>
            <View style={styles.gridRow}>
              <View
                style={[
                  styles.gridCell,
                  {backgroundColor: NINTHS_COLORS['Lib Left']},
                ]}
              />
              <View
                style={[
                  styles.gridCell,
                  {backgroundColor: NINTHS_COLORS['Lib Econocenter']},
                ]}
              />
              <View
                style={[
                  styles.gridCell,
                  {backgroundColor: NINTHS_COLORS['Lib Right']},
                ]}
              />
            </View>

            {/* Labels */}
            <Text style={[styles.compassLabel, styles.labelAuth]}>
              AUTHORITARIAN
            </Text>
            <Text style={[styles.compassLabel, styles.labelLib]}>
              LIBERTARIAN
            </Text>
            <Text style={[styles.compassLabel, styles.labelLeft]}>LEFT</Text>
            <Text style={[styles.compassLabel, styles.labelRight]}>RIGHT</Text>

            {/* Dot */}
            <View
              style={[
                styles.compassDot,
                {
                  left: `${((x + 1) / 2) * 100}%`,
                  top: `${((1 - y) / 2) * 100}%`,
                  borderColor: t.palette.contrast_50,
                },
              ]}
            />
          </View>
        </View>

        {/* Radar Chart - NOW BELOW COMPASS */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, t.atoms.text]}>
            12-Axis Radar Profile
          </Text>
        </View>
        <View style={styles.chartContainer}>
          <Svg width={CHART_SIZE} height={CHART_SIZE}>
            <G>
              {/* Grid Lines */}
              {gridCircles.map(c => {
                const angleStep = (Math.PI * 2) / 12
                const gridPoints = Array.from({length: 12})
                  .map((_, i) => {
                    const angle = i * angleStep - Math.PI / 2
                    const r = c * RADIUS
                    // Fix: Rename variables to avoid shadowing
                    const gridX = CENTER + r * Math.cos(angle)
                    const gridY = CENTER + r * Math.sin(angle)
                    return `${gridX},${gridY}`
                  })
                  .join(' ')
                return (
                  <Polygon
                    key={c}
                    points={gridPoints}
                    fill="none"
                    stroke={t.palette.contrast_100}
                    strokeWidth="1"
                  />
                )
              })}

              {/* Axis Spoke Lines */}
              {Array.from({length: 12}).map((_, i) => {
                const angle = i * ((Math.PI * 2) / 12) - Math.PI / 2
                const x2 = CENTER + RADIUS * Math.cos(angle)
                const y2 = CENTER + RADIUS * Math.sin(angle)
                return (
                  <Line
                    key={i}
                    x1={CENTER}
                    y1={CENTER}
                    x2={x2}
                    y2={y2}
                    stroke={t.palette.contrast_100}
                    strokeWidth="1"
                  />
                )
              })}

              {/* Data Polygon */}
              <Polygon
                points={points}
                fill={t.palette.primary_500}
                fillOpacity={0.3}
                stroke={t.palette.primary_500}
                strokeWidth="2"
              />

              {/* Labels */}
              {results.map((res: AxisResult, i: number) => {
                const angle = i * ((Math.PI * 2) / 12) - Math.PI / 2
                const labelX = CENTER + (RADIUS + 22) * Math.cos(angle)
                const labelY = CENTER + (RADIUS + 22) * Math.sin(angle)
                const shortLabel = res.title
                  .replace(/^\d+\.\s*/, '')
                  .replace(/\s+/g, ' ')
                  .slice(0, 14)
                return (
                  <SvgText
                    key={i}
                    x={labelX}
                    y={labelY}
                    fontSize="9"
                    fill={t.palette.contrast_500}
                    textAnchor="middle"
                    alignmentBaseline="middle">
                    {shortLabel}
                  </SvgText>
                )
              })}

            </G>
          </Svg>
        </View>

        {/* Breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={[styles.sectionTitle, t.atoms.text]}>
            Detailed Axis Breakdown
          </Text>
          {results.map((res: AxisResult) => (
            <View
              key={res.id}
              style={[styles.axisRow, t.atoms.border_contrast_low]}>
              <View style={styles.axisInfo}>
                <Text style={[styles.axisTitle, t.atoms.text]}>
                  {res.title}
                </Text>
              </View>
              <View style={styles.dichotomyLabels}>
                <Text
                  style={[
                    styles.dichotomyLabel,
                    res.score < 50
                      ? {fontWeight: '900', color: t.palette.primary_500}
                      : t.atoms.text_contrast_medium,
                  ]}>
                  {res.labelLow}
                </Text>
                <Text
                  style={[
                    styles.dichotomyLabel,
                    res.score > 50
                      ? {fontWeight: '900', color: t.palette.primary_500}
                      : t.atoms.text_contrast_medium,
                  ]}>
                  {res.labelHigh}
                </Text>
              </View>
              {/* Center-origin bar: extends left from 50% for low scores, right for high */}
              <View style={[styles.centerBarTrack, t.atoms.bg_contrast_25]}>
                <View style={styles.centerBarContainer}>
                  {/* Left half */}
                  <View style={styles.centerBarHalf}>
                    {res.score < 50 && (
                      <View
                        style={[
                          styles.centerBarFill,
                          {
                            backgroundColor: t.palette.primary_500,
                            width: `${((50 - res.score) / 50) * 100}%`,
                            alignSelf: 'flex-end',
                          },
                        ]}
                      />
                    )}
                  </View>
                  {/* Center marker */}
                  <View style={[styles.centerBarMarker, {backgroundColor: t.palette.contrast_300}]} />
                  {/* Right half */}
                  <View style={styles.centerBarHalf}>
                    {res.score > 50 && (
                      <View
                        style={[
                          styles.centerBarFill,
                          {
                            backgroundColor: t.palette.primary_500,
                            width: `${((res.score - 50) / 50) * 100}%`,
                          },
                        ]}
                      />
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.scoreRow}>
                <Text
                  style={[styles.axisScore, {color: t.palette.primary_500}]}>
                  {res.score}% {res.label}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Community Match */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, t.atoms.text]}>
            Party Alignment
          </Text>
        </View>
        <View style={styles.partyMatchSection}>
          {partyMatches.slice(0, 3).map((match, idx) => (
            <View
              key={match.party.id}
              style={[
                styles.partyCard,
                {
                  backgroundColor: match.party.color,
                  opacity: idx === 0 ? 1 : 0.75,
                },
              ]}>
              <Text style={styles.partyName}>{match.party.name}</Text>
              <Text style={styles.partyFullName}>{match.party.fullName}</Text>
              <Text style={styles.partyMatch}>{match.matchPercent}% Match</Text>
            </View>
          ))}
        </View>

        {/* Publish Button */}
        <View style={[styles.publishSection, {paddingBottom: insets.bottom + 20}]}>
          <Button
            label={_(msg`Publish to Profile`)}
            onPress={handlePublish}
            disabled={isPublishing}
            size="large"
            variant="solid">
            <ButtonText>
              <Trans>Publish to Profile</Trans>
            </ButtonText>
          </Button>
          <Text style={[styles.publishHint, t.atoms.text_contrast_medium]}>
            {isPublishing
              ? _(msg`Publishing...`)
              : _(msg`Make your alignment visible on your profile`)}
          </Text>
        </View>
      </ScrollView>

      {/* Countdown Modal */}
      <Modal visible={showCountdown} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, t.atoms.bg]}>
            <Text style={[styles.modalTitle, t.atoms.text]}>
              <Trans>Publishing RAQ Assessment</Trans>
            </Text>
            <Text style={[styles.modalBody, t.atoms.text_contrast_medium]}>
              <Trans>
                Your assessment will be published to your profile in {countdown}{' '}
                seconds. Tap Cancel to abort.
              </Trans>
            </Text>
            <View style={styles.countdownRing}>
              <Text style={[styles.countdownNumber, t.atoms.text]}>
                {countdown}
              </Text>
            </View>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.cancelButton, {borderColor: t.palette.contrast_200}]}
              onPress={handleCancelPublish}>
              <Text style={[styles.cancelButtonText, t.atoms.text]}>
                <Trans>Cancel</Trans>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    padding: 24,
    alignItems: 'center',
  },
  ideologyLabel: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 12,
  },
  secondaryMatch: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  ninthBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  ninthBadgeText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 20,
  },
  compassContainer: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  compassGrid: {
    width: 260,
    height: 260,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
    opacity: 0.8,
  },
  compassDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'white',
    borderWidth: 2,
    marginLeft: -7,
    marginTop: -7,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 5,
  },
  compassLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '900',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 1,
  },
  labelAuth: {top: 4, alignSelf: 'center'},
  labelLib: {bottom: 4, alignSelf: 'center'},
  labelLeft: {left: 4, top: '48%'},
  labelRight: {right: 4, top: '48%'},
  breakdownSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  axisRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  axisInfo: {
    marginBottom: 4,
  },
  dichotomyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dichotomyLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  axisTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  axisScore: {
    fontSize: 12,
    fontWeight: '800',
  },
  centerBarTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    paddingVertical: 2,
  },
  centerBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  centerBarHalf: {
    flex: 1,
    height: '100%',
  },
  centerBarMarker: {
    width: 2,
    height: 10,
    borderRadius: 1,
  },
  centerBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  partyMatchSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  partyCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  partyName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  partyFullName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  partyMatch: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  publishSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 8,
  },
  publishHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  countdownRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: '900',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
})
