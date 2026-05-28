
import {StyleSheet, View} from 'react-native'

import {
  COMPASS_COLORS,
  COMPASS_GRID_ROWS,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {useTheme} from '#/alf'
import {Text} from './Typography'

interface CompassPoint {
  position: CompassPositionId
  density: number // 0-100
}

interface Props {
  distribution: CompassPoint[]
  size?: number
}

export function IdeologicalDiversityMap({distribution, size = 180}: Props) {
  const t = useTheme()
  const cellSize = size / 3

  const getDensity = (pos: CompassPositionId) => {
    return distribution.find(p => p.position === pos)?.density ?? 0
  }

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      {/* Background Grid */}
      <View style={styles.grid}>
        {COMPASS_GRID_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map(cellId => {
              const density = getDensity(cellId)
              // Calculate opacity based on density (min 0.05, max 0.9)
              const opacity = 0.05 + (density / 100) * 0.85
              
              return (
                <View
                  key={cellId}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: COMPASS_COLORS[cellId],
                      opacity: opacity,
                    },
                  ]}>
                  {density > 15 && (
                    <View style={[styles.pulse, {backgroundColor: '#fff', opacity: 0.3}]} />
                  )}
                </View>
              )
            })}
          </View>
        ))}
      </View>

      {/* Crosshair / Axes */}
      <View style={[styles.axis, styles.axisH, {top: size / 2, backgroundColor: t.palette.contrast_200}]} />
      <View style={[styles.axis, styles.axisV, {left: size / 2, backgroundColor: t.palette.contrast_200}]} />

      {/* Legend / Labels */}
      <View style={styles.labels}>
        <Text style={[styles.label, styles.labelTop, t.atoms.text_contrast_medium]}>AUTH</Text>
        <Text style={[styles.label, styles.labelBottom, t.atoms.text_contrast_medium]}>LIB</Text>
        <Text style={[styles.label, styles.labelLeft, t.atoms.text_contrast_medium]}>LEFT</Text>
        <Text style={[styles.label, styles.labelRight, t.atoms.text_contrast_medium]}>RIGHT</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  grid: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  axis: {
    position: 'absolute',
    opacity: 0.5,
  },
  axisH: {
    width: '100%',
    height: 1,
  },
  axisV: {
    width: 1,
    height: '100%',
  },
  labels: {
    ...StyleSheet.absoluteFillObject,
    padding: 4,
    pointerEvents: 'none',
  },
  label: {
    position: 'absolute',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },
  labelTop: {top: 2, alignSelf: 'center'},
  labelBottom: {bottom: 2, alignSelf: 'center'},
  labelLeft: {left: 2, top: '45%', transform: [{rotate: '-90deg'}]},
  labelRight: {right: 2, top: '45%', transform: [{rotate: '90deg'}]},
})
