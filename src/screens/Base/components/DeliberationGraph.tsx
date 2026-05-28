import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import Svg, {Circle, G, Line, Rect, Text as SvgText} from 'react-native-svg'

import {COMPASS_COLORS, type CompassPositionId} from '#/lib/compass/compassColors'
import {useTheme} from '#/alf'
import {useNativeGraphGestures} from '#/components/graph/useNativeGraphGestures'
import {Text} from '#/components/Typography'
import {CARD_TYPE_COLORS, RELATIONSHIP_COLORS, STANCE_COLORS} from '../deliberation-colors'
import {type GraphData} from '../deliberation-types'
import {useForceSimulation} from './useForceSimulation'

interface DeliberationGraphProps {
  data: GraphData
  searchQuery: string
  activeCardTypes: Set<string>
  activeRelTypes: Set<string>
  activeStances: Set<string>
  onNodePress: (nodeId: string) => void
  selectedNodeId?: string
  showIdeologicalOverlay?: boolean
  onRefresh?: () => void
  isRefreshing?: boolean
}

function getNodeRadius(influence: number | undefined, isSelected: boolean): number {
  const base = 8 + Math.min(Math.abs(influence ?? 0) * 1.5, 10)
  return isSelected ? base + 3 : base
}

export function DeliberationGraph({
  data,
  searchQuery,
  activeCardTypes,
  activeRelTypes,
  activeStances,
  showIdeologicalOverlay,
  onNodePress,
  selectedNodeId,
  onRefresh,
  isRefreshing,
}: DeliberationGraphProps) {
  const t = useTheme()
  const {width, height} = useWindowDimensions()
  const graphHeight = Math.min(height * 0.75, 600)

  const [pan, setPan] = useState({x: 0, y: 0})
  const [scale, setScale] = useState(1)
  const lastTapRef = useRef(0)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  const {panResponder, panOffsetRef} = useNativeGraphGestures({
    panX: pan.x,
    panY: pan.y,
    scale,
    onPanChange: (x, y) => setPan({x, y}),
    onScaleChange: s => setScale(s),
    onRefresh: () => onRefreshRef.current?.(),
  })

  const nodeIds = useMemo(() => data.nodes.map(n => n.id), [data.nodes])

  const edges = useMemo(
    () =>
      data.edges.map(e => ({
        source: e.source,
        target: e.target,
        idealLength: 120,
        strength: 1,
      })),
    [data.edges],
  )

  const stanceMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const n of data.nodes) {
      if (n.stance) map.set(n.id, n.stance)
    }
    return map
  }, [data.nodes])

  const {nodes: simNodes, restart: restartSimulation} = useForceSimulation(
    nodeIds,
    edges,
    width,
    graphHeight,
    {},
    stanceMap,
  )

  const nodePositions = useMemo(() => {
    const map = new Map<string, {x: number; y: number}>()
    for (const n of simNodes) {
      map.set(n.id, {x: n.x, y: n.y})
    }
    return map
  }, [simNodes])

  // Node lookup map — O(1) for edge visibility checks instead of O(N) .find()
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphData['nodes'][number]>()
    for (const n of data.nodes) {
      map.set(n.id, n)
    }
    return map
  }, [data.nodes])

  const query = searchQuery.toLowerCase().trim()
  const hasFilters =
    query.length > 0 ||
    activeCardTypes.size > 0 ||
    activeRelTypes.size > 0 ||
    activeStances.size > 0

  const isNodeVisible = useCallback(
    (node: GraphData['nodes'][number]) => {
      if (!hasFilters) return true
      const matchesQuery = !query || node.title.toLowerCase().includes(query)
      const matchesType =
        activeCardTypes.size === 0 || activeCardTypes.has(node.card_type)
      const matchesStance =
        activeStances.size === 0 ||
        (node.stance && activeStances.has(node.stance))
      return matchesQuery && matchesType && matchesStance
    },
    [hasFilters, query, activeCardTypes, activeStances],
  )

  const isEdgeVisible = useCallback(
    (edge: GraphData['edges'][number]) => {
      if (!hasFilters) return true
      const sourceNode = nodeMap.get(edge.source)
      const targetNode = nodeMap.get(edge.target)
      const sourceVisible = sourceNode ? isNodeVisible(sourceNode) : false
      const targetVisible = targetNode ? isNodeVisible(targetNode) : false
      const matchesRel =
        activeRelTypes.size === 0 || activeRelTypes.has(edge.relationship_type)
      return sourceVisible && targetVisible && matchesRel
    },
    [hasFilters, activeRelTypes, nodeMap, isNodeVisible],
  )

  // Double-tap to zoom
  const handleBackgroundPress = useCallback(() => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      // Double tap
      setScale(prev => (prev >= 1.4 ? 1 : prev + 0.4))
    }
    lastTapRef.current = now
  }, [])

  // Keyboard zoom (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        setScale(prev => Math.min(prev + 0.3, 3))
      } else if (e.key === '-' || e.key === '_') {
        setScale(prev => Math.max(prev - 0.3, 0.5))
      } else if (e.key === '0') {
        setScale(1)
        setPan({x: 0, y: 0})
        panOffsetRef.current = {x: 0, y: 0}
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Mouse wheel zoom (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return
    if (typeof document === 'undefined') return
    const handler = (e: Event) => {
      e.preventDefault()
      const wheelEvent = e as unknown as {deltaY: number}
      const delta = wheelEvent.deltaY > 0 ? -0.15 : 0.15
      setScale(prev => Math.min(Math.max(prev + delta, 0.5), 3))
    }
    const el = document.querySelector('[data-deliberation-graph]')
    if (el) {
      el.addEventListener('wheel', handler, {passive: false})
      return () => el.removeEventListener('wheel', handler)
    }
  }, [])

  if (data.nodes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, {color: t.palette.contrast_900}]}>
          No arguments to display
        </Text>
        <Text style={[styles.emptySubtitle, {color: t.palette.contrast_500}]}>
          Start discussing in your community to build the Community Civic Tree.
        </Text>
      </View>
    )
  }

  const matchCount = data.nodes.filter(n => isNodeVisible(n)).length

  return (
    <View style={styles.container} {...panResponder.panHandlers} data-deliberation-graph>
      {hasFilters && (
        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>
            {matchCount} / {data.nodes.length} claims
          </Text>
        </View>
      )}

      {/* Zoom controls */}
      <View style={styles.zoomControls}>
        {onRefresh && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Refresh graph"
            accessibilityHint="Reloads community civic tree data"
            onPress={onRefresh}
            disabled={!!isRefreshing}
            style={[styles.zoomBtn, {backgroundColor: t.palette.contrast_100}]}>
            <Text style={{color: t.palette.contrast_900, fontSize: 14}}>
              {isRefreshing ? '⟳' : '↻'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
          accessibilityHint="Increases graph zoom level"
          onPress={() => setScale(prev => Math.min(prev + 0.3, 3))}
          style={[styles.zoomBtn, {backgroundColor: t.palette.contrast_100}]}>
          <Text style={{color: t.palette.contrast_900, fontSize: 18}}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          accessibilityHint="Decreases graph zoom level"
          onPress={() => setScale(prev => Math.max(prev - 0.3, 0.5))}
          style={[styles.zoomBtn, {backgroundColor: t.palette.contrast_100}]}>
          <Text style={{color: t.palette.contrast_900, fontSize: 18}}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Reset zoom"
          accessibilityHint="Resets zoom and pan to default"
          onPress={() => {
            setScale(1)
            setPan({x: 0, y: 0})
            panOffsetRef.current = {x: 0, y: 0}
          }}
          style={[styles.zoomBtn, {backgroundColor: t.palette.contrast_100}]}>
          <Text style={{color: t.palette.contrast_900, fontSize: 12}}>⟲</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Re-stabilize graph"
          accessibilityHint="Re-runs the force simulation without randomizing positions"
          onPress={restartSimulation}
          style={[styles.zoomBtn, {backgroundColor: t.palette.primary_500 + '20'}]}>
          <Text style={{color: t.palette.primary_500, fontSize: 12}}>⚡</Text>
        </TouchableOpacity>
      </View>

      <Svg
        width={width}
        height={graphHeight}
        onPress={handleBackgroundPress}>
        <G
          transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {/* Edges */}
          {data.edges.map(edge => {
            const sp = nodePositions.get(edge.source)
            const tp = nodePositions.get(edge.target)
            if (!sp || !tp) return null
            const visible = isEdgeVisible(edge)
            const color =
              RELATIONSHIP_COLORS[edge.relationship_type] || '#9ca3af'
            return (
              <Line
                key={edge.id}
                x1={sp.x}
                y1={sp.y}
                x2={tp.x}
                y2={tp.y}
                stroke={color}
                strokeWidth={visible ? 2 : 0.5}
                strokeOpacity={visible ? 0.6 : 0.06}
              />
            )
          })}

          {/* Nodes */}
          {data.nodes.map(node => {
            const pos = nodePositions.get(node.id)
            if (!pos) return null
            const visible = isNodeVisible(node)
            const isSelected = node.id === selectedNodeId
            const stance = node.stance || 'neutral'
            let fillColor = STANCE_COLORS[stance] || STANCE_COLORS.neutral
            
            if (showIdeologicalOverlay) {
              if (node.compass_quadrant && COMPASS_COLORS[node.compass_quadrant as CompassPositionId]) {
                fillColor = COMPASS_COLORS[node.compass_quadrant as CompassPositionId]
              } else {
                fillColor = '#cbd5e1' // slate-300 for unknown ideology
              }
            }

            const borderColor = CARD_TYPE_COLORS[node.card_type] || '#1e293b'
            const radius = getNodeRadius(node.influence, isSelected)
            const label =
              node.title.length > 28
                ? node.title.slice(0, 28) + '...'
                : node.title
            const labelWidth = label.length * 6.5 + 8

            return (
              <G key={node.id} opacity={visible ? 1 : 0.12}>
                {/* Selection ring */}
                {isSelected && (
                  <Circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radius + 4}
                    fill="none"
                    stroke="white"
                    strokeWidth={2}
                  />
                )}

                {/* Visible node circle — fill by stance, stroke by card type */}
                <Circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill={fillColor}
                  stroke={borderColor}
                  strokeWidth={isSelected ? 3 : 2}
                />

                {/* Large invisible hit area for reliable tapping */}
                <Circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius + 12}
                  fill="transparent"
                  onPress={() => onNodePress(node.id)}
                />

                {/* Label */}
                {visible && (
                  <>
                    <SvgText
                      x={pos.x + radius + 6}
                      y={pos.y + 4}
                      fill={t.palette.contrast_900}
                      fontSize={11}
                      fontWeight="600">
                      {label}
                    </SvgText>
                    {/* Invisible hit rect behind label */}
                    <Rect
                      x={pos.x + radius + 4}
                      y={pos.y - 10}
                      width={labelWidth}
                      height={18}
                      fill="transparent"
                      onPress={() => onNodePress(node.id)}
                    />
                  </>
                )}
              </G>
            )
          })}
        </G>
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  matchBadge: {
    position: 'absolute',
    top: 8,
    left: 12,
    zIndex: 10,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  matchBadgeText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  zoomControls: {
    position: 'absolute',
    bottom: 16,
    right: 12,
    zIndex: 10,
    gap: 6,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
})
