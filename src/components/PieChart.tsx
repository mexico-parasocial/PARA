import {View} from 'react-native'
import Svg, {G, Path, Text as SvgText} from 'react-native-svg'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

type Slice = {
  label: string
  value: number
  color: string
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number,
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`
}

export function PieChart({
  data,
  size = 140,
  showLegend = true,
}: {
  data: Slice[]
  size?: number
  showLegend?: boolean
}) {
  const t = useTheme()
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.42

  let currentAngle = 0
  const slices = data
    .filter(d => d.value > 0)
    .map(d => {
      const sliceAngle = (d.value / total) * 360
      const start = currentAngle
      const end = currentAngle + sliceAngle
      currentAngle = end
      const mid = start + sliceAngle / 2
      const labelPos = polarToCartesian(cx, cy, radius * 0.65, mid)
      return {
        ...d,
        start,
        end,
        path: describeArc(cx, cy, radius, start, end),
        labelX: labelPos.x,
        labelY: labelPos.y,
        percent: Math.round((d.value / total) * 100),
      }
    })

  if (slices.length === 0) {
    return (
      <View
        style={[a.align_center, a.justify_center, {width: size, height: size}]}>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>—</Text>
      </View>
    )
  }

  return (
    <View style={[a.flex_row, a.align_center, a.gap_lg]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {slices.map((slice, i) => (
            <Path
              key={i}
              d={slice.path}
              fill={slice.color}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
          {slices.map((slice, i) =>
            slice.percent >= 10 ? (
              <SvgText
                key={`label-${i}`}
                x={slice.labelX}
                y={slice.labelY}
                textAnchor="middle"
                fill="#fff"
                fontSize={size * 0.1}
                fontWeight="bold">
                {`${slice.percent}%`}
              </SvgText>
            ) : null,
          )}
        </G>
      </Svg>

      {showLegend && (
        <View style={[a.gap_xs]}>
          {slices.map((slice, i) => (
            <View key={i} style={[a.flex_row, a.align_center, a.gap_sm]}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: slice.color,
                }}
              />
              <Text style={[a.text_sm, t.atoms.text]}>
                {slice.label}{' '}
                <Text style={t.atoms.text_contrast_medium}>
                  ({slice.value})
                </Text>
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
