import {useState} from 'react'
import {Pressable, StyleSheet, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {SIGNAL_COLORS} from './SignalBadge'

export function TripleSignalIndicator({
  flat,
  sqrtN,
  correlation,
}: {
  flat: number
  sqrtN: number
  correlation: number
}) {
  const t = useTheme()
  const [showTip, setShowTip] = useState(false)

  const values = [
    {label: 'Flat', value: flat, key: 'flat'},
    {label: '√n', value: sqrtN, key: 'sqrtN'},
    {label: 'Corr', value: correlation, key: 'corr'},
  ]

  const maxAbs = Math.max(...values.map(v => Math.abs(v.value)))
  const diverges =
    maxAbs > 0.3 && values.some(v => Math.abs(v.value - values[0].value) > 0.3)

  return (
    <Pressable accessibilityRole="button" onPress={() => setShowTip(!showTip)} style={styles.wrap}>
      <View style={styles.bars}>
        {values.map(v => {
          const rounded = Math.max(-3, Math.min(3, Math.round(v.value)))
          const color = SIGNAL_COLORS[rounded] ?? t.palette.contrast_400
          const ratio = Math.min(1, Math.abs(v.value) / 3)
          const isPositive = v.value >= 0
          return (
            <View key={v.key} style={styles.barRow}>
              <Text style={[styles.barLabel, t.atoms.text_contrast_medium]}>
                {v.label}
              </Text>
              <View style={[styles.track, t.atoms.bg_contrast_100]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${ratio * 100}%`,
                      backgroundColor: color,
                      marginLeft: isPositive ? '50%' : undefined,
                      marginRight: !isPositive ? '50%' : undefined,
                      left: !isPositive ? undefined : undefined,
                      right: !isPositive ? '50%' : undefined,
                    },
                  ]}
                />
                <View style={styles.centerLine} />
              </View>
              <Text style={[styles.barValue, {color}]}>
                {v.value > 0 ? '+' : ''}
                {v.value.toFixed(2)}
              </Text>
            </View>
          )
        })}
      </View>
      {diverges && !showTip && (
        <View style={styles.divergePill}>
          <Text style={styles.divergeText}>
            <Trans>Tallies diverge — tap to learn why</Trans>
          </Text>
        </View>
      )}
      {showTip && (
        <View style={[styles.tipBox, t.atoms.bg_contrast_25]}>
          <Text style={[styles.tipText, t.atoms.text]}>
            <Trans>
              Three tallies measure different things. Flat = one person, one
              vote. √n discounts highly correlated voters. Correlation-adjusted
              also weights by deliberation participation.
            </Trans>
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {gap: 6},
  bars: {gap: 4},
  barRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  barLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    width: 28,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    position: 'relative',
    overflow: 'hidden',
  },
  fill: {position: 'absolute', top: 0, bottom: 0, borderRadius: 1.5},
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(128,128,128,0.3)',
  },
  barValue: {fontSize: 10, fontWeight: '700', width: 36, textAlign: 'right'},
  divergePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B18',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  divergeText: {fontSize: 10, fontWeight: '700', color: '#B45309'},
  tipBox: {borderRadius: 8, padding: 10, marginTop: 4},
  tipText: {fontSize: 12, lineHeight: 17},
})
