import {useEffect, useMemo, useState} from 'react'
import {ScrollView, TouchableOpacity, View} from 'react-native'
import Svg, {Circle, Defs, G, Line, Pattern, Rect} from 'react-native-svg'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'

import {
  COMPASS_COLORS,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {STANCE_COLORS} from '#/features/civicTree/colors'
import {type GraphData} from '#/features/civicTree/types'
import {MapViewport} from '#/features/personalCivicTree/components/MapViewport'
import {
  MAP_GROUPINGS,
  type MapCamera,
  type MapGrouping,
  zoomMapCamera,
} from '#/features/personalCivicTree/map'
import {buildCommunityMapLayout, communityEdgeColor} from '../workspace'

export function CommunityCivicTreeMap({
  data,
  context = data,
  onNodePress,
  selectedNodeId,
  showIdeologicalOverlay = false,
}: {
  data: GraphData
  context?: GraphData
  onNodePress: (id: string) => void
  selectedNodeId?: string
  showIdeologicalOverlay?: boolean
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const [grouping, setGrouping] = useState<MapGrouping>('collection')
  const [size, setSize] = useState({width: 600, height: 500})
  const [camera, setCamera] = useState<MapCamera>({x: 0, y: 0, scale: 1})
  const [clusterId, setClusterId] = useState<string>()
  const layout = buildCommunityMapLayout(
    data,
    grouping,
    i18n._.bind(i18n),
    context,
  )
  const fit = useMemo(() => {
    const scale = Math.max(
      0.15,
      Math.min(
        1,
        (size.width - 56) / layout.width,
        (size.height - 100) / layout.height,
      ),
    )
    return {
      scale,
      x: (size.width - layout.width * scale) / 2,
      y: (size.height - layout.height * scale) / 2,
    }
  }, [size, layout.width, layout.height])
  useEffect(() => {
    setCamera(fit)
    setClusterId(undefined)
  }, [fit, grouping, data])
  const points = new Map(layout.nodes.map(point => [point.node.id, point]))
  const focus = (id: string) => {
    const cluster = layout.clusters.find(item => item.id === id)
    if (!cluster) return
    const scale = Math.max(
      0.15,
      Math.min(
        1.5,
        (size.width - 80) / (cluster.radius * 2 + 100),
        (size.height - 100) / (cluster.radius * 2 + 100),
      ),
    )
    setClusterId(id)
    setCamera({
      scale,
      x: size.width / 2 - cluster.x * scale,
      y: size.height / 2 - cluster.y * scale,
    })
  }
  const zoom = (factor: number) =>
    setCamera(previous =>
      zoomMapCamera(previous, previous.scale * factor, {
        x: size.width / 2,
        y: size.height / 2,
      }),
    )
  return (
    <View style={[a.flex_1, a.w_full, {minHeight: 280}]}>
      <View style={[a.p_md, a.gap_sm, a.border_b, t.atoms.border_contrast_low]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[a.align_center, a.gap_xs]}>
          <Text style={[a.text_sm, a.pr_sm, t.atoms.text_contrast_medium]}>
            <Trans>Group by</Trans>
          </Text>
          {MAP_GROUPINGS.map(mode => (
            <Button
              key={mode.id}
              label={i18n._(mode.label)}
              size="small"
              variant={grouping === mode.id ? 'solid' : 'ghost'}
              color={grouping === mode.id ? 'primary' : 'secondary'}
              accessibilityState={{selected: grouping === mode.id}}
              onPress={() => setGrouping(mode.id)}>
              <ButtonText>{i18n._(mode.label)}</ButtonText>
            </Button>
          ))}
        </ScrollView>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {grouping === 'axis' ? (
            <Trans>
              Six civic fields from explicit flairs or directly connected
              topics. Unclassified cards stay unassigned.
            </Trans>
          ) : grouping === 'type' ? (
            <Trans>Community contributions grouped by their data type.</Trans>
          ) : grouping === 'size' ? (
            <Trans>
              Largest topic groups first. Cluster area reflects the number of
              cards.
            </Trans>
          ) : (
            <Trans>
              Topic groups from existing connections. Each card appears once;
              all its links remain visible.
            </Trans>
          )}
        </Text>
      </View>
      {layout.clusters.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{flexGrow: 0}}
          contentContainerStyle={[a.px_md, a.py_sm, a.gap_sm]}>
          {layout.clusters.map(cluster => (
            <Button
              key={cluster.id}
              label={l`Focus ${cluster.label}`}
              size="small"
              variant="ghost"
              color="secondary"
              accessibilityState={{selected: clusterId === cluster.id}}
              onPress={() => focus(cluster.id)}>
              <View style={[a.flex_row, a.align_center, a.gap_xs]}>
                <View
                  style={[
                    a.rounded_full,
                    {width: 7, height: 7, backgroundColor: cluster.color},
                  ]}
                />
                <Text style={[a.text_xs, t.atoms.text]}>{cluster.label}</Text>
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  {cluster.nodes.length}
                </Text>
              </View>
            </Button>
          ))}
        </ScrollView>
      ) : null}
      <View
        testID="community-civic-tree-map"
        onLayout={event => {
          const {width, height} = event.nativeEvent.layout
          if (width > 0 && height > 0) setSize({width, height})
        }}
        style={[
          a.flex_1,
          a.relative,
          a.overflow_hidden,
          t.atoms.bg_contrast_25,
        ]}>
        <MapViewport camera={camera} setCamera={setCamera}>
          <Svg width={size.width} height={size.height}>
            <Defs>
              <Pattern
                id="community-map-grid"
                width={24}
                height={24}
                patternUnits="userSpaceOnUse">
                <Circle cx={1} cy={1} r={1} fill={t.palette.contrast_100} />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#community-map-grid)" />
            <G
              transform={`translate(${camera.x}, ${camera.y}) scale(${camera.scale})`}>
              {layout.clusters.map(cluster => (
                <Circle
                  key={cluster.id}
                  cx={cluster.x}
                  cy={cluster.y}
                  r={cluster.radius}
                  fill={cluster.color}
                  fillOpacity={0.055}
                  stroke={cluster.color}
                  strokeOpacity={clusterId === cluster.id ? 0.9 : 0.28}
                  strokeWidth={clusterId === cluster.id ? 2 : 1}
                />
              ))}
              {data.edges.map(edge => {
                const source = points.get(edge.source),
                  target = points.get(edge.target)
                if (!source || !target) return null
                const selected =
                  edge.source === selectedNodeId ||
                  edge.target === selectedNodeId
                return (
                  <Line
                    key={edge.id}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={communityEdgeColor(edge.relationship_type)}
                    strokeWidth={selected ? 2.5 : 1.5}
                    strokeOpacity={selected ? 1 : 0.35}
                  />
                )
              })}
            </G>
          </Svg>
          {layout.clusters.map(cluster => (
            <TouchableOpacity
              key={cluster.id}
              accessibilityRole="button"
              accessibilityLabel={l`Inspect cluster ${cluster.label}`}
              accessibilityHint={l`Focuses this topic or data cluster`}
              onPress={() => focus(cluster.id)}
              style={[
                a.absolute,
                a.align_center,
                {
                  left: camera.x + cluster.x * camera.scale - 90,
                  top:
                    camera.y + (cluster.y - cluster.radius) * camera.scale - 36,
                  width: 180,
                },
              ]}>
              <Text
                numberOfLines={1}
                style={[a.text_sm, a.font_bold, t.atoms.text]}>
                {cluster.label}
              </Text>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {plural(cluster.nodes.length, {
                  one: '# card',
                  other: '# cards',
                })}
              </Text>
            </TouchableOpacity>
          ))}
          {layout.nodes.map(({node, x, y}) => {
            const radius = Math.max(3, Math.min(18, node.radius * camera.scale))
            const selected = node.id === selectedNodeId
            return (
              <TouchableOpacity
                key={node.id}
                accessibilityRole="button"
                accessibilityLabel={l`Inspect ${node.title}`}
                accessibilityHint={l`Opens this node's details`}
                accessibilityState={{selected}}
                onPress={() => onNodePress(node.id)}
                style={[
                  a.absolute,
                  a.align_center,
                  a.justify_center,
                  {
                    left: camera.x + x * camera.scale - radius - 3,
                    top: camera.y + y * camera.scale - radius - 3,
                    width: radius * 2 + 6,
                    height: radius * 2 + 6,
                  },
                ]}>
                <View
                  style={[
                    a.rounded_full,
                    {
                      width: radius * 2,
                      height: radius * 2,
                      backgroundColor: showIdeologicalOverlay
                        ? (COMPASS_COLORS[
                            node.compass_quadrant as CompassPositionId
                          ] ?? STANCE_COLORS[node.stance ?? 'neutral'])
                        : node.color,
                      borderWidth: selected ? 3 : Math.min(2, camera.scale * 2),
                      borderColor: selected
                        ? t.palette.primary_500
                        : node.borderColor,
                    },
                  ]}
                />
                {camera.scale >= 0.85 || selected ? (
                  <View
                    pointerEvents="none"
                    style={[a.absolute, {top: radius * 2 + 10, width: 112}]}>
                    <Text
                      numberOfLines={1}
                      style={[a.text_xs, a.text_center, t.atoms.text]}>
                      {node.title}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            )
          })}
        </MapViewport>
        {!layout.nodes.length ? (
          <View
            pointerEvents="none"
            style={[
              a.absolute,
              a.inset_0,
              a.align_center,
              a.justify_center,
              a.p_xl,
            ]}>
            <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
              <Trans>No cards match these filters.</Trans>
            </Text>
          </View>
        ) : null}
        <View
          style={[
            a.absolute,
            a.flex_row,
            a.align_center,
            a.gap_xs,
            a.p_xs,
            a.rounded_md,
            a.border,
            t.atoms.bg,
            t.atoms.border_contrast_low,
            {bottom: 16, right: 16},
          ]}>
          <Button
            label={l`Zoom out`}
            size="small"
            variant="ghost"
            color="secondary"
            onPress={() => zoom(1 / 1.25)}>
            <ButtonText>−</ButtonText>
          </Button>
          <Text
            style={[
              a.text_xs,
              a.text_center,
              t.atoms.text_contrast_medium,
              {minWidth: 40},
            ]}>
            {Math.round(camera.scale * 100)}%
          </Text>
          <Button
            label={l`Zoom in`}
            size="small"
            variant="ghost"
            color="secondary"
            onPress={() => zoom(1.25)}>
            <ButtonText>+</ButtonText>
          </Button>
          <Button
            label={l`Fit map`}
            size="small"
            variant="ghost"
            color="secondary"
            onPress={() => {
              setCamera(fit)
              setClusterId(undefined)
            }}>
            <ButtonText>
              <Trans>Fit</Trans>
            </ButtonText>
          </Button>
        </View>
      </View>
      <View
        style={[
          a.flex_row,
          a.flex_wrap,
          a.justify_between,
          a.gap_sm,
          a.px_md,
          a.py_sm,
          a.border_t,
          t.atoms.border_contrast_low,
        ]}>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>
            Drag to pan · Scroll or pinch to zoom · Select to inspect
          </Trans>
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {plural(layout.clusters.length, {
            one: '# cluster',
            other: '# clusters',
          })}{' '}
          ·{' '}
          {plural(data.edges.length, {
            one: '# connection',
            other: '# connections',
          })}
        </Text>
      </View>
    </View>
  )
}
