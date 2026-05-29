import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import Svg, {Circle, G, Line, Rect, Text as SvgText} from 'react-native-svg'

import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {useGraphLayout} from './useGraphLayout'
import {useNativeGraphGestures} from './useNativeGraphGestures'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface GraphNodeData {
  id: string
  title: string
  color: string
  borderColor?: string
  radius?: number
  group?: string
  metadata?: Record<string, unknown>
}

export interface GraphEdgeData {
  id: string
  source: string
  target: string
  color?: string
  strokeWidth?: number
}

export interface GraphCanvasProps {
  nodes: GraphNodeData[]
  edges: GraphEdgeData[]
  onNodePress?: (nodeId: string) => void
  _onNodeLongPress?: (nodeId: string) => void
  selectedNodeId?: string
  searchQuery?: string
  activeGroups?: Set<string>
  height?: number
  emptyTitle?: string
  emptySubtitle?: string
  onRefresh?: () => void
  isRefreshing?: boolean
  renderNodeLabel?: (node: GraphNodeData) => string
  simulationConfig?: Parameters<typeof useGraphLayout>[4]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNodeRadius(node: GraphNodeData, isSelected: boolean): number {
  const base = node.radius ?? 8 + Math.min(node.title.length * 0.15, 10)
  return isSelected ? base + 3 : base
}

function truncateLabel(label: string, maxLen = 28): string {
  return label.length > maxLen ? label.slice(0, maxLen) + '...' : label
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GraphCanvas({
  nodes,
  edges,
  onNodePress,
  _onNodeLongPress,
  selectedNodeId,
  searchQuery = '',
  activeGroups,
  height: propHeight,
  emptyTitle = 'No hay elementos para mostrar',
  emptySubtitle = 'Empieza a agregar contenido para construir tu mapa.',
  onRefresh,
  isRefreshing,
  renderNodeLabel,
  simulationConfig,
}: GraphCanvasProps) {
  const t = useTheme()
  const {width: windowWidth, height: windowHeight} = useWindowDimensions()
  const [layoutWidth, setLayoutWidth] = useState(0)
  const width = layoutWidth || Math.min(windowWidth, 600)
  const graphHeight = propHeight ?? Math.min(windowHeight * 0.75, 600)

  const [pan, setPan] = useState({x: 0, y: 0})
  const [scale, setScale] = useState(1)
  const lastTapRef = useRef(0)

  const {panResponder, resetPanOffset} = useNativeGraphGestures({
    panX: pan.x,
    panY: pan.y,
    scale,
    onPanChange: (x, y) => setPan({x, y}),
    onScaleChange: s => setScale(s),
    onRefresh,
  })

  // Build simulation edges
  const simEdges = useMemo(
    () =>
      edges.map(e => ({
        source: e.source,
        target: e.target,
        idealLength: 120,
        strength: 1,
      })),
    [edges],
  )

  // Build group map for simulation
  const groupMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const n of nodes) {
      if (n.group) map.set(n.id, n.group)
    }
    return map
  }, [nodes])

  // Run layout simulation
  const {nodes: simNodes, restart} = useGraphLayout(
    nodes.map(n => n.id),
    simEdges,
    width,
    graphHeight,
    simulationConfig ?? {},
    groupMap,
  )

  // Map sim positions
  const nodePositions = useMemo(() => {
    const map = new Map<string, {x: number; y: number}>()
    for (const n of simNodes) {
      map.set(n.id, {x: n.x, y: n.y})
    }
    return map
  }, [simNodes])

  // Node lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNodeData>()
    for (const n of nodes) map.set(n.id, n)
    return map
  }, [nodes])

  // Visibility
  const query = searchQuery.toLowerCase().trim()
  const hasFilters = query.length > 0 || (activeGroups?.size ?? 0) > 0

  const isNodeVisible = useCallback(
    (node: GraphNodeData) => {
      if (!hasFilters) return true
      const matchesQuery = !query || node.title.toLowerCase().includes(query)
      const matchesGroup =
        !activeGroups || activeGroups.size === 0 ||
        (node.group && activeGroups.has(node.group))
      return matchesQuery && matchesGroup
    },
    [hasFilters, query, activeGroups],
  )

  const isEdgeVisible = useCallback(
    (edge: GraphEdgeData) => {
      if (!hasFilters) return true
      const sourceNode = nodeMap.get(edge.source)
      const targetNode = nodeMap.get(edge.target)
      const sourceVisible = sourceNode ? isNodeVisible(sourceNode) : false
      const targetVisible = targetNode ? isNodeVisible(targetNode) : false
      return sourceVisible && targetVisible
    },
    [hasFilters, nodeMap, isNodeVisible],
  )

  // Double-tap zoom
  const handleBackgroundPress = useCallback(() => {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      setScale(prev => (prev >= 1.4 ? 1 : prev + 0.4))
    }
    lastTapRef.current = now
  }, [])

  // Keyboard zoom (web)
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
        resetPanOffset()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [resetPanOffset])

  // Mouse wheel zoom (web)
  useEffect(() => {
    if (Platform.OS !== 'web') return
    const handler = (e: Event) => {
      e.preventDefault()
      const wheelEvent = e as unknown as {deltaY: number}
      const delta = wheelEvent.deltaY > 0 ? -0.15 : 0.15
      setScale(prev => Math.min(Math.max(prev + delta, 0.5), 3))
    }
    const el = document.querySelector('[data-graph-canvas]')
    if (el) {
      el.addEventListener('wheel', handler, {passive: false})
      return () => el.removeEventListener('wheel', handler)
    }
  }, [])

  if (nodes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyTitle, {color: t.palette.contrast_900}]}>
          {emptyTitle}
        </Text>
        <Text style={[styles.emptySubtitle, {color: t.palette.contrast_500}]}>
          {emptySubtitle}
        </Text>
      </View>
    )
  }

  const matchCount = nodes.filter(n => isNodeVisible(n)).length

  return (
    <View
      style={styles.container}
      onLayout={e => setLayoutWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
      data-graph-canvas>
      {hasFilters && (
        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>
            {matchCount} / {nodes.length}
          </Text>
        </View>
      )}

      {/* Zoom controls */}
      <View style={styles.zoomControls}>
        {onRefresh && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Refresh graph"
            accessibilityHint="Reloads the graph data and restarts simulation"
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
          accessibilityHint="Increases the zoom level of the graph"
          onPress={() => setScale(prev => Math.min(prev + 0.3, 3))}
          style={[styles.zoomBtn, {backgroundColor: t.palette.contrast_100}]}>
          <Text style={{color: t.palette.contrast_900, fontSize: 18}}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          accessibilityHint="Decreases the zoom level of the graph"
          onPress={() => setScale(prev => Math.max(prev - 0.3, 0.5))}
          style={[styles.zoomBtn, {backgroundColor: t.palette.contrast_100}]}>
          <Text style={{color: t.palette.contrast_900, fontSize: 18}}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Reset zoom"
          accessibilityHint="Resets zoom and pan to default values"
          onPress={() => {
            setScale(1)
            setPan({x: 0, y: 0})
            resetPanOffset()
          }}
          style={[styles.zoomBtn, {backgroundColor: t.palette.contrast_100}]}>
          <Text style={{color: t.palette.contrast_900, fontSize: 12}}>⟲</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Re-stabilize graph"
          accessibilityHint="Runs the layout simulation again to stabilize node positions"
          onPress={restart}
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
          {edges.map(edge => {
            const sp = nodePositions.get(edge.source)
            const tp = nodePositions.get(edge.target)
            if (!sp || !tp) return null
            const visible = isEdgeVisible(edge)
            return (
              <Line
                key={edge.id}
                x1={sp.x}
                y1={sp.y}
                x2={tp.x}
                y2={tp.y}
                stroke={edge.color ?? '#9ca3af'}
                strokeWidth={visible ? (edge.strokeWidth ?? 2) : 0.5}
                strokeOpacity={visible ? 0.6 : 0.06}
              />
            )
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const pos = nodePositions.get(node.id)
            if (!pos) return null
            const visible = isNodeVisible(node)
            const isSelected = node.id === selectedNodeId
            const radius = getNodeRadius(node, isSelected)
            const label = truncateLabel(
              renderNodeLabel ? renderNodeLabel(node) : node.title,
            )
            const labelWidth = label.length * 6.5 + 8

            return (
              <G key={node.id} opacity={visible ? 1 : 0.12}>
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
                <Circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill={node.color}
                  stroke={query.length > 0 && node.title.toLowerCase().includes(query) ? t.palette.primary_500 : (node.borderColor ?? '#1e293b')}
                  strokeWidth={query.length > 0 && node.title.toLowerCase().includes(query) ? 3 : (isSelected ? 3 : 2)}
                />
                <Circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius + 12}
                  fill="transparent"
                  onPress={() => onNodePress?.(node.id)}
                />
                {visible && (
                  <>
                    <SvgText
                      x={pos.x + radius + 6}
                      y={pos.y + 4}
                      fill={query.length > 0 && node.title.toLowerCase().includes(query) ? t.palette.primary_500 : t.palette.contrast_900}
                      fontSize={11}
                      fontWeight={query.length > 0 && node.title.toLowerCase().includes(query) ? '700' : '600'}>
                      {label}
                    </SvgText>
                    <Rect
                      x={pos.x + radius + 4}
                      y={pos.y - 10}
                      width={labelWidth}
                      height={18}
                      fill="transparent"
                      onPress={() => onNodePress?.(node.id)}
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
