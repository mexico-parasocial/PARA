import {StyleSheet, View} from 'react-native'

import {type ContestedAxis} from '#/lib/api/para-lexicons'
import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

interface Props {
  axes: ContestedAxis[]
}

export function ContestedAxesChart({axes}: Props) {
  const t = useTheme()

  return (
    <View style={styles.container}>
      {axes.map(axis => (
        <View key={axis.axisId} style={styles.axisRow}>
          {/* Header: title + engagement */}
          <View style={styles.axisHeader}>
            <Text style={[styles.axisTitle, t.atoms.text]} numberOfLines={1}>
              {axis.axisTitle}
            </Text>
            <Text style={[styles.engagement, t.atoms.text_contrast_medium]}>
              {axis.engagementCount} voices
            </Text>
          </View>

          {/* Dichotomy labels */}
          <View style={styles.labelRow}>
            <Text
              style={[
                styles.dichotomyLabel,
                axis.discourseScore < 50
                  ? {fontWeight: '900', color: t.palette.primary_500}
                  : t.atoms.text_contrast_medium,
              ]}>
              {axis.labelLow}
            </Text>
            <Text
              style={[
                styles.dichotomyLabel,
                axis.discourseScore > 50
                  ? {fontWeight: '900', color: t.palette.primary_500}
                  : t.atoms.text_contrast_medium,
              ]}>
              {axis.labelHigh}
            </Text>
          </View>

          {/* Center-origin bar */}
          <View style={[styles.barTrack, t.atoms.bg_contrast_25]}>
            <View style={styles.barContainer}>
              {/* Left half */}
              <View style={styles.barHalf}>
                {axis.discourseScore < 50 && (
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: t.palette.primary_500,
                        width: `${((50 - axis.discourseScore) / 50) * 100}%`,
                        alignSelf: 'flex-end',
                      },
                    ]}
                  />
                )}
              </View>
              {/* Center marker */}
              <View
                style={[
                  styles.barMarker,
                  {backgroundColor: t.palette.contrast_300},
                ]}
              />
              {/* Right half */}
              <View style={styles.barHalf}>
                {axis.discourseScore > 50 && (
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: t.palette.primary_500,
                        width: `${((axis.discourseScore - 50) / 50) * 100}%`,
                      },
                    ]}
                  />
                )}
              </View>
            </View>
          </View>

          {/* Score */}
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreText, {color: t.palette.primary_500}]}>
              {axis.discourseScore}% — Leans{' '}
              {axis.discourseScore > 50 ? axis.labelHigh : axis.labelLow}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  axisRow: {
    gap: 6,
  },
  axisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  axisTitle: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  engagement: {
    fontSize: 11,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dichotomyLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  barContainer: {
    flexDirection: 'row',
    flex: 1,
    height: '100%',
  },
  barHalf: {
    flex: 1,
    height: '100%',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barMarker: {
    width: 2,
    height: '100%',
    zIndex: 1,
  },
  scoreRow: {
    marginTop: 2,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
  },
})
